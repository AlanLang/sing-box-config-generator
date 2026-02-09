use axum::{Json, http::StatusCode, response::IntoResponse};
use serde::{Deserialize, Serialize};
use std::path::Path;
use tokio::fs;

use crate::backend::error::AppError;

#[derive(Debug, Deserialize, Serialize)]
pub struct FilterCreateDto {
  pub uuid: String,
  pub name: String,
  pub filter_type: String, // "simple" or "regex"
  pub pattern: String,
  #[serde(skip_serializing_if = "Option::is_none")]
  pub except: Option<String>, // Optional except pattern (only for "simple" type)
}

pub async fn create_filter(
  Json(payload): Json<FilterCreateDto>,
) -> Result<impl IntoResponse, AppError> {
  let file_name = format!("{}.json", payload.uuid);
  log::info!("Creating filter: {}", file_name);
  let dir_path = Path::new("./data/filters");
  let file_path = dir_path.join(&file_name);

  if !dir_path.exists() {
    fs::create_dir_all(dir_path).await?;
  }

  if file_path.exists() {
    return Ok((StatusCode::CONFLICT, "Filter with this UUID already exists").into_response());
  }

  fs::write(file_path, serde_json::to_string(&payload)?.as_bytes()).await?;

  Ok((StatusCode::CREATED, "Filter created successfully").into_response())
}

#[derive(Debug, Serialize)]
pub struct FilterListDto {
  pub uuid: String,
  pub name: String,
  pub filter_type: String,
  pub pattern: String,
  #[serde(skip_serializing_if = "Option::is_none")]
  pub except: Option<String>,
}

pub async fn list_filters() -> Result<impl IntoResponse, AppError> {
  let dir_path = Path::new("./data/filters");
  if !dir_path.exists() {
    return Ok(Json(Vec::<FilterListDto>::new()));
  }

  let mut entries = fs::read_dir(dir_path).await?;
  let mut filters = Vec::new();

  while let Some(entry) = entries.next_entry().await? {
    let path = entry.path();
    if path.extension().and_then(|s| s.to_str()) == Some("json") {
      let content = fs::read_to_string(&path).await?;
      if let Ok(filter_dto) = serde_json::from_str::<FilterCreateDto>(&content) {
        filters.push(FilterListDto {
          uuid: filter_dto.uuid,
          name: filter_dto.name,
          filter_type: filter_dto.filter_type,
          pattern: filter_dto.pattern,
          except: filter_dto.except,
        });
      }
    }
  }

  Ok(Json(filters))
}

#[derive(Debug, Deserialize)]
pub struct FilterUpdateDto {
  pub uuid: String,
  pub name: String,
  pub filter_type: String,
  pub pattern: String,
  #[serde(skip_serializing_if = "Option::is_none")]
  pub except: Option<String>,
}

pub async fn update_filter(
  Json(payload): Json<FilterUpdateDto>,
) -> Result<impl IntoResponse, AppError> {
  let file_name = format!("{}.json", payload.uuid);
  let dir_path = Path::new("./data/filters");
  let file_path = dir_path.join(&file_name);

  if !file_path.exists() {
    return Ok((StatusCode::NOT_FOUND, "Filter not found").into_response());
  }

  // Reuse FilterCreateDto structure for storage to maintain consistency
  let storage_dto = FilterCreateDto {
    uuid: payload.uuid,
    name: payload.name,
    filter_type: payload.filter_type,
    pattern: payload.pattern,
    except: payload.except,
  };

  fs::write(file_path, serde_json::to_string(&storage_dto)?.as_bytes()).await?;

  Ok((StatusCode::OK, "Filter updated successfully").into_response())
}

#[derive(Debug, Deserialize)]
pub struct FilterDeleteDto {
  pub uuid: String,
}

pub async fn delete_filter(
  axum::extract::Query(payload): axum::extract::Query<FilterDeleteDto>,
) -> Result<impl IntoResponse, AppError> {
  let file_name = format!("{}.json", payload.uuid);
  let dir_path = Path::new("./data/filters");
  let file_path = dir_path.join(&file_name);

  if !file_path.exists() {
    return Ok((StatusCode::NOT_FOUND, "Filter not found").into_response());
  }

  fs::remove_file(file_path).await?;

  Ok((StatusCode::OK, "Filter deleted successfully").into_response())
}
