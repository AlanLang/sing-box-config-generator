use axum::{Json, http::StatusCode, response::IntoResponse};
use serde::{Deserialize, Serialize};
use std::path::Path;
use tokio::fs;

use crate::backend::error::AppError;

#[derive(Debug, Deserialize, Serialize)]
pub struct OutboundCreateDto {
  pub uuid: String,
  pub name: String,
  pub json: String,
}

pub async fn create_outbound(
  Json(payload): Json<OutboundCreateDto>,
) -> Result<impl IntoResponse, AppError> {
  let file_name = format!("{}.json", payload.uuid);
  log::info!("Creating outbound: {}", file_name);
  let dir_path = Path::new("./data/outbounds");
  let file_path = dir_path.join(&file_name);

  if !dir_path.exists() {
    fs::create_dir_all(dir_path).await?;
  }

  if file_path.exists() {
    return Ok(
      (
        StatusCode::CONFLICT,
        "Outbound with this name already exists",
      )
        .into_response(),
    );
  }

  fs::write(file_path, serde_json::to_string(&payload)?.as_bytes()).await?;

  Ok((StatusCode::CREATED, "Outbound created successfully").into_response())
}

#[derive(Debug, Serialize)]
pub struct OutboundListDto {
  pub uuid: String,
  pub name: String,
  pub json: String,
}

pub async fn list_outbounds() -> Result<impl IntoResponse, AppError> {
  let dir_path = Path::new("./data/outbounds");
  if !dir_path.exists() {
    return Ok(Json(Vec::<OutboundListDto>::new()));
  }

  let mut entries = fs::read_dir(dir_path).await?;
  let mut outbounds = Vec::new();

  while let Some(entry) = entries.next_entry().await? {
    let path = entry.path();
    if path.extension().and_then(|s| s.to_str()) == Some("json") {
      let content = fs::read_to_string(&path).await?;
      if let Ok(outbound_dto) = serde_json::from_str::<OutboundCreateDto>(&content) {
        outbounds.push(OutboundListDto {
          uuid: outbound_dto.uuid,
          name: outbound_dto.name,
          json: outbound_dto.json,
        });
      }
    }
  }

  Ok(Json(outbounds))
}

#[derive(Debug, Deserialize)]
pub struct OutboundUpdateDto {
  pub uuid: String,
  pub name: String,
  pub json: String,
}

pub async fn update_outbound(
  Json(payload): Json<OutboundUpdateDto>,
) -> Result<impl IntoResponse, AppError> {
  let file_name = format!("{}.json", payload.uuid);
  let dir_path = Path::new("./data/outbounds");
  let file_path = dir_path.join(&file_name);

  if !file_path.exists() {
    return Ok((StatusCode::NOT_FOUND, "Outbound not found").into_response());
  }

  // Reuse OutboundCreateDto structure for storage to maintain consistency
  let storage_dto = OutboundCreateDto {
    uuid: payload.uuid,
    name: payload.name,
    json: payload.json,
  };

  fs::write(file_path, serde_json::to_string(&storage_dto)?.as_bytes()).await?;

  Ok((StatusCode::OK, "Outbound updated successfully").into_response())
}

#[derive(Debug, Deserialize)]
pub struct OutboundDeleteDto {
  pub uuid: String,
}

pub async fn delete_outbound(
  axum::extract::Query(payload): axum::extract::Query<OutboundDeleteDto>,
) -> Result<impl IntoResponse, AppError> {
  let file_name = format!("{}.json", payload.uuid);
  let dir_path = Path::new("./data/outbounds");
  let file_path = dir_path.join(&file_name);

  if !file_path.exists() {
    return Ok((StatusCode::NOT_FOUND, "Outbound not found").into_response());
  }

  fs::remove_file(file_path).await?;

  Ok((StatusCode::OK, "Outbound deleted successfully").into_response())
}
