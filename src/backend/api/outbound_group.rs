use axum::{Json, http::StatusCode, response::IntoResponse};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::Path;
use tokio::fs;

use crate::backend::error::AppError;

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

#[derive(Debug, Serialize, Deserialize)]
struct OutboundGroupOrder {
  uuids: Vec<String>,
}

/// Read outbound group order from file
async fn read_outbound_group_order() -> Result<Vec<String>, AppError> {
  let order_path = Path::new("./data/outbound-group/.order.json");
  if !order_path.exists() {
    return Ok(Vec::new());
  }

  let content = fs::read_to_string(order_path).await?;
  let order: OutboundGroupOrder = serde_json::from_str(&content)?;
  Ok(order.uuids)
}

/// Write outbound group order to file
async fn write_outbound_group_order(uuids: Vec<String>) -> Result<(), AppError> {
  let dir_path = Path::new("./data/outbound-group");
  if !dir_path.exists() {
    fs::create_dir_all(dir_path).await?;
  }

  let order_path = dir_path.join(".order.json");
  let order = OutboundGroupOrder { uuids };
  let content = serde_json::to_string_pretty(&order)?;
  fs::write(order_path, content.as_bytes()).await?;
  Ok(())
}

pub async fn create_outbound_group(
  Json(payload): Json<OutboundGroupCreateDto>,
) -> Result<impl IntoResponse, AppError> {
  let file_name = format!("{}.json", payload.uuid);
  log::info!("Creating outbound group: {}", file_name);
  let dir_path = Path::new("./data/outbound-group");
  let file_path = dir_path.join(&file_name);

  if !dir_path.exists() {
    fs::create_dir_all(dir_path).await?;
  }

  if file_path.exists() {
    return Ok(
      (
        StatusCode::CONFLICT,
        "Outbound group with this UUID already exists",
      )
        .into_response(),
    );
  }

  fs::write(file_path, serde_json::to_string(&payload)?.as_bytes()).await?;

  Ok((StatusCode::CREATED, "Outbound group created successfully").into_response())
}

pub async fn list_outbound_groups() -> Result<impl IntoResponse, AppError> {
  let dir_path = Path::new("./data/outbound-group");
  if !dir_path.exists() {
    return Ok(Json(Vec::<OutboundGroupCreateDto>::new()));
  }

  let mut entries = fs::read_dir(dir_path).await?;
  let mut groups_map: HashMap<String, OutboundGroupCreateDto> = HashMap::new();

  while let Some(entry) = entries.next_entry().await? {
    let path = entry.path();
    if path.extension().and_then(|s| s.to_str()) == Some("json") {
      let content = fs::read_to_string(&path).await?;
      if let Ok(group_dto) = serde_json::from_str::<OutboundGroupCreateDto>(&content) {
        groups_map.insert(group_dto.uuid.clone(), group_dto);
      }
    }
  }

  // Read order and sort groups
  let order = read_outbound_group_order().await?;
  let mut groups = Vec::new();

  // First, add groups in the specified order
  for uuid in &order {
    if let Some(group) = groups_map.remove(uuid) {
      groups.push(group);
    }
  }

  // Then add any remaining groups (new ones not in order yet)
  for (_, group) in groups_map {
    groups.push(group);
  }

  Ok(Json(groups))
}

#[derive(Debug, Deserialize)]
pub struct UpdateQuery {
  pub uuid: String,
}

pub async fn update_outbound_group(
  axum::extract::Query(query): axum::extract::Query<UpdateQuery>,
  Json(payload): Json<OutboundGroupCreateDto>,
) -> Result<impl IntoResponse, AppError> {
  let file_name = format!("{}.json", query.uuid);
  let dir_path = Path::new("./data/outbound-group");
  let file_path = dir_path.join(&file_name);

  if !file_path.exists() {
    return Ok((StatusCode::NOT_FOUND, "Outbound group not found").into_response());
  }

  fs::write(file_path, serde_json::to_string(&payload)?.as_bytes()).await?;

  Ok((StatusCode::OK, Json(payload)).into_response())
}

#[derive(Debug, Deserialize)]
pub struct DeleteQuery {
  pub uuid: String,
}

pub async fn delete_outbound_group(
  axum::extract::Query(query): axum::extract::Query<DeleteQuery>,
) -> Result<impl IntoResponse, AppError> {
  let file_name = format!("{}.json", query.uuid);
  let dir_path = Path::new("./data/outbound-group");
  let file_path = dir_path.join(&file_name);

  if !file_path.exists() {
    return Ok((StatusCode::NOT_FOUND, "Outbound group not found").into_response());
  }

  fs::remove_file(file_path).await?;

  Ok((StatusCode::OK, "Outbound group deleted successfully").into_response())
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

pub async fn get_available_options() -> impl IntoResponse {
  let mut options = Vec::new();

  // Read outbound options
  if let Ok(entries) = fs::read_dir(OUTBOUND_DIR).await {
    let mut entries = entries;
    while let Ok(Some(entry)) = entries.next_entry().await {
      let path = entry.path();
      if path.extension().and_then(|s| s.to_str()) == Some("json") {
        if let Ok(content) = fs::read_to_string(&path).await {
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
  if let Ok(entries) = fs::read_dir(FILTER_DIR).await {
    let mut entries = entries;
    while let Ok(Some(entry)) = entries.next_entry().await {
      let path = entry.path();
      if path.extension().and_then(|s| s.to_str()) == Some("json") {
        if let Ok(content) = fs::read_to_string(&path).await {
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
  let dir_path = Path::new("./data/outbound-group");
  if dir_path.exists() {
    if let Ok(entries) = fs::read_dir(dir_path).await {
      let mut entries = entries;
      while let Ok(Some(entry)) = entries.next_entry().await {
        let path = entry.path();
        if path.extension().and_then(|s| s.to_str()) == Some("json") {
          if let Ok(content) = fs::read_to_string(&path).await {
            if let Ok(group) = serde_json::from_str::<OutboundGroupCreateDto>(&content) {
              options.push(OutboundOptionDto {
                uuid: group.uuid,
                value: group.name.clone(),
                label: group.name,
                source: "outbound_group".to_string(),
                option_type: Some(group.group_type),
              });
            }
          }
        }
      }
    }
  }

  (StatusCode::OK, Json(options)).into_response()
}

#[derive(Debug, Deserialize)]
pub struct ReorderDto {
  pub uuids: Vec<String>,
}

pub async fn reorder_outbound_groups(Json(payload): Json<ReorderDto>) -> impl IntoResponse {
  match write_outbound_group_order(payload.uuids).await {
    Ok(()) => (StatusCode::OK, "Reordered successfully").into_response(),
    Err(e) => {
      log::error!("Failed to reorder outbound groups: {:?}", e);
      (
        StatusCode::INTERNAL_SERVER_ERROR,
        "Failed to reorder outbound groups",
      )
        .into_response()
    }
  }
}
