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

// Use subscription parser from shared module
use crate::backend::subscription_parser::parse_subscription_line;
