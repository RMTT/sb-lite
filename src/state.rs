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
    pub configs_directory: PathBuf,
    pub extra_json_path: PathBuf,
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
    #[serde(default)]
    pub routing_mark: Option<String>,
    #[serde(default)]
    pub custom_fields: Option<String>,
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

#[derive(Serialize, Deserialize, Clone)]
pub struct SubscriptionConfig {
    pub url: String,
    pub prefix: Option<String>,
    pub routing_mark: Option<String>,
    pub custom_fields: Option<String>,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct ExtraConfig {
    pub active_config: Option<String>,
    pub subscriptions: Vec<SubscriptionConfig>,
    pub selectors: Vec<Selector>,
    pub auto_start: bool,
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

impl PersistedState {
    pub fn to_extra_config(&self) -> ExtraConfig {
        ExtraConfig {
            active_config: self.active_config.clone(),
            subscriptions: self
                .subscriptions
                .iter()
                .map(|s| SubscriptionConfig {
                    url: s.url.clone(),
                    prefix: s.prefix.clone(),
                    routing_mark: s.routing_mark.clone(),
                    custom_fields: s.custom_fields.clone(),
                })
                .collect(),
            selectors: self.selectors.clone(),
            auto_start: self.auto_start,
            external_controller: self.external_controller.clone(),
        }
    }

    pub fn merge_extra(&mut self, extra: ExtraConfig) {
        self.active_config = extra.active_config;
        self.selectors = extra.selectors;
        self.auto_start = extra.auto_start;
        self.external_controller = extra.external_controller;

        // Merge subscriptions: update existing ones, add new ones
        let mut new_subscriptions = Vec::new();
        for sub_cfg in extra.subscriptions {
            if let Some(existing) = self.subscriptions.iter().find(|s| s.url == sub_cfg.url) {
                let mut updated = existing.clone();
                updated.prefix = sub_cfg.prefix;
                updated.routing_mark = sub_cfg.routing_mark;
                updated.custom_fields = sub_cfg.custom_fields;
                new_subscriptions.push(updated);
            } else {
                new_subscriptions.push(Subscription {
                    url: sub_cfg.url,
                    prefix: sub_cfg.prefix,
                    routing_mark: sub_cfg.routing_mark,
                    custom_fields: sub_cfg.custom_fields,
                    last_fetched: None,
                    raw_data: None,
                });
            }
        }
        self.subscriptions = new_subscriptions;
    }
}

impl AppState {
    pub fn configs_dir(&self) -> PathBuf {
        self.configs_directory.clone()
    }

    pub fn state_file_path(&self) -> PathBuf {
        self.state_directory.join("state")
    }

    pub fn extra_json_path(&self) -> PathBuf {
        self.extra_json_path.clone()
    }

    pub async fn save_state(&self, state: &PersistedState) -> Result<(), String> {
        // Save binary state
        let bytes = bincode::serialize(state).map_err(|e| e.to_string())?;
        tokio::fs::write(self.state_file_path(), bytes)
            .await
            .map_err(|e| e.to_string())?;

        // Save extra.json
        let extra = state.to_extra_config();
        let json = serde_json::to_string_pretty(&extra).map_err(|e| e.to_string())?;
        tokio::fs::write(self.extra_json_path(), json)
            .await
            .map_err(|e| e.to_string())?;

        Ok(())
    }

    pub async fn get_active_config(&self) -> Option<String> {
        let state = self.persisted_state.read().await;
        state.active_config.clone()
    }

    pub async fn set_active_config(&self, filename: String) -> Result<(), String> {
        let mut state = self.persisted_state.write().await;
        state.active_config = Some(filename);
        self.save_state(&state).await
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
        self.save_state(&state).await
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

        // Just save binary state for runtime updates?
        // Actually, the user said "extra.json only saves configurations".
        // raw_data and last_fetched are runtime state, so they don't go to extra.json.
        // But save_state updates both. That's fine, to_extra_config filters them out.
        self.save_state(&state).await
    }

    pub async fn get_auto_start(&self) -> bool {
        let state = self.persisted_state.read().await;
        state.auto_start
    }

    pub async fn set_auto_start(&self, enabled: bool) -> Result<(), String> {
        let mut state = self.persisted_state.write().await;
        state.auto_start = enabled;
        self.save_state(&state).await
    }

    pub async fn check_config(&self) -> Result<(), String> {
        let tmp_path = std::path::PathBuf::from("/tmp/sblite-active.json");
        if !tmp_path.exists() {
            if let Err(e) = crate::merge::generate_and_write_active_config(self).await {
                return Err(format!("Failed to generate merged config: {}", e));
            }
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

    pub async fn start_sing_box(&self, force_restart: bool) -> Result<(), String> {
        self.check_config().await?;

        let mut process_lock = self.sing_box_process.lock().await;

        let is_running = if let Some(child) = process_lock.as_mut() {
            child.try_wait().is_ok_and(|status| status.is_none())
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

        let tmp_path = std::path::PathBuf::from("/tmp/sblite-active.json");
        match tokio::process::Command::new(&self.sing_box_path)
            .arg("run")
            .arg("-c")
            .arg(&tmp_path)
            .arg("-D")
            .arg(&self.state_directory)
            .stdout(std::process::Stdio::piped())
            .stderr(std::process::Stdio::piped())
            .spawn()
        {
            Ok(mut child) => {
                if let Some(stdout) = child.stdout.take() {
                    tokio::spawn(async move {
                        use tokio::io::{AsyncBufReadExt, BufReader};
                        let mut reader = BufReader::new(stdout).lines();
                        while let Ok(Some(line)) = reader.next_line().await {
                            log::info!("{}", line);
                        }
                    });
                }

                if let Some(stderr) = child.stderr.take() {
                    tokio::spawn(async move {
                        use tokio::io::{AsyncBufReadExt, BufReader};
                        let mut reader = BufReader::new(stderr).lines();
                        while let Ok(Some(line)) = reader.next_line().await {
                            log::warn!("{}", line);
                        }
                    });
                }

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

impl AppState {
    pub async fn fetch_subscription(&self, index: usize) -> Result<(), String> {
        let (subs, _, _) = self.get_custom_fields().await;
        let url = subs
            .get(index)
            .ok_or("Invalid subscription index")?
            .url
            .clone();

        let client = reqwest::Client::builder()
            .user_agent("Shadowrocket")
            .build()
            .unwrap_or_default();

        match client.get(&url).send().await {
            Ok(resp) => {
                let status = resp.status();
                if status.is_success() {
                    let text = resp.text().await.map_err(|e| e.to_string())?;
                    // Validate SIP008
                    if let Err(e) = serde_json::from_str::<crate::handlers::Sip008Data>(&text) {
                        return Err(format!("Invalid SIP008 format for {}: {}", url, e));
                    }

                    self.update_subscription(index, chrono::Utc::now(), text)
                        .await?;
                    log::info!("Successfully fetched subscription: {}", url);

                    // Regenerate config if there is an active one
                    if let Err(e) = crate::merge::generate_and_write_active_config(self).await {
                        log::error!(
                            "Failed to generate and write active config after fetching subscription: {}",
                            e
                        );
                    }
                    Ok(())
                } else {
                    Err(format!(
                        "Failed to fetch subscription {}: HTTP {}",
                        url, status
                    ))
                }
            }
            Err(e) => Err(format!("Failed to fetch subscription {}: {}", url, e)),
        }
    }

    pub async fn fetch_missing_subscriptions(&self) {
        let (subs, _, _) = self.get_custom_fields().await;
        for (i, sub) in subs.iter().enumerate() {
            if sub.raw_data.is_none() {
                log::info!("Fetching missing subscription data for {}", sub.url);
                if let Err(e) = self.fetch_subscription(i).await {
                    log::error!("{}", e);
                }
            }
        }
    }
}
