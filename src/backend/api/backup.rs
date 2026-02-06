use axum::{Json, http::StatusCode, response::IntoResponse};
use serde::{Deserialize, Serialize};
use std::path::Path;
use tokio::fs;

use crate::backend::error::AppError;

const BACKUP_DIR: &str = "./backups";
const DATA_DIR: &str = "./data";

#[derive(Debug, Deserialize)]
pub struct BackupCreateDto {
  pub uuid: String,
  pub name: String,
  pub description: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct BackupMetadata {
  pub uuid: String,
  pub name: String,
  pub description: String,
  pub created_at: String,
  pub file_name: String,
  pub file_size: u64,
}

pub async fn create_backup(
  Json(payload): Json<BackupCreateDto>,
) -> Result<impl IntoResponse, AppError> {
  let backup_dir = Path::new(BACKUP_DIR);
  if !backup_dir.exists() {
    fs::create_dir_all(backup_dir).await?;
  }

  let meta_path = backup_dir.join(format!("{}.json", payload.uuid));
  if meta_path.exists() {
    return Ok((StatusCode::CONFLICT, "Backup with this UUID already exists").into_response());
  }

  let archive_name = format!("{}.tar.gz", payload.uuid);
  let archive_path = backup_dir.join(&archive_name);

  // Create tar.gz archive of the data directory
  let data_dir = Path::new(DATA_DIR);
  if !data_dir.exists() {
    return Ok((StatusCode::BAD_REQUEST, "Data directory does not exist").into_response());
  }

  // Use blocking task for compression
  let archive_path_clone = archive_path.clone();
  let data_dir_str = DATA_DIR.to_string();
  tokio::task::spawn_blocking(move || -> anyhow::Result<()> {
    use std::fs::File;
    use std::io::BufWriter;

    let tar_gz = File::create(&archive_path_clone)?;
    let buf_writer = BufWriter::new(tar_gz);
    let enc = flate2::write::GzEncoder::new(buf_writer, flate2::Compression::default());
    let mut tar = tar::Builder::new(enc);
    tar.append_dir_all("data", &data_dir_str)?;
    tar.finish()?;
    Ok(())
  })
  .await
  .map_err(|e| AppError::InternalServerError(format!("Task join error: {}", e)))?
  .map_err(|e| AppError::InternalServerError(format!("Archive creation failed: {}", e)))?;

  // Get archive file size
  let file_size = fs::metadata(&archive_path).await?.len();

  let now = chrono::Local::now();
  let metadata = BackupMetadata {
    uuid: payload.uuid,
    name: payload.name,
    description: payload.description,
    created_at: now.to_rfc3339(),
    file_name: archive_name,
    file_size,
  };

  fs::write(&meta_path, serde_json::to_string(&metadata)?.as_bytes()).await?;

  Ok((StatusCode::CREATED, "Backup created successfully").into_response())
}

pub async fn list_backups() -> Result<impl IntoResponse, AppError> {
  let backup_dir = Path::new(BACKUP_DIR);
  if !backup_dir.exists() {
    return Ok(Json(Vec::<BackupMetadata>::new()));
  }

  let mut entries = fs::read_dir(backup_dir).await?;
  let mut backups = Vec::new();

  while let Some(entry) = entries.next_entry().await? {
    let path = entry.path();
    if path.extension().and_then(|s| s.to_str()) == Some("json") {
      let content = fs::read_to_string(&path).await?;
      if let Ok(metadata) = serde_json::from_str::<BackupMetadata>(&content) {
        backups.push(metadata);
      }
    }
  }

  // Sort by created_at descending (newest first)
  backups.sort_by(|a, b| b.created_at.cmp(&a.created_at));

  Ok(Json(backups))
}

#[derive(Debug, Deserialize)]
pub struct BackupDeleteDto {
  pub uuid: String,
}

pub async fn delete_backup(
  axum::extract::Query(payload): axum::extract::Query<BackupDeleteDto>,
) -> Result<impl IntoResponse, AppError> {
  let backup_dir = Path::new(BACKUP_DIR);
  let meta_path = backup_dir.join(format!("{}.json", payload.uuid));
  let archive_path = backup_dir.join(format!("{}.tar.gz", payload.uuid));

  if !meta_path.exists() {
    return Ok((StatusCode::NOT_FOUND, "Backup not found").into_response());
  }

  // Delete both the metadata file and the archive
  if meta_path.exists() {
    fs::remove_file(&meta_path).await?;
  }
  if archive_path.exists() {
    fs::remove_file(&archive_path).await?;
  }

  Ok((StatusCode::OK, "Backup deleted successfully").into_response())
}

pub async fn download_backup(
  axum::extract::Path(uuid): axum::extract::Path<String>,
) -> Result<impl IntoResponse, AppError> {
  let backup_dir = Path::new(BACKUP_DIR);
  let meta_path = backup_dir.join(format!("{}.json", uuid));

  if !meta_path.exists() {
    return Err(AppError::NotFound("Backup not found".to_string()));
  }

  let content = fs::read_to_string(&meta_path).await?;
  let metadata: BackupMetadata = serde_json::from_str(&content)?;

  let archive_path = backup_dir.join(&metadata.file_name);
  if !archive_path.exists() {
    return Err(AppError::NotFound("Backup archive not found".to_string()));
  }

  let file_bytes = fs::read(&archive_path).await?;

  let display_name = format!("{}.tar.gz", metadata.name);
  let encoded_name = urlencoding::encode(&display_name);

  Ok((
    StatusCode::OK,
    [
      (
        axum::http::header::CONTENT_TYPE,
        "application/gzip".to_string(),
      ),
      (
        axum::http::header::CONTENT_DISPOSITION,
        format!(
          "attachment; filename=\"{}.tar.gz\"; filename*=UTF-8''{}",
          metadata.uuid, encoded_name
        ),
      ),
    ],
    file_bytes,
  ))
}
