mod handlers;
mod merge;
mod router;
mod state;

use clap::Parser;
use log::{error, info};
use sha2::{Digest, Sha256};
use std::os::unix::fs::PermissionsExt;
use std::path::PathBuf;
use std::sync::Arc;
use tokio::sync::RwLock;

use crate::state::{AppState, PersistedState};

const SING_BOX_BIN_ZST: &[u8] = include_bytes!(concat!(env!("OUT_DIR"), "/sing-box-bin.zst"));
const SING_BOX_BIN_SHA256: &str = include_str!(concat!(env!("OUT_DIR"), "/sing-box-bin.sha256"));

#[derive(Parser, Debug, Clone)]
#[command(version, about, long_about = None)]
struct Args {
    /// Address to listen on (format: address:port)
    #[arg(short, long, default_value = "127.0.0.1:8180")]
    listen: String,
    /// State directory containing sing-box config and other data
    #[arg(long, default_value = "/var/lib/sblite")]
    state_directory: PathBuf,
}

fn compute_sha256(data: &[u8]) -> String {
    let mut hasher = Sha256::new();
    hasher.update(data);
    let result = hasher.finalize();
    format!("{:x}", result)
}

#[tokio::main]
async fn main() {
    env_logger::Builder::from_env(env_logger::Env::default().default_filter_or("info")).init();

    let args = Args::parse();

    if let Err(e) = std::fs::create_dir_all(&args.state_directory) {
        error!(
            "Failed to create state directory at {:?}: {}",
            args.state_directory, e
        );
        std::process::exit(1);
    }
    info!("Using state directory at: {:?}", args.state_directory);

    let sing_box_path = args.state_directory.join("core");
    info!(
        "Embedded sing-box (decompressed) hash: {}",
        SING_BOX_BIN_SHA256
    );

    let mut needs_extraction = true;
    if sing_box_path.exists()
        && let Ok(existing_bin) = std::fs::read(&sing_box_path)
    {
        let existing_hash = compute_sha256(&existing_bin);
        if existing_hash == SING_BOX_BIN_SHA256 {
            info!("Existing core binary matches embedded hash. Skipping extraction.");
            needs_extraction = false;
        } else {
            info!("Existing core binary hash mismatch. Will overwrite.");
        }
    }

    if needs_extraction {
        info!("Decompressing sing-box binary...");
        let decompressed_bin = match zstd::decode_all(SING_BOX_BIN_ZST) {
            Ok(data) => data,
            Err(e) => {
                error!("Failed to decompress embedded sing-box binary: {}", e);
                std::process::exit(1);
            }
        };

        info!(
            "Extracting decompressed sing-box binary to {:?}",
            sing_box_path
        );
        if let Err(e) = std::fs::write(&sing_box_path, &decompressed_bin) {
            error!(
                "Failed to write sing-box binary to {:?}: {}",
                sing_box_path, e
            );
            std::process::exit(1);
        }

        #[cfg(unix)]
        {
            if let Ok(mut perms) = std::fs::metadata(&sing_box_path).map(|m| m.permissions()) {
                perms.set_mode(0o755);
                if let Err(e) = std::fs::set_permissions(&sing_box_path, perms) {
                    error!(
                        "Failed to set executable permissions on {:?}: {}",
                        sing_box_path, e
                    );
                }
            }
        }
    }

    info!("Using sing-box binary at: {:?}", sing_box_path);

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
        state_directory: args.state_directory.clone(),
        persisted_state: Arc::new(RwLock::new(persisted_state.clone())),
        sing_box_path,
        sing_box_process: Arc::new(tokio::sync::Mutex::new(None)),
        start_time: Arc::new(tokio::sync::Mutex::new(None)),
    };

    if persisted_state.auto_start {
        info!("Auto-start is enabled. Attempting to start sing-box...");

        if let Err(e) = shared_state.start_sing_box(false).await {
            error!("Failed to auto-start sing-box: {}", e);
        }
    }

    let app = router::create_router(shared_state);

    let addr = args.listen.clone();
    let listener = tokio::net::TcpListener::bind(&addr).await.unwrap();
    info!("Listening on http://{}", addr);
    axum::serve(listener, app).await.unwrap();
}
