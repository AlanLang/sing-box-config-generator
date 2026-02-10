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
  let route_value = resolve_route(&config.route, &route_final_tag).await?;

  // Filter out unused outbounds
  let outbounds = filter_unused_outbounds(outbounds, &route_value, &route_final_tag);

  singbox_config.insert("outbounds".to_string(), outbounds);
  singbox_config.insert("route".to_string(), route_value);

  // Resolve download_detour tag
  let download_detour_tag = resolve_download_detour_tag(&config.ext_config.download_detour).await?;

  // Inject download_detour into remote rule_set entries in route
  if let Some(route_obj) = singbox_config
    .get_mut("route")
    .and_then(|v| v.as_object_mut())
  {
    inject_download_detour_to_rule_sets(route_obj, &download_detour_tag);
  }

  let mut experimental_value = resolve_experimental(&config.experimental).await?;

  // Inject download_detour into experimental.clash_api.external_ui_download_detour
  if let Some(exp_obj) = experimental_value.as_object_mut() {
    if let Some(clash_api) = exp_obj.get_mut("clash_api").and_then(|v| v.as_object_mut()) {
      clash_api.insert(
        "external_ui_download_detour".to_string(),
        Value::String(download_detour_tag.clone()),
      );
    }
  }

  singbox_config.insert("experimental".to_string(), experimental_value);

  // 4. Return as downloadable JSON
  let safe_name = sanitize_filename(&config.name);
  let filename = format!("{}.json", safe_name);

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

/// Load a module's JSON field, injecting the module's "name" as "tag" if not present in the JSON.
/// This is used for outbound modules where the JSON may not contain a "tag" field.
async fn load_module_json_with_tag(module_type: &str, uuid: &str) -> Result<Value, AppError> {
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

  let module_name = module
    .get("name")
    .and_then(|n| n.as_str())
    .unwrap_or("")
    .to_string();

  if let Some(json_str) = module.get("json").and_then(|j| j.as_str()) {
    let mut parsed: Value = serde_json::from_str(json_str).map_err(|e| {
      AppError::InternalServerError(format!(
        "Failed to parse {} module JSON: {}",
        module_type, e
      ))
    })?;

    // Inject "tag" from module "name" if not already present
    if let Some(obj) = parsed.as_object_mut() {
      if !obj.contains_key("tag") && !module_name.is_empty() {
        obj.insert("tag".to_string(), Value::String(module_name));
      }
    }

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
  for server_entry in &dns.servers {
    let mut server = load_module_json("dns-server", &server_entry.uuid).await?;
    // Inject detour if configured
    if let Some(detour_uuid) = &server_entry.detour {
      let detour_tag = resolve_outbound_uuid_to_tag(detour_uuid).await?;
      if !detour_tag.is_empty() {
        if let Some(obj) = server.as_object_mut() {
          obj.insert("detour".to_string(), Value::String(detour_tag));
        }
      }
    }
    servers.push(server);
  }
  dns_config.insert("servers".to_string(), Value::Array(servers));

  // Resolve DNS rules if provided and non-empty
  // Note: rule_set definitions are NOT placed here - they only belong in the route section.
  // DNS rules just reference rule_set tags by name.
  if let Some(rules) = &dns.rules {
    if !rules.is_empty() {
      let mut dns_rules = Vec::new();
      for rule in rules {
        let mut rule_obj = Map::new();

        // Resolve rulesets - collect tag names only
        let mut rule_set_tags = Vec::new();
        for ruleset_uuid in &rule.rule_set {
          let ruleset = load_module_json_with_tag("rulesets", ruleset_uuid).await?;
          if let Some(tag) = ruleset.get("tag").and_then(|t| t.as_str()) {
            rule_set_tags.push(Value::String(tag.to_string()));
          }
        }
        rule_obj.insert("rule_set".to_string(), Value::Array(rule_set_tags));

        // Resolve server tag
        let server = load_module_json("dns-server", &rule.server).await?;
        if let Some(tag) = server.get("tag").and_then(|t| t.as_str()) {
          rule_obj.insert("server".to_string(), Value::String(tag.to_string()));
        }

        dns_rules.push(Value::Object(rule_obj));
      }
      dns_config.insert("rules".to_string(), Value::Array(dns_rules));
    }
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

/// Decode base64-encoded subscription content to a UTF-8 string.
/// Handles both padded and unpadded base64 (many subscription servers omit padding).
pub fn decode_base64_content(content: &str) -> Option<String> {
  let content = content.trim();
  if content.is_empty() {
    return None;
  }
  // Try standard base64 (with padding) first
  if let Ok(decoded) = base64::Engine::decode(&base64::engine::general_purpose::STANDARD, content) {
    return String::from_utf8(decoded).ok();
  }
  // Fall back to base64 without padding requirement
  let decoded =
    base64::Engine::decode(&base64::engine::general_purpose::STANDARD_NO_PAD, content).ok()?;
  String::from_utf8(decoded).ok()
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
          let subscribe_name = subscribe.name.clone();

          // Parse subscription metadata
          if let Ok(metadata) = serde_json::from_str::<Value>(&subscribe.json) {
            // Skip disabled subscriptions (enabled defaults to true if not set)
            if metadata.get("enabled").and_then(|e| e.as_bool()) == Some(false) {
              continue;
            }

            if let Some(content_str) = metadata.get("content").and_then(|c| c.as_str()) {
              // Decode base64 content
              if let Some(decoded_str) = decode_base64_content(content_str) {
                // Parse subscription format (ss://, trojan://, etc.)
                for line in decoded_str.lines() {
                  let line = line.trim();
                  if line.is_empty() {
                    continue;
                  }

                  // Parse different formats and convert to sing-box outbound
                  if let Ok(mut outbound) = parse_subscription_line(line) {
                    // Rename tag to "original-name-subscription-name" format
                    if let Some(obj) = outbound.as_object_mut() {
                      if let Some(original_tag) = obj.get("tag").and_then(|t| t.as_str()) {
                        let new_tag = format!("{}-{}", original_tag, subscribe_name);
                        obj.insert("tag".to_string(), Value::String(new_tag));
                      }
                    }
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

  Ok(all_outbounds)
}

// Re-export subscription parser from shared module
use crate::backend::subscription_parser::parse_subscription_line;

/// Apply filter to subscription outbounds
async fn apply_filter(filter: &FilterCreateDto) -> Result<Vec<Value>, AppError> {
  let all_outbounds = get_subscription_outbounds().await?;
  let mut filtered = Vec::new();

  for outbound in all_outbounds {
    if let Some(tag) = outbound.get("tag").and_then(|t| t.as_str()) {
      let matches = match filter.filter_type.as_str() {
        "simple" => {
          // Simple contains match for any pattern part
          let pattern_match = filter
            .pattern
            .split('|')
            .any(|pattern| tag.contains(pattern.trim()));

          // If pattern matches and except is configured, check if should be excluded
          if pattern_match {
            if let Some(except_pattern) = &filter.except {
              // Exclude if any except pattern matches
              !except_pattern
                .split('|')
                .any(|pattern| tag.contains(pattern.trim()))
            } else {
              // No except pattern, include the match
              true
            }
          } else {
            false
          }
        }
        "regex" => {
          // Regex match (except not supported for regex type)
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
      match rule {
        crate::backend::api::config::RouteRuleDto::Ruleset { outbound, .. } => {
          outbound_uuids.insert(outbound.clone());
        }
        crate::backend::api::config::RouteRuleDto::Rule { outbound, .. } => {
          if let Some(ob) = outbound {
            outbound_uuids.insert(ob.clone());
          }
        }
      }
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
  let mut processed_uuids = HashSet::new();
  let mut final_tag = String::new();

  while let Some(uuid) = work_queue.pop() {
    // Skip already-processed UUIDs to avoid duplicates
    if !processed_uuids.insert(uuid.clone()) {
      continue;
    }

    if is_outbound_group(&uuid).await? {
      let group = load_outbound_group(&uuid).await?;
      let group_tag = group.name.clone();

      // Store final tag if this is the final outbound
      if uuid == final_uuid {
        final_tag = group_tag.clone();
      }

      // Skip duplicate group tags
      if collected_tags.contains(&group_tag) {
        continue;
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
          let outbound_json = load_module_json_with_tag("outbounds", member_uuid).await?;
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

      // Store group with its member tags, mark tag as collected
      collected_tags.insert(group_tag);
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
      let outbound_json = load_module_json_with_tag("outbounds", &uuid).await?;
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

/// Filter out outbounds that are not referenced by any route rule, route final, or group
fn filter_unused_outbounds(outbounds: Value, route: &Value, final_tag: &str) -> Value {
  let outbounds_arr = match outbounds {
    Value::Array(arr) => arr,
    _ => return outbounds,
  };

  // Collect all referenced tags
  let mut referenced_tags = HashSet::new();

  // From route final
  if !final_tag.is_empty() {
    referenced_tags.insert(final_tag.to_string());
  }

  // From route rules
  if let Some(rules) = route.get("rules").and_then(|r| r.as_array()) {
    for rule in rules {
      if let Some(tag) = rule.get("outbound").and_then(|t| t.as_str()) {
        if !tag.is_empty() {
          referenced_tags.insert(tag.to_string());
        }
      }
    }
  }

  // From group outbounds (groups reference other outbounds by tag)
  for outbound in &outbounds_arr {
    if let Some(outbound_tags) = outbound.get("outbounds").and_then(|o| o.as_array()) {
      for tag_val in outbound_tags {
        if let Some(tag) = tag_val.as_str() {
          referenced_tags.insert(tag.to_string());
        }
      }
    }
  }

  // Filter: keep only outbounds whose tag is in the referenced set
  let filtered: Vec<Value> = outbounds_arr
    .into_iter()
    .filter(|outbound| {
      let tag = outbound.get("tag").and_then(|t| t.as_str()).unwrap_or("");
      if tag.is_empty() {
        log::warn!("Removing outbound with empty tag: {:?}", outbound);
        return false;
      }
      referenced_tags.contains(tag)
    })
    .collect();

  Value::Array(filtered)
}

/// Resolve an outbound UUID to its tag (outbound_group name or outbound tag)
async fn resolve_outbound_uuid_to_tag(uuid: &str) -> Result<String, AppError> {
  if is_outbound_group(uuid).await? {
    let group = load_outbound_group(uuid).await?;
    Ok(group.name)
  } else {
    let outbound = load_module_json_with_tag("outbounds", uuid).await?;
    Ok(
      outbound
        .get("tag")
        .and_then(|t| t.as_str())
        .unwrap_or("")
        .to_string(),
    )
  }
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

  // Resolve route rules if provided and non-empty
  let mut collected_rule_sets: Vec<Value> = Vec::new();
  let mut collected_rule_set_tags: HashSet<String> = HashSet::new();

  if let Some(rules) = &route.rules {
    if !rules.is_empty() {
      let mut route_rules = Vec::new();
      for rule in rules {
        match rule {
          crate::backend::api::config::RouteRuleDto::Ruleset { rulesets, outbound } => {
            let mut rule_obj = Map::new();

            // Resolve rulesets
            let mut rule_set_tags = Vec::new();
            for ruleset_uuid in rulesets {
              let ruleset = load_module_json_with_tag("rulesets", ruleset_uuid).await?;
              if let Some(tag) = ruleset.get("tag").and_then(|t| t.as_str()) {
                rule_set_tags.push(Value::String(tag.to_string()));

                // Collect rule_set definition (deduplicated)
                if !collected_rule_set_tags.contains(tag) {
                  collected_rule_set_tags.insert(tag.to_string());
                  collected_rule_sets.push(ruleset);
                }
              }
            }
            rule_obj.insert("rule_set".to_string(), Value::Array(rule_set_tags));

            // Resolve outbound tag
            let outbound_tag = resolve_outbound_uuid_to_tag(outbound).await?;

            // Skip rules with empty outbound tag
            if outbound_tag.is_empty() {
              log::warn!(
                "Skipping route rule with empty outbound tag for UUID: {}",
                outbound
              );
              continue;
            }

            rule_obj.insert("outbound".to_string(), Value::String(outbound_tag));
            route_rules.push(Value::Object(rule_obj));
          }
          crate::backend::api::config::RouteRuleDto::Rule {
            rule: rule_uuid,
            outbound,
          } => {
            // Load rule module JSON - it's a complete SingBox rule object
            let mut rule_obj_value = load_module_json("rules", rule_uuid).await?;

            // If outbound UUID is specified, resolve and override outbound in the rule
            if let Some(outbound_uuid) = outbound {
              let outbound_tag = resolve_outbound_uuid_to_tag(outbound_uuid).await?;
              if !outbound_tag.is_empty() {
                if let Some(obj) = rule_obj_value.as_object_mut() {
                  obj.insert("outbound".to_string(), Value::String(outbound_tag));
                }
              }
            }

            route_rules.push(rule_obj_value);
          }
        }
      }
      if !route_rules.is_empty() {
        route_config.insert("rules".to_string(), Value::Array(route_rules));
      }
    }
  }

  // Add rule_set definitions
  if !collected_rule_sets.is_empty() {
    route_config.insert("rule_set".to_string(), Value::Array(collected_rule_sets));
  }

  // Set final outbound tag (already resolved in resolve_outbounds_and_route)
  route_config.insert("final".to_string(), Value::String(final_tag.to_string()));

  // Set default_domain_resolver if provided
  if let Some(dns_server_uuid) = &route.default_domain_resolver {
    let dns_server = load_module_json("dns-server", dns_server_uuid).await?;
    // Use tag if available, otherwise fall back to name
    let resolver_tag = if let Some(tag) = dns_server.get("tag").and_then(|t| t.as_str()) {
      tag.to_string()
    } else if let Some(name) = dns_server.get("name").and_then(|n| n.as_str()) {
      name.to_string()
    } else {
      return Err(AppError::InternalServerError(
        "DNS server missing both tag and name".to_string(),
      ));
    };
    route_config.insert(
      "default_domain_resolver".to_string(),
      Value::String(resolver_tag),
    );
  }

  Ok(Value::Object(route_config))
}

/// Resolve download_detour UUID to its tag (outbound tag or outbound_group name)
async fn resolve_download_detour_tag(uuid: &str) -> Result<String, AppError> {
  let tag = resolve_outbound_uuid_to_tag(uuid).await?;
  if tag.is_empty() {
    return Err(AppError::InternalServerError(
      "download_detour outbound has no tag".to_string(),
    ));
  }
  Ok(tag)
}

/// Inject download_detour into remote rule_set entries within a config object (route or dns)
fn inject_download_detour_to_rule_sets(obj: &mut Map<String, Value>, download_detour_tag: &str) {
  if let Some(rule_sets) = obj.get_mut("rule_set").and_then(|v| v.as_array_mut()) {
    for rule_set in rule_sets {
      if let Some(rs_obj) = rule_set.as_object_mut() {
        if rs_obj.get("type").and_then(|t| t.as_str()) == Some("remote") {
          rs_obj.insert(
            "download_detour".to_string(),
            Value::String(download_detour_tag.to_string()),
          );
        }
      }
    }
  }
}

/// Sanitize filename for safe download
/// Keeps Unicode characters (including Chinese) but replaces filesystem-unsafe characters
fn sanitize_filename(name: &str) -> String {
  // Characters that are generally unsafe in filenames across platforms
  const UNSAFE_CHARS: &[char] = &['/', '\\', ':', '*', '?', '"', '<', '>', '|'];

  name
    .chars()
    .map(|c| if UNSAFE_CHARS.contains(&c) { '_' } else { c })
    .collect::<String>()
    .chars()
    .take(100) // Increased limit to accommodate Unicode characters
    .collect()
}
