use axum::{Json, extract::Multipart, http::StatusCode, response::IntoResponse};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
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
  #[serde(skip_serializing_if = "Option::is_none")]
  pub content_hash: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct ContentHashResponse {
  pub content_hash: String,
}

/// Compute SHA-256 hash of all files under a directory.
/// Files are sorted by path to ensure deterministic output.
fn compute_dir_hash(dir: &std::path::Path) -> anyhow::Result<String> {
  if !dir.exists() {
    return Ok(String::from(
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    ));
  }

  let mut entries: Vec<std::path::PathBuf> = Vec::new();
  collect_files(dir, &mut entries)?;
  entries.sort();

  let mut hasher = Sha256::new();
  for path in &entries {
    let rel = path.strip_prefix(dir).unwrap_or(path);
    hasher.update(rel.to_string_lossy().as_bytes());
    let content = std::fs::read(path)?;
    hasher.update(&content);
  }

  Ok(format!("{:x}", hasher.finalize()))
}

fn compute_data_hash() -> anyhow::Result<String> {
  compute_dir_hash(std::path::Path::new(DATA_DIR))
}

fn collect_files(
  dir: &std::path::Path,
  entries: &mut Vec<std::path::PathBuf>,
) -> anyhow::Result<()> {
  for entry in std::fs::read_dir(dir)? {
    let entry = entry?;
    let path = entry.path();
    if path.is_dir() {
      collect_files(&path, entries)?;
    } else {
      entries.push(path);
    }
  }
  Ok(())
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

  // Compute content hash of data directory
  let content_hash = tokio::task::spawn_blocking(compute_data_hash)
    .await
    .map_err(|e| AppError::InternalServerError(format!("Task join error: {}", e)))?
    .map_err(|e| AppError::InternalServerError(format!("Hash computation failed: {}", e)))?;

  let now = chrono::Local::now();
  let metadata = BackupMetadata {
    uuid: payload.uuid,
    name: payload.name,
    description: payload.description,
    created_at: now.to_rfc3339(),
    file_name: archive_name,
    file_size,
    content_hash: Some(content_hash),
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

#[derive(Debug, Deserialize)]
pub struct BackupRestoreDto {
  pub uuid: String,
}

pub async fn restore_backup(
  axum::extract::Query(payload): axum::extract::Query<BackupRestoreDto>,
) -> Result<impl IntoResponse, AppError> {
  let backup_dir = Path::new(BACKUP_DIR);
  let meta_path = backup_dir.join(format!("{}.json", payload.uuid));

  if !meta_path.exists() {
    return Err(AppError::NotFound("Backup not found".to_string()));
  }

  let content = fs::read_to_string(&meta_path).await?;
  let metadata: BackupMetadata = serde_json::from_str(&content)?;

  let archive_path = backup_dir.join(&metadata.file_name);
  if !archive_path.exists() {
    return Err(AppError::NotFound("Backup archive not found".to_string()));
  }

  // Remove existing data directory
  let data_dir = Path::new(DATA_DIR);
  if data_dir.exists() {
    fs::remove_dir_all(data_dir).await?;
  }

  // Extract tar.gz archive (contains data/ prefix, extracts to ./data/)
  let archive_path_clone = archive_path.clone();
  tokio::task::spawn_blocking(move || -> anyhow::Result<()> {
    use std::fs::File;
    use std::io::BufReader;

    let tar_gz = File::open(&archive_path_clone)?;
    let buf_reader = BufReader::new(tar_gz);
    let dec = flate2::read::GzDecoder::new(buf_reader);
    let mut archive = tar::Archive::new(dec);
    archive.unpack(".")?;
    Ok(())
  })
  .await
  .map_err(|e| AppError::InternalServerError(format!("Task join error: {}", e)))?
  .map_err(|e| AppError::InternalServerError(format!("Archive extraction failed: {}", e)))?;

  Ok((StatusCode::OK, "Backup restored successfully"))
}

pub async fn current_hash() -> Result<impl IntoResponse, AppError> {
  let hash = tokio::task::spawn_blocking(compute_data_hash)
    .await
    .map_err(|e| AppError::InternalServerError(format!("Task join error: {}", e)))?
    .map_err(|e| AppError::InternalServerError(format!("Hash computation failed: {}", e)))?;

  Ok(Json(ContentHashResponse { content_hash: hash }))
}

pub async fn upload_backup(mut multipart: Multipart) -> Result<impl IntoResponse, AppError> {
  // 1. Read file from multipart
  let mut file_bytes: Option<Vec<u8>> = None;
  while let Ok(Some(field)) = multipart.next_field().await {
    if field.name() == Some("file") {
      match field.bytes().await {
        Ok(data) => {
          file_bytes = Some(data.to_vec());
          break;
        }
        Err(e) => {
          return Err(AppError::BadRequest(format!("Failed to read file: {}", e)));
        }
      }
    }
  }

  let file_bytes =
    file_bytes.ok_or_else(|| AppError::BadRequest("No file field found".to_string()))?;

  if file_bytes.is_empty() {
    return Err(AppError::BadRequest("Empty file".to_string()));
  }

  // 2. Save to temp file and extract to temp dir
  let temp_dir = tempfile::tempdir()
    .map_err(|e| AppError::InternalServerError(format!("Failed to create temp dir: {}", e)))?;

  let temp_archive = temp_dir.path().join("upload.tar.gz");
  fs::write(&temp_archive, &file_bytes).await?;

  // Extract to temp dir
  let temp_extract_dir = temp_dir.path().join("extracted");
  fs::create_dir_all(&temp_extract_dir).await?;

  let temp_archive_clone = temp_archive.clone();
  let temp_extract_clone = temp_extract_dir.clone();
  tokio::task::spawn_blocking(move || -> anyhow::Result<()> {
    use std::fs::File;
    use std::io::BufReader;

    let tar_gz = File::open(&temp_archive_clone)?;
    let buf_reader = BufReader::new(tar_gz);
    let dec = flate2::read::GzDecoder::new(buf_reader);
    let mut archive = tar::Archive::new(dec);
    archive.unpack(&temp_extract_clone)?;
    Ok(())
  })
  .await
  .map_err(|e| AppError::InternalServerError(format!("Task join error: {}", e)))?
  .map_err(|e| AppError::BadRequest(format!("Invalid archive: {}", e)))?;

  // 3. Compute content hash of extracted data
  let data_in_temp = temp_extract_dir.join("data");
  if !data_in_temp.exists() {
    return Err(AppError::BadRequest(
      "Archive does not contain a data/ directory".to_string(),
    ));
  }

  let data_in_temp_clone = data_in_temp.clone();
  let uploaded_hash = tokio::task::spawn_blocking(move || compute_dir_hash(&data_in_temp_clone))
    .await
    .map_err(|e| AppError::InternalServerError(format!("Task join error: {}", e)))?
    .map_err(|e| AppError::InternalServerError(format!("Hash computation failed: {}", e)))?;

  // 4. Check for duplicates among existing backups
  let backup_dir = Path::new(BACKUP_DIR);
  if backup_dir.exists() {
    let mut entries = fs::read_dir(backup_dir).await?;
    while let Some(entry) = entries.next_entry().await? {
      let path = entry.path();
      if path.extension().and_then(|s| s.to_str()) == Some("json") {
        let content = fs::read_to_string(&path).await?;
        if let Ok(metadata) = serde_json::from_str::<BackupMetadata>(&content) {
          if metadata.content_hash.as_deref() == Some(&uploaded_hash) {
            return Ok(
              (
                StatusCode::CONFLICT,
                Json(serde_json::json!({
                  "error": "already_exists",
                  "name": metadata.name
                })),
              )
                .into_response(),
            );
          }
        }
      }
    }
  } else {
    fs::create_dir_all(backup_dir).await?;
  }

  // 5. Save archive and metadata
  let new_uuid = uuid::Uuid::new_v4().to_string();
  let archive_name = format!("{}.tar.gz", new_uuid);
  let archive_dest = backup_dir.join(&archive_name);
  fs::copy(&temp_archive, &archive_dest).await?;

  let file_size = fs::metadata(&archive_dest).await?.len();
  let now = chrono::Local::now();

  // Use file name without extension as backup name
  let backup_name = format_date_time();

  let metadata = BackupMetadata {
    uuid: new_uuid.clone(),
    name: backup_name,
    description: "Uploaded backup".to_string(),
    created_at: now.to_rfc3339(),
    file_name: archive_name,
    file_size,
    content_hash: Some(uploaded_hash),
  };

  let meta_path = backup_dir.join(format!("{}.json", new_uuid));
  fs::write(&meta_path, serde_json::to_string(&metadata)?.as_bytes()).await?;

  // 6. Restore: replace ./data with uploaded content
  let data_dir = Path::new(DATA_DIR);
  if data_dir.exists() {
    fs::remove_dir_all(data_dir).await?;
  }

  let archive_dest_clone = archive_dest.clone();
  tokio::task::spawn_blocking(move || -> anyhow::Result<()> {
    use std::fs::File;
    use std::io::BufReader;

    let tar_gz = File::open(&archive_dest_clone)?;
    let buf_reader = BufReader::new(tar_gz);
    let dec = flate2::read::GzDecoder::new(buf_reader);
    let mut archive = tar::Archive::new(dec);
    archive.unpack(".")?;
    Ok(())
  })
  .await
  .map_err(|e| AppError::InternalServerError(format!("Task join error: {}", e)))?
  .map_err(|e| AppError::InternalServerError(format!("Archive extraction failed: {}", e)))?;

  Ok((StatusCode::CREATED, Json(serde_json::to_value(&metadata)?)).into_response())
}

fn format_date_time() -> String {
  let now = chrono::Local::now();
  now.format("%Y%m%d%H%M%S").to_string()
}
