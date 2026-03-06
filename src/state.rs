use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::Arc;
use tokio::sync::RwLock;

#[derive(Clone)]
pub struct AppState {
    pub state_directory: PathBuf,
    pub persisted_state: Arc<RwLock<PersistedState>>,
    pub sing_box_path: PathBuf,
    pub sing_box_process: Arc<tokio::sync::Mutex<Option<tokio::process::Child>>>,
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
}
