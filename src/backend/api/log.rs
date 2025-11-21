use axum::{Json, http::StatusCode, response::IntoResponse};
use serde::{Deserialize, Serialize};
use std::path::Path;
use tokio::fs;

#[derive(Debug, Deserialize, Serialize)]
pub struct LogCreateDto {
  pub name: String,
  pub json: String,
}

pub async fn create_log(Json(payload): Json<LogCreateDto>) -> impl IntoResponse {
  let file_name = format!("{}.json", payload.name);
  log::info!("Creating log: {}", file_name);
  let dir_path = Path::new("./data/logs");
  let file_path = dir_path.join(&file_name);

  if !dir_path.exists() {
    if let Err(e) = fs::create_dir_all(dir_path).await {
      log::error!("Failed to create directory: {}", e);
      return (
        StatusCode::INTERNAL_SERVER_ERROR,
        "Failed to create directory",
      )
        .into_response();
    }
  }

  if file_path.exists() {
    return (StatusCode::CONFLICT, "Log with this name already exists").into_response();
  }

  if let Err(e) = fs::write(file_path, payload.json).await {
    log::error!("Failed to write file: {}", e);
    return (StatusCode::INTERNAL_SERVER_ERROR, "Failed to save log").into_response();
  }

  (StatusCode::CREATED, "Log created successfully").into_response()
}
