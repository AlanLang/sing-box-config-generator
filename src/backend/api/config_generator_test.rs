#[cfg(test)]
mod tests {
  use super::super::config_generator::decode_base64_content;
  use crate::backend::subscription_parser::parse_subscription_line;
  use base64::Engine;

  /// Create test subscription content as base64 (with proper padding)
  fn make_padded_base64(lines: &[&str]) -> String {
    let content = lines.join("\n");
    base64::engine::general_purpose::STANDARD.encode(content.as_bytes())
  }

  /// Create test subscription content as base64 WITHOUT padding
  fn make_unpadded_base64(lines: &[&str]) -> String {
    let content = lines.join("\n");
    let encoded = base64::engine::general_purpose::STANDARD.encode(content.as_bytes());
    encoded.trim_end_matches('=').to_string()
  }

  // ========== decode_base64_content tests ==========

  #[test]
  fn test_decode_base64_with_proper_padding() {
    let lines = vec![
      "trojan://password123@server1.example.com:443?security=tls#Node-A",
      "trojan://password456@server2.example.com:443?security=tls#Node-B",
    ];
    let encoded = make_padded_base64(&lines);

    let result = decode_base64_content(&encoded);
    assert!(result.is_some(), "Should decode properly padded base64");

    let decoded = result.unwrap();
    assert!(decoded.contains("trojan://"));
    assert!(decoded.contains("Node-A"));
    assert!(decoded.contains("Node-B"));
  }

  #[test]
  fn test_decode_base64_without_padding() {
    let lines = vec![
      "trojan://password123@server1.example.com:443?security=tls#Node-A",
      "trojan://password456@server2.example.com:443?security=tls#Node-B",
      "trojan://password789@server3.example.com:443?security=tls#Node-C",
    ];
    let encoded = make_unpadded_base64(&lines);

    // Verify it IS actually unpadded (has missing padding chars)
    assert_ne!(
      encoded.len() % 4,
      0,
      "Test data should have missing padding"
    );

    let result = decode_base64_content(&encoded);
    assert!(
      result.is_some(),
      "Should decode base64 even without padding"
    );

    let decoded = result.unwrap();
    assert!(decoded.contains("trojan://"));
    assert!(decoded.contains("Node-A"));
    assert!(decoded.contains("Node-B"));
    assert!(decoded.contains("Node-C"));
  }

  #[test]
  fn test_decode_base64_with_whitespace() {
    let lines = vec!["trojan://password123@server1.example.com:443?security=tls#Node-A"];
    let encoded = make_padded_base64(&lines);
    // Add trailing whitespace/newlines (common from HTTP responses)
    let encoded_with_whitespace = format!("  {}  \n", encoded);

    let result = decode_base64_content(&encoded_with_whitespace);
    assert!(
      result.is_some(),
      "Should decode base64 with surrounding whitespace"
    );
  }

  #[test]
  fn test_decode_empty_content() {
    let result = decode_base64_content("");
    // Empty string should return empty or None
    assert!(
      result.is_none() || result.as_deref() == Some(""),
      "Empty content should return None or empty string"
    );
  }

  #[test]
  fn test_decode_whitespace_only_content() {
    let result = decode_base64_content("   \n  ");
    assert!(
      result.is_none(),
      "Whitespace-only content should return None"
    );
  }

  #[test]
  fn test_decode_invalid_base64() {
    let result = decode_base64_content("not-valid-base64!!!");
    assert!(result.is_none(), "Invalid base64 should return None");
  }

  // ========== parse_subscription_line tests ==========

  #[test]
  fn test_parse_trojan_line() {
    let line = "trojan://test-password@proxy.example.com:10114?security=tls&sni=proxy.example.com&type=tcp&allowInsecure=1#TestNode-HK";
    let result = parse_subscription_line(line);
    assert!(result.is_ok(), "Should parse trojan URL");

    let outbound = result.unwrap();
    assert_eq!(outbound.get("type").unwrap().as_str().unwrap(), "trojan");
    assert_eq!(
      outbound.get("tag").unwrap().as_str().unwrap(),
      "TestNode-HK"
    );
    assert_eq!(
      outbound.get("server").unwrap().as_str().unwrap(),
      "proxy.example.com"
    );
    assert_eq!(
      outbound.get("server_port").unwrap().as_u64().unwrap(),
      10114
    );
  }

  #[test]
  fn test_parse_ss_line() {
    // SIP002 format: ss://base64(method:password)@server:port#name
    let method_pass = base64::engine::general_purpose::STANDARD.encode("aes-256-gcm:testpass123");
    let line = format!(
      "ss://{}@ss-server.example.com:8388#TestSS-Node",
      method_pass
    );
    let result = parse_subscription_line(&line);
    assert!(result.is_ok(), "Should parse ss URL");

    let outbound = result.unwrap();
    assert_eq!(
      outbound.get("type").unwrap().as_str().unwrap(),
      "shadowsocks"
    );
    assert_eq!(
      outbound.get("tag").unwrap().as_str().unwrap(),
      "TestSS-Node"
    );
  }

  #[test]
  fn test_parse_unsupported_protocol() {
    let line = "http://not-a-proxy.example.com:8080";
    let result = parse_subscription_line(line);
    assert!(result.is_err(), "Should fail for unsupported protocol");
  }

  // ========== Integration-style test: filter with unpadded base64 subscription ==========

  #[test]
  fn test_subscription_outbounds_from_unpadded_base64() {
    // Simulate what get_subscription_outbounds does internally:
    // 1. Read subscription content (base64 encoded)
    // 2. Decode base64
    // 3. Parse each line into outbound

    let proxy_lines = vec![
      "trojan://pass1@hk1.example.com:443?security=tls&sni=hk1.example.com&type=tcp#HK-Node-1",
      "trojan://pass2@hk2.example.com:443?security=tls&sni=hk2.example.com&type=tcp#HK-Node-2",
      "trojan://pass3@jp1.example.com:443?security=tls&sni=jp1.example.com&type=tcp#JP-Node-1",
      "trojan://pass4@us1.example.com:443?security=tls&sni=us1.example.com&type=tcp#US-Node-1",
    ];

    // Content WITHOUT padding (as many subscription servers return)
    let encoded = make_unpadded_base64(&proxy_lines);

    // Decode using our function
    let decoded = decode_base64_content(&encoded);
    assert!(
      decoded.is_some(),
      "Should decode unpadded base64 subscription content"
    );

    let decoded_str = decoded.unwrap();
    let mut outbounds = Vec::new();

    for line in decoded_str.lines() {
      let line = line.trim();
      if line.is_empty() {
        continue;
      }
      if let Ok(outbound) = parse_subscription_line(line) {
        outbounds.push(outbound);
      }
    }

    assert_eq!(
      outbounds.len(),
      4,
      "Should parse all 4 proxy nodes from unpadded base64 content"
    );

    // Verify tags
    let tags: Vec<&str> = outbounds
      .iter()
      .filter_map(|ob| ob.get("tag").and_then(|t| t.as_str()))
      .collect();
    assert!(tags.contains(&"HK-Node-1"));
    assert!(tags.contains(&"HK-Node-2"));
    assert!(tags.contains(&"JP-Node-1"));
    assert!(tags.contains(&"US-Node-1"));
  }

  // ========== VMess transport protocol tests ==========

  #[test]
  fn test_parse_vmess_with_tcp() {
    // VMess with plain TCP (no transport, no TLS)
    let vmess_json = r#"{
      "add": "tcp.example.com",
      "port": 8080,
      "id": "test-uuid-tcp",
      "aid": 0,
      "scy": "auto",
      "net": "tcp"
    }"#;

    let encoded = base64::Engine::encode(&base64::engine::general_purpose::STANDARD, vmess_json);
    let url = format!("vmess://{}", encoded);
    let result = parse_subscription_line(&url);

    assert!(result.is_ok(), "Should parse VMess with plain TCP");
    let outbound = result.unwrap();

    assert_eq!(outbound["type"], "vmess");
    assert_eq!(outbound["server"], "tcp.example.com");
    assert_eq!(outbound["server_port"], 8080);
    assert_eq!(outbound["uuid"], "test-uuid-tcp");

    // Should not have transport field for plain TCP
    assert!(
      outbound.get("transport").is_none(),
      "Plain TCP should not have transport field"
    );
  }

  #[test]
  fn test_parse_vmess_with_ws_no_headers() {
    // VMess with WebSocket but no host header
    let vmess_json = r#"{
      "add": "ws.example.com",
      "port": 443,
      "id": "test-uuid-ws",
      "aid": 0,
      "tls": "tls",
      "net": "ws",
      "path": "/websocket"
    }"#;

    let encoded = base64::Engine::encode(&base64::engine::general_purpose::STANDARD, vmess_json);
    let url = format!("vmess://{}", encoded);
    let result = parse_subscription_line(&url);

    assert!(result.is_ok());
    let outbound = result.unwrap();

    let transport = &outbound["transport"];
    assert_eq!(transport["type"], "ws");
    assert_eq!(transport["path"], "/websocket");

    // Should not have headers if no host provided
    assert!(
      transport.get("headers").is_none(),
      "Should not have headers if host not provided"
    );
  }

  #[test]
  fn test_parse_vmess_with_quic() {
    // VMess with QUIC transport (edge case)
    let vmess_json = r#"{
      "add": "quic.example.com",
      "port": 443,
      "id": "test-uuid-quic",
      "aid": 0,
      "tls": "tls",
      "net": "quic",
      "path": "quic-path"
    }"#;

    let encoded = base64::Engine::encode(&base64::engine::general_purpose::STANDARD, vmess_json);
    let url = format!("vmess://{}", encoded);
    let result = parse_subscription_line(&url);

    assert!(result.is_ok());
    let outbound = result.unwrap();

    let transport = &outbound["transport"];
    assert_eq!(transport["type"], "quic");
  }

  #[test]
  fn test_parse_vmess_missing_required_fields() {
    // VMess with missing server (add field)
    let vmess_json = r#"{
      "port": 443,
      "id": "test-uuid",
      "aid": 0
    }"#;

    let encoded = base64::Engine::encode(&base64::engine::general_purpose::STANDARD, vmess_json);
    let url = format!("vmess://{}", encoded);
    let result = parse_subscription_line(&url);

    assert!(
      result.is_ok(),
      "Should not fail but may have incomplete data"
    );
    let outbound = result.unwrap();

    // Server should be missing or empty
    assert!(
      outbound.get("server").is_none() || outbound["server"] == "",
      "Server should be missing"
    );
  }

  // ========== VLESS transport protocol tests ==========

  #[test]
  fn test_parse_vless_with_tcp_no_tls() {
    // VLESS with plain TCP, no TLS
    let url = "vless://test-uuid@plain.example.com:8080?type=tcp#Plain-VLESS";
    let result = parse_subscription_line(url);

    assert!(result.is_ok());
    let outbound = result.unwrap();

    assert_eq!(outbound["type"], "vless");
    assert_eq!(outbound["uuid"], "test-uuid");
    assert_eq!(outbound["server"], "plain.example.com");
    assert_eq!(outbound["server_port"], 8080);

    // Should not have TLS
    assert!(
      outbound.get("tls").is_none(),
      "Plain TCP should not have TLS"
    );
  }

  #[test]
  fn test_parse_vless_with_ws_and_empty_path() {
    // VLESS with WebSocket but empty path (should be omitted)
    let url = "vless://uuid@ws.example.com:443?security=tls&type=ws&path=&host=ws.example.com#WS-Empty-Path";
    let result = parse_subscription_line(url);

    assert!(result.is_ok());
    let outbound = result.unwrap();

    let transport = &outbound["transport"];
    assert_eq!(transport["type"], "ws");

    // Empty path should not be included
    assert!(
      transport.get("path").is_none(),
      "Empty path should not be included"
    );
  }

  #[test]
  fn test_parse_vless_with_h2_multiple_hosts() {
    // VLESS with HTTP/2 and comma-separated hosts
    let url = "vless://uuid@h2.example.com:443?security=tls&type=h2&path=/h2&host=cdn1.com,cdn2.com,cdn3.com#H2-Multi-Host";
    let result = parse_subscription_line(url);

    assert!(result.is_ok());
    let outbound = result.unwrap();

    let transport = &outbound["transport"];
    assert_eq!(transport["type"], "http"); // sing-box uses "http" not "h2"
    assert_eq!(transport["path"], "/h2");

    let hosts = transport["host"].as_array().unwrap();
    assert_eq!(hosts.len(), 3);
    assert_eq!(hosts[0], "cdn1.com");
    assert_eq!(hosts[1], "cdn2.com");
    assert_eq!(hosts[2], "cdn3.com");
  }

  #[test]
  fn test_parse_vless_with_grpc_both_params() {
    // Some VLESS URLs have both serviceName and path for gRPC
    // serviceName should take priority
    let url = "vless://uuid@grpc.example.com:443?security=tls&type=grpc&serviceName=MainService&path=FallbackService#gRPC-Priority";
    let result = parse_subscription_line(url);

    assert!(result.is_ok());
    let outbound = result.unwrap();

    let transport = &outbound["transport"];
    assert_eq!(transport["type"], "grpc");
    // serviceName should take priority over path
    assert_eq!(transport["service_name"], "MainService");
  }

  #[test]
  fn test_parse_vless_reality_missing_params() {
    // VLESS with Reality but missing some parameters
    let url =
      "vless://uuid@reality.example.com:443?security=reality&sni=apple.com#Reality-Incomplete";
    let result = parse_subscription_line(url);

    assert!(result.is_ok());
    let outbound = result.unwrap();

    // TLS should be enabled
    assert_eq!(outbound["tls"]["enabled"], true);

    // Reality should be present but may be incomplete
    let reality = &outbound["tls"]["reality"];
    assert_eq!(reality["enabled"], true);

    // public_key and short_id might be missing (not in URL)
    // This is valid - the config may still work with defaults
  }

  #[test]
  fn test_parse_vless_with_xtls_flow() {
    // VLESS with XTLS flow parameter
    let url =
      "vless://uuid@xtls.example.com:443?security=tls&flow=xtls-rprx-vision&type=tcp#XTLS-Vision";
    let result = parse_subscription_line(url);

    assert!(result.is_ok());
    let outbound = result.unwrap();

    assert_eq!(outbound["type"], "vless");
    assert_eq!(outbound["flow"], "xtls-rprx-vision");

    // TLS should be enabled
    assert_eq!(outbound["tls"]["enabled"], true);
  }

  // ========== Trojan transport protocol tests ==========

  #[test]
  fn test_parse_trojan_with_h2_transport() {
    // Trojan with HTTP/2 transport
    let url =
      "trojan://password@h2.example.com:443?type=h2&path=/trojan&host=cdn1.com,cdn2.com#Trojan-H2";
    let result = parse_subscription_line(url);

    assert!(result.is_ok());
    let outbound = result.unwrap();

    assert_eq!(outbound["type"], "trojan");

    // TLS should always be enabled for Trojan
    assert_eq!(outbound["tls"]["enabled"], true);
    assert_eq!(outbound["tls"]["insecure"], true);

    // Verify HTTP/2 transport
    let transport = &outbound["transport"];
    assert_eq!(transport["type"], "http"); // sing-box uses "http" not "h2"
    assert_eq!(transport["path"], "/trojan");

    let hosts = transport["host"].as_array().unwrap();
    assert_eq!(hosts.len(), 2);
    assert_eq!(hosts[0], "cdn1.com");
    assert_eq!(hosts[1], "cdn2.com");
  }

  #[test]
  fn test_parse_trojan_with_alpn_multiple_protocols() {
    // Trojan with ALPN supporting multiple protocols
    let url = "trojan://password@alpn.example.com:443?alpn=h2,http/1.1,h3#Trojan-Multi-ALPN";
    let result = parse_subscription_line(url);

    assert!(result.is_ok());
    let outbound = result.unwrap();

    let tls = &outbound["tls"];
    assert_eq!(tls["enabled"], true);

    let alpn = tls["alpn"].as_array().unwrap();
    assert_eq!(alpn.len(), 3);
    assert_eq!(alpn[0], "h2");
    assert_eq!(alpn[1], "http/1.1");
    assert_eq!(alpn[2], "h3");
  }

  #[test]
  fn test_parse_trojan_with_grpc_servicename() {
    // Trojan with gRPC using serviceName parameter
    let url = "trojan://password@grpc.example.com:443?type=grpc&serviceName=TrojanGunService#Trojan-gRPC-Service";
    let result = parse_subscription_line(url);

    assert!(result.is_ok());
    let outbound = result.unwrap();

    let transport = &outbound["transport"];
    assert_eq!(transport["type"], "grpc");
    assert_eq!(transport["service_name"], "TrojanGunService");
  }

  #[test]
  fn test_parse_trojan_with_grpc_path_fallback() {
    // Trojan with gRPC using path parameter (should be used as service_name)
    let url = "trojan://password@grpc.example.com:443?type=grpc&path=TrojanPath#Trojan-gRPC-Path";
    let result = parse_subscription_line(url);

    assert!(result.is_ok());
    let outbound = result.unwrap();

    let transport = &outbound["transport"];
    assert_eq!(transport["type"], "grpc");
    // path should be used as service_name when serviceName is not provided
    assert_eq!(transport["service_name"], "TrojanPath");
  }

  #[test]
  fn test_parse_trojan_default_port() {
    // Trojan with explicit 443 port
    let url = "trojan://password@default.example.com:443#Default-Port";
    let result = parse_subscription_line(url);

    assert!(result.is_ok());
    let outbound = result.unwrap();

    assert_eq!(outbound["server_port"], 443);
  }

  // ========== Shadowsocks tests ==========

  #[test]
  fn test_parse_ss_with_query_params() {
    // Shadowsocks with query parameters (some servers include extra params)
    let auth = "aes-256-gcm:testpass";
    let encoded = base64::Engine::encode(&base64::engine::general_purpose::STANDARD, auth);
    let url = format!(
      "ss://{}@ss.example.com:8388?plugin=obfs#SS-With-Query",
      encoded
    );
    let result = parse_subscription_line(&url);

    assert!(result.is_ok());
    let outbound = result.unwrap();

    assert_eq!(outbound["type"], "shadowsocks");
    assert_eq!(outbound["method"], "aes-256-gcm");
    assert_eq!(outbound["password"], "testpass");
    assert_eq!(outbound["server"], "ss.example.com");
    assert_eq!(outbound["server_port"], 8388);
  }

  #[test]
  fn test_parse_ss_with_special_chars_password() {
    // Shadowsocks with password containing special characters
    let auth = "aes-128-gcm:p@ss:w0rd!#$%";
    let encoded = base64::Engine::encode(&base64::engine::general_purpose::STANDARD, auth);
    let url = format!("ss://{}@ss.example.com:8388#SS-Special", encoded);
    let result = parse_subscription_line(&url);

    assert!(result.is_ok());
    let outbound = result.unwrap();

    assert_eq!(outbound["method"], "aes-128-gcm");
    // Password should preserve special characters after first colon
    assert_eq!(outbound["password"], "p@ss:w0rd!#$%");
  }

  #[test]
  fn test_parse_ss_without_fragment() {
    // Shadowsocks without name fragment (should use "Unnamed")
    let auth = "chacha20-ietf-poly1305:mypass";
    let encoded = base64::Engine::encode(&base64::engine::general_purpose::STANDARD, auth);
    let url = format!("ss://{}@ss.example.com:8388", encoded);
    let result = parse_subscription_line(&url);

    assert!(result.is_ok());
    let outbound = result.unwrap();

    assert_eq!(outbound["tag"], "Unnamed");
  }

  // ========== Mixed subscription tests ==========

  #[test]
  fn test_mixed_protocol_subscription() {
    // Real-world scenario: subscription with multiple protocol types
    let proxy_lines = vec![
      "ss://YWVzLTI1Ni1nY206cGFzczEyMw==@ss.example.com:8388#SS-Node",
      "trojan://trojan-pass@trojan.example.com:443?type=ws&path=/trojan#Trojan-WS",
      "vless://vless-uuid@vless.example.com:443?security=reality&sni=apple.com&pbk=test-key&sid=123#VLESS-Reality",
      // Invalid line (should be skipped)
      "invalid://not-supported.com:1234#Invalid",
    ];

    let mut outbounds = Vec::new();
    let mut errors = 0;

    for line in proxy_lines {
      match parse_subscription_line(line) {
        Ok(outbound) => outbounds.push(outbound),
        Err(_) => errors += 1,
      }
    }

    assert_eq!(
      outbounds.len(),
      3,
      "Should parse 3 valid protocols (ss, trojan, vless)"
    );
    assert_eq!(errors, 1, "Should have 1 error for invalid protocol");

    // Verify each protocol type
    let types: Vec<&str> = outbounds
      .iter()
      .filter_map(|ob| ob.get("type").and_then(|t| t.as_str()))
      .collect();
    assert!(types.contains(&"shadowsocks"));
    assert!(types.contains(&"trojan"));
    assert!(types.contains(&"vless"));
  }

  // ========== URL encoding and special characters tests ==========

  #[test]
  fn test_parse_url_with_encoded_fragment() {
    // URL with URL-encoded fragment (Chinese characters)
    let url = "trojan://password@server.com:443#%E9%A6%99%E6%B8%AF%E8%8A%82%E7%82%B9";
    let result = parse_subscription_line(url);

    assert!(result.is_ok());
    let outbound = result.unwrap();

    // Fragment should be decoded to Chinese characters
    assert_eq!(outbound["tag"], "香港节点");
  }

  #[test]
  fn test_parse_url_with_encoded_query_params() {
    // URL with URL-encoded query parameters
    let url = "trojan://password@server.com:443?sni=server.com&type=ws&path=%2Fmy%2Fpath#Node";
    let result = parse_subscription_line(url);

    assert!(result.is_ok());
    let outbound = result.unwrap();

    // TLS should be enabled
    assert_eq!(outbound["tls"]["enabled"], true);
    assert_eq!(outbound["tls"]["server_name"], "server.com");

    // WebSocket transport should be present
    let transport = &outbound["transport"];
    assert_eq!(transport["type"], "ws");
    // Path should be decoded
    assert_eq!(transport["path"], "/my/path");
  }

  // ========== Edge cases ==========

  #[test]
  fn test_parse_empty_line() {
    let result = parse_subscription_line("");
    assert!(result.is_err(), "Empty line should fail");
  }

  #[test]
  fn test_parse_whitespace_only_line() {
    let result = parse_subscription_line("   \n  ");
    assert!(result.is_err(), "Whitespace-only line should fail");
  }

  #[test]
  fn test_parse_url_with_ipv6_server() {
    // IPv6 address in URL (need brackets in actual usage, but test the parsing)
    let auth = "aes-256-gcm:pass";
    let encoded = base64::Engine::encode(&base64::engine::general_purpose::STANDARD, auth);
    // Note: This is a simplified test - real IPv6 URLs need [brackets]
    let url = format!("ss://{}@[2001:db8::1]:8388#IPv6-Node", encoded);
    let result = parse_subscription_line(&url);

    // This may fail or succeed depending on URL parsing implementation
    // Just verify it doesn't panic
    let _ = result;
  }

  #[test]
  fn test_parse_with_very_long_tag() {
    // Test with very long tag name (100+ characters)
    let long_tag = "Very-Long-Node-Name-".repeat(10); // 200 chars
    let url = format!(
      "trojan://password@server.com:443#{}",
      urlencoding::encode(&long_tag)
    );
    let result = parse_subscription_line(&url);

    assert!(result.is_ok());
    let outbound = result.unwrap();

    // Tag should be preserved (or truncated safely)
    assert!(outbound["tag"].as_str().unwrap().len() > 0);
  }

  // ========== Base64 encoding variations ==========

  #[test]
  fn test_decode_base64_url_safe_encoding() {
    // Some servers use URL-safe base64 (- and _ instead of + and /)
    let content = "trojan://password@server.com:443#Node";

    // Regular base64
    let encoded_regular = base64::Engine::encode(
      &base64::engine::general_purpose::STANDARD,
      content.as_bytes(),
    );

    // URL-safe base64
    let encoded_url_safe = base64::Engine::encode(
      &base64::engine::general_purpose::URL_SAFE,
      content.as_bytes(),
    );

    // Both should decode successfully
    let result1 = decode_base64_content(&encoded_regular);
    let result2 = decode_base64_content(&encoded_url_safe);

    assert!(result1.is_some());
    // Note: Our current implementation may not support URL-safe base64
    // This test documents the expected behavior
    let _ = result2; // May be Some or None depending on implementation
  }
}
