use axum::{Json, http::StatusCode, response::IntoResponse};
use serde::{Deserialize, Serialize};
use std::path::Path;
use tokio::fs;

use crate::backend::error::AppError;

#[derive(Debug, Deserialize, Serialize)]
pub struct DnsCreateDto {
  pub uuid: String,
  pub name: String,
  pub json: String,
}

pub async fn create_dns(Json(payload): Json<DnsCreateDto>) -> Result<impl IntoResponse, AppError> {
  let file_name = format!("{}.json", payload.uuid);
  log::info!("Creating dns: {}", file_name);
  let dir_path = Path::new("./data/dns-server");
  let file_path = dir_path.join(&file_name);

  if !dir_path.exists() {
    fs::create_dir_all(dir_path).await?;
  }

  if file_path.exists() {
    return Ok((StatusCode::CONFLICT, "Dns with this name already exists").into_response());
  }

  fs::write(file_path, serde_json::to_string(&payload)?.as_bytes()).await?;

  Ok((StatusCode::CREATED, "Dns created successfully").into_response())
}

#[derive(Debug, Serialize)]
pub struct DnsListDto {
  pub uuid: String,
  pub name: String,
  pub json: String,
}

pub async fn list_dns() -> Result<impl IntoResponse, AppError> {
  let dir_path = Path::new("./data/dns-server");
  if !dir_path.exists() {
    return Ok(Json(Vec::<DnsListDto>::new()));
  }

  let mut entries = fs::read_dir(dir_path).await?;
  let mut dns_list = Vec::new();

  while let Some(entry) = entries.next_entry().await? {
    let path = entry.path();
    if path.extension().and_then(|s| s.to_str()) == Some("json") {
      let content = fs::read_to_string(&path).await?;
      if let Ok(dns_dto) = serde_json::from_str::<DnsCreateDto>(&content) {
        dns_list.push(DnsListDto {
          uuid: dns_dto.uuid,
          name: dns_dto.name,
          json: dns_dto.json,
        });
      }
    }
  }

  Ok(Json(dns_list))
}

#[derive(Debug, Deserialize)]
pub struct DnsUpdateDto {
  pub uuid: String,
  pub name: String,
  pub json: String,
}

pub async fn update_dns(Json(payload): Json<DnsUpdateDto>) -> Result<impl IntoResponse, AppError> {
  let file_name = format!("{}.json", payload.uuid);
  let dir_path = Path::new("./data/dns-server");
  let file_path = dir_path.join(&file_name);

  if !file_path.exists() {
    return Ok((StatusCode::NOT_FOUND, "Dns not found").into_response());
  }

  // Reuse DnsCreateDto structure for storage to maintain consistency
  let storage_dto = DnsCreateDto {
    uuid: payload.uuid,
    name: payload.name,
    json: payload.json,
  };

  fs::write(file_path, serde_json::to_string(&storage_dto)?.as_bytes()).await?;

  Ok((StatusCode::OK, "Dns updated successfully").into_response())
}

#[derive(Debug, Deserialize)]
pub struct DnsDeleteDto {
  pub uuid: String,
}

pub async fn delete_dns(
  axum::extract::Query(payload): axum::extract::Query<DnsDeleteDto>,
) -> Result<impl IntoResponse, AppError> {
  let file_name = format!("{}.json", payload.uuid);
  let dir_path = Path::new("./data/dns-server");
  let file_path = dir_path.join(&file_name);

  if !file_path.exists() {
    return Ok((StatusCode::NOT_FOUND, "Dns not found").into_response());
  }

  fs::remove_file(file_path).await?;

  Ok((StatusCode::OK, "Dns deleted successfully").into_response())
}
