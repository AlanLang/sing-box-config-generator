use axum::{Json, http::StatusCode, response::IntoResponse};
use serde::{Deserialize, Serialize};
use std::path::Path;
use tokio::fs;

use crate::backend::error::AppError;

#[derive(Debug, Deserialize, Serialize)]
pub struct DnsConfigCreateDto {
  pub uuid: String,
  pub name: String,
  pub json: String,
}

pub async fn create_dns_config(
  Json(payload): Json<DnsConfigCreateDto>,
) -> Result<impl IntoResponse, AppError> {
  let file_name = format!("{}.json", payload.uuid);
  log::info!("Creating dns_config: {}", file_name);
  let dir_path = Path::new("./data/dns-config");
  let file_path = dir_path.join(&file_name);

  if !dir_path.exists() {
    fs::create_dir_all(dir_path).await?;
  }

  if file_path.exists() {
    return Ok(
      (
        StatusCode::CONFLICT,
        "DNS Config with this name already exists",
      )
        .into_response(),
    );
  }

  fs::write(file_path, serde_json::to_string(&payload)?.as_bytes()).await?;

  Ok((StatusCode::CREATED, "DNS Config created successfully").into_response())
}

#[derive(Debug, Serialize)]
pub struct DnsConfigListDto {
  pub uuid: String,
  pub name: String,
  pub json: String,
}

pub async fn list_dns_configs() -> Result<impl IntoResponse, AppError> {
  let dir_path = Path::new("./data/dns-config");
  if !dir_path.exists() {
    return Ok(Json(Vec::<DnsConfigListDto>::new()));
  }

  let mut entries = fs::read_dir(dir_path).await?;
  let mut dns_config_list = Vec::new();

  while let Some(entry) = entries.next_entry().await? {
    let path = entry.path();
    if path.extension().and_then(|s| s.to_str()) == Some("json") {
      let content = fs::read_to_string(&path).await?;
      if let Ok(dns_config_dto) = serde_json::from_str::<DnsConfigCreateDto>(&content) {
        dns_config_list.push(DnsConfigListDto {
          uuid: dns_config_dto.uuid,
          name: dns_config_dto.name,
          json: dns_config_dto.json,
        });
      }
    }
  }

  Ok(Json(dns_config_list))
}

#[derive(Debug, Deserialize)]
pub struct DnsConfigUpdateDto {
  pub uuid: String,
  pub name: String,
  pub json: String,
}

pub async fn update_dns_config(
  Json(payload): Json<DnsConfigUpdateDto>,
) -> Result<impl IntoResponse, AppError> {
  let file_name = format!("{}.json", payload.uuid);
  let dir_path = Path::new("./data/dns-config");
  let file_path = dir_path.join(&file_name);

  if !file_path.exists() {
    return Ok((StatusCode::NOT_FOUND, "DNS Config not found").into_response());
  }

  // Reuse DnsConfigCreateDto structure for storage to maintain consistency
  let storage_dto = DnsConfigCreateDto {
    uuid: payload.uuid,
    name: payload.name,
    json: payload.json,
  };

  fs::write(file_path, serde_json::to_string(&storage_dto)?.as_bytes()).await?;

  Ok((StatusCode::OK, "DNS Config updated successfully").into_response())
}

#[derive(Debug, Deserialize)]
pub struct DnsConfigDeleteDto {
  pub uuid: String,
}

pub async fn delete_dns_config(
  axum::extract::Query(payload): axum::extract::Query<DnsConfigDeleteDto>,
) -> Result<impl IntoResponse, AppError> {
  let file_name = format!("{}.json", payload.uuid);
  let dir_path = Path::new("./data/dns-config");
  let file_path = dir_path.join(&file_name);

  if !file_path.exists() {
    return Ok((StatusCode::NOT_FOUND, "DNS Config not found").into_response());
  }

  fs::remove_file(file_path).await?;

  Ok((StatusCode::OK, "DNS Config deleted successfully").into_response())
}
