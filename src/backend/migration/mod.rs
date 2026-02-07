mod migrations;

use anyhow::Result;
use serde_json::Value;
use std::path::Path;
use tokio::fs;

/// Current config data version. Increment this when adding new migrations.
pub const CURRENT_VERSION: u64 = 1;

type MigrationFn = fn(&mut Value) -> Result<()>;

/// Returns the ordered list of migration functions.
/// Index 0 = v0→v1, index 1 = v1→v2, etc.
fn get_migrations() -> Vec<MigrationFn> {
  vec![
    migrations::migrate_v0_to_v1, // v0 → v1
  ]
}

/// Scan all config files and run pending migrations.
/// Called once at server startup before accepting requests.
pub async fn run_migrations() -> Result<()> {
  let dir_path = Path::new("./data/configs");
  if !dir_path.exists() {
    log::info!("Migration: no configs directory found, skipping");
    return Ok(());
  }

  let migrations = get_migrations();
  let mut migrated = 0u32;
  let mut errors = 0u32;
  let mut skipped = 0u32;

  let mut entries = fs::read_dir(dir_path).await?;
  while let Some(entry) = entries.next_entry().await? {
    let path = entry.path();
    if path.extension().and_then(|s| s.to_str()) != Some("json") {
      continue;
    }

    let file_name = path
      .file_name()
      .and_then(|n| n.to_str())
      .unwrap_or("unknown")
      .to_string();

    match migrate_file(&path, &migrations).await {
      Ok(true) => {
        migrated += 1;
        log::info!("Migration: migrated {}", file_name);
      }
      Ok(false) => {
        skipped += 1;
      }
      Err(e) => {
        errors += 1;
        log::error!("Migration: failed to migrate {}: {}", file_name, e);
      }
    }
  }

  log::info!(
    "Migration complete: {} migrated, {} skipped, {} errors",
    migrated,
    skipped,
    errors
  );

  Ok(())
}

/// Migrate a single config file. Returns true if the file was modified.
async fn migrate_file(path: &Path, migrations: &[MigrationFn]) -> Result<bool> {
  let content = fs::read_to_string(path).await?;
  let mut data: Value = serde_json::from_str(&content)?;

  let version = data.get("version").and_then(|v| v.as_u64()).unwrap_or(0);

  if version >= CURRENT_VERSION {
    return Ok(false);
  }

  // Run each pending migration in order
  for v in version..CURRENT_VERSION {
    let idx = v as usize;
    if idx < migrations.len() {
      migrations[idx](&mut data)?;
    }
  }

  // Set version to current
  data["version"] = Value::from(CURRENT_VERSION);

  // Write back
  let output = serde_json::to_string(&data)?;
  fs::write(path, output.as_bytes()).await?;

  Ok(true)
}
