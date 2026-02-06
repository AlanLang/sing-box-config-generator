use axum::{Json, http::StatusCode, response::IntoResponse};
use serde::{Deserialize, Serialize};
use std::path::Path;
use tokio::fs;

use crate::backend::error::AppError;

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct DnsRuleDto {
  pub rule_set: Vec<String>,
  pub server: String,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct DnsConfigDto {
  pub config: Option<String>,
  pub servers: Vec<String>,
  pub rules: Option<Vec<DnsRuleDto>>,
  #[serde(rename = "final")]
  pub final_server: String,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct RouteRuleDto {
  pub rulesets: Vec<String>,
  pub outbound: String,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct RouteConfigDto {
  pub config: Option<String>,
  pub rules: Option<Vec<RouteRuleDto>>,
  #[serde(rename = "final")]
  pub final_outbound: String,
  pub default_domain_resolver: Option<String>,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct ExtConfigDto {
  pub download_detour: String,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct ConfigCreateDto {
  pub uuid: String,
  pub name: String,
  pub log: String,
  pub dns: DnsConfigDto,
  pub inbounds: Vec<String>,
  pub route: RouteConfigDto,
  pub experimental: String,
  pub ext_config: ExtConfigDto,
}

pub async fn create_config(
  Json(payload): Json<ConfigCreateDto>,
) -> Result<impl IntoResponse, AppError> {
  let file_name = format!("{}.json", payload.uuid);
  log::info!("Creating config: {}", file_name);
  let dir_path = Path::new("./data/configs");
  let file_path = dir_path.join(&file_name);

  if !dir_path.exists() {
    fs::create_dir_all(dir_path).await?;
  }

  if file_path.exists() {
    return Ok((StatusCode::CONFLICT, "Config with this UUID already exists").into_response());
  }

  fs::write(file_path, serde_json::to_string(&payload)?.as_bytes()).await?;

  Ok((StatusCode::CREATED, "Config created successfully").into_response())
}

#[derive(Debug, Serialize)]
pub struct ConfigListDto {
  pub uuid: String,
  pub name: String,
  pub log: String,
  pub dns: DnsConfigDto,
  pub inbounds: Vec<String>,
  pub route: RouteConfigDto,
  pub experimental: String,
  pub ext_config: ExtConfigDto,
}

pub async fn list_configs() -> Result<impl IntoResponse, AppError> {
  let dir_path = Path::new("./data/configs");
  if !dir_path.exists() {
    return Ok(Json(Vec::<ConfigListDto>::new()));
  }

  let mut entries = fs::read_dir(dir_path).await?;
  let mut configs = Vec::new();

  while let Some(entry) = entries.next_entry().await? {
    let path = entry.path();
    if path.extension().and_then(|s| s.to_str()) == Some("json") {
      let content = fs::read_to_string(&path).await?;
      if let Ok(config_dto) = serde_json::from_str::<ConfigCreateDto>(&content) {
        configs.push(ConfigListDto {
          uuid: config_dto.uuid,
          name: config_dto.name,
          log: config_dto.log,
          dns: config_dto.dns,
          inbounds: config_dto.inbounds,
          route: config_dto.route,
          experimental: config_dto.experimental,
          ext_config: config_dto.ext_config,
        });
      }
    }
  }

  Ok(Json(configs))
}

#[derive(Debug, Deserialize)]
pub struct ConfigUpdateDto {
  pub uuid: String,
  pub name: String,
  pub log: String,
  pub dns: DnsConfigDto,
  pub inbounds: Vec<String>,
  pub route: RouteConfigDto,
  pub experimental: String,
  pub ext_config: ExtConfigDto,
}

pub async fn update_config(
  Json(payload): Json<ConfigUpdateDto>,
) -> Result<impl IntoResponse, AppError> {
  let file_name = format!("{}.json", payload.uuid);
  let dir_path = Path::new("./data/configs");
  let file_path = dir_path.join(&file_name);

  if !file_path.exists() {
    return Ok((StatusCode::NOT_FOUND, "Config not found").into_response());
  }

  let storage_dto = ConfigCreateDto {
    uuid: payload.uuid,
    name: payload.name,
    log: payload.log,
    dns: payload.dns,
    inbounds: payload.inbounds,
    route: payload.route,
    experimental: payload.experimental,
    ext_config: payload.ext_config,
  };

  fs::write(file_path, serde_json::to_string(&storage_dto)?.as_bytes()).await?;

  Ok((StatusCode::OK, "Config updated successfully").into_response())
}

#[derive(Debug, Deserialize)]
pub struct ConfigDeleteDto {
  pub uuid: String,
}

pub async fn delete_config(
  axum::extract::Query(payload): axum::extract::Query<ConfigDeleteDto>,
) -> Result<impl IntoResponse, AppError> {
  let file_name = format!("{}.json", payload.uuid);
  let dir_path = Path::new("./data/configs");
  let file_path = dir_path.join(&file_name);

  if !file_path.exists() {
    return Ok((StatusCode::NOT_FOUND, "Config not found").into_response());
  }

  fs::remove_file(file_path).await?;

  Ok((StatusCode::OK, "Config deleted successfully").into_response())
}
