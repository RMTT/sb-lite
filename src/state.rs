use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::Arc;
use tokio::sync::RwLock;

use tokio::process::Child;
use tokio::sync::Mutex;

#[derive(Clone)]
pub struct AppState {
    pub state_directory: PathBuf,
    pub persisted_state: Arc<RwLock<PersistedState>>,
    pub sing_box_path: PathBuf,
    pub sing_box_process: Arc<Mutex<Option<Child>>>,
}

#[derive(Serialize, Deserialize, Default, Clone)]
pub struct Subscription {
    pub url: String,
    #[serde(default)]
    pub prefix: Option<String>,
    pub last_fetched: Option<chrono::DateTime<chrono::Utc>>,
    pub raw_data: Option<String>,
}

#[derive(Serialize, Deserialize, Default, Clone)]
pub struct Selector {
    pub name: String,
    pub regex: String,
    pub default: String,
    pub interrupt_exist_connections: bool,
}

#[derive(Serialize, Deserialize, Default, Clone)]
pub struct PersistedState {
    pub active_config: Option<String>,
    pub subscriptions: Vec<Subscription>,
    pub selectors: Vec<Selector>,
    #[serde(default)]
    pub auto_start: bool,
}

impl AppState {
    pub fn state_file_path(&self) -> PathBuf {
        self.state_directory.join("state")
    }

    pub async fn get_active_config(&self) -> Option<String> {
        let state = self.persisted_state.read().await;
        state.active_config.clone()
    }

    pub async fn set_active_config(&self, filename: String) -> Result<(), String> {
        let mut state = self.persisted_state.write().await;
        state.active_config = Some(filename);

        let bytes = bincode::serialize(&*state).map_err(|e| e.to_string())?;
        tokio::fs::write(self.state_file_path(), bytes)
            .await
            .map_err(|e| e.to_string())
    }

    pub async fn get_custom_fields(&self) -> (Vec<Subscription>, Vec<Selector>) {
        let state = self.persisted_state.read().await;
        (state.subscriptions.clone(), state.selectors.clone())
    }

    pub async fn set_custom_fields(
        &self,
        subscriptions: Vec<Subscription>,
        selectors: Vec<Selector>,
    ) -> Result<(), String> {
        let mut state = self.persisted_state.write().await;
        state.subscriptions = subscriptions;
        state.selectors = selectors;

        let bytes = bincode::serialize(&*state).map_err(|e| e.to_string())?;
        tokio::fs::write(self.state_file_path(), bytes)
            .await
            .map_err(|e| e.to_string())
    }
    pub async fn update_subscription(
        &self,
        index: usize,
        last_fetched: chrono::DateTime<chrono::Utc>,
        raw_data: String,
    ) -> Result<(), String> {
        let mut state = self.persisted_state.write().await;
        if let Some(sub) = state.subscriptions.get_mut(index) {
            sub.last_fetched = Some(last_fetched);
            sub.raw_data = Some(raw_data);
        } else {
            return Err("Subscription index out of bounds".to_string());
        }

        let bytes = bincode::serialize(&*state).map_err(|e| e.to_string())?;
        tokio::fs::write(self.state_file_path(), bytes)
            .await
            .map_err(|e| e.to_string())
    }

    pub async fn start_sing_box(&self) -> Result<(), String> {
        let mut process = self.sing_box_process.lock().await;

        // Stop it if it's already running
        if let Some(mut child) = process.take() {
            if let Err(e) = child.kill().await {
                log::error!("Failed to kill existing sing-box process: {}", e);
            }
        }

        let config_path = "/tmp/sing-box-lite-active.json";

        // Ensure config exists
        if !std::path::Path::new(config_path).exists() {
            return Err("Temporary config file not found".to_string());
        }

        // Run check first
        let check_result = tokio::process::Command::new(&self.sing_box_path)
            .arg("check")
            .arg("-c")
            .arg(config_path)
            .output()
            .await;

        match check_result {
            Ok(output) => {
                if !output.status.success() {
                    let err_msg = String::from_utf8_lossy(&output.stderr);
                    log::error!("sing-box check failed: {}", err_msg);
                    return Err(format!("Configuration check failed: {}", err_msg));
                }
            }
            Err(e) => {
                return Err(format!("Failed to run sing-box check: {}", e));
            }
        }

        // Start new process
        let child = tokio::process::Command::new(&self.sing_box_path)
            .arg("run")
            .arg("-c")
            .arg(config_path)
            .spawn();

        match child {
            Ok(child) => {
                *process = Some(child);
                log::info!("sing-box started successfully");
                Ok(())
            }
            Err(e) => {
                log::error!("Failed to start sing-box: {}", e);
                Err(format!("Failed to start sing-box: {}", e))
            }
        }
    }

    pub async fn stop_sing_box(&self) -> Result<(), String> {
        let mut process = self.sing_box_process.lock().await;
        if let Some(mut child) = process.take() {
            match child.kill().await {
                Ok(_) => {
                    log::info!("sing-box stopped successfully");
                    Ok(())
                }
                Err(e) => {
                    log::error!("Failed to stop sing-box: {}", e);
                    Err(format!("Failed to stop sing-box: {}", e))
                }
            }
        } else {
            Ok(())
        }
    }

    pub async fn is_sing_box_running(&self) -> bool {
        let mut process = self.sing_box_process.lock().await;
        if let Some(child) = process.as_mut() {
            match child.try_wait() {
                Ok(Some(_status)) => {
                    // Process has exited
                    *process = None;
                    false
                }
                Ok(None) => {
                    // Process is still running
                    true
                }
                Err(_) => {
                    // Error getting status, assume it's dead
                    *process = None;
                    false
                }
            }
        } else {
            false
        }
    }
}
