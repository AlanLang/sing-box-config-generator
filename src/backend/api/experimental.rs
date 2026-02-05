use axum::{Json, http::StatusCode, response::IntoResponse};
use serde::{Deserialize, Serialize};
use std::path::Path;
use tokio::fs;

use crate::backend::error::AppError;

#[derive(Debug, Deserialize, Serialize)]
pub struct ExperimentalCreateDto {
  pub uuid: String,
  pub name: String,
  pub json: String,
}

pub async fn create_experimental(Json(payload): Json<ExperimentalCreateDto>) -> Result<impl IntoResponse, AppError> {
  let file_name = format!("{}.json", payload.uuid);
  log::info!("Creating experimental: {}", file_name);
  let dir_path = Path::new("./data/experimentals");
  let file_path = dir_path.join(&file_name);

  if !dir_path.exists() {
    fs::create_dir_all(dir_path).await?;
  }

  if file_path.exists() {
    return Ok((StatusCode::CONFLICT, "Experimental with this UUID already exists").into_response());
  }

  fs::write(
    file_path,
    serde_json::to_string(&payload)?.as_bytes(),
  )
  .await?;

  Ok((StatusCode::CREATED, "Experimental created successfully").into_response())
}

#[derive(Debug, Serialize)]
pub struct ExperimentalListDto {
  pub uuid: String,
  pub name: String,
  pub json: String,
}

pub async fn list_experimentals() -> Result<impl IntoResponse, AppError> {
  let dir_path = Path::new("./data/experimentals");
  if !dir_path.exists() {
    return Ok(Json(Vec::<ExperimentalListDto>::new()));
  }

  let mut entries = fs::read_dir(dir_path).await?;
  let mut experimentals = Vec::new();

  while let Some(entry) = entries.next_entry().await? {
    let path = entry.path();
    if path.extension().and_then(|s| s.to_str()) == Some("json") {
      let content = fs::read_to_string(&path).await?;
      if let Ok(experimental_dto) = serde_json::from_str::<ExperimentalCreateDto>(&content) {
        experimentals.push(ExperimentalListDto {
          uuid: experimental_dto.uuid,
          name: experimental_dto.name,
          json: experimental_dto.json,
        });
      }
    }
  }

  Ok(Json(experimentals))
}

#[derive(Debug, Deserialize)]
pub struct ExperimentalUpdateDto {
  pub uuid: String,
  pub name: String,
  pub json: String,
}

pub async fn update_experimental(Json(payload): Json<ExperimentalUpdateDto>) -> Result<impl IntoResponse, AppError> {
  let file_name = format!("{}.json", payload.uuid);
  let dir_path = Path::new("./data/experimentals");
  let file_path = dir_path.join(&file_name);

  if !file_path.exists() {
    return Ok((StatusCode::NOT_FOUND, "Experimental not found").into_response());
  }

  let storage_dto = ExperimentalCreateDto {
    uuid: payload.uuid,
    name: payload.name,
    json: payload.json,
  };

  fs::write(
    file_path,
    serde_json::to_string(&storage_dto)?.as_bytes(),
  )
  .await?;

  Ok((StatusCode::OK, "Experimental updated successfully").into_response())
}

#[derive(Debug, Deserialize)]
pub struct ExperimentalDeleteDto {
  pub uuid: String,
}

pub async fn delete_experimental(
  axum::extract::Query(payload): axum::extract::Query<ExperimentalDeleteDto>,
) -> Result<impl IntoResponse, AppError> {
  let file_name = format!("{}.json", payload.uuid);
  let dir_path = Path::new("./data/experimentals");
  let file_path = dir_path.join(&file_name);

  if !file_path.exists() {
    return Ok((StatusCode::NOT_FOUND, "Experimental not found").into_response());
  }

  fs::remove_file(file_path).await?;

  Ok((StatusCode::OK, "Experimental deleted successfully").into_response())
}
