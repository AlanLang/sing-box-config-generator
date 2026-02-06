use axum::{Json, http::StatusCode, response::IntoResponse};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

const DATA_DIR: &str = "./data";
const OUTBOUND_GROUP_FILE: &str = "./data/outbound_groups.json";
const OUTBOUND_DIR: &str = "./data/outbounds";
const FILTER_DIR: &str = "./data/filters";

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct OutboundGroupCreateDto {
  pub uuid: String,
  pub name: String,
  pub group_type: String,
  pub outbounds: Vec<String>,
  #[serde(skip_serializing_if = "Option::is_none")]
  pub url: Option<String>,
  #[serde(skip_serializing_if = "Option::is_none")]
  pub interval: Option<String>,
  #[serde(skip_serializing_if = "Option::is_none")]
  pub tolerance: Option<u32>,
  #[serde(skip_serializing_if = "Option::is_none")]
  pub idle_timeout: Option<String>,
  #[serde(skip_serializing_if = "Option::is_none")]
  pub interrupt_exist_connections: Option<bool>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct OutboundGroupList {
  pub groups: Vec<OutboundGroupCreateDto>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateQuery {
  pub uuid: String,
}

#[derive(Debug, Deserialize)]
pub struct DeleteQuery {
  pub uuid: String,
}

#[derive(Debug, Deserialize)]
pub struct ReorderDto {
  pub uuids: Vec<String>,
}

// Helper function to read the groups list
fn read_groups_list() -> Result<OutboundGroupList, String> {
  if !PathBuf::from(OUTBOUND_GROUP_FILE).exists() {
    return Ok(OutboundGroupList { groups: Vec::new() });
  }

  let content = fs::read_to_string(OUTBOUND_GROUP_FILE)
    .map_err(|e| format!("Failed to read outbound groups file: {}", e))?;

  let list: OutboundGroupList = serde_json::from_str(&content)
    .map_err(|e| format!("Failed to parse outbound groups file: {}", e))?;

  Ok(list)
}

// Helper function to write the groups list
fn write_groups_list(list: &OutboundGroupList) -> Result<(), String> {
  // Ensure data directory exists
  fs::create_dir_all(DATA_DIR).map_err(|e| format!("Failed to create data directory: {}", e))?;

  let json_content = serde_json::to_string_pretty(list)
    .map_err(|e| format!("Failed to serialize outbound groups: {}", e))?;

  fs::write(OUTBOUND_GROUP_FILE, json_content)
    .map_err(|e| format!("Failed to write outbound groups file: {}", e))?;

  Ok(())
}

#[derive(Debug, Serialize)]
pub struct OutboundOptionDto {
  pub uuid: String,
  pub value: String,
  pub label: String,
  pub source: String,
  #[serde(rename = "type")]
  pub option_type: Option<String>,
}

pub async fn create_outbound_group(
  Json(payload): Json<OutboundGroupCreateDto>,
) -> impl IntoResponse {
  // Read existing groups
  let mut list = match read_groups_list() {
    Ok(list) => list,
    Err(e) => {
      eprintln!("{}", e);
      return (StatusCode::INTERNAL_SERVER_ERROR, e).into_response();
    }
  };

  // Check if UUID already exists
  if list.groups.iter().any(|g| g.uuid == payload.uuid) {
    return (
      StatusCode::CONFLICT,
      "Outbound group with this UUID already exists",
    )
      .into_response();
  }

  // Add new group
  list.groups.push(payload.clone());

  // Write back
  if let Err(e) = write_groups_list(&list) {
    eprintln!("{}", e);
    return (StatusCode::INTERNAL_SERVER_ERROR, e).into_response();
  }

  (StatusCode::CREATED, Json(payload)).into_response()
}

pub async fn list_outbound_groups() -> impl IntoResponse {
  let list = match read_groups_list() {
    Ok(list) => list,
    Err(_) => OutboundGroupList { groups: Vec::new() },
  };

  (StatusCode::OK, Json(list.groups)).into_response()
}

pub async fn update_outbound_group(
  axum::extract::Query(query): axum::extract::Query<UpdateQuery>,
  Json(payload): Json<OutboundGroupCreateDto>,
) -> impl IntoResponse {
  // Read existing groups
  let mut list = match read_groups_list() {
    Ok(list) => list,
    Err(e) => {
      eprintln!("{}", e);
      return (StatusCode::INTERNAL_SERVER_ERROR, e).into_response();
    }
  };

  // Find and update the group
  let group_index = list.groups.iter().position(|g| g.uuid == query.uuid);

  match group_index {
    Some(index) => {
      list.groups[index] = payload.clone();

      // Write back
      if let Err(e) = write_groups_list(&list) {
        eprintln!("{}", e);
        return (StatusCode::INTERNAL_SERVER_ERROR, e).into_response();
      }

      (StatusCode::OK, Json(payload)).into_response()
    }
    None => (StatusCode::NOT_FOUND, "Outbound group not found").into_response(),
  }
}

pub async fn delete_outbound_group(
  axum::extract::Query(query): axum::extract::Query<DeleteQuery>,
) -> impl IntoResponse {
  // Read existing groups
  let mut list = match read_groups_list() {
    Ok(list) => list,
    Err(e) => {
      eprintln!("{}", e);
      return (StatusCode::INTERNAL_SERVER_ERROR, e).into_response();
    }
  };

  // Find and remove the group
  let group_index = list.groups.iter().position(|g| g.uuid == query.uuid);

  match group_index {
    Some(index) => {
      list.groups.remove(index);

      // Write back
      if let Err(e) = write_groups_list(&list) {
        eprintln!("{}", e);
        return (StatusCode::INTERNAL_SERVER_ERROR, e).into_response();
      }

      (StatusCode::OK, "Outbound group deleted successfully").into_response()
    }
    None => (StatusCode::NOT_FOUND, "Outbound group not found").into_response(),
  }
}

pub async fn get_available_options() -> impl IntoResponse {
  let mut options = Vec::new();

  // Read outbound options
  if let Ok(entries) = fs::read_dir(OUTBOUND_DIR) {
    for entry in entries.flatten() {
      let path = entry.path();
      if path.extension().and_then(|s| s.to_str()) == Some("json") {
        if let Ok(content) = fs::read_to_string(&path) {
          if let Ok(outbound_wrapper) = serde_json::from_str::<serde_json::Value>(&content) {
            // Get UUID from wrapper
            let uuid = outbound_wrapper
              .get("uuid")
              .and_then(|u| u.as_str())
              .unwrap_or("")
              .to_string();

            // Get name from wrapper (fallback)
            let wrapper_name = outbound_wrapper
              .get("name")
              .and_then(|n| n.as_str())
              .unwrap_or("");

            // Outbound data is stored with a "json" field containing the actual config as a string
            if let Some(json_str) = outbound_wrapper.get("json").and_then(|j| j.as_str()) {
              // Parse the inner JSON string
              if let Ok(outbound_config) = serde_json::from_str::<serde_json::Value>(json_str) {
                // Try to get tag from config, fallback to wrapper name
                let label = outbound_config
                  .get("tag")
                  .and_then(|t| t.as_str())
                  .unwrap_or(wrapper_name);

                // Only add if we have a valid label
                if !label.is_empty() {
                  let outbound_type = outbound_config
                    .get("type")
                    .and_then(|t| t.as_str())
                    .map(|s| s.to_string());

                  options.push(OutboundOptionDto {
                    uuid,
                    value: label.to_string(),
                    label: label.to_string(),
                    source: "outbound".to_string(),
                    option_type: outbound_type,
                  });
                }
              }
            }
          }
        }
      }
    }
  }

  // Read filter options
  if let Ok(entries) = fs::read_dir(FILTER_DIR) {
    for entry in entries.flatten() {
      let path = entry.path();
      if path.extension().and_then(|s| s.to_str()) == Some("json") {
        if let Ok(content) = fs::read_to_string(&path) {
          if let Ok(filter) = serde_json::from_str::<serde_json::Value>(&content) {
            let uuid = filter
              .get("uuid")
              .and_then(|u| u.as_str())
              .unwrap_or("")
              .to_string();

            if let Some(name) = filter.get("name").and_then(|n| n.as_str()) {
              let filter_type = filter
                .get("filter_type")
                .and_then(|t| t.as_str())
                .map(|s| s.to_string());

              options.push(OutboundOptionDto {
                uuid,
                value: name.to_string(),
                label: name.to_string(),
                source: "filter".to_string(),
                option_type: filter_type,
              });
            }
          }
        }
      }
    }
  }

  // Read outbound group options
  let list = read_groups_list().unwrap_or(OutboundGroupList { groups: Vec::new() });
  for group in list.groups {
    options.push(OutboundOptionDto {
      uuid: group.uuid,
      value: group.name.clone(),
      label: group.name,
      source: "outbound_group".to_string(),
      option_type: Some(group.group_type),
    });
  }

  (StatusCode::OK, Json(options)).into_response()
}

pub async fn reorder_outbound_groups(Json(payload): Json<ReorderDto>) -> impl IntoResponse {
  // Read existing groups
  let mut list = match read_groups_list() {
    Ok(list) => list,
    Err(e) => {
      eprintln!("{}", e);
      return (StatusCode::INTERNAL_SERVER_ERROR, e).into_response();
    }
  };

  // Create a map of uuid -> group for quick lookup
  let mut group_map: std::collections::HashMap<String, OutboundGroupCreateDto> = list
    .groups
    .into_iter()
    .map(|g| (g.uuid.clone(), g))
    .collect();

  // Rebuild the list in the new order
  let mut reordered_groups = Vec::new();
  for uuid in payload.uuids {
    if let Some(group) = group_map.remove(&uuid) {
      reordered_groups.push(group);
    }
  }

  // Add any remaining groups that weren't in the reorder list
  for (_, group) in group_map {
    reordered_groups.push(group);
  }

  list.groups = reordered_groups;

  // Write back
  if let Err(e) = write_groups_list(&list) {
    eprintln!("{}", e);
    return (StatusCode::INTERNAL_SERVER_ERROR, e).into_response();
  }

  (StatusCode::OK, "Reordered successfully").into_response()
}
