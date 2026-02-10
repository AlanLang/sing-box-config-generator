use axum::{Json, http::StatusCode, response::IntoResponse};
use serde::{Deserialize, Serialize};
use std::path::Path;
use tokio::fs;

use crate::backend::error::AppError;

#[derive(Debug, Deserialize, Serialize)]
pub struct SubscribeCreateDto {
  pub uuid: String,
  pub name: String,
  pub json: String,
}

pub async fn create_subscribe(
  Json(payload): Json<SubscribeCreateDto>,
) -> Result<impl IntoResponse, AppError> {
  let file_name = format!("{}.json", payload.uuid);
  log::info!("Creating subscribe: {}", file_name);
  let dir_path = Path::new("./data/subscribes");
  let file_path = dir_path.join(&file_name);

  if !dir_path.exists() {
    fs::create_dir_all(dir_path).await?;
  }

  if file_path.exists() {
    return Ok(
      (
        StatusCode::CONFLICT,
        "Subscribe with this UUID already exists",
      )
        .into_response(),
    );
  }

  fs::write(file_path, serde_json::to_string(&payload)?.as_bytes()).await?;

  Ok((StatusCode::CREATED, "Subscribe created successfully").into_response())
}

#[derive(Debug, Serialize)]
pub struct SubscribeListDto {
  pub uuid: String,
  pub name: String,
  pub json: String,
}

pub async fn list_subscribes() -> Result<impl IntoResponse, AppError> {
  let dir_path = Path::new("./data/subscribes");
  if !dir_path.exists() {
    return Ok(Json(Vec::<SubscribeListDto>::new()));
  }

  let mut entries = fs::read_dir(dir_path).await?;
  let mut subscribes = Vec::new();

  while let Some(entry) = entries.next_entry().await? {
    let path = entry.path();
    if path.extension().and_then(|s| s.to_str()) == Some("json") {
      let content = fs::read_to_string(&path).await?;
      if let Ok(subscribe_dto) = serde_json::from_str::<SubscribeCreateDto>(&content) {
        subscribes.push(SubscribeListDto {
          uuid: subscribe_dto.uuid,
          name: subscribe_dto.name,
          json: subscribe_dto.json,
        });
      }
    }
  }

  Ok(Json(subscribes))
}

#[derive(Debug, Deserialize)]
pub struct SubscribeUpdateDto {
  pub uuid: String,
  pub name: String,
  pub json: String,
}

pub async fn update_subscribe(
  Json(payload): Json<SubscribeUpdateDto>,
) -> Result<impl IntoResponse, AppError> {
  let file_name = format!("{}.json", payload.uuid);
  let dir_path = Path::new("./data/subscribes");
  let file_path = dir_path.join(&file_name);

  if !file_path.exists() {
    return Ok((StatusCode::NOT_FOUND, "Subscribe not found").into_response());
  }

  let storage_dto = SubscribeCreateDto {
    uuid: payload.uuid,
    name: payload.name,
    json: payload.json,
  };

  fs::write(file_path, serde_json::to_string(&storage_dto)?.as_bytes()).await?;

  Ok((StatusCode::OK, "Subscribe updated successfully").into_response())
}

#[derive(Debug, Deserialize)]
pub struct SubscribeDeleteDto {
  pub uuid: String,
}

pub async fn delete_subscribe(
  axum::extract::Query(payload): axum::extract::Query<SubscribeDeleteDto>,
) -> Result<impl IntoResponse, AppError> {
  let file_name = format!("{}.json", payload.uuid);
  let dir_path = Path::new("./data/subscribes");
  let file_path = dir_path.join(&file_name);

  if !file_path.exists() {
    return Ok((StatusCode::NOT_FOUND, "Subscribe not found").into_response());
  }

  fs::remove_file(file_path).await?;

  Ok((StatusCode::OK, "Subscribe deleted successfully").into_response())
}

#[derive(Debug, Deserialize)]
pub struct SubscribeRefreshDto {
  pub uuid: String,
}

#[derive(Debug, Deserialize)]
struct SubscriptionMetadata {
  subscription_url: String,
  #[allow(dead_code)]
  website_url: Option<String>,
  #[allow(dead_code)]
  content: String,
  #[allow(dead_code)]
  last_updated: Option<String>,
  #[allow(dead_code)]
  enabled: Option<bool>,
}

pub async fn refresh_subscribe(
  axum::extract::Query(payload): axum::extract::Query<SubscribeRefreshDto>,
) -> Result<impl IntoResponse, AppError> {
  let file_name = format!("{}.json", payload.uuid);
  let dir_path = Path::new("./data/subscribes");
  let file_path = dir_path.join(&file_name);

  if !file_path.exists() {
    return Ok((StatusCode::NOT_FOUND, "Subscribe not found").into_response());
  }

  let content = fs::read_to_string(&file_path).await?;
  let mut subscribe_dto: SubscribeCreateDto = serde_json::from_str(&content)?;

  let metadata: SubscriptionMetadata = serde_json::from_str(&subscribe_dto.json)
    .map_err(|e| AppError::from(anyhow::anyhow!("Invalid subscription metadata: {}", e)))?;

  let client = reqwest::Client::builder()
    .timeout(std::time::Duration::from_secs(30))
    .build()
    .map_err(|e| AppError::from(anyhow::anyhow!("Failed to create HTTP client: {}", e)))?;

  let response = client
    .get(&metadata.subscription_url)
    .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
    .header("Accept", "*/*")
    .send()
    .await
    .map_err(|e| AppError::from(anyhow::anyhow!("Failed to fetch subscription: {}", e)))?;

  if !response.status().is_success() {
    return Ok(
      (
        StatusCode::BAD_GATEWAY,
        format!("Failed to fetch subscription: HTTP {}", response.status()),
      )
        .into_response(),
    );
  }

  let subscription_content = response.text().await.map_err(|e| {
    AppError::from(anyhow::anyhow!(
      "Failed to read subscription content: {}",
      e
    ))
  })?;

  let now = chrono::Utc::now().to_rfc3339();

  let updated_metadata = serde_json::json!({
    "subscription_url": metadata.subscription_url,
    "website_url": metadata.website_url,
    "content": subscription_content,
    "last_updated": now,
    "enabled": metadata.enabled.unwrap_or(true),
  });

  subscribe_dto.json = serde_json::to_string(&updated_metadata)?;

  fs::write(file_path, serde_json::to_string(&subscribe_dto)?.as_bytes()).await?;

  Ok((StatusCode::OK, "Subscribe refreshed successfully").into_response())
}

#[derive(Debug, Deserialize)]
pub struct SubscribeOutboundsDto {
  pub uuid: String,
}

/// Get all outbounds for a specific subscription
pub async fn get_subscribe_outbounds(
  axum::extract::Query(payload): axum::extract::Query<SubscribeOutboundsDto>,
) -> Result<impl IntoResponse, AppError> {
  let file_name = format!("{}.json", payload.uuid);
  let dir_path = Path::new("./data/subscribes");
  let file_path = dir_path.join(&file_name);

  if !file_path.exists() {
    return Ok((StatusCode::NOT_FOUND, Json(Vec::<serde_json::Value>::new())).into_response());
  }

  let content = fs::read_to_string(&file_path).await?;
  let subscribe_dto: SubscribeCreateDto = serde_json::from_str(&content)?;

  // Parse subscription metadata
  let metadata: serde_json::Value = serde_json::from_str(&subscribe_dto.json)
    .map_err(|e| AppError::from(anyhow::anyhow!("Invalid subscription metadata: {}", e)))?;

  // Get content and decode
  let outbounds = if let Some(content_str) = metadata.get("content").and_then(|c| c.as_str()) {
    if let Some(decoded_str) = decode_base64_content(content_str) {
      parse_subscription_content(&decoded_str)?
    } else {
      Vec::new()
    }
  } else {
    Vec::new()
  };

  Ok((StatusCode::OK, Json(outbounds)).into_response())
}

/// Decode base64-encoded subscription content (handles padded and unpadded base64)
fn decode_base64_content(content: &str) -> Option<String> {
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

/// Parse subscription content to outbound objects
fn parse_subscription_content(decoded_str: &str) -> Result<Vec<serde_json::Value>, AppError> {
  let mut outbounds = Vec::new();

  for line in decoded_str.lines() {
    let line = line.trim();
    if line.is_empty() {
      continue;
    }

    // Parse different formats and convert to sing-box outbound
    if let Ok(outbound) = parse_subscription_line(line) {
      outbounds.push(outbound);
    }
  }

  Ok(outbounds)
}

/// Parse a single subscription line to sing-box outbound format
fn parse_subscription_line(line: &str) -> Result<serde_json::Value, AppError> {
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
fn parse_shadowsocks(url: &str, tag: String) -> Result<serde_json::Value, AppError> {
  use serde_json::{Map, Value};

  let mut outbound = Map::new();
  outbound.insert("tag".to_string(), Value::String(tag));
  outbound.insert("type".to_string(), Value::String("shadowsocks".to_string()));

  let url = url.strip_prefix("ss://").unwrap_or(url);

  // Remove fragment (hash) part if present
  let url = url.split('#').next().unwrap_or(url);

  // Try SIP002 format: base64(method:password)@server:port
  if let Some(at_pos) = url.find('@') {
    let (encoded_part, server_part) = url.split_at(at_pos);
    let server_part = &server_part[1..];

    if let Ok(decoded) =
      base64::Engine::decode(&base64::engine::general_purpose::STANDARD, encoded_part)
    {
      if let Ok(decoded_str) = String::from_utf8(decoded) {
        if let Some((method, password)) = decoded_str.split_once(':') {
          outbound.insert("method".to_string(), Value::String(method.to_string()));
          outbound.insert("password".to_string(), Value::String(password.to_string()));

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
  }

  Err(AppError::InternalServerError(
    "Failed to parse Shadowsocks URL".to_string(),
  ))
}

/// Parse Trojan URL
fn parse_trojan(url: &str, tag: String) -> Result<serde_json::Value, AppError> {
  use serde_json::{Map, Value};

  let mut outbound = Map::new();
  outbound.insert("tag".to_string(), Value::String(tag));
  outbound.insert("type".to_string(), Value::String("trojan".to_string()));

  let url = url.strip_prefix("trojan://").unwrap_or(url);

  if let Some((password, server_part)) = url.split_once('@') {
    outbound.insert("password".to_string(), Value::String(password.to_string()));

    let server_part = server_part.split('?').next().unwrap_or(server_part);
    if let Some((server, port_str)) = server_part.split_once(':') {
      let port = port_str.parse::<u16>().unwrap_or(443);
      outbound.insert("server".to_string(), Value::String(server.to_string()));
      outbound.insert("server_port".to_string(), Value::Number(port.into()));

      let mut tls = Map::new();
      tls.insert("enabled".to_string(), Value::Bool(true));
      outbound.insert("tls".to_string(), Value::Object(tls));

      return Ok(Value::Object(outbound));
    }
  }

  Err(AppError::InternalServerError(
    "Failed to parse Trojan URL".to_string(),
  ))
}

/// Parse VMess URL (base64 JSON format)
fn parse_vmess(url: &str, tag: String) -> Result<serde_json::Value, AppError> {
  use serde_json::{Map, Value};

  let url = url.strip_prefix("vmess://").unwrap_or(url);

  let decoded = base64::Engine::decode(&base64::engine::general_purpose::STANDARD, url)
    .map_err(|_| AppError::InternalServerError("Failed to decode VMess URL".to_string()))?;

  let decoded_str = String::from_utf8(decoded)
    .map_err(|_| AppError::InternalServerError("Invalid UTF-8 in VMess URL".to_string()))?;

  let vmess_data: serde_json::Value = serde_json::from_str(&decoded_str)
    .map_err(|_| AppError::InternalServerError("Invalid VMess JSON".to_string()))?;

  let mut outbound = Map::new();
  outbound.insert("tag".to_string(), Value::String(tag));
  outbound.insert("type".to_string(), Value::String("vmess".to_string()));

  if let Some(server) = vmess_data.get("add").and_then(|v| v.as_str()) {
    outbound.insert("server".to_string(), Value::String(server.to_string()));
  }

  if let Some(port) = vmess_data.get("port").and_then(|v| v.as_u64()) {
    outbound.insert("server_port".to_string(), Value::Number(port.into()));
  }

  if let Some(uuid) = vmess_data.get("id").and_then(|v| v.as_str()) {
    outbound.insert("uuid".to_string(), Value::String(uuid.to_string()));
  }

  if let Some(alter_id) = vmess_data.get("aid").and_then(|v| v.as_u64()) {
    outbound.insert("alter_id".to_string(), Value::Number(alter_id.into()));
  }

  if let Some(security) = vmess_data.get("scy").and_then(|v| v.as_str()) {
    outbound.insert("security".to_string(), Value::String(security.to_string()));
  }

  // Handle TLS
  if let Some(tls_type) = vmess_data.get("tls").and_then(|v| v.as_str()) {
    if tls_type == "tls" {
      let mut tls = Map::new();
      tls.insert("enabled".to_string(), Value::Bool(true));
      if let Some(sni) = vmess_data.get("sni").and_then(|v| v.as_str()) {
        if !sni.is_empty() {
          tls.insert("server_name".to_string(), Value::String(sni.to_string()));
        }
      }
      outbound.insert("tls".to_string(), Value::Object(tls));
    }
  }

  // Handle transport (net field: tcp, ws, h2, grpc, etc.)
  if let Some(net) = vmess_data.get("net").and_then(|v| v.as_str()) {
    if net != "tcp" {
      let mut transport = Map::new();
      transport.insert("type".to_string(), Value::String(net.to_string()));

      // WebSocket specific fields
      if net == "ws" {
        if let Some(path) = vmess_data.get("path").and_then(|v| v.as_str()) {
          if !path.is_empty() {
            transport.insert("path".to_string(), Value::String(path.to_string()));
          }
        }
        if let Some(host) = vmess_data.get("host").and_then(|v| v.as_str()) {
          if !host.is_empty() {
            let mut headers = Map::new();
            headers.insert("Host".to_string(), Value::String(host.to_string()));
            transport.insert("headers".to_string(), Value::Object(headers));
          }
        }
      }
      // HTTP/2 specific fields
      else if net == "h2" {
        if let Some(path) = vmess_data.get("path").and_then(|v| v.as_str()) {
          if !path.is_empty() {
            transport.insert("path".to_string(), Value::String(path.to_string()));
          }
        }
        if let Some(host) = vmess_data.get("host").and_then(|v| v.as_str()) {
          if !host.is_empty() {
            let hosts: Vec<Value> = host
              .split(',')
              .map(|s| Value::String(s.trim().to_string()))
              .collect();
            transport.insert("host".to_string(), Value::Array(hosts));
          }
        }
      }
      // gRPC specific fields
      else if net == "grpc" {
        if let Some(path) = vmess_data.get("path").and_then(|v| v.as_str()) {
          if !path.is_empty() {
            transport.insert("service_name".to_string(), Value::String(path.to_string()));
          }
        }
      }

      outbound.insert("transport".to_string(), Value::Object(transport));
    }
  }

  Ok(Value::Object(outbound))
}

/// Parse VLESS URL
fn parse_vless(url: &str, tag: String) -> Result<serde_json::Value, AppError> {
  use serde_json::{Map, Value};
  use std::collections::HashMap;

  let mut outbound = Map::new();
  outbound.insert("tag".to_string(), Value::String(tag));
  outbound.insert("type".to_string(), Value::String("vless".to_string()));

  let url = url.strip_prefix("vless://").unwrap_or(url);

  // Split into user@server:port and query parameters
  let (main_part, query_part) = if let Some(pos) = url.find('?') {
    (&url[..pos], Some(&url[pos + 1..]))
  } else {
    (url, None)
  };

  // Parse user@server:port
  if let Some((uuid, server_part)) = main_part.split_once('@') {
    outbound.insert("uuid".to_string(), Value::String(uuid.to_string()));

    if let Some((server, port_str)) = server_part.split_once(':') {
      let port = port_str.parse::<u16>().unwrap_or(443);
      outbound.insert("server".to_string(), Value::String(server.to_string()));
      outbound.insert("server_port".to_string(), Value::Number(port.into()));
    }
  }

  // Parse query parameters
  if let Some(query) = query_part {
    let params: HashMap<String, String> = query
      .split('&')
      .filter_map(|pair| {
        let mut parts = pair.splitn(2, '=');
        Some((
          parts.next()?.to_string(),
          urlencoding::decode(parts.next()?).ok()?.to_string(),
        ))
      })
      .collect();

    // Handle flow parameter (XTLS)
    if let Some(flow) = params.get("flow") {
      outbound.insert("flow".to_string(), Value::String(flow.clone()));
    }

    // Handle network/type parameter
    if let Some(network) = params.get("type") {
      if network != "tcp" {
        let mut transport = Map::new();
        transport.insert("type".to_string(), Value::String(network.clone()));
        outbound.insert("transport".to_string(), Value::Object(transport));
      }
    }

    // Handle TLS configuration
    if let Some(security) = params.get("security") {
      match security.as_str() {
        "tls" => {
          let mut tls = Map::new();
          tls.insert("enabled".to_string(), Value::Bool(true));
          if let Some(sni) = params.get("sni") {
            tls.insert("server_name".to_string(), Value::String(sni.clone()));
          }
          if let Some(alpn) = params.get("alpn") {
            let alpn_list: Vec<Value> = alpn
              .split(',')
              .map(|s| Value::String(s.to_string()))
              .collect();
            tls.insert("alpn".to_string(), Value::Array(alpn_list));
          }
          outbound.insert("tls".to_string(), Value::Object(tls));
        }
        "reality" => {
          let mut tls = Map::new();
          tls.insert("enabled".to_string(), Value::Bool(true));
          if let Some(sni) = params.get("sni") {
            tls.insert("server_name".to_string(), Value::String(sni.clone()));
          }

          // Reality-specific configuration
          let mut reality = Map::new();
          reality.insert("enabled".to_string(), Value::Bool(true));
          if let Some(pbk) = params.get("pbk") {
            reality.insert("public_key".to_string(), Value::String(pbk.clone()));
          }
          if let Some(sid) = params.get("sid") {
            reality.insert("short_id".to_string(), Value::String(sid.clone()));
          }
          tls.insert("reality".to_string(), Value::Object(reality));

          // Handle utls/fingerprint
          if let Some(fp) = params.get("fp") {
            tls.insert(
              "utls".to_string(),
              Value::Object({
                let mut utls = Map::new();
                utls.insert("enabled".to_string(), Value::Bool(true));
                utls.insert("fingerprint".to_string(), Value::String(fp.clone()));
                utls
              }),
            );
          }

          outbound.insert("tls".to_string(), Value::Object(tls));
        }
        _ => {}
      }
    }
  }

  if outbound.contains_key("server") && outbound.contains_key("uuid") {
    Ok(Value::Object(outbound))
  } else {
    Err(AppError::InternalServerError(
      "Failed to parse VLESS URL".to_string(),
    ))
  }
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn test_parse_vless_with_reality() {
    // Real VLESS URL with XTLS Reality from "肯的机" subscription
    let url = "vless://501881ee-45f6-4290-8404-c01fc1582977@103.73.220.243:1007?encryption=none&flow=xtls-rprx-vision&security=reality&sni=www.apple.com&fp=chrome&pbk=WrMZntjC9XSbB9ooU7QhJrX_A25_p3vy5irci7I0QAQ&sid=6c4ef2d5&type=tcp&udp=1&tfo=1#HongKong%2001";
    let result = parse_vless(url, "HongKong 01".to_string());

    assert!(result.is_ok(), "Failed to parse VLESS URL");
    let outbound = result.unwrap();

    // Verify basic fields
    assert_eq!(outbound["type"], "vless");
    assert_eq!(outbound["tag"], "HongKong 01");
    assert_eq!(outbound["uuid"], "501881ee-45f6-4290-8404-c01fc1582977");
    assert_eq!(outbound["server"], "103.73.220.243");
    assert_eq!(outbound["server_port"], 1007);

    // Verify flow (XTLS)
    assert_eq!(outbound["flow"], "xtls-rprx-vision");

    // Verify TLS configuration
    assert!(outbound.get("tls").is_some(), "TLS configuration missing");
    let tls = &outbound["tls"];
    assert_eq!(tls["enabled"], true);
    assert_eq!(tls["server_name"], "www.apple.com");

    // Verify Reality configuration
    assert!(
      tls.get("reality").is_some(),
      "Reality configuration missing"
    );
    let reality = &tls["reality"];
    assert_eq!(reality["enabled"], true);
    assert_eq!(
      reality["public_key"],
      "WrMZntjC9XSbB9ooU7QhJrX_A25_p3vy5irci7I0QAQ"
    );
    assert_eq!(reality["short_id"], "6c4ef2d5");

    // Verify uTLS fingerprint
    assert!(tls.get("utls").is_some(), "uTLS configuration missing");
    let utls = &tls["utls"];
    assert_eq!(utls["enabled"], true);
    assert_eq!(utls["fingerprint"], "chrome");
  }

  #[test]
  fn test_parse_vless_with_standard_tls() {
    let url = "vless://uuid-test@example.com:443?security=tls&sni=example.com&alpn=h2,http/1.1&type=tcp#test-tag";
    let result = parse_vless(url, "test-tag".to_string());

    assert!(result.is_ok());
    let outbound = result.unwrap();

    assert_eq!(outbound["type"], "vless");
    assert_eq!(outbound["uuid"], "uuid-test");
    assert_eq!(outbound["server"], "example.com");
    assert_eq!(outbound["server_port"], 443);

    // Verify TLS
    let tls = &outbound["tls"];
    assert_eq!(tls["enabled"], true);
    assert_eq!(tls["server_name"], "example.com");

    // Verify ALPN
    assert!(tls.get("alpn").is_some());
    let alpn = tls["alpn"].as_array().unwrap();
    assert_eq!(alpn.len(), 2);
    assert_eq!(alpn[0], "h2");
    assert_eq!(alpn[1], "http/1.1");
  }

  #[test]
  fn test_parse_vless_without_tls() {
    let url = "vless://uuid-plain@192.168.1.1:8080?type=tcp#plain-tag";
    let result = parse_vless(url, "plain-tag".to_string());

    assert!(result.is_ok());
    let outbound = result.unwrap();

    assert_eq!(outbound["type"], "vless");
    assert_eq!(outbound["uuid"], "uuid-plain");
    assert_eq!(outbound["server"], "192.168.1.1");
    assert_eq!(outbound["server_port"], 8080);

    // TLS should not be present
    assert!(outbound.get("tls").is_none());
  }

  #[test]
  fn test_parse_vmess_with_tls_and_ws() {
    // VMess with TLS and WebSocket transport
    let vmess_json = r#"{
      "add": "example.com",
      "port": 443,
      "id": "test-uuid-vmess",
      "aid": 0,
      "scy": "auto",
      "tls": "tls",
      "sni": "example.com",
      "net": "ws",
      "path": "/vmess",
      "host": "example.com"
    }"#;

    let encoded = base64::Engine::encode(&base64::engine::general_purpose::STANDARD, vmess_json);
    let url = format!("vmess://{}", encoded);
    let result = parse_vmess(&url, "VMess Test".to_string());

    assert!(result.is_ok());
    let outbound = result.unwrap();

    assert_eq!(outbound["type"], "vmess");
    assert_eq!(outbound["server"], "example.com");
    assert_eq!(outbound["server_port"], 443);
    assert_eq!(outbound["uuid"], "test-uuid-vmess");
    assert_eq!(outbound["alter_id"], 0);
    assert_eq!(outbound["security"], "auto");

    // Verify TLS
    let tls = &outbound["tls"];
    assert_eq!(tls["enabled"], true);
    assert_eq!(tls["server_name"], "example.com");

    // Verify WebSocket transport
    let transport = &outbound["transport"];
    assert_eq!(transport["type"], "ws");
    assert_eq!(transport["path"], "/vmess");
    let headers = &transport["headers"];
    assert_eq!(headers["Host"], "example.com");
  }

  #[test]
  fn test_parse_vmess_with_h2() {
    // VMess with HTTP/2 transport
    let vmess_json = r#"{
      "add": "h2.example.com",
      "port": 443,
      "id": "test-uuid-h2",
      "aid": 0,
      "scy": "aes-128-gcm",
      "tls": "tls",
      "net": "h2",
      "path": "/h2path",
      "host": "host1.com,host2.com"
    }"#;

    let encoded = base64::Engine::encode(&base64::engine::general_purpose::STANDARD, vmess_json);
    let url = format!("vmess://{}", encoded);
    let result = parse_vmess(&url, "VMess H2".to_string());

    assert!(result.is_ok());
    let outbound = result.unwrap();

    // Verify HTTP/2 transport
    let transport = &outbound["transport"];
    assert_eq!(transport["type"], "h2");
    assert_eq!(transport["path"], "/h2path");

    let hosts = transport["host"].as_array().unwrap();
    assert_eq!(hosts.len(), 2);
    assert_eq!(hosts[0], "host1.com");
    assert_eq!(hosts[1], "host2.com");
  }

  #[test]
  fn test_parse_vmess_with_grpc() {
    // VMess with gRPC transport
    let vmess_json = r#"{
      "add": "grpc.example.com",
      "port": 443,
      "id": "test-uuid-grpc",
      "aid": 0,
      "tls": "tls",
      "net": "grpc",
      "path": "GunService"
    }"#;

    let encoded = base64::Engine::encode(&base64::engine::general_purpose::STANDARD, vmess_json);
    let url = format!("vmess://{}", encoded);
    let result = parse_vmess(&url, "VMess gRPC".to_string());

    assert!(result.is_ok());
    let outbound = result.unwrap();

    // Verify gRPC transport
    let transport = &outbound["transport"];
    assert_eq!(transport["type"], "grpc");
    assert_eq!(transport["service_name"], "GunService");
  }

  #[test]
  fn test_parse_trojan_with_tls() {
    let url = "trojan://password123@trojan.example.com:443?security=tls#Trojan%20Test";
    let result = parse_trojan(url, "Trojan Test".to_string());

    assert!(result.is_ok());
    let outbound = result.unwrap();

    assert_eq!(outbound["type"], "trojan");
    assert_eq!(outbound["password"], "password123");
    assert_eq!(outbound["server"], "trojan.example.com");
    assert_eq!(outbound["server_port"], 443);

    // Verify TLS is enabled
    let tls = &outbound["tls"];
    assert_eq!(tls["enabled"], true);
  }

  #[test]
  fn test_parse_shadowsocks() {
    // SIP002 format: ss://base64(method:password)@server:port
    let auth = "aes-256-gcm:mypassword";
    let encoded = base64::Engine::encode(&base64::engine::general_purpose::STANDARD, auth);
    let url = format!("ss://{}@ss.example.com:8388#Shadowsocks%20Test", encoded);
    let result = parse_shadowsocks(&url, "Shadowsocks Test".to_string());

    assert!(result.is_ok());
    let outbound = result.unwrap();

    assert_eq!(outbound["type"], "shadowsocks");
    assert_eq!(outbound["method"], "aes-256-gcm");
    assert_eq!(outbound["password"], "mypassword");
    assert_eq!(outbound["server"], "ss.example.com");
    assert_eq!(outbound["server_port"], 8388);
  }
}
