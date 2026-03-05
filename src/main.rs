use axum::{
    Router,
    extract::{Path, State},
    http::{StatusCode, Uri, header},
    response::{IntoResponse, Json, Response},
    routing::{get, post},
};
use clap::Parser;
use log::{error, info};
use rust_embed::Embed;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::Arc;
use tokio::sync::RwLock;

#[derive(Parser, Debug, Clone)]
#[command(version, about, long_about = None)]
struct Args {
    /// Address to listen on (format: address:port)
    #[arg(short, long, default_value = "127.0.0.1:8180")]
    listen: String,
    /// Path to the sing-box binary
    #[arg(long)]
    sing_box_path: Option<String>,
    /// State directory containing sing-box config and other data
    #[arg(long, default_value = "/var/lib/sing-box-lite")]
    state_directory: PathBuf,
}

#[derive(Embed)]
#[folder = "web/dist/"]
struct Asset;

#[derive(Clone)]
struct AppState {
    args: Arc<Args>,
    persisted_state: Arc<RwLock<PersistedState>>,
}

#[derive(Serialize, Deserialize, Default, Clone)]
struct Selector {
    name: String,
    regex: String,
    default: String,
    interrupt_exist_connections: bool,
}

#[derive(Serialize, Deserialize, Default, Clone)]
struct PersistedState {
    active_config: Option<String>,
    subscription_urls: Vec<String>,
    selectors: Vec<Selector>,
}

impl AppState {
    fn state_file_path(&self) -> PathBuf {
        self.args.state_directory.join("state")
    }

    async fn get_active_config(&self) -> Option<String> {
        let state = self.persisted_state.read().await;
        state.active_config.clone()
    }

    async fn set_active_config(&self, filename: String) -> Result<(), String> {
        let mut state = self.persisted_state.write().await;
        state.active_config = Some(filename);

        let bytes = bincode::serialize(&*state).map_err(|e| e.to_string())?;
        tokio::fs::write(self.state_file_path(), bytes)
            .await
            .map_err(|e| e.to_string())
    }

    async fn get_custom_fields(&self) -> (Vec<String>, Vec<Selector>) {
        let state = self.persisted_state.read().await;
        (state.subscription_urls.clone(), state.selectors.clone())
    }

    async fn set_custom_fields(
        &self,
        urls: Vec<String>,
        selectors: Vec<Selector>,
    ) -> Result<(), String> {
        let mut state = self.persisted_state.write().await;
        state.subscription_urls = urls;
        state.selectors = selectors;

        let bytes = bincode::serialize(&*state).map_err(|e| e.to_string())?;
        tokio::fs::write(self.state_file_path(), bytes)
            .await
            .map_err(|e| e.to_string())
    }
}

#[derive(Serialize, Deserialize)]
struct CustomFieldsRequest {
    subscription_urls: Vec<String>,
    selectors: Vec<Selector>,
}

async fn get_custom_fields_handler(State(state): State<AppState>) -> Response {
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

async fn update_custom_fields_handler(
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
struct ConfigsResponse {
    files: Vec<String>,
    active: Option<String>,
}

async fn list_configs_handler(State(state): State<AppState>) -> Response {
    let mut files = Vec::new();
    let mut entries = match tokio::fs::read_dir(&state.args.state_directory).await {
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
        if path.is_file() && path.extension().is_some_and(|ext| ext == "json") {
            if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
                files.push(name.to_string());
            }
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

async fn get_config_handler(
    State(state): State<AppState>,
    Path(filename): Path<String>,
) -> Response {
    let safe_name = match safe_filename(&filename) {
        Some(n) => n,
        None => return (StatusCode::BAD_REQUEST, "Invalid filename").into_response(),
    };

    let config_path = state.args.state_directory.join(safe_name);
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

async fn update_config_handler(
    State(state): State<AppState>,
    Path(filename): Path<String>,
    body: String,
) -> Response {
    let safe_name = match safe_filename(&filename) {
        Some(n) => n,
        None => return (StatusCode::BAD_REQUEST, "Invalid filename").into_response(),
    };

    let config_path = state.args.state_directory.join(safe_name);
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
struct ApplyConfigRequest {
    filename: String,
}

async fn apply_config_handler(
    State(state): State<AppState>,
    Json(payload): Json<ApplyConfigRequest>,
) -> Response {
    let safe_name = match safe_filename(&payload.filename) {
        Some(n) => n,
        None => return (StatusCode::BAD_REQUEST, "Invalid filename").into_response(),
    };

    let config_path = state.args.state_directory.join(&safe_name);
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

async fn static_handler(uri: Uri) -> impl IntoResponse {
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

#[tokio::main]
async fn main() {
    env_logger::Builder::from_env(env_logger::Env::default().default_filter_or("info")).init();

    let args = Args::parse();

    let sing_box_path = match &args.sing_box_path {
        Some(path) => {
            let p = PathBuf::from(path);
            if p.is_file() {
                p
            } else {
                error!("Provided sing-box path is not a valid file: {:?}", p);
                std::process::exit(1);
            }
        }
        None => match which::which("sing-box") {
            Ok(path) => path,
            Err(_) => {
                error!(
                    "Could not find `sing-box` binary in PATH. Please install it or provide its location using --sing-box-path."
                );
                std::process::exit(1);
            }
        },
    };

    info!("Using sing-box binary at: {:?}", sing_box_path);

    if let Err(e) = std::fs::create_dir_all(&args.state_directory) {
        error!(
            "Failed to create state directory at {:?}: {}",
            args.state_directory, e
        );
        std::process::exit(1);
    }
    info!("Using state directory at: {:?}", args.state_directory);

    let state_file_path = args.state_directory.join("state");
    let persisted_state = match std::fs::read(&state_file_path) {
        Ok(bytes) => match bincode::deserialize::<PersistedState>(&bytes) {
            Ok(state) => state,
            Err(e) => {
                error!(
                    "Failed to deserialize state file: {}. Starting with default state.",
                    e
                );
                PersistedState::default()
            }
        },
        Err(_) => PersistedState::default(),
    };

    let shared_state = AppState {
        args: Arc::new(args.clone()),
        persisted_state: Arc::new(RwLock::new(persisted_state)),
    };

    let app = Router::new()
        .route("/api/configs", get(list_configs_handler))
        .route(
            "/api/custom-fields",
            get(get_custom_fields_handler).post(update_custom_fields_handler),
        )
        .route(
            "/api/config/{filename}",
            get(get_config_handler).post(update_config_handler),
        )
        .route("/api/config/apply", post(apply_config_handler))
        .fallback(get(static_handler))
        .with_state(shared_state);

    let addr = args.listen.clone();
    let listener = tokio::net::TcpListener::bind(&addr).await.unwrap();
    info!("Listening on http://{}", addr);
    axum::serve(listener, app).await.unwrap();
}
