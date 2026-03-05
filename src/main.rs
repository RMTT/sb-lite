use axum::{
    Router,
    extract::State,
    http::{StatusCode, Uri, header},
    response::{IntoResponse, Response},
    routing::get,
};
use clap::Parser;
use log::{error, info};
use rust_embed::Embed;
use std::path::PathBuf;
use std::sync::Arc;

#[derive(Parser, Debug, Clone)]
#[command(version, about, long_about = None)]
struct Args {
    /// Port to listen on
    #[arg(short, long, default_value_t = 8180)]
    port: u16,
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
}

async fn get_config_handler(State(state): State<AppState>) -> Response {
    let config_path = state.args.state_directory.join("config.json");
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

async fn update_config_handler(State(state): State<AppState>, body: String) -> Response {
    let config_path = state.args.state_directory.join("config.json");
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

    let shared_state = AppState {
        args: Arc::new(args.clone()),
    };

    let app = Router::new()
        .route(
            "/api/config",
            get(get_config_handler).post(update_config_handler),
        )
        .fallback(get(static_handler))
        .with_state(shared_state);

    let addr = format!("0.0.0.0:{}", args.port);
    let listener = tokio::net::TcpListener::bind(&addr).await.unwrap();
    info!("Listening on http://{}", addr);
    axum::serve(listener, app).await.unwrap();
}
