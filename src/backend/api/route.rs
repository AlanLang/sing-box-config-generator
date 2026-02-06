use axum::{Json, http::StatusCode, response::IntoResponse};
use serde::{Deserialize, Serialize};
use std::path::Path;
use tokio::fs;

use crate::backend::error::AppError;

#[derive(Debug, Deserialize, Serialize)]
pub struct RouteCreateDto {
  pub uuid: String,
  pub name: String,
  pub json: String,
}

pub async fn create_route(
  Json(payload): Json<RouteCreateDto>,
) -> Result<impl IntoResponse, AppError> {
  let file_name = format!("{}.json", payload.uuid);
  log::info!("Creating route: {}", file_name);
  let dir_path = Path::new("./data/routes");
  let file_path = dir_path.join(&file_name);

  if !dir_path.exists() {
    fs::create_dir_all(dir_path).await?;
  }

  if file_path.exists() {
    return Ok((StatusCode::CONFLICT, "Route with this UUID already exists").into_response());
  }

  fs::write(file_path, serde_json::to_string(&payload)?.as_bytes()).await?;

  Ok((StatusCode::CREATED, "Route created successfully").into_response())
}

#[derive(Debug, Serialize)]
pub struct RouteListDto {
  pub uuid: String,
  pub name: String,
  pub json: String,
}

pub async fn list_routes() -> Result<impl IntoResponse, AppError> {
  let dir_path = Path::new("./data/routes");
  if !dir_path.exists() {
    return Ok(Json(Vec::<RouteListDto>::new()));
  }

  let mut entries = fs::read_dir(dir_path).await?;
  let mut routes = Vec::new();

  while let Some(entry) = entries.next_entry().await? {
    let path = entry.path();
    if path.extension().and_then(|s| s.to_str()) == Some("json") {
      let content = fs::read_to_string(&path).await?;
      if let Ok(route_dto) = serde_json::from_str::<RouteCreateDto>(&content) {
        routes.push(RouteListDto {
          uuid: route_dto.uuid,
          name: route_dto.name,
          json: route_dto.json,
        });
      }
    }
  }

  Ok(Json(routes))
}

#[derive(Debug, Deserialize)]
pub struct RouteUpdateDto {
  pub uuid: String,
  pub name: String,
  pub json: String,
}

pub async fn update_route(
  Json(payload): Json<RouteUpdateDto>,
) -> Result<impl IntoResponse, AppError> {
  let file_name = format!("{}.json", payload.uuid);
  let dir_path = Path::new("./data/routes");
  let file_path = dir_path.join(&file_name);

  if !file_path.exists() {
    return Ok((StatusCode::NOT_FOUND, "Route not found").into_response());
  }

  let storage_dto = RouteCreateDto {
    uuid: payload.uuid,
    name: payload.name,
    json: payload.json,
  };

  fs::write(file_path, serde_json::to_string(&storage_dto)?.as_bytes()).await?;

  Ok((StatusCode::OK, "Route updated successfully").into_response())
}

#[derive(Debug, Deserialize)]
pub struct RouteDeleteDto {
  pub uuid: String,
}

pub async fn delete_route(
  axum::extract::Query(payload): axum::extract::Query<RouteDeleteDto>,
) -> Result<impl IntoResponse, AppError> {
  let file_name = format!("{}.json", payload.uuid);
  let dir_path = Path::new("./data/routes");
  let file_path = dir_path.join(&file_name);

  if !file_path.exists() {
    return Ok((StatusCode::NOT_FOUND, "Route not found").into_response());
  }

  fs::remove_file(file_path).await?;

  Ok((StatusCode::OK, "Route deleted successfully").into_response())
}
