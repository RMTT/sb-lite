use axum::{
    extract::{Path, State},
    http::{StatusCode, Uri, header},
    response::{IntoResponse, Json, Response},
};
use log::{error, info};
use rust_embed::Embed;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

use crate::state::{AppState, Selector, Subscription};

#[derive(Embed)]
#[folder = "web/dist/"]
pub struct Asset;

#[derive(Serialize, Deserialize)]
pub struct CustomFieldsRequest {
    pub subscriptions: Vec<Subscription>,
    pub selectors: Vec<Selector>,
}

pub async fn get_custom_fields_handler(State(state): State<AppState>) -> Response {
    let (urls, selectors) = state.get_custom_fields().await;
    (
        StatusCode::OK,
        Json(CustomFieldsRequest {
            subscriptions: urls,
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
        .set_custom_fields(payload.subscriptions, payload.selectors)
        .await
    {
        Ok(_) => {
            info!("Custom fields updated");
            // Regenerate config if there is an active one
            if let Err(e) = crate::merge::generate_and_write_active_config(&state).await {
                error!(
                    "Failed to generate and write active config after updating custom fields: {}",
                    e
                );
            }
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

pub async fn delete_config_handler(
    State(state): State<AppState>,
    Path(filename): Path<String>,
) -> Response {
    let safe_name = match safe_filename(&filename) {
        Some(n) => n,
        None => return (StatusCode::BAD_REQUEST, "Invalid filename").into_response(),
    };

    let config_path = state.state_directory.join(&safe_name);
    match tokio::fs::remove_file(&config_path).await {
        Ok(_) => {
            info!("Config file deleted at {:?}", config_path);

            // If the deleted config was active, optionally clear active config state
            if let Some(active) = state.get_active_config().await {
                if active == safe_name {
                    let _ = state.set_active_config("".to_string()).await;
                }
            }

            (StatusCode::OK, "Config deleted").into_response()
        }
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => {
            (StatusCode::NOT_FOUND, "Config file not found").into_response()
        }
        Err(e) => {
            error!("Failed to delete config file: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                "Failed to delete config file",
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

#[derive(serde::Deserialize, Debug)]
pub struct Sip008Data {
    pub servers: Option<Vec<Sip008Server>>,
}

#[derive(serde::Deserialize, Debug)]
pub struct Sip008Server {
    pub server: String,
    pub server_port: u16,
    pub password: Option<String>,
    pub method: Option<String>,
    pub remarks: Option<String>,
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

    // Parse base config
    let mut config: serde_json::Value = match serde_json::from_str(&content) {
        Ok(c) => c,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("Invalid base config JSON: {}", e),
            )
                .into_response();
        }
    };

    let (subs, _) = state.get_custom_fields().await;
    let mut new_outbounds = Vec::new();

    for sub in subs {
        if let Some(raw) = sub.raw_data {
            if let Ok(sip_data) = serde_json::from_str::<Sip008Data>(&raw) {
                if let Some(servers) = sip_data.servers {
                    for server in servers {
                        let tag = server.remarks.unwrap_or_else(|| server.server.clone());
                        let mut outbound = serde_json::json!({
                            "type": "shadowsocks",
                            "tag": tag,
                            "server": server.server,
                            "server_port": server.server_port,
                            "method": server.method.unwrap_or_else(|| "chacha20-ietf-poly1305".to_string()),
                        });

                        if let Some(password) = server.password {
                            outbound["password"] = serde_json::Value::String(password);
                        }

                        new_outbounds.push(outbound);
                    }
                }
            } else {
                error!(
                    "Failed to parse subscription data from url: {} as SIP008",
                    sub.url
                );
            }
        }
    }

    if let Some(outbounds) = config.get_mut("outbounds").and_then(|o| o.as_array_mut()) {
        outbounds.extend(new_outbounds);
    } else {
        // Create an outbounds array if it doesn't exist
        config["outbounds"] = serde_json::Value::Array(new_outbounds);
    }

    let merged_content = match serde_json::to_string_pretty(&config) {
        Ok(c) => c,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("Failed to serialize merged config: {}", e),
            )
                .into_response();
        }
    };

    // Save active state
    if let Err(e) = state.set_active_config(safe_name.clone()).await {
        error!("Failed to save active config state: {}", e);
        return (StatusCode::INTERNAL_SERVER_ERROR, "Failed to save state").into_response();
    }

    // Write to /tmp/sing-box-lite-active.json
    let tmp_path = PathBuf::from("/tmp/sing-box-lite-active.json");
    if let Err(e) = tokio::fs::write(&tmp_path, merged_content).await {
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

#[derive(Deserialize)]
pub struct ValidateSubscriptionRequest {
    pub url: String,
}

#[derive(Serialize)]
pub struct ValidateSubscriptionResponse {
    pub raw_data: String,
    pub last_fetched: chrono::DateTime<chrono::Utc>,
}

pub async fn validate_subscription_handler(
    Json(payload): Json<ValidateSubscriptionRequest>,
) -> Response {
    let client = reqwest::Client::builder()
        .user_agent("Shadowrocket")
        .build()
        .unwrap_or_default();

    match client.get(&payload.url).send().await {
        Ok(resp) => {
            let status = resp.status();
            if status.is_success() {
                if let Ok(text) = resp.text().await {
                    // Try to parse it to ensure it's valid SIP008
                    match serde_json::from_str::<Sip008Data>(&text) {
                        Ok(_data) => {
                            // Valid format
                            let response_data = ValidateSubscriptionResponse {
                                raw_data: text,
                                last_fetched: chrono::Utc::now(),
                            };
                            return (StatusCode::OK, Json(response_data)).into_response();
                        }
                        Err(e) => {
                            error!(
                                "Failed to parse subscription {} as SIP008: {}",
                                payload.url, e
                            );
                            return (
                                StatusCode::BAD_REQUEST,
                                "Subscription data is not in a supported format (SIP008)",
                            )
                                .into_response();
                        }
                    }
                }
            }
            (
                StatusCode::BAD_GATEWAY,
                format!("Failed to fetch subscription: HTTP {}", status),
            )
                .into_response()
        }
        Err(e) => (
            StatusCode::BAD_GATEWAY,
            format!("Failed to fetch subscription: {}", e),
        )
            .into_response(),
    }
}

pub async fn update_subscription_handler(
    State(state): State<AppState>,
    Path(index): Path<usize>,
) -> Response {
    let (subs, _) = state.get_custom_fields().await;
    if index >= subs.len() {
        return (StatusCode::BAD_REQUEST, "Invalid subscription index").into_response();
    }

    let url = &subs[index].url;
    let client = reqwest::Client::builder()
        .user_agent("Shadowrocket")
        .build()
        .unwrap_or_default();

    match client.get(url).send().await {
        Ok(resp) => {
            let status = resp.status();
            if status.is_success() {
                if let Ok(text) = resp.text().await {
                    match serde_json::from_str::<Sip008Data>(&text) {
                        Ok(_) => {
                            if let Err(e) = state
                                .update_subscription(index, chrono::Utc::now(), text)
                                .await
                            {
                                return (
                                    StatusCode::INTERNAL_SERVER_ERROR,
                                    format!("Failed to update subscription state: {}", e),
                                )
                                    .into_response();
                            }
                            info!("Successfully updated subscription: {}", url);
                            // Regenerate config if there is an active one
                            if let Err(e) =
                                crate::merge::generate_and_write_active_config(&state).await
                            {
                                error!(
                                    "Failed to generate and write active config after updating subscription: {}",
                                    e
                                );
                            }
                            return (StatusCode::OK, "Subscription updated").into_response();
                        }
                        Err(e) => {
                            error!("Failed to parse subscription {} as SIP008: {}", url, e);
                            return (
                                StatusCode::BAD_REQUEST,
                                "Fetched subscription data is not in a supported format (SIP008)",
                            )
                                .into_response();
                        }
                    }
                }
            }
            (
                StatusCode::BAD_GATEWAY,
                format!("Failed to fetch subscription: HTTP {}", status),
            )
                .into_response()
        }
        Err(e) => (
            StatusCode::BAD_GATEWAY,
            format!("Failed to fetch subscription: {}", e),
        )
            .into_response(),
    }
}
