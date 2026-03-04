use axum::{
    Router,
    http::{StatusCode, Uri, header},
    response::IntoResponse,
    routing::get,
};
use clap::Parser;
use log::{error, info};
use rust_embed::Embed;
use std::path::PathBuf;

#[derive(Parser, Debug)]
#[command(version, about, long_about = None)]
struct Args {
    /// Port to listen on
    #[arg(short, long, default_value_t = 8180)]
    port: u16,
    /// Path to the sing-box binary
    #[arg(long)]
    sing_box_path: Option<String>,
}

#[derive(Embed)]
#[folder = "web/dist/"]
struct Asset;

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

    let sing_box_path = match args.sing_box_path {
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

    let app = Router::new().fallback(get(static_handler));

    let addr = format!("0.0.0.0:{}", args.port);
    let listener = tokio::net::TcpListener::bind(&addr).await.unwrap();
    info!("Listening on http://{}", addr);
    axum::serve(listener, app).await.unwrap();
}
