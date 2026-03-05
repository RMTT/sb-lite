use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::Arc;
use tokio::sync::RwLock;

#[derive(Clone)]
pub struct AppState {
    pub state_directory: PathBuf,
    pub persisted_state: Arc<RwLock<PersistedState>>,
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
    pub subscription_urls: Vec<String>,
    pub selectors: Vec<Selector>,
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

    pub async fn get_custom_fields(&self) -> (Vec<String>, Vec<Selector>) {
        let state = self.persisted_state.read().await;
        (state.subscription_urls.clone(), state.selectors.clone())
    }

    pub async fn set_custom_fields(
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
