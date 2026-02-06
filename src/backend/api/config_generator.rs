use axum::{
  Json,
  response::{IntoResponse, Response},
};
use serde_json::{Map, Value};
use std::collections::HashSet;
use std::path::Path;
use tokio::fs;

use crate::backend::api::config::ConfigCreateDto;
use crate::backend::api::filter::FilterCreateDto;
use crate::backend::api::outbound_group::OutboundGroupCreateDto;
use crate::backend::api::subscribe::SubscribeCreateDto;
use crate::backend::error::AppError;

const OUTBOUND_GROUP_FILE: &str = "./data/outbound_groups.json";

/// Main handler for generating and downloading a complete sing-box config
pub async fn generate_config(
  axum::extract::Path(uuid): axum::extract::Path<String>,
) -> Result<Response, AppError> {
  log::info!("Generating config for UUID: {}", uuid);

  // 1. Load config
  let config = load_config(&uuid).await?;

  // 2. Build sing-box config as JSON object
  let mut singbox_config = Map::new();

  // 3. Resolve each module
  singbox_config.insert("log".to_string(), resolve_log(&config.log).await?);
  singbox_config.insert("dns".to_string(), resolve_dns(&config.dns).await?);
  singbox_config.insert(
    "inbounds".to_string(),
    resolve_inbounds(&config.inbounds).await?,
  );

  let (outbounds, route_final_tag) = resolve_outbounds_and_route(&config).await?;
  singbox_config.insert("outbounds".to_string(), outbounds);
  singbox_config.insert(
    "route".to_string(),
    resolve_route(&config.route, &route_final_tag).await?,
  );

  if let Some(exp) = &config.experimental {
    singbox_config.insert("experimental".to_string(), resolve_experimental(exp).await?);
  }

  // 4. Return as downloadable JSON
  let safe_name = sanitize_filename(&config.name);
  let filename = format!("singbox-config-{}.json", safe_name);

  let mut response = Json(Value::Object(singbox_config)).into_response();
  response.headers_mut().insert(
    "Content-Type",
    "application/json"
      .parse()
      .map_err(|_| AppError::InternalServerError("Invalid header value".to_string()))?,
  );
  response.headers_mut().insert(
    "Content-Disposition",
    format!("attachment; filename=\"{}\"", filename)
      .parse()
      .map_err(|_| AppError::InternalServerError("Invalid header value".to_string()))?,
  );

  Ok(response)
}

/// Load config file
async fn load_config(uuid: &str) -> Result<ConfigCreateDto, AppError> {
  let file_path = Path::new("./data/configs").join(format!("{}.json", uuid));

  if !file_path.exists() {
    return Err(AppError::NotFound("Config not found".to_string()));
  }

  let content = fs::read_to_string(&file_path).await?;
  let config: ConfigCreateDto = serde_json::from_str(&content)?;

  Ok(config)
}

/// Load and parse a module's JSON field
async fn load_module_json(module_type: &str, uuid: &str) -> Result<Value, AppError> {
  let file_path = Path::new("./data")
    .join(module_type)
    .join(format!("{}.json", uuid));

  if !file_path.exists() {
    return Err(AppError::NotFound(format!(
      "{} module not found: {}",
      module_type, uuid
    )));
  }

  let content = fs::read_to_string(&file_path).await?;
  let module: Value = serde_json::from_str(&content)?;

  // Extract and parse the "json" field
  if let Some(json_str) = module.get("json").and_then(|j| j.as_str()) {
    let parsed: Value = serde_json::from_str(json_str).map_err(|e| {
      AppError::InternalServerError(format!(
        "Failed to parse {} module JSON: {}",
        module_type, e
      ))
    })?;
    Ok(parsed)
  } else {
    Err(AppError::InternalServerError(format!(
      "{} module missing 'json' field",
      module_type
    )))
  }
}

/// Resolve log module
async fn resolve_log(uuid: &str) -> Result<Value, AppError> {
  load_module_json("logs", uuid).await
}

/// Resolve DNS configuration
async fn resolve_dns(dns: &crate::backend::api::config::DnsConfigDto) -> Result<Value, AppError> {
  let mut dns_config = Map::new();

  // Merge dns-config if provided
  if let Some(config_uuid) = &dns.config {
    let config_value = load_module_json("dns-config", config_uuid).await?;
    if let Value::Object(config_obj) = config_value {
      for (key, value) in config_obj {
        dns_config.insert(key, value);
      }
    }
  }

  // Resolve DNS servers
  let mut servers = Vec::new();
  for server_uuid in &dns.servers {
    let server = load_module_json("dns-server", server_uuid).await?;
    servers.push(server);
  }
  dns_config.insert("servers".to_string(), Value::Array(servers));

  // Resolve DNS rules if provided
  if let Some(rules) = &dns.rules {
    let mut dns_rules = Vec::new();
    for rule in rules {
      let mut rule_obj = Map::new();

      // Resolve rulesets
      let mut rule_sets = Vec::new();
      for ruleset_uuid in &rule.rule_set {
        let ruleset = load_module_json("rulesets", ruleset_uuid).await?;
        // Extract "tag" field from ruleset
        if let Some(tag) = ruleset.get("tag").and_then(|t| t.as_str()) {
          rule_sets.push(Value::String(tag.to_string()));
        }
      }
      rule_obj.insert("rule_set".to_string(), Value::Array(rule_sets));

      // Resolve server tag
      let server = load_module_json("dns-server", &rule.server).await?;
      if let Some(tag) = server.get("tag").and_then(|t| t.as_str()) {
        rule_obj.insert("server".to_string(), Value::String(tag.to_string()));
      }

      dns_rules.push(Value::Object(rule_obj));
    }
    dns_config.insert("rules".to_string(), Value::Array(dns_rules));
  }

  // Resolve final server tag
  let final_server = load_module_json("dns-server", &dns.final_server).await?;
  if let Some(tag) = final_server.get("tag").and_then(|t| t.as_str()) {
    dns_config.insert("final".to_string(), Value::String(tag.to_string()));
  }

  Ok(Value::Object(dns_config))
}

/// Resolve inbounds array
async fn resolve_inbounds(inbound_uuids: &[String]) -> Result<Value, AppError> {
  let mut inbounds = Vec::new();
  for uuid in inbound_uuids {
    let inbound = load_module_json("inbounds", uuid).await?;
    inbounds.push(inbound);
  }
  Ok(Value::Array(inbounds))
}

/// Resolve experimental module
async fn resolve_experimental(uuid: &str) -> Result<Value, AppError> {
  load_module_json("experimentals", uuid).await
}

/// Check if UUID is an outbound group
async fn is_outbound_group(uuid: &str) -> Result<bool, AppError> {
  let file_path = Path::new(OUTBOUND_GROUP_FILE);
  if !file_path.exists() {
    return Ok(false);
  }

  let content = fs::read_to_string(file_path).await?;
  let groups: Value = serde_json::from_str(&content)?;

  if let Some(groups_array) = groups.get("groups").and_then(|g| g.as_array()) {
    for group in groups_array {
      if let Some(group_uuid) = group.get("uuid").and_then(|u| u.as_str())
        && group_uuid == uuid
      {
        return Ok(true);
      }
    }
  }

  Ok(false)
}

/// Load outbound group
async fn load_outbound_group(uuid: &str) -> Result<OutboundGroupCreateDto, AppError> {
  let file_path = Path::new(OUTBOUND_GROUP_FILE);
  if !file_path.exists() {
    return Err(AppError::NotFound(
      "Outbound groups file not found".to_string(),
    ));
  }

  let content = fs::read_to_string(file_path).await?;
  let groups: Value = serde_json::from_str(&content)?;

  if let Some(groups_array) = groups.get("groups").and_then(|g| g.as_array()) {
    for group in groups_array {
      if let Some(group_uuid) = group.get("uuid").and_then(|u| u.as_str())
        && group_uuid == uuid
      {
        let group_dto: OutboundGroupCreateDto = serde_json::from_value(group.clone())?;
        return Ok(group_dto);
      }
    }
  }

  Err(AppError::NotFound(format!(
    "Outbound group not found: {}",
    uuid
  )))
}

/// Convert outbound group to sing-box format
fn convert_group_to_singbox(group: &OutboundGroupCreateDto, outbound_tags: &[String]) -> Value {
  let mut obj = Map::new();

  // Required fields
  obj.insert("type".to_string(), Value::String(group.group_type.clone()));
  obj.insert("tag".to_string(), Value::String(group.name.clone()));
  obj.insert(
    "outbounds".to_string(),
    Value::Array(
      outbound_tags
        .iter()
        .map(|t| Value::String(t.clone()))
        .collect(),
    ),
  );

  // Optional fields
  if let Some(url) = &group.url {
    obj.insert("url".to_string(), Value::String(url.clone()));
  }
  if let Some(interval) = &group.interval {
    obj.insert("interval".to_string(), Value::String(interval.clone()));
  }
  if let Some(tolerance) = &group.tolerance {
    obj.insert("tolerance".to_string(), Value::Number((*tolerance).into()));
  }
  if let Some(idle_timeout) = &group.idle_timeout {
    obj.insert(
      "idle_timeout".to_string(),
      Value::String(idle_timeout.clone()),
    );
  }
  if let Some(interrupt) = &group.interrupt_exist_connections {
    obj.insert(
      "interrupt_exist_connections".to_string(),
      Value::Bool(*interrupt),
    );
  }

  Value::Object(obj)
}

/// Check if UUID is a filter
async fn is_filter(uuid: &str) -> Result<bool, AppError> {
  let file_path = Path::new("./data/filters").join(format!("{}.json", uuid));
  Ok(file_path.exists())
}

/// Load filter
async fn load_filter(uuid: &str) -> Result<FilterCreateDto, AppError> {
  let file_path = Path::new("./data/filters").join(format!("{}.json", uuid));
  if !file_path.exists() {
    return Err(AppError::NotFound(format!("Filter not found: {}", uuid)));
  }

  let content = fs::read_to_string(&file_path).await?;
  let filter: FilterCreateDto = serde_json::from_str(&content)?;
  Ok(filter)
}

/// Get all subscription outbounds
async fn get_subscription_outbounds() -> Result<Vec<Value>, AppError> {
  let dir_path = Path::new("./data/subscribes");
  if !dir_path.exists() {
    return Ok(Vec::new());
  }

  let mut all_outbounds = Vec::new();
  let mut entries = fs::read_dir(dir_path).await?;

  while let Some(entry) = entries.next_entry().await? {
    let path = entry.path();
    if path.extension().and_then(|s| s.to_str()) == Some("json") {
      if let Ok(content) = fs::read_to_string(&path).await {
        if let Ok(subscribe) = serde_json::from_str::<SubscribeCreateDto>(&content) {
          // Parse subscription metadata
          if let Ok(metadata) = serde_json::from_str::<Value>(&subscribe.json) {
            if let Some(content_str) = metadata.get("content").and_then(|c| c.as_str()) {
              // Decode base64 content
              if let Ok(decoded) =
                base64::Engine::decode(&base64::engine::general_purpose::STANDARD, content_str)
              {
                if let Ok(decoded_str) = String::from_utf8(decoded) {
                  // Parse subscription format (ss://, trojan://, etc.)
                  for line in decoded_str.lines() {
                    let line = line.trim();
                    if line.is_empty() {
                      continue;
                    }

                    // Parse different formats and convert to sing-box outbound
                    if let Ok(outbound) = parse_subscription_line(line) {
                      all_outbounds.push(outbound);
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }

  Ok(all_outbounds)
}

/// Parse a single subscription line to sing-box outbound format
fn parse_subscription_line(line: &str) -> Result<Value, AppError> {
  // Extract tag/name from URL fragment
  let tag = if let Some(hash_pos) = line.rfind('#') {
    let fragment = &line[hash_pos + 1..];
    urlencoding::decode(fragment)
      .unwrap_or_else(|_| fragment.into())
      .to_string()
  } else {
    "Unnamed".to_string()
  };

  // Basic outbound structure
  let mut outbound = Map::new();
  outbound.insert("tag".to_string(), Value::String(tag));

  // Parse protocol
  if line.starts_with("ss://") {
    outbound.insert("type".to_string(), Value::String("shadowsocks".to_string()));
    // Add minimal required fields for ss
    outbound.insert("server".to_string(), Value::String("".to_string()));
    outbound.insert("server_port".to_string(), Value::Number(0.into()));
    outbound.insert("method".to_string(), Value::String("".to_string()));
    outbound.insert("password".to_string(), Value::String("".to_string()));
  } else if line.starts_with("trojan://") {
    outbound.insert("type".to_string(), Value::String("trojan".to_string()));
    outbound.insert("server".to_string(), Value::String("".to_string()));
    outbound.insert("server_port".to_string(), Value::Number(0.into()));
    outbound.insert("password".to_string(), Value::String("".to_string()));
  } else if line.starts_with("vmess://") {
    outbound.insert("type".to_string(), Value::String("vmess".to_string()));
    outbound.insert("server".to_string(), Value::String("".to_string()));
    outbound.insert("server_port".to_string(), Value::Number(0.into()));
    outbound.insert("uuid".to_string(), Value::String("".to_string()));
  } else {
    return Err(AppError::InternalServerError(format!(
      "Unsupported protocol: {}",
      line
    )));
  }

  Ok(Value::Object(outbound))
}

/// Apply filter to subscription outbounds
async fn apply_filter(filter: &FilterCreateDto) -> Result<Vec<Value>, AppError> {
  let all_outbounds = get_subscription_outbounds().await?;
  let mut filtered = Vec::new();

  for outbound in all_outbounds {
    if let Some(tag) = outbound.get("tag").and_then(|t| t.as_str()) {
      let matches = match filter.filter_type.as_str() {
        "simple" => {
          // Simple contains match for any pattern part
          filter
            .pattern
            .split('|')
            .any(|pattern| tag.contains(pattern.trim()))
        }
        "regex" => {
          // Regex match
          if let Ok(re) = regex::Regex::new(&filter.pattern) {
            re.is_match(tag)
          } else {
            false
          }
        }
        _ => false,
      };

      if matches {
        filtered.push(outbound);
      }
    }
  }

  Ok(filtered)
}

/// Resolve outbounds and route together (they depend on each other)
async fn resolve_outbounds_and_route(
  config: &ConfigCreateDto,
) -> Result<(Value, String), AppError> {
  let mut outbound_uuids = HashSet::new();

  // Collect from route rules
  if let Some(rules) = &config.route.rules {
    for rule in rules {
      outbound_uuids.insert(rule.outbound.clone());
    }
  }

  // Collect route final
  let final_uuid = config.route.final_outbound.clone();
  outbound_uuids.insert(final_uuid.clone());

  // Use iterative approach with a work queue to handle nested groups
  let mut collected_tags = HashSet::new();
  let mut outbounds = Vec::new();
  let mut groups_to_add = Vec::new();
  let mut work_queue: Vec<String> = outbound_uuids.iter().cloned().collect();
  let mut final_tag = String::new();

  while let Some(uuid) = work_queue.pop() {
    if is_outbound_group(&uuid).await? {
      let group = load_outbound_group(&uuid).await?;
      let group_tag = group.name.clone();

      // Store final tag if this is the final outbound
      if uuid == final_uuid {
        final_tag = group_tag.clone();
      }

      // Collect member tags and add members to work queue
      let mut member_tags = Vec::new();
      for member_uuid in &group.outbounds {
        // Check if it's a group, filter, or outbound
        if is_outbound_group(member_uuid).await? {
          let member_group = load_outbound_group(member_uuid).await?;
          member_tags.push(member_group.name.clone());
          work_queue.push(member_uuid.clone());
        } else if is_filter(member_uuid).await? {
          // It's a filter - apply to subscriptions
          let filter = load_filter(member_uuid).await?;
          let filtered_outbounds = apply_filter(&filter).await?;

          // Add all filtered outbounds
          for outbound_json in filtered_outbounds {
            let tag = outbound_json
              .get("tag")
              .and_then(|t| t.as_str())
              .unwrap_or("")
              .to_string();
            member_tags.push(tag.clone());

            // Add only if not already collected
            if !collected_tags.contains(&tag) {
              collected_tags.insert(tag);
              outbounds.push(outbound_json);
            }
          }
        } else {
          // It's an individual outbound
          let outbound_json = load_module_json("outbounds", member_uuid).await?;
          let tag = outbound_json
            .get("tag")
            .and_then(|t| t.as_str())
            .unwrap_or("")
            .to_string();
          member_tags.push(tag.clone());

          // Add only if not already collected
          if !collected_tags.contains(&tag) {
            collected_tags.insert(tag);
            outbounds.push(outbound_json);
          }
        }
      }

      // Store group with its member tags
      groups_to_add.push((group, member_tags));
    } else if is_filter(&uuid).await? {
      // It's a filter - apply to subscriptions
      let filter = load_filter(&uuid).await?;
      let filter_tag = filter.name.clone();

      // Store final tag if this is the final outbound
      if uuid == final_uuid {
        final_tag = filter_tag;
      }

      let filtered_outbounds = apply_filter(&filter).await?;
      for outbound_json in filtered_outbounds {
        let tag = outbound_json
          .get("tag")
          .and_then(|t| t.as_str())
          .unwrap_or("")
          .to_string();

        // Add only if not already collected
        if !collected_tags.contains(&tag) {
          collected_tags.insert(tag);
          outbounds.push(outbound_json);
        }
      }
    } else {
      // It's an individual outbound
      let outbound_json = load_module_json("outbounds", &uuid).await?;
      let tag = outbound_json
        .get("tag")
        .and_then(|t| t.as_str())
        .unwrap_or("")
        .to_string();

      // Store final tag if this is the final outbound
      if uuid == final_uuid {
        final_tag = tag.clone();
      }

      // Add only if not already collected
      if !collected_tags.contains(&tag) {
        collected_tags.insert(tag);
        outbounds.push(outbound_json);
      }
    }
  }

  // Add all groups to outbounds array (after their members)
  for (group, member_tags) in groups_to_add {
    outbounds.push(convert_group_to_singbox(&group, &member_tags));
  }

  Ok((Value::Array(outbounds), final_tag))
}

/// Resolve route configuration
async fn resolve_route(
  route: &crate::backend::api::config::RouteConfigDto,
  final_tag: &str,
) -> Result<Value, AppError> {
  let mut route_config = Map::new();

  // Merge route-config if provided
  if let Some(config_uuid) = &route.config {
    let config_value = load_module_json("routes", config_uuid).await?;
    if let Value::Object(config_obj) = config_value {
      for (key, value) in config_obj {
        route_config.insert(key, value);
      }
    }
  }

  // Resolve route rules if provided
  if let Some(rules) = &route.rules {
    let mut route_rules = Vec::new();
    for rule in rules {
      let mut rule_obj = Map::new();

      // Resolve rulesets
      let mut rule_sets = Vec::new();
      for ruleset_uuid in &rule.rulesets {
        let ruleset = load_module_json("rulesets", ruleset_uuid).await?;
        // Extract "tag" field from ruleset
        if let Some(tag) = ruleset.get("tag").and_then(|t| t.as_str()) {
          rule_sets.push(Value::String(tag.to_string()));
        }
      }
      rule_obj.insert("rule_set".to_string(), Value::Array(rule_sets));

      // Resolve outbound tag
      let outbound_tag = if is_outbound_group(&rule.outbound).await? {
        let group = load_outbound_group(&rule.outbound).await?;
        group.name.clone()
      } else {
        let outbound = load_module_json("outbounds", &rule.outbound).await?;
        outbound
          .get("tag")
          .and_then(|t| t.as_str())
          .unwrap_or("")
          .to_string()
      };
      rule_obj.insert("outbound".to_string(), Value::String(outbound_tag));

      route_rules.push(Value::Object(rule_obj));
    }
    route_config.insert("rules".to_string(), Value::Array(route_rules));
  }

  // Set final outbound tag (already resolved in resolve_outbounds_and_route)
  route_config.insert("final".to_string(), Value::String(final_tag.to_string()));

  Ok(Value::Object(route_config))
}

/// Sanitize filename for safe download
fn sanitize_filename(name: &str) -> String {
  name
    .chars()
    .map(|c| {
      if c.is_ascii_alphanumeric() || c == '-' || c == '_' {
        c
      } else {
        '_'
      }
    })
    .collect::<String>()
    .chars()
    .take(50) // Limit length
    .collect()
}
