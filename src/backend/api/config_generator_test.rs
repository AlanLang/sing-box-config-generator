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
}
