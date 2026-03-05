use axum::{
    extract::{Path, State},
    http::{StatusCode, Uri, header},
    response::{IntoResponse, Json, Response},
};
use log::{error, info};
use rust_embed::Embed;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

use crate::state::{AppState, Selector};

#[derive(Embed)]
#[folder = "web/dist/"]
pub struct Asset;

#[derive(Serialize, Deserialize)]
pub struct CustomFieldsRequest {
    pub subscription_urls: Vec<String>,
    pub selectors: Vec<Selector>,
}

pub async fn get_custom_fields_handler(State(state): State<AppState>) -> Response {
    let (urls, selectors) = state.get_custom_fields().await;
    (
        StatusCode::OK,
        Json(CustomFieldsRequest {
            subscription_urls: urls,
            selectors,
        }),
    )
        .into_response()
}

pub async fn update_custom_fields_handler(
    State(state): State<AppState>,
    Json(payload): Json<CustomFieldsRequest>,
) -> Response {
    match state
        .set_custom_fields(payload.subscription_urls, payload.selectors)
        .await
    {
        Ok(_) => {
            info!("Custom fields updated");
            (StatusCode::OK, "Custom fields updated").into_response()
        }
        Err(e) => {
            error!("Failed to write state file: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                "Failed to write state file",
            )
                .into_response()
        }
    }
}

#[derive(Serialize)]
pub struct ConfigsResponse {
    pub files: Vec<String>,
    pub active: Option<String>,
}

pub async fn list_configs_handler(State(state): State<AppState>) -> Response {
    let mut files = Vec::new();
    let mut entries = match tokio::fs::read_dir(&state.state_directory).await {
        Ok(e) => e,
        Err(e) => {
            error!("Failed to read state directory: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                "Failed to read state directory",
            )
                .into_response();
        }
    };

    while let Ok(Some(entry)) = entries.next_entry().await {
        let path = entry.path();
        if path.is_file()
            && path.extension().is_some_and(|ext| ext == "json")
            && let Some(name) = path.file_name().and_then(|n| n.to_str())
        {
            files.push(name.to_string());
        }
    }

    let active = state.get_active_config().await;

    (StatusCode::OK, Json(ConfigsResponse { files, active })).into_response()
}

fn safe_filename(filename: &str) -> Option<String> {
    if filename.contains('/') || filename.contains('\\') || filename.contains("..") {
        None
    } else {
        Some(filename.to_string())
    }
}

pub async fn get_config_handler(
    State(state): State<AppState>,
    Path(filename): Path<String>,
) -> Response {
    let safe_name = match safe_filename(&filename) {
        Some(n) => n,
        None => return (StatusCode::BAD_REQUEST, "Invalid filename").into_response(),
    };

    let config_path = state.state_directory.join(safe_name);
    match tokio::fs::read_to_string(&config_path).await {
        Ok(content) => (
            StatusCode::OK,
            [(header::CONTENT_TYPE, "application/json")],
            content,
        )
            .into_response(),
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => {
            (StatusCode::NOT_FOUND, "Config file not found").into_response()
        }
        Err(e) => {
            error!("Failed to read config file: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                "Failed to read config file",
            )
                .into_response()
        }
    }
}

pub async fn update_config_handler(
    State(state): State<AppState>,
    Path(filename): Path<String>,
    body: String,
) -> Response {
    let safe_name = match safe_filename(&filename) {
        Some(n) => n,
        None => return (StatusCode::BAD_REQUEST, "Invalid filename").into_response(),
    };

    let config_path = state.state_directory.join(safe_name);
    match tokio::fs::write(&config_path, body).await {
        Ok(_) => {
            info!("Config file updated at {:?}", config_path);
            (StatusCode::OK, "Config updated").into_response()
        }
        Err(e) => {
            error!("Failed to write config file: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                "Failed to write config file",
            )
                .into_response()
        }
    }
}

#[derive(Deserialize)]
pub struct ApplyConfigRequest {
    pub filename: String,
}

pub async fn apply_config_handler(
    State(state): State<AppState>,
    Json(payload): Json<ApplyConfigRequest>,
) -> Response {
    let safe_name = match safe_filename(&payload.filename) {
        Some(n) => n,
        None => return (StatusCode::BAD_REQUEST, "Invalid filename").into_response(),
    };

    let config_path = state.state_directory.join(&safe_name);
    let content = match tokio::fs::read_to_string(&config_path).await {
        Ok(c) => c,
        Err(_) => return (StatusCode::NOT_FOUND, "Config file not found").into_response(),
    };

    // Save active state
    if let Err(e) = state.set_active_config(safe_name.clone()).await {
        error!("Failed to save active config state: {}", e);
        return (StatusCode::INTERNAL_SERVER_ERROR, "Failed to save state").into_response();
    }

    // Write to /tmp/sing-box-lite-active.json
    let tmp_path = PathBuf::from("/tmp/sing-box-lite-active.json");
    if let Err(e) = tokio::fs::write(&tmp_path, content).await {
        error!("Failed to write temporary config: {}", e);
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            "Failed to write temporary config",
        )
            .into_response();
    }

    info!("Applied config {} to {:?}", safe_name, tmp_path);
    (StatusCode::OK, "Config applied successfully").into_response()
}

pub async fn static_handler(uri: Uri) -> impl IntoResponse {
    let path = uri.path().trim_start_matches('/');

    // If the path is empty, we default to "index.html"
    let path = if path.is_empty() { "index.html" } else { path };

    match Asset::get(path) {
        Some(content) => {
            let mime = mime_guess::from_path(path).first_or_octet_stream();
            ([(header::CONTENT_TYPE, mime.as_ref())], content.data).into_response()
        }
        None => {
            // Fallback to index.html for SPA routing if the file doesn't exist
            match Asset::get("index.html") {
                Some(content) => {
                    let mime = mime_guess::from_path("index.html").first_or_octet_stream();
                    ([(header::CONTENT_TYPE, mime.as_ref())], content.data).into_response()
                }
                None => (StatusCode::NOT_FOUND, "404 Not Found").into_response(),
            }
        }
    }
}
