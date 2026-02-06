#[cfg(test)]
mod tests {
  use super::super::outbound_group::OutboundGroupCreateDto;
  use serde_json;

  #[test]
  fn test_skip_none_serialization() {
    // Test selector type with minimal fields
    let selector = OutboundGroupCreateDto {
      uuid: "test-uuid".to_string(),
      name: "test-selector".to_string(),
      group_type: "selector".to_string(),
      outbounds: vec!["out1".to_string(), "out2".to_string()],
      default: Some("out1".to_string()),
      url: None,
      interval: None,
      tolerance: None,
      idle_timeout: None,
      interrupt_exist_connections: Some(false),
    };

    let json = serde_json::to_string_pretty(&selector).unwrap();
    println!("Selector JSON:\n{}", json);

    // Verify None fields are not serialized
    assert!(!json.contains("\"url\""));
    assert!(!json.contains("\"interval\""));
    assert!(!json.contains("\"tolerance\""));
    assert!(!json.contains("\"idle_timeout\""));

    // Verify Some fields are serialized
    assert!(json.contains("\"default\""));
    assert!(json.contains("\"interrupt_exist_connections\""));
  }

  #[test]
  fn test_urltest_serialization() {
    // Test urltest type with all fields
    let urltest = OutboundGroupCreateDto {
      uuid: "test-uuid-2".to_string(),
      name: "test-urltest".to_string(),
      group_type: "urltest".to_string(),
      outbounds: vec!["out1".to_string(), "out2".to_string()],
      default: None,
      url: Some("https://www.gstatic.com/generate_204".to_string()),
      interval: Some("3m".to_string()),
      tolerance: Some(50),
      idle_timeout: Some("30m".to_string()),
      interrupt_exist_connections: Some(false),
    };

    let json = serde_json::to_string_pretty(&urltest).unwrap();
    println!("URLTest JSON:\n{}", json);

    // Verify None fields are not serialized
    assert!(!json.contains("\"default\""));

    // Verify Some fields are serialized
    assert!(json.contains("\"url\""));
    assert!(json.contains("\"interval\""));
    assert!(json.contains("\"tolerance\""));
    assert!(json.contains("\"idle_timeout\""));
  }

  #[test]
  fn test_all_none_optional_fields() {
    // Test with all optional fields as None
    let minimal = OutboundGroupCreateDto {
      uuid: "test-uuid-3".to_string(),
      name: "minimal".to_string(),
      group_type: "selector".to_string(),
      outbounds: vec!["out1".to_string()],
      default: None,
      url: None,
      interval: None,
      tolerance: None,
      idle_timeout: None,
      interrupt_exist_connections: None,
    };

    let json = serde_json::to_string_pretty(&minimal).unwrap();
    println!("Minimal JSON:\n{}", json);

    // Verify no optional fields are serialized
    assert!(!json.contains("\"default\""));
    assert!(!json.contains("\"url\""));
    assert!(!json.contains("\"interval\""));
    assert!(!json.contains("\"tolerance\""));
    assert!(!json.contains("\"idle_timeout\""));
    assert!(!json.contains("\"interrupt_exist_connections\""));

    // Verify required fields are serialized
    assert!(json.contains("\"uuid\""));
    assert!(json.contains("\"name\""));
    assert!(json.contains("\"group_type\""));
    assert!(json.contains("\"outbounds\""));
  }
}
