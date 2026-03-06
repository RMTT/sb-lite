use axum::{
    extract::{Path, State},
    http::{StatusCode, Uri, header},
    response::{IntoResponse, Json, Response},
};
use log::{error, info};
use rust_embed::Embed;
use serde::{Deserialize, Serialize};

use crate::state::{AppState, Selector, Subscription};

#[derive(Embed)]
#[folder = "web/dist/"]
pub struct Asset;

#[derive(Serialize, Deserialize)]
pub struct CustomFieldsRequest {
    pub subscriptions: Vec<Subscription>,
    pub selectors: Vec<Selector>,
    pub external_controller: String,
}

pub async fn get_custom_fields_handler(State(state): State<AppState>) -> Response {
    let (urls, selectors, external_controller) = state.get_custom_fields().await;
    (
        StatusCode::OK,
        Json(CustomFieldsRequest {
            subscriptions: urls,
            selectors,
            external_controller,
        }),
    )
        .into_response()
}

pub async fn update_custom_fields_handler(
    State(state): State<AppState>,
    Json(payload): Json<CustomFieldsRequest>,
) -> Response {
    match state
        .set_custom_fields(
            payload.subscriptions,
            payload.selectors,
            payload.external_controller,
        )
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

    let config_path = state.state_directory.join(&safe_name);
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
                    if let Err(e) = crate::merge::generate_and_write_active_config(&state).await {
                        error!(
                            "Failed to generate and write active config after deletion: {}",
                            e
                        );
                    }
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

    let config_path = state.state_directory.join(&safe_name);
    match tokio::fs::write(&config_path, body).await {
        Ok(_) => {
            info!("Config file updated at {:?}", config_path);

            // If the updated config is the active one, regenerate the merged config

            if let Some(active) = state.get_active_config().await {
                if active == safe_name {
                    if let Err(e) = crate::merge::generate_and_write_active_config(&state).await {
                        error!(
                            "Failed to generate and write active config after update: {}",
                            e
                        );
                        return (StatusCode::BAD_REQUEST, e).into_response();
                    }
                }
            }

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
    pub method: String,
    pub password: Option<String>,
    pub remarks: Option<String>,
    pub plugin: Option<String>,
    pub plugin_opts: Option<String>,
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
    if let Err(_) = tokio::fs::metadata(&config_path).await {
        return (StatusCode::NOT_FOUND, "Config file not found").into_response();
    }

    // Save active state
    if let Err(e) = state.set_active_config(safe_name.clone()).await {
        error!("Failed to save active config state: {}", e);
        return (StatusCode::INTERNAL_SERVER_ERROR, "Failed to save state").into_response();
    }

    if let Err(e) = crate::merge::generate_and_write_active_config(&state).await {
        error!("Failed to generate and write active config: {}", e);
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            "Failed to merge temporary config",
        )
            .into_response();
    }

    let is_running = {
        let mut process_lock = state.sing_box_process.lock().await;
        if let Some(child) = process_lock.as_mut() {
            child.try_wait().map_or(false, |status| status.is_none())
        } else {
            false
        }
    };

    if !is_running {
        if let Err(e) = state.restart_sing_box(false).await {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("Config applied but failed to start sing-box: {}", e),
            )
                .into_response();
        }
    }

    (StatusCode::OK, "Config applied successfully").into_response()
}

pub async fn get_merged_config_handler(State(state): State<AppState>) -> Response {
    let tmp_path = std::path::PathBuf::from("/tmp/sing-box-lite-active.json");
    let mut read_result = tokio::fs::read_to_string(&tmp_path).await;

    if let Err(e) = &read_result {
        if e.kind() == std::io::ErrorKind::NotFound {
            if let Err(gen_err) = crate::merge::generate_and_write_active_config(&state).await {
                error!("Failed to generate merged config: {}", gen_err);
                return (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "Failed to generate merged config",
                )
                    .into_response();
            }
            // Try reading again
            read_result = tokio::fs::read_to_string(&tmp_path).await;
        }
    }

    match read_result {
        Ok(content) => (
            StatusCode::OK,
            [(header::CONTENT_TYPE, "application/json")],
            content,
        )
            .into_response(),
        Err(e) => {
            error!("Failed to read merged config: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                "Failed to read merged config",
            )
                .into_response()
        }
    }
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
    let (subs, _, _) = state.get_custom_fields().await;
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

#[derive(Serialize)]
pub struct SingBoxStatusResponse {
    pub version: Option<String>,
    pub is_running: bool,
    pub auto_start: bool,
    pub start_time: Option<chrono::DateTime<chrono::Utc>>,
}

pub async fn get_sing_box_status_handler(State(state): State<AppState>) -> Response {
    let version = match tokio::process::Command::new(&state.sing_box_path)
        .arg("version")
        .output()
        .await
    {
        Ok(output) if output.status.success() => {
            let output_str = String::from_utf8_lossy(&output.stdout);
            // Parse version. e.g. "sing-box version 1.8.0-rc.1"
            let parsed_version = output_str
                .lines()
                .next()
                .and_then(|line| line.strip_prefix("sing-box version "))
                .map(|s| s.to_string());
            parsed_version
        }
        _ => None,
    };

    let mut is_running = false;
    let mut process_lock = state.sing_box_process.lock().await;
    if let Some(child) = process_lock.as_mut() {
        if let Ok(None) = child.try_wait() {
            is_running = true;
        } else {
            *process_lock = None;
        }
    }

    let start_time = *state.start_time.lock().await;

    let auto_start = state.get_auto_start().await;

    (
        StatusCode::OK,
        Json(SingBoxStatusResponse {
            version,
            is_running,
            auto_start,
            start_time,
        }),
    )
        .into_response()
}

pub async fn start_sing_box_handler(State(state): State<AppState>) -> Response {
    match state.restart_sing_box(false).await {
        Ok(_) => (StatusCode::OK, "sing-box started").into_response(),
        Err(e) => {
            if e == "sing-box is already running" {
                (StatusCode::BAD_REQUEST, e).into_response()
            } else {
                (StatusCode::INTERNAL_SERVER_ERROR, e).into_response()
            }
        }
    }
}

pub async fn stop_sing_box_handler(State(state): State<AppState>) -> Response {
    let mut process_lock = state.sing_box_process.lock().await;
    if let Some(mut child) = process_lock.take() {
        if let Err(e) = child.kill().await {
            error!("Failed to kill sing-box process: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("Failed to stop sing-box: {}", e),
            )
                .into_response();
        }
        let _ = child.wait().await;
        let mut start_time_lock = state.start_time.lock().await;
        *start_time_lock = None;
        info!("sing-box stopped");
        (StatusCode::OK, "sing-box stopped").into_response()
    } else {
        (StatusCode::BAD_REQUEST, "sing-box is not running").into_response()
    }
}

#[derive(Deserialize)]
pub struct AutoStartRequest {
    pub enabled: bool,
}

pub async fn toggle_auto_start_handler(
    State(state): State<AppState>,
    Json(payload): Json<AutoStartRequest>,
) -> Response {
    match state.set_auto_start(payload.enabled).await {
        Ok(_) => {
            info!("Auto start set to {}", payload.enabled);
            (StatusCode::OK, "Auto start updated").into_response()
        }
        Err(e) => {
            error!("Failed to save state: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, "Failed to save state").into_response()
        }
    }
}

pub async fn get_connections_handler(State(state): State<AppState>) -> Response {
    let (_, _, external_controller) = state.get_custom_fields().await;
    let url = format!("http://{}/connections", external_controller);

    let client = reqwest::Client::new();
    match client.get(&url).send().await {
        Ok(resp) => {
            let status = resp.status();
            if status.is_success() {
                if let Ok(text) = resp.text().await {
                    return (
                        StatusCode::OK,
                        [(axum::http::header::CONTENT_TYPE, "application/json")],
                        text,
                    )
                        .into_response();
                }
            }
            (
                StatusCode::BAD_GATEWAY,
                format!("Failed to fetch connections: HTTP {}", status),
            )
                .into_response()
        }
        Err(e) => {
            error!("Failed to fetch connections: {}", e);
            (
                StatusCode::BAD_GATEWAY,
                format!("Failed to fetch connections: {}", e),
            )
                .into_response()
        }
    }
}

pub async fn get_proxies_handler(State(state): State<AppState>) -> Response {
    let (_, _, external_controller) = state.get_custom_fields().await;
    let url = format!("http://{}/proxies", external_controller);

    let client = reqwest::Client::new();
    match client.get(&url).send().await {
        Ok(resp) => {
            let status = resp.status();
            if status.is_success() {
                if let Ok(text) = resp.text().await {
                    return (
                        StatusCode::OK,
                        [(axum::http::header::CONTENT_TYPE, "application/json")],
                        text,
                    )
                        .into_response();
                }
            }
            (
                StatusCode::BAD_GATEWAY,
                format!("Failed to fetch proxies: HTTP {}", status),
            )
                .into_response()
        }
        Err(e) => {
            error!("Failed to fetch proxies: {}", e);
            (
                StatusCode::BAD_GATEWAY,
                format!("Failed to fetch proxies: {}", e),
            )
                .into_response()
        }
    }
}

#[derive(Deserialize, Serialize)]
pub struct UpdateProxyRequest {
    pub name: String,
}

pub async fn update_proxy_handler(
    State(state): State<AppState>,
    Path(selector_name): Path<String>,
    Json(payload): Json<UpdateProxyRequest>,
) -> Response {
    let (_, _, external_controller) = state.get_custom_fields().await;
    let url = format!("http://{}/proxies/{}", external_controller, selector_name);

    let client = reqwest::Client::new();
    match client.put(&url).json(&payload).send().await {
        Ok(resp) => {
            let status = resp.status();
            if status.is_success() {
                return (StatusCode::NO_CONTENT).into_response();
            }
            (
                StatusCode::BAD_GATEWAY,
                format!("Failed to update proxy: HTTP {}", status),
            )
                .into_response()
        }
        Err(e) => {
            error!("Failed to update proxy {}: {}", selector_name, e);
            (
                StatusCode::BAD_GATEWAY,
                format!("Failed to update proxy: {}", e),
            )
                .into_response()
        }
    }
}

use axum::extract::Query;

#[derive(serde::Deserialize)]
pub struct ProxyDelayQuery {
    url: Option<String>,
    timeout: Option<u32>,
}

pub async fn get_proxy_delay_handler(
    State(state): State<AppState>,
    Path(proxy_name): Path<String>,
    Query(query): Query<ProxyDelayQuery>,
) -> Response {
    let (_, _, external_controller) = state.get_custom_fields().await;

    let mut query_params = vec![];
    if let Some(url) = query.url {
        query_params.push(format!("url={}", url));
    }
    if let Some(timeout) = query.timeout {
        query_params.push(format!("timeout={}", timeout));
    }

    let query_string = if query_params.is_empty() {
        String::new()
    } else {
        format!("?{}", query_params.join("&"))
    };

    let url = format!(
        "http://{}/proxies/{}/delay{}",
        external_controller, proxy_name, query_string
    );
    let client = reqwest::Client::new();
    match client.get(&url).send().await {
        Ok(res) => {
            let status = res.status();
            match res.text().await {
                Ok(text) => (status, text).into_response(),
                Err(e) => {
                    error!("Failed to read proxy delay response: {}", e);
                    (
                        StatusCode::INTERNAL_SERVER_ERROR,
                        axum::Json(serde_json::json!({ "error": e.to_string() })),
                    )
                        .into_response()
                }
            }
        }
        Err(e) => {
            error!("Failed to fetch proxy delay: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                axum::Json(serde_json::json!({ "error": e.to_string() })),
            )
                .into_response()
        }
    }
}
