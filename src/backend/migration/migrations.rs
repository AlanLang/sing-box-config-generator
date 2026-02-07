use anyhow::Result;
use serde_json::Value;

/// v0 → v1: Normalize existing config data
///
/// - Add `ext_config` with default `download_detour: ""` if missing
/// - Add `type: "ruleset"` to route rules that have `rulesets` field but no `type`
pub fn migrate_v0_to_v1(data: &mut Value) -> Result<()> {
  // 1. Add ext_config if missing
  if data.get("ext_config").is_none() {
    data["ext_config"] = serde_json::json!({
        "download_detour": ""
    });
  }

  // 2. Normalize route.rules: add type field
  if let Some(route) = data.get_mut("route") {
    if let Some(rules) = route.get_mut("rules").and_then(|r| r.as_array_mut()) {
      for rule in rules.iter_mut() {
        if let Some(obj) = rule.as_object_mut() {
          if obj.get("type").is_none() {
            if obj.contains_key("rulesets") {
              obj.insert("type".to_string(), Value::String("ruleset".to_string()));
            }
          }
        }
      }
    }
  }

  Ok(())
}

#[cfg(test)]
mod tests {
  use super::*;
  use serde_json::json;

  #[test]
  fn test_migrate_v0_to_v1_adds_ext_config() {
    let mut data = json!({
        "uuid": "test",
        "name": "test",
        "dns": {"servers": [], "final": "a"},
        "route": {"rules": [], "final": "b"}
    });

    migrate_v0_to_v1(&mut data).unwrap();

    assert_eq!(data["ext_config"], json!({"download_detour": ""}));
  }

  #[test]
  fn test_migrate_v0_to_v1_preserves_existing_ext_config() {
    let mut data = json!({
        "uuid": "test",
        "ext_config": {"download_detour": "proxy"},
        "dns": {"servers": [], "final": "a"},
        "route": {"rules": [], "final": "b"}
    });

    migrate_v0_to_v1(&mut data).unwrap();

    assert_eq!(data["ext_config"]["download_detour"], "proxy");
  }

  #[test]
  fn test_migrate_v0_to_v1_adds_route_rule_type() {
    let mut data = json!({
        "uuid": "test",
        "route": {
            "rules": [
                {"rulesets": ["a", "b"], "outbound": "c"},
                {"type": "rule", "rule": "x", "outbound": "y"}
            ],
            "final": "d"
        },
        "dns": {"servers": [], "final": "a"}
    });

    migrate_v0_to_v1(&mut data).unwrap();

    assert_eq!(data["route"]["rules"][0]["type"], "ruleset");
    assert_eq!(data["route"]["rules"][1]["type"], "rule");
  }

  #[test]
  fn test_migrate_v0_to_v1_leaves_optional_fields_absent() {
    let mut data = json!({
        "uuid": "test",
        "route": {"rules": [], "final": "b"},
        "dns": {
            "servers": [
                {"uuid": "s1"},
                {"uuid": "s2", "detour": "proxy"}
            ],
            "final": "a"
        }
    });

    migrate_v0_to_v1(&mut data).unwrap();

    // Optional fields should remain absent, not set to null
    assert!(data["route"].get("default_domain_resolver").is_none());
    assert!(data["dns"]["servers"][0].get("detour").is_none());
    // Existing values should be preserved
    assert_eq!(data["dns"]["servers"][1]["detour"], "proxy");
  }
}
