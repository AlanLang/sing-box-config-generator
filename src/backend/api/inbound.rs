use axum::{Json, http::StatusCode, response::IntoResponse};
use serde::{Deserialize, Serialize};
use std::path::Path;
use tokio::fs;

use crate::backend::error::AppError;

#[derive(Debug, Deserialize, Serialize)]
pub struct InboundCreateDto {
  pub uuid: String,
  pub name: String,
  pub json: String,
}

pub async fn create_inbound(Json(payload): Json<InboundCreateDto>) -> Result<impl IntoResponse, AppError> {
  let file_name = format!("{}.json", payload.uuid);
  log::info!("Creating inbound: {}", file_name);
  let dir_path = Path::new("./data/inbounds");
  let file_path = dir_path.join(&file_name);

  if !dir_path.exists() {
    fs::create_dir_all(dir_path).await?;
  }

  if file_path.exists() {
    return Ok((StatusCode::CONFLICT, "Inbound with this UUID already exists").into_response());
  }

  fs::write(
    file_path,
    serde_json::to_string(&payload)?.as_bytes(),
  )
  .await?;

  Ok((StatusCode::CREATED, "Inbound created successfully").into_response())
}

#[derive(Debug, Serialize)]
pub struct InboundListDto {
  pub uuid: String,
  pub name: String,
  pub json: String,
}

pub async fn list_inbounds() -> Result<impl IntoResponse, AppError> {
  let dir_path = Path::new("./data/inbounds");
  if !dir_path.exists() {
    return Ok(Json(Vec::<InboundListDto>::new()));
  }

  let mut entries = fs::read_dir(dir_path).await?;
  let mut inbounds = Vec::new();

  while let Some(entry) = entries.next_entry().await? {
    let path = entry.path();
    if path.extension().and_then(|s| s.to_str()) == Some("json") {
      let content = fs::read_to_string(&path).await?;
      if let Ok(inbound_dto) = serde_json::from_str::<InboundCreateDto>(&content) {
        inbounds.push(InboundListDto {
          uuid: inbound_dto.uuid,
          name: inbound_dto.name,
          json: inbound_dto.json,
        });
      }
    }
  }

  Ok(Json(inbounds))
}

#[derive(Debug, Deserialize)]
pub struct InboundUpdateDto {
  pub uuid: String,
  pub name: String,
  pub json: String,
}

pub async fn update_inbound(Json(payload): Json<InboundUpdateDto>) -> Result<impl IntoResponse, AppError> {
  let file_name = format!("{}.json", payload.uuid);
  let dir_path = Path::new("./data/inbounds");
  let file_path = dir_path.join(&file_name);

  if !file_path.exists() {
    return Ok((StatusCode::NOT_FOUND, "Inbound not found").into_response());
  }

  let storage_dto = InboundCreateDto {
    uuid: payload.uuid,
    name: payload.name,
    json: payload.json,
  };

  fs::write(
    file_path,
    serde_json::to_string(&storage_dto)?.as_bytes(),
  )
  .await?;

  Ok((StatusCode::OK, "Inbound updated successfully").into_response())
}

#[derive(Debug, Deserialize)]
pub struct InboundDeleteDto {
  pub uuid: String,
}

pub async fn delete_inbound(
  axum::extract::Query(payload): axum::extract::Query<InboundDeleteDto>,
) -> Result<impl IntoResponse, AppError> {
  let file_name = format!("{}.json", payload.uuid);
  let dir_path = Path::new("./data/inbounds");
  let file_path = dir_path.join(&file_name);

  if !file_path.exists() {
    return Ok((StatusCode::NOT_FOUND, "Inbound not found").into_response());
  }

  fs::remove_file(file_path).await?;

  Ok((StatusCode::OK, "Inbound deleted successfully").into_response())
}
