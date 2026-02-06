use axum::{Json, http::StatusCode, response::IntoResponse};
use serde::{Deserialize, Serialize};
use std::path::Path;
use tokio::fs;

use crate::backend::error::AppError;

#[derive(Debug, Deserialize, Serialize)]
pub struct RulesetCreateDto {
  pub uuid: String,
  pub name: String,
  pub json: String,
}

pub async fn create_ruleset(
  Json(payload): Json<RulesetCreateDto>,
) -> Result<impl IntoResponse, AppError> {
  let file_name = format!("{}.json", payload.uuid);
  log::info!("Creating ruleset: {}", file_name);
  let dir_path = Path::new("./data/rulesets");
  let file_path = dir_path.join(&file_name);

  if !dir_path.exists() {
    fs::create_dir_all(dir_path).await?;
  }

  if file_path.exists() {
    return Ok(
      (
        StatusCode::CONFLICT,
        "Ruleset with this UUID already exists",
      )
        .into_response(),
    );
  }

  fs::write(file_path, serde_json::to_string(&payload)?.as_bytes()).await?;

  Ok((StatusCode::CREATED, "Ruleset created successfully").into_response())
}

#[derive(Debug, Serialize)]
pub struct RulesetListDto {
  pub uuid: String,
  pub name: String,
  pub json: String,
}

pub async fn list_rulesets() -> Result<impl IntoResponse, AppError> {
  let dir_path = Path::new("./data/rulesets");
  if !dir_path.exists() {
    return Ok(Json(Vec::<RulesetListDto>::new()));
  }

  let mut entries = fs::read_dir(dir_path).await?;
  let mut rulesets = Vec::new();

  while let Some(entry) = entries.next_entry().await? {
    let path = entry.path();
    if path.extension().and_then(|s| s.to_str()) == Some("json") {
      let content = fs::read_to_string(&path).await?;
      if let Ok(ruleset_dto) = serde_json::from_str::<RulesetCreateDto>(&content) {
        rulesets.push(RulesetListDto {
          uuid: ruleset_dto.uuid,
          name: ruleset_dto.name,
          json: ruleset_dto.json,
        });
      }
    }
  }

  Ok(Json(rulesets))
}

#[derive(Debug, Deserialize)]
pub struct RulesetUpdateDto {
  pub uuid: String,
  pub name: String,
  pub json: String,
}

pub async fn update_ruleset(
  Json(payload): Json<RulesetUpdateDto>,
) -> Result<impl IntoResponse, AppError> {
  let file_name = format!("{}.json", payload.uuid);
  let dir_path = Path::new("./data/rulesets");
  let file_path = dir_path.join(&file_name);

  if !file_path.exists() {
    return Ok((StatusCode::NOT_FOUND, "Ruleset not found").into_response());
  }

  let storage_dto = RulesetCreateDto {
    uuid: payload.uuid,
    name: payload.name,
    json: payload.json,
  };

  fs::write(file_path, serde_json::to_string(&storage_dto)?.as_bytes()).await?;

  Ok((StatusCode::OK, "Ruleset updated successfully").into_response())
}

#[derive(Debug, Deserialize)]
pub struct RulesetDeleteDto {
  pub uuid: String,
}

pub async fn delete_ruleset(
  axum::extract::Query(payload): axum::extract::Query<RulesetDeleteDto>,
) -> Result<impl IntoResponse, AppError> {
  let file_name = format!("{}.json", payload.uuid);
  let dir_path = Path::new("./data/rulesets");
  let file_path = dir_path.join(&file_name);

  if !file_path.exists() {
    return Ok((StatusCode::NOT_FOUND, "Ruleset not found").into_response());
  }

  fs::remove_file(file_path).await?;

  Ok((StatusCode::OK, "Ruleset deleted successfully").into_response())
}
