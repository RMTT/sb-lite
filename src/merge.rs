use crate::state::AppState;
use log::{error, info};
use regex::Regex;
use serde_json::json;
use std::path::PathBuf;

use crate::handlers::Sip008Data;

pub async fn generate_and_write_active_config(state: &AppState) -> Result<(), String> {
    let mut config: serde_json::Value = match state.get_active_config().await {
        Some(name) if !name.is_empty() => {
            let config_path = state.state_directory.join(&name);
            match tokio::fs::read_to_string(&config_path).await {
                Ok(content) => match serde_json::from_str(&content) {
                    Ok(c) => c,
                    Err(e) => {
                        error!("Invalid base config JSON ({}): {}", name, e);
                        json!({})
                    }
                },
                Err(e) => {
                    error!("Failed to read active config ({}): {}", name, e);
                    json!({})
                }
            }
        }
        _ => json!({}),
    };

    let (subs, selectors) = state.get_custom_fields().await;
    let mut new_outbounds = Vec::new();
    let mut all_tags = Vec::new();

    // Collect base tags
    if let Some(outbounds) = config.get("outbounds").and_then(|o| o.as_array()) {
        for ob in outbounds {
            if let Some(tag) = ob.get("tag").and_then(|t| t.as_str()) {
                all_tags.push(tag.to_string());
            }
        }
    }

    // Process subscriptions
    for sub in subs {
        if let Some(raw) = sub.raw_data {
            if let Ok(sip_data) = serde_json::from_str::<Sip008Data>(&raw) {
                if let Some(servers) = sip_data.servers {
                    for server in servers {
                        let mut tag = server
                            .remarks
                            .clone()
                            .unwrap_or_else(|| server.server.clone());

                        if let Some(prefix) = &sub.prefix {
                            if !prefix.is_empty() {
                                tag = format!("{} {}", prefix, tag);
                            }
                        }

                        let mut outbound = json!({
                            "type": "shadowsocks",
                            "tag": tag.clone(),
                            "server": server.server,
                            "server_port": server.server_port,
                            "method": server.method.unwrap_or_else(|| "chacha20-ietf-poly1305".to_string()),
                        });

                        if let Some(password) = server.password {
                            outbound["password"] = serde_json::Value::String(password);
                        }

                        new_outbounds.push(outbound);
                        all_tags.push(tag);
                    }
                }
            }
        }
    }

    // Process Selectors
    let mut selector_outbounds = Vec::new();
    for selector in selectors {
        let regex = match Regex::new(&selector.regex) {
            Ok(r) => r,
            Err(e) => {
                error!(
                    "Invalid regex '{}' for selector '{}': {}",
                    selector.regex, selector.name, e
                );
                continue;
            }
        };

        let matched_tags: Vec<String> = all_tags
            .iter()
            .filter(|t| regex.is_match(t))
            .cloned()
            .collect();

        // Avoid empty selector outbounds causing sing-box errors
        if matched_tags.is_empty() {
            continue;
        }

        let mut sel_outbound = json!({
            "type": "selector",
            "tag": selector.name,
            "outbounds": matched_tags,
            "interrupt_exist_connections": selector.interrupt_exist_connections
        });

        if !selector.default.is_empty() {
            sel_outbound["default"] = serde_json::Value::String(selector.default.clone());
        }

        selector_outbounds.push(sel_outbound);
    }

    // Merge into config
    if let Some(outbounds) = config.get_mut("outbounds").and_then(|o| o.as_array_mut()) {
        outbounds.extend(new_outbounds);
        outbounds.extend(selector_outbounds);
    } else {
        let mut final_outbounds = new_outbounds;
        final_outbounds.extend(selector_outbounds);
        config["outbounds"] = serde_json::Value::Array(final_outbounds);
    }

    let merged_content = match serde_json::to_string_pretty(&config) {
        Ok(c) => c,
        Err(e) => return Err(format!("Failed to serialize merged config: {}", e)),
    };

    let tmp_path = PathBuf::from("/tmp/sing-box-lite-active.json");
    if let Err(e) = tokio::fs::write(&tmp_path, merged_content).await {
        return Err(format!("Failed to write temporary config: {}", e));
    }

    info!("Applied merged config to {:?}", tmp_path);
    Ok(())
}
