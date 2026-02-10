/// Shared subscription parsing module
/// Provides parsing functions for various proxy protocols (Shadowsocks, Trojan, VMess, VLESS)
/// to be used by both subscribe.rs and config_generator.rs
use crate::backend::error::AppError;
use serde_json::{Map, Value};
use std::collections::HashMap;

/// Parse a single subscription line to sing-box outbound format
pub fn parse_subscription_line(line: &str) -> Result<Value, AppError> {
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
fn parse_shadowsocks(url: &str, tag: String) -> Result<Value, AppError> {
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
fn parse_trojan(url: &str, tag: String) -> Result<Value, AppError> {
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
fn parse_vmess(url: &str, tag: String) -> Result<Value, AppError> {
  let url = url.strip_prefix("vmess://").unwrap_or(url);

  let decoded = base64::Engine::decode(&base64::engine::general_purpose::STANDARD, url)
    .map_err(|_| AppError::InternalServerError("Failed to decode VMess URL".to_string()))?;

  let decoded_str = String::from_utf8(decoded)
    .map_err(|_| AppError::InternalServerError("Invalid UTF-8 in VMess URL".to_string()))?;

  let vmess_data: Value = serde_json::from_str(&decoded_str)
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
      // Map V2Ray transport types to sing-box transport types
      // V2Ray uses "h2" for HTTP/2, but sing-box uses "http"
      let transport_type = if net == "h2" { "http" } else { net };
      transport.insert(
        "type".to_string(),
        Value::String(transport_type.to_string()),
      );

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
fn parse_vless(url: &str, tag: String) -> Result<Value, AppError> {
  let mut outbound = Map::new();
  outbound.insert("tag".to_string(), Value::String(tag));
  outbound.insert("type".to_string(), Value::String("vless".to_string()));

  let url = url.strip_prefix("vless://").unwrap_or(url);

  // Split into user@server:port and query parameters
  let (main_part, query_part) = if let Some(pos) = url.find('?') {
    let query_with_fragment = &url[pos + 1..];
    // Remove fragment (#...) from query string
    let query_only = query_with_fragment
      .split('#')
      .next()
      .unwrap_or(query_with_fragment);
    (&url[..pos], Some(query_only))
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

    // Handle network/type parameter (transport)
    if let Some(network) = params.get("type") {
      if network != "tcp" {
        let mut transport = Map::new();
        // Map V2Ray transport types to sing-box transport types
        // V2Ray uses "h2" for HTTP/2, but sing-box uses "http"
        let transport_type = if network == "h2" {
          "http"
        } else {
          network.as_str()
        };
        transport.insert(
          "type".to_string(),
          Value::String(transport_type.to_string()),
        );

        // WebSocket specific fields
        if network == "ws" {
          if let Some(path) = params.get("path") {
            if !path.is_empty() {
              transport.insert("path".to_string(), Value::String(path.clone()));
            }
          }
          if let Some(host) = params.get("host") {
            if !host.is_empty() {
              let mut headers = Map::new();
              headers.insert("Host".to_string(), Value::String(host.clone()));
              transport.insert("headers".to_string(), Value::Object(headers));
            }
          }
        }
        // HTTP/2 specific fields
        else if network == "h2" {
          if let Some(path) = params.get("path") {
            if !path.is_empty() {
              transport.insert("path".to_string(), Value::String(path.clone()));
            }
          }
          if let Some(host) = params.get("host") {
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
        else if network == "grpc" {
          if let Some(service_name) = params.get("serviceName") {
            if !service_name.is_empty() {
              transport.insert(
                "service_name".to_string(),
                Value::String(service_name.clone()),
              );
            }
          }
          // Some VLESS URLs use "path" instead of "serviceName" for gRPC
          else if let Some(path) = params.get("path") {
            if !path.is_empty() {
              transport.insert("service_name".to_string(), Value::String(path.clone()));
            }
          }
        }

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
    assert_eq!(transport["type"], "http"); // sing-box uses "http" for HTTP/2, not "h2"
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

  #[test]
  fn test_parse_vless_with_websocket() {
    // VLESS with WebSocket transport
    let url = "vless://uuid-ws@example.com:443?security=tls&sni=example.com&type=ws&path=/ws&host=example.com#VLESS-WS";
    let result = parse_vless(url, "VLESS-WS".to_string());

    assert!(result.is_ok());
    let outbound = result.unwrap();

    assert_eq!(outbound["type"], "vless");
    assert_eq!(outbound["uuid"], "uuid-ws");
    assert_eq!(outbound["server"], "example.com");
    assert_eq!(outbound["server_port"], 443);

    // Verify TLS
    let tls = &outbound["tls"];
    assert_eq!(tls["enabled"], true);
    assert_eq!(tls["server_name"], "example.com");

    // Verify WebSocket transport
    assert!(
      outbound.get("transport").is_some(),
      "WebSocket transport missing"
    );
    let transport = &outbound["transport"];
    assert_eq!(transport["type"], "ws");
    assert_eq!(transport["path"], "/ws");

    // Verify WebSocket headers
    assert!(
      transport.get("headers").is_some(),
      "WebSocket headers missing"
    );
    let headers = &transport["headers"];
    assert_eq!(headers["Host"], "example.com");
  }

  #[test]
  fn test_parse_vless_with_http2() {
    // VLESS with HTTP/2 transport
    let url = "vless://uuid-h2@example.com:443?security=tls&type=h2&path=/h2path&host=host1.com,host2.com#VLESS-H2";
    let result = parse_vless(url, "VLESS-H2".to_string());

    assert!(result.is_ok());
    let outbound = result.unwrap();

    assert_eq!(outbound["type"], "vless");

    // Verify HTTP/2 transport
    assert!(
      outbound.get("transport").is_some(),
      "HTTP/2 transport missing"
    );
    let transport = &outbound["transport"];
    assert_eq!(transport["type"], "http"); // sing-box uses "http" for HTTP/2, not "h2"
    assert_eq!(transport["path"], "/h2path");

    // Verify hosts array
    assert!(transport.get("host").is_some(), "HTTP/2 host missing");
    let hosts = transport["host"].as_array().unwrap();
    assert_eq!(hosts.len(), 2);
    assert_eq!(hosts[0], "host1.com");
    assert_eq!(hosts[1], "host2.com");
  }

  #[test]
  fn test_parse_vless_with_grpc() {
    // VLESS with gRPC transport
    let url =
      "vless://uuid-grpc@example.com:443?security=tls&type=grpc&serviceName=GunService#VLESS-gRPC";
    let result = parse_vless(url, "VLESS-gRPC".to_string());

    assert!(result.is_ok());
    let outbound = result.unwrap();

    assert_eq!(outbound["type"], "vless");

    // Verify gRPC transport
    assert!(
      outbound.get("transport").is_some(),
      "gRPC transport missing"
    );
    let transport = &outbound["transport"];
    assert_eq!(transport["type"], "grpc");
    assert_eq!(transport["service_name"], "GunService");
  }

  #[test]
  fn test_parse_vless_with_grpc_path_fallback() {
    // Some VLESS URLs use "path" instead of "serviceName" for gRPC
    let url =
      "vless://uuid-grpc@example.com:443?security=tls&type=grpc&path=GunService#VLESS-gRPC-Path";
    let result = parse_vless(url, "VLESS-gRPC-Path".to_string());

    assert!(result.is_ok());
    let outbound = result.unwrap();

    // Verify gRPC uses path as service_name
    let transport = &outbound["transport"];
    assert_eq!(transport["type"], "grpc");
    assert_eq!(transport["service_name"], "GunService");
  }
}
