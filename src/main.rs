use axum::{

    http::{header, StatusCode, Uri},
    response::IntoResponse,
    routing::get,
    Router,
};
use rust_embed::Embed;

#[derive(Embed)]
#[folder = "web/dist/"]
struct Asset;

async fn static_handler(uri: Uri) -> impl IntoResponse {
    let path = uri.path().trim_start_matches('/');

    // If the path is empty, we default to "index.html"
    let path = if path.is_empty() {
        "index.html"
    } else {
        path
    };

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
                None => (StatusCode::NOT_FOUND, "404 Not Found").into_response()
            }
        }
    }
}

#[tokio::main]
async fn main() {
    println!("Hello World!");
    println!("Embedded files:");
    for file in Asset::iter() {
        println!(" - {}", file.as_ref());
    }

    let app = Router::new()
        .fallback(get(static_handler));

    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000").await.unwrap();
    println!("Listening on http://0.0.0.0:3000");
    axum::serve(listener, app).await.unwrap();
}
