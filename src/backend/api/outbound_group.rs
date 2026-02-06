use axum::{http::StatusCode, response::IntoResponse, Json};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

const OUTBOUND_GROUP_DIR: &str = "./data/outbound_groups";
const OUTBOUND_DIR: &str = "./data/outbounds";
const FILTER_DIR: &str = "./data/filters";

#[derive(Debug, Deserialize, Serialize)]
pub struct OutboundGroupCreateDto {
    pub uuid: String,
    pub name: String,
    pub group_type: String,
    pub outbounds: Vec<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub url: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub interval: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tolerance: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub idle_timeout: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub interrupt_exist_connections: Option<bool>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateQuery {
    pub uuid: String,
}

#[derive(Debug, Deserialize)]
pub struct DeleteQuery {
    pub uuid: String,
}

#[derive(Debug, Serialize)]
pub struct OutboundOptionDto {
    pub uuid: String,
    pub value: String,
    pub label: String,
    pub source: String,
    #[serde(rename = "type")]
    pub option_type: Option<String>,
}

pub async fn create_outbound_group(
    Json(payload): Json<OutboundGroupCreateDto>,
) -> impl IntoResponse {
    let file_path = PathBuf::from(OUTBOUND_GROUP_DIR).join(format!("{}.json", payload.uuid));

    if file_path.exists() {
        return (
            StatusCode::CONFLICT,
            "Outbound group with this UUID already exists",
        )
            .into_response();
    }

    // Serialize the payload
    let json_content = match serde_json::to_string_pretty(&payload) {
        Ok(content) => content,
        Err(e) => {
            let error_msg = format!("Failed to serialize outbound group: {}", e);
            eprintln!("{}", error_msg);
            return (StatusCode::INTERNAL_SERVER_ERROR, error_msg).into_response();
        }
    };

    // Write to file
    if let Err(e) = fs::write(&file_path, json_content) {
        let error_msg = format!("Failed to write outbound group file: {}", e);
        eprintln!("{}", error_msg);
        return (StatusCode::INTERNAL_SERVER_ERROR, error_msg).into_response();
    }

    (StatusCode::CREATED, Json(payload)).into_response()
}

pub async fn list_outbound_groups() -> impl IntoResponse {
    let mut groups = Vec::new();

    let entries = match fs::read_dir(OUTBOUND_GROUP_DIR) {
        Ok(entries) => entries,
        Err(_) => {
            return (StatusCode::OK, Json(groups)).into_response();
        }
    };

    for entry in entries.flatten() {
        let path = entry.path();
        if path.extension().and_then(|s| s.to_str()) == Some("json") {
            if let Ok(content) = fs::read_to_string(&path) {
                if let Ok(group) = serde_json::from_str::<OutboundGroupCreateDto>(&content) {
                    // Return full data instead of summary
                    groups.push(group);
                }
            }
        }
    }

    (StatusCode::OK, Json(groups)).into_response()
}

pub async fn update_outbound_group(
    axum::extract::Query(query): axum::extract::Query<UpdateQuery>,
    Json(payload): Json<OutboundGroupCreateDto>,
) -> impl IntoResponse {
    let file_path = PathBuf::from(OUTBOUND_GROUP_DIR).join(format!("{}.json", query.uuid));

    if !file_path.exists() {
        return (StatusCode::NOT_FOUND, "Outbound group not found").into_response();
    }

    // Serialize the payload
    let json_content = match serde_json::to_string_pretty(&payload) {
        Ok(content) => content,
        Err(e) => {
            let error_msg = format!("Failed to serialize outbound group: {}", e);
            eprintln!("{}", error_msg);
            return (StatusCode::INTERNAL_SERVER_ERROR, error_msg).into_response();
        }
    };

    // Write to file
    if let Err(e) = fs::write(&file_path, json_content) {
        let error_msg = format!("Failed to update outbound group file: {}", e);
        eprintln!("{}", error_msg);
        return (StatusCode::INTERNAL_SERVER_ERROR, error_msg).into_response();
    }

    (StatusCode::OK, Json(payload)).into_response()
}

pub async fn delete_outbound_group(
    axum::extract::Query(query): axum::extract::Query<DeleteQuery>,
) -> impl IntoResponse {
    let file_path = PathBuf::from(OUTBOUND_GROUP_DIR).join(format!("{}.json", query.uuid));

    if !file_path.exists() {
        return (StatusCode::NOT_FOUND, "Outbound group not found").into_response();
    }

    if let Err(e) = fs::remove_file(&file_path) {
        let error_msg = format!("Failed to delete outbound group file: {}", e);
        eprintln!("{}", error_msg);
        return (StatusCode::INTERNAL_SERVER_ERROR, error_msg).into_response();
    }

    (StatusCode::OK, "Outbound group deleted successfully").into_response()
}

pub async fn get_available_options() -> impl IntoResponse {
    let mut options = Vec::new();

    // Read outbound options
    if let Ok(entries) = fs::read_dir(OUTBOUND_DIR) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.extension().and_then(|s| s.to_str()) == Some("json") {
                if let Ok(content) = fs::read_to_string(&path) {
                    if let Ok(outbound_wrapper) =
                        serde_json::from_str::<serde_json::Value>(&content)
                    {
                        // Get UUID from wrapper
                        let uuid = outbound_wrapper
                            .get("uuid")
                            .and_then(|u| u.as_str())
                            .unwrap_or("")
                            .to_string();

                        // Outbound data is stored with a "json" field containing the actual config as a string
                        if let Some(json_str) = outbound_wrapper.get("json").and_then(|j| j.as_str())
                        {
                            // Parse the inner JSON string
                            if let Ok(outbound_config) =
                                serde_json::from_str::<serde_json::Value>(json_str)
                            {
                                if let Some(tag) =
                                    outbound_config.get("tag").and_then(|t| t.as_str())
                                {
                                    let outbound_type = outbound_config
                                        .get("type")
                                        .and_then(|t| t.as_str())
                                        .map(|s| s.to_string());

                                    options.push(OutboundOptionDto {
                                        uuid,
                                        value: tag.to_string(),
                                        label: tag.to_string(),
                                        source: "outbound".to_string(),
                                        option_type: outbound_type,
                                    });
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    // Read filter options
    if let Ok(entries) = fs::read_dir(FILTER_DIR) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.extension().and_then(|s| s.to_str()) == Some("json") {
                if let Ok(content) = fs::read_to_string(&path) {
                    if let Ok(filter) = serde_json::from_str::<serde_json::Value>(&content) {
                        let uuid = filter
                            .get("uuid")
                            .and_then(|u| u.as_str())
                            .unwrap_or("")
                            .to_string();

                        if let Some(name) = filter.get("name").and_then(|n| n.as_str()) {
                            let filter_type = filter
                                .get("filter_type")
                                .and_then(|t| t.as_str())
                                .map(|s| s.to_string());

                            options.push(OutboundOptionDto {
                                uuid,
                                value: name.to_string(),
                                label: name.to_string(),
                                source: "filter".to_string(),
                                option_type: filter_type,
                            });
                        }
                    }
                }
            }
        }
    }

    (StatusCode::OK, Json(options)).into_response()
}
