mod handlers;
mod merge;
mod router;
mod state;

use clap::Parser;
use log::{error, info};
use std::path::PathBuf;
use std::sync::Arc;
use tokio::sync::RwLock;

use crate::state::{AppState, PersistedState};

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
