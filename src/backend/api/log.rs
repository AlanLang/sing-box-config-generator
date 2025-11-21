use axum::{Json, http::StatusCode, response::IntoResponse};
use serde::{Deserialize, Serialize};
use std::path::Path;
use tokio::fs;

use crate::backend::error::AppError;

#[derive(Debug, Deserialize, Serialize)]
pub struct LogCreateDto {
  pub uuid: String,
  pub name: String,
  pub json: String,
}

pub async fn create_log(Json(payload): Json<LogCreateDto>) -> Result<impl IntoResponse, AppError> {
  let file_name = format!("{}.json", payload.uuid);
  log::info!("Creating log: {}", file_name);
  let dir_path = Path::new("./data/logs");
  let file_path = dir_path.join(&file_name);

  if !dir_path.exists() {
    fs::create_dir_all(dir_path).await?;
  }

  if file_path.exists() {
    return Ok((StatusCode::CONFLICT, "Log with this name already exists").into_response());
  }

  fs::write(
    file_path,
    serde_json::to_string(&payload)?.as_bytes(),
  )
  .await?;

  Ok((StatusCode::CREATED, "Log created successfully").into_response())
}

#[derive(Debug, Serialize)]
pub struct LogListDto {
  pub uuid: String,
  pub name: String,
  pub json: String,
}

pub async fn list_logs() -> Result<impl IntoResponse, AppError> {
  let dir_path = Path::new("./data/logs");
  if !dir_path.exists() {
    return Ok(Json(Vec::<LogListDto>::new()));
  }

  let mut entries = fs::read_dir(dir_path).await?;
  let mut logs = Vec::new();

  while let Some(entry) = entries.next_entry().await? {
    let path = entry.path();
    if path.extension().and_then(|s| s.to_str()) == Some("json") {
      let content = fs::read_to_string(&path).await?;
      if let Ok(log_dto) = serde_json::from_str::<LogCreateDto>(&content) {
        logs.push(LogListDto {
          uuid: log_dto.uuid,
          name: log_dto.name,
          json: log_dto.json,
        });
      }
    }
  }

  Ok(Json(logs))
}

#[derive(Debug, Deserialize)]
pub struct LogUpdateDto {
  pub uuid: String,
  pub name: String,
  pub json: String,
}

pub async fn update_log(Json(payload): Json<LogUpdateDto>) -> Result<impl IntoResponse, AppError> {
  let file_name = format!("{}.json", payload.uuid);
  let dir_path = Path::new("./data/logs");
  let file_path = dir_path.join(&file_name);

  if !file_path.exists() {
    return Ok((StatusCode::NOT_FOUND, "Log not found").into_response());
  }

  // Reuse LogCreateDto structure for storage to maintain consistency
  let storage_dto = LogCreateDto {
    uuid: payload.uuid,
    name: payload.name,
    json: payload.json,
  };

  fs::write(
    file_path,
    serde_json::to_string(&storage_dto)?.as_bytes(),
  )
  .await?;

  Ok((StatusCode::OK, "Log updated successfully").into_response())
}

#[derive(Debug, Deserialize)]
pub struct LogDeleteDto {
  pub uuid: String,
}

pub async fn delete_log(
  axum::extract::Query(payload): axum::extract::Query<LogDeleteDto>,
) -> Result<impl IntoResponse, AppError> {
  let file_name = format!("{}.json", payload.uuid);
  let dir_path = Path::new("./data/logs");
  let file_path = dir_path.join(&file_name);

  if !file_path.exists() {
    return Ok((StatusCode::NOT_FOUND, "Log not found").into_response());
  }

  fs::remove_file(file_path).await?;

  Ok((StatusCode::OK, "Log deleted successfully").into_response())
}
