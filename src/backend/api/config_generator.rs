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
  for server_uuid in &dns.servers {
    let server = load_module_json("dns-server", server_uuid).await?;
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
  }

  Ok(all_outbounds)
}

/// Parse a single subscription line to sing-box outbound format
fn parse_subscription_line(line: &str) -> Result<Value, AppError> {
  let line = line.trim();

  // Extract tag/name from URL fragment
  let (url_part, tag) = if let Some(hash_pos) = line.rfind('#') {
    let fragment = &line[hash_pos + 1..];
    let decoded_tag = urlencoding::decode(fragment)
      .unwrap_or_else(|_| fragment.into())
      .to_string();
    (&line[..hash_pos], decoded_tag)
  } else {
    (line, "Unnamed".to_string())
  };

  // Parse protocol
  if url_part.starts_with("ss://") {
    parse_shadowsocks(url_part, tag)
  } else if url_part.starts_with("trojan://") {
    parse_trojan(url_part, tag)
  } else if url_part.starts_with("vmess://") {
    parse_vmess(url_part, tag)
  } else if url_part.starts_with("vless://") {
    parse_vless(url_part, tag)
  } else {
    Err(AppError::InternalServerError(format!(
      "Unsupported protocol: {}",
      line
    )))
  }
}

/// Parse Shadowsocks URL (SIP002 format)
/// Format: ss://base64(method:password)@server:port or ss://base64(method:password@server:port)
fn parse_shadowsocks(url: &str, tag: String) -> Result<Value, AppError> {
  let mut outbound = Map::new();
  // Field order: tag -> type -> other fields
  outbound.insert("tag".to_string(), Value::String(tag));
  outbound.insert("type".to_string(), Value::String("shadowsocks".to_string()));

  // Remove ss:// prefix
  let url = url.strip_prefix("ss://").unwrap_or(url);

  // Try SIP002 format first: base64(method:password)@server:port
  if let Some(at_pos) = url.find('@') {
    let (encoded_part, server_part) = url.split_at(at_pos);
    let server_part = &server_part[1..]; // Remove '@'

    // Decode base64 part
    if let Ok(decoded) =
      base64::Engine::decode(&base64::engine::general_purpose::STANDARD, encoded_part)
    {
      if let Ok(decoded_str) = String::from_utf8(decoded) {
        // Parse method:password
        if let Some((method, password)) = decoded_str.split_once(':') {
          outbound.insert("method".to_string(), Value::String(method.to_string()));
          outbound.insert("password".to_string(), Value::String(password.to_string()));

          // Parse server:port
          if let Some((server, port_str)) = server_part.split_once(':') {
            let port = port_str
              .split('?')
              .next()
              .unwrap_or(port_str)
              .parse::<u16>()
              .unwrap_or(443);
            outbound.insert("server".to_string(), Value::String(server.to_string()));
            outbound.insert("server_port".to_string(), Value::Number(port.into()));

            return Ok(Value::Object(outbound));
          }
        }
      }
    }
  } else {
    // Try old format: base64(method:password@server:port)
    if let Ok(decoded) = base64::Engine::decode(&base64::engine::general_purpose::STANDARD, url) {
      if let Ok(decoded_str) = String::from_utf8(decoded) {
        // Parse method:password@server:port
        if let Some((method_pass, server_port)) = decoded_str.split_once('@') {
          if let Some((method, password)) = method_pass.split_once(':') {
            outbound.insert("method".to_string(), Value::String(method.to_string()));
            outbound.insert("password".to_string(), Value::String(password.to_string()));

            if let Some((server, port_str)) = server_port.split_once(':') {
              let port = port_str.parse::<u16>().unwrap_or(443);
              outbound.insert("server".to_string(), Value::String(server.to_string()));
              outbound.insert("server_port".to_string(), Value::Number(port.into()));

              return Ok(Value::Object(outbound));
            }
          }
        }
      }
    }
  }

  // If parsing failed, return error
  Err(AppError::InternalServerError(
    "Failed to parse Shadowsocks URL".to_string(),
  ))
}

/// Parse Trojan URL
/// Format: trojan://password@server:port?params#tag
fn parse_trojan(url: &str, tag: String) -> Result<Value, AppError> {
  let mut outbound = Map::new();
  // Field order: tag -> type -> other fields
  outbound.insert("tag".to_string(), Value::String(tag));
  outbound.insert("type".to_string(), Value::String("trojan".to_string()));

  // Remove trojan:// prefix
  let url = url.strip_prefix("trojan://").unwrap_or(url);

  // Parse password@server:port?params
  if let Some((password, server_part)) = url.split_once('@') {
    outbound.insert("password".to_string(), Value::String(password.to_string()));

    // Parse server:port?params
    let server_part = server_part.split('?').next().unwrap_or(server_part);
    if let Some((server, port_str)) = server_part.split_once(':') {
      let port = port_str.parse::<u16>().unwrap_or(443);
      outbound.insert("server".to_string(), Value::String(server.to_string()));
      outbound.insert("server_port".to_string(), Value::Number(port.into()));

      // Parse query parameters for TLS settings
      if let Some(query_pos) = url.find('?') {
        let query = &url[query_pos + 1..];
        let mut tls_obj = Map::new();
        let mut needs_tls = false;

        for param in query.split('&') {
          if let Some((key, value)) = param.split_once('=') {
            match key {
              "sni" => {
                tls_obj.insert(
                  "server_name".to_string(),
                  Value::String(
                    urlencoding::decode(value)
                      .unwrap_or(value.into())
                      .to_string(),
                  ),
                );
                needs_tls = true;
              }
              "security" if value == "tls" => {
                needs_tls = true;
              }
              "alpn" => {
                let alpn_list: Vec<Value> = value
                  .split(',')
                  .map(|s| Value::String(s.to_string()))
                  .collect();
                tls_obj.insert("alpn".to_string(), Value::Array(alpn_list));
              }
              _ => {}
            }
          }
        }

        if needs_tls {
          tls_obj.insert("enabled".to_string(), Value::Bool(true));
          tls_obj.insert("insecure".to_string(), Value::Bool(true));
          outbound.insert("tls".to_string(), Value::Object(tls_obj));
        }
      }

      return Ok(Value::Object(outbound));
    }
  }

  Err(AppError::InternalServerError(
    "Failed to parse Trojan URL".to_string(),
  ))
}

/// Parse VMess URL
/// Format: vmess://base64(json_config)
fn parse_vmess(url: &str, tag: String) -> Result<Value, AppError> {
  let mut outbound = Map::new();
  // Field order: tag -> type -> other fields
  outbound.insert("tag".to_string(), Value::String(tag));
  outbound.insert("type".to_string(), Value::String("vmess".to_string()));

  // Remove vmess:// prefix
  let url = url.strip_prefix("vmess://").unwrap_or(url);

  // Decode base64
  if let Ok(decoded) = base64::Engine::decode(&base64::engine::general_purpose::STANDARD, url) {
    if let Ok(decoded_str) = String::from_utf8(decoded) {
      if let Ok(config) = serde_json::from_str::<Value>(&decoded_str) {
        // Extract standard fields
        if let Some(server) = config.get("add").and_then(|v| v.as_str()) {
          outbound.insert("server".to_string(), Value::String(server.to_string()));
        }
        if let Some(port) = config.get("port").and_then(|v| v.as_u64()) {
          outbound.insert("server_port".to_string(), Value::Number(port.into()));
        }
        if let Some(uuid) = config.get("id").and_then(|v| v.as_str()) {
          outbound.insert("uuid".to_string(), Value::String(uuid.to_string()));
        }
        if let Some(alter_id) = config.get("aid").and_then(|v| v.as_u64()) {
          outbound.insert("alter_id".to_string(), Value::Number(alter_id.into()));
        }
        if let Some(security) = config.get("scy").and_then(|v| v.as_str()) {
          outbound.insert("security".to_string(), Value::String(security.to_string()));
        } else {
          outbound.insert("security".to_string(), Value::String("auto".to_string()));
        }

        // Handle TLS
        if let Some(tls) = config.get("tls").and_then(|v| v.as_str()) {
          if tls == "tls" {
            let mut tls_obj = Map::new();
            tls_obj.insert("enabled".to_string(), Value::Bool(true));
            tls_obj.insert("insecure".to_string(), Value::Bool(true));
            if let Some(sni) = config.get("sni").and_then(|v| v.as_str()) {
              tls_obj.insert("server_name".to_string(), Value::String(sni.to_string()));
            } else if let Some(host) = config.get("host").and_then(|v| v.as_str()) {
              tls_obj.insert("server_name".to_string(), Value::String(host.to_string()));
            }
            outbound.insert("tls".to_string(), Value::Object(tls_obj));
          }
        }

        // Handle transport
        if let Some(net) = config.get("net").and_then(|v| v.as_str()) {
          let mut transport_obj = Map::new();
          transport_obj.insert("type".to_string(), Value::String(net.to_string()));

          match net {
            "ws" => {
              if let Some(path) = config.get("path").and_then(|v| v.as_str()) {
                transport_obj.insert("path".to_string(), Value::String(path.to_string()));
              }
              if let Some(host) = config.get("host").and_then(|v| v.as_str()) {
                let mut headers = Map::new();
                headers.insert("Host".to_string(), Value::String(host.to_string()));
                transport_obj.insert("headers".to_string(), Value::Object(headers));
              }
            }
            "grpc" => {
              if let Some(path) = config.get("path").and_then(|v| v.as_str()) {
                transport_obj.insert("service_name".to_string(), Value::String(path.to_string()));
              }
            }
            _ => {}
          }

          outbound.insert("transport".to_string(), Value::Object(transport_obj));
        }

        return Ok(Value::Object(outbound));
      }
    }
  }

  Err(AppError::InternalServerError(
    "Failed to parse VMess URL".to_string(),
  ))
}

/// Parse VLESS URL
/// Format: vless://uuid@server:port?params#tag
fn parse_vless(url: &str, tag: String) -> Result<Value, AppError> {
  let mut outbound = Map::new();
  // Field order: tag -> type -> other fields
  outbound.insert("tag".to_string(), Value::String(tag));
  outbound.insert("type".to_string(), Value::String("vless".to_string()));

  // Remove vless:// prefix
  let url = url.strip_prefix("vless://").unwrap_or(url);

  // Parse uuid@server:port?params
  if let Some((uuid, server_part)) = url.split_once('@') {
    outbound.insert("uuid".to_string(), Value::String(uuid.to_string()));

    // Parse server:port?params
    let server_part_clean = server_part.split('?').next().unwrap_or(server_part);
    if let Some((server, port_str)) = server_part_clean.split_once(':') {
      let port = port_str.parse::<u16>().unwrap_or(443);
      outbound.insert("server".to_string(), Value::String(server.to_string()));
      outbound.insert("server_port".to_string(), Value::Number(port.into()));

      // Parse query parameters
      if let Some(query_pos) = url.find('?') {
        let query = &url[query_pos + 1..];
        let mut tls_obj = Map::new();
        let mut transport_obj = Map::new();
        let mut needs_tls = false;

        for param in query.split('&') {
          if let Some((key, value)) = param.split_once('=') {
            let value = urlencoding::decode(value)
              .unwrap_or(value.into())
              .to_string();
            match key {
              "encryption" => {
                outbound.insert("flow".to_string(), Value::String(value));
              }
              "flow" => {
                outbound.insert("flow".to_string(), Value::String(value));
              }
              "security" => {
                if value == "tls" || value == "reality" {
                  needs_tls = true;
                  tls_obj.insert("enabled".to_string(), Value::Bool(true));
                  tls_obj.insert("insecure".to_string(), Value::Bool(true));
                }
              }
              "sni" => {
                tls_obj.insert("server_name".to_string(), Value::String(value));
              }
              "alpn" => {
                let alpn_list: Vec<Value> = value
                  .split(',')
                  .map(|s| Value::String(s.to_string()))
                  .collect();
                tls_obj.insert("alpn".to_string(), Value::Array(alpn_list));
              }
              "type" => {
                transport_obj.insert("type".to_string(), Value::String(value));
              }
              "path" => {
                transport_obj.insert("path".to_string(), Value::String(value));
              }
              "host" => {
                let mut headers = Map::new();
                headers.insert("Host".to_string(), Value::String(value));
                transport_obj.insert("headers".to_string(), Value::Object(headers));
              }
              "serviceName" => {
                transport_obj.insert("service_name".to_string(), Value::String(value));
              }
              _ => {}
            }
          }
        }

        if needs_tls && !tls_obj.is_empty() {
          outbound.insert("tls".to_string(), Value::Object(tls_obj));
        }
        if !transport_obj.is_empty() {
          outbound.insert("transport".to_string(), Value::Object(transport_obj));
        }
      }

      return Ok(Value::Object(outbound));
    }
  }

  Err(AppError::InternalServerError(
    "Failed to parse VLESS URL".to_string(),
  ))
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
        let mut rule_obj = Map::new();

        // Resolve rulesets
        let mut rule_set_tags = Vec::new();
        for ruleset_uuid in &rule.rulesets {
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
        let outbound_tag = if is_outbound_group(&rule.outbound).await? {
          let group = load_outbound_group(&rule.outbound).await?;
          group.name.clone()
        } else {
          let outbound = load_module_json_with_tag("outbounds", &rule.outbound).await?;
          outbound
            .get("tag")
            .and_then(|t| t.as_str())
            .unwrap_or("")
            .to_string()
        };

        // Skip rules with empty outbound tag (outbound has no valid tag)
        if outbound_tag.is_empty() {
          log::warn!(
            "Skipping route rule with empty outbound tag for UUID: {}",
            rule.outbound
          );
          continue;
        }

        rule_obj.insert("outbound".to_string(), Value::String(outbound_tag));

        route_rules.push(Value::Object(rule_obj));
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
  if is_outbound_group(uuid).await? {
    let group = load_outbound_group(uuid).await?;
    Ok(group.name)
  } else {
    let outbound = load_module_json_with_tag("outbounds", uuid).await?;
    outbound
      .get("tag")
      .and_then(|t| t.as_str())
      .map(|s| s.to_string())
      .ok_or_else(|| {
        AppError::InternalServerError("download_detour outbound has no tag".to_string())
      })
  }
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
