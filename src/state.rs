use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::Arc;
use tokio::sync::RwLock;

pub fn default_external_controller() -> String {
    "127.0.0.1:9091".to_string()
}

#[derive(Clone)]
pub struct AppState {
    pub state_directory: PathBuf,
    pub persisted_state: Arc<RwLock<PersistedState>>,
    pub sing_box_path: PathBuf,
    pub sing_box_process: Arc<tokio::sync::Mutex<Option<tokio::process::Child>>>,
    pub start_time: Arc<tokio::sync::Mutex<Option<chrono::DateTime<chrono::Utc>>>>,
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

#[derive(Serialize, Deserialize, Clone)]
pub struct PersistedState {
    pub active_config: Option<String>,
    pub subscriptions: Vec<Subscription>,
    pub selectors: Vec<Selector>,
    #[serde(default)]
    pub auto_start: bool,
    #[serde(default = "default_external_controller")]
    pub external_controller: String,
}

impl Default for PersistedState {
    fn default() -> Self {
        Self {
            active_config: None,
            subscriptions: vec![],
            selectors: vec![],
            auto_start: false,
            external_controller: default_external_controller(),
        }
    }
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

    pub async fn get_custom_fields(&self) -> (Vec<Subscription>, Vec<Selector>, String) {
        let state = self.persisted_state.read().await;
        (
            state.subscriptions.clone(),
            state.selectors.clone(),
            state.external_controller.clone(),
        )
    }

    pub async fn set_custom_fields(
        &self,
        subscriptions: Vec<Subscription>,
        selectors: Vec<Selector>,
        external_controller: String,
    ) -> Result<(), String> {
        let mut state = self.persisted_state.write().await;
        state.subscriptions = subscriptions;
        state.selectors = selectors;
        state.external_controller = external_controller;

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

    pub async fn get_auto_start(&self) -> bool {
        let state = self.persisted_state.read().await;
        state.auto_start
    }

    pub async fn set_auto_start(&self, enabled: bool) -> Result<(), String> {
        let mut state = self.persisted_state.write().await;
        state.auto_start = enabled;

        let bytes = bincode::serialize(&*state).map_err(|e| e.to_string())?;
        tokio::fs::write(self.state_file_path(), bytes)
            .await
            .map_err(|e| e.to_string())
    }

    pub async fn check_config(&self) -> Result<(), String> {
        let tmp_path = std::path::PathBuf::from("/tmp/sing-box-lite-active.json");
        if !tmp_path.exists() {
            return Err("Merged config not found".to_string());
        }

        match tokio::process::Command::new(&self.sing_box_path)
            .arg("check")
            .arg("-c")
            .arg(&tmp_path)
            .output()
            .await
        {
            Ok(output) if output.status.success() => Ok(()),
            Ok(output) => {
                let err_msg = String::from_utf8_lossy(&output.stderr);
                Err(format!("Invalid config: {}", err_msg))
            }
            Err(e) => Err(format!("Failed to execute config check: {}", e)),
        }
    }

    pub async fn restart_sing_box(&self, force_restart: bool) -> Result<(), String> {
        self.check_config().await?;

        let mut process_lock = self.sing_box_process.lock().await;

        let is_running = if let Some(child) = process_lock.as_mut() {
            child.try_wait().map_or(false, |status| status.is_none())
        } else {
            false
        };

        if is_running {
            if !force_restart {
                return Err("sing-box is already running".to_string());
            }

            // Kill existing process
            if let Some(mut child) = process_lock.take() {
                let _ = child.kill().await;
                let _ = child.wait().await;
            }
        }

        let tmp_path = std::path::PathBuf::from("/tmp/sing-box-lite-active.json");
        match tokio::process::Command::new(&self.sing_box_path)
            .arg("run")
            .arg("-c")
            .arg(&tmp_path)
            .arg("-D")
            .arg(&self.state_directory)
            .stdout(std::process::Stdio::null())
            .stderr(std::process::Stdio::null())
            .spawn()
        {
            Ok(child) => {
                *process_lock = Some(child);
                let mut start_time_lock = self.start_time.lock().await;
                *start_time_lock = Some(chrono::Utc::now());
                log::info!("sing-box process started/restarted successfully");
                Ok(())
            }
            Err(e) => {
                let err_msg = format!("Failed to spawn sing-box process: {}", e);
                log::error!("{}", err_msg);
                Err(err_msg)
            }
        }
    }
}
