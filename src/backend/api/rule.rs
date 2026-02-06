use axum::{Json, http::StatusCode, response::IntoResponse};
use serde::{Deserialize, Serialize};
use std::path::Path;
use tokio::fs;

use crate::backend::error::AppError;

#[derive(Debug, Deserialize, Serialize)]
pub struct RuleCreateDto {
  pub uuid: String,
  pub name: String,
  pub json: String,
}

pub async fn create_rule(
  Json(payload): Json<RuleCreateDto>,
) -> Result<impl IntoResponse, AppError> {
  let file_name = format!("{}.json", payload.uuid);
  log::info!("Creating rule: {}", file_name);
  let dir_path = Path::new("./data/rules");
  let file_path = dir_path.join(&file_name);

  if !dir_path.exists() {
    fs::create_dir_all(dir_path).await?;
  }

  if file_path.exists() {
    return Ok((StatusCode::CONFLICT, "Rule with this UUID already exists").into_response());
  }

  fs::write(file_path, serde_json::to_string(&payload)?.as_bytes()).await?;

  Ok((StatusCode::CREATED, "Rule created successfully").into_response())
}

#[derive(Debug, Serialize)]
pub struct RuleListDto {
  pub uuid: String,
  pub name: String,
  pub json: String,
}

pub async fn list_rules() -> Result<impl IntoResponse, AppError> {
  let dir_path = Path::new("./data/rules");
  if !dir_path.exists() {
    return Ok(Json(Vec::<RuleListDto>::new()));
  }

  let mut entries = fs::read_dir(dir_path).await?;
  let mut rules = Vec::new();

  while let Some(entry) = entries.next_entry().await? {
    let path = entry.path();
    if path.extension().and_then(|s| s.to_str()) == Some("json") {
      let content = fs::read_to_string(&path).await?;
      if let Ok(rule_dto) = serde_json::from_str::<RuleCreateDto>(&content) {
        rules.push(RuleListDto {
          uuid: rule_dto.uuid,
          name: rule_dto.name,
          json: rule_dto.json,
        });
      }
    }
  }

  Ok(Json(rules))
}

#[derive(Debug, Deserialize)]
pub struct RuleUpdateDto {
  pub uuid: String,
  pub name: String,
  pub json: String,
}

pub async fn update_rule(
  Json(payload): Json<RuleUpdateDto>,
) -> Result<impl IntoResponse, AppError> {
  let file_name = format!("{}.json", payload.uuid);
  let dir_path = Path::new("./data/rules");
  let file_path = dir_path.join(&file_name);

  if !file_path.exists() {
    return Ok((StatusCode::NOT_FOUND, "Rule not found").into_response());
  }

  let storage_dto = RuleCreateDto {
    uuid: payload.uuid,
    name: payload.name,
    json: payload.json,
  };

  fs::write(file_path, serde_json::to_string(&storage_dto)?.as_bytes()).await?;

  Ok((StatusCode::OK, "Rule updated successfully").into_response())
}

#[derive(Debug, Deserialize)]
pub struct RuleDeleteDto {
  pub uuid: String,
}

pub async fn delete_rule(
  axum::extract::Query(payload): axum::extract::Query<RuleDeleteDto>,
) -> Result<impl IntoResponse, AppError> {
  let file_name = format!("{}.json", payload.uuid);
  let dir_path = Path::new("./data/rules");
  let file_path = dir_path.join(&file_name);

  if !file_path.exists() {
    return Ok((StatusCode::NOT_FOUND, "Rule not found").into_response());
  }

  fs::remove_file(file_path).await?;

  Ok((StatusCode::OK, "Rule deleted successfully").into_response())
}
