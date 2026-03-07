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

const SING_BOX_BIN: &[u8] = include_bytes!(concat!(env!("OUT_DIR"), "/sing-box-bin"));

#[derive(Parser, Debug, Clone)]
#[command(version, about, long_about = None)]
struct Args {
    /// Address to listen on (format: address:port)
    #[arg(short, long, default_value = "127.0.0.1:8180")]
    listen: String,
    /// State directory containing sing-box config and other data
    #[arg(long, default_value = "/var/lib/sing-box-lite")]
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
    let embedded_hash = compute_sha256(SING_BOX_BIN);
    info!("Embedded sing-box hash: {}", embedded_hash);

    let mut needs_extraction = true;
    if sing_box_path.exists() {
        if let Ok(existing_bin) = std::fs::read(&sing_box_path) {
            let existing_hash = compute_sha256(&existing_bin);
            if existing_hash == embedded_hash {
                info!("Existing core binary matches embedded hash. Skipping extraction.");
                needs_extraction = false;
            } else {
                info!("Existing core binary hash mismatch. Will overwrite.");
            }
        }
    }

    if needs_extraction {
        info!("Extracting sing-box binary to {:?}", sing_box_path);
        if let Err(e) = std::fs::write(&sing_box_path, SING_BOX_BIN) {
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

        // Ensure merged config exists
        match crate::merge::generate_and_write_active_config(&shared_state).await {
            Ok(_) => {
                let tmp_path = std::path::PathBuf::from("/tmp/sing-box-lite-active.json");

                match tokio::process::Command::new(&shared_state.sing_box_path)
                    .arg("check")
                    .arg("-c")
                    .arg(&tmp_path)
                    .output()
                    .await
                {
                    Ok(output) if output.status.success() => {
                        match tokio::process::Command::new(&shared_state.sing_box_path)
                            .arg("run")
                            .arg("-c")
                            .arg(&tmp_path)
                            .arg("-D")
                            .arg(&shared_state.state_directory)
                            .stdout(std::process::Stdio::null())
                            .stderr(std::process::Stdio::null())
                            .spawn()
                        {
                            Ok(child) => {
                                let mut process_lock = shared_state.sing_box_process.lock().await;
                                *process_lock = Some(child);
                                let mut start_time_lock = shared_state.start_time.lock().await;
                                *start_time_lock = Some(chrono::Utc::now());
                                info!("sing-box auto-started successfully on boot.");
                            }
                            Err(e) => {
                                error!("Failed to auto-start sing-box: {}", e);
                            }
                        }
                    }
                    Ok(output) => {
                        error!(
                            "Config check failed on auto-start: {}",
                            String::from_utf8_lossy(&output.stderr)
                        );
                    }
                    Err(e) => {
                        error!("Failed to run config check on auto-start: {}", e);
                    }
                }
            }
            Err(e) => {
                error!("Failed to generate active config on auto-start: {}", e);
            }
        }
    }

    let app = router::create_router(shared_state);

    let addr = args.listen.clone();
    let listener = tokio::net::TcpListener::bind(&addr).await.unwrap();
    info!("Listening on http://{}", addr);
    axum::serve(listener, app).await.unwrap();
}
