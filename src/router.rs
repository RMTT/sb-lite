use crate::handlers::{
    apply_config_handler, delete_config_handler, get_config_handler, get_custom_fields_handler,
    get_merged_config_handler, list_configs_handler, static_handler, update_config_handler,
    update_custom_fields_handler, update_subscription_handler, validate_subscription_handler,
};
use crate::state::AppState;
use axum::{
    Router,
    routing::{get, post},
};

pub fn create_router(state: AppState) -> Router {
    Router::new()
        .route("/api/configs", get(list_configs_handler))
        .route(
            "/api/custom-fields",
            get(get_custom_fields_handler).post(update_custom_fields_handler),
        )
        .route("/api/config/apply", post(apply_config_handler))
        .route("/api/config/merged", get(get_merged_config_handler))
        .route(
            "/api/config/{filename}",
            get(get_config_handler)
                .post(update_config_handler)
                .delete(delete_config_handler),
        )
        .route(
            "/api/subscriptions/{index}/update",
            post(update_subscription_handler),
        )
        .route(
            "/api/subscriptions/validate",
            post(validate_subscription_handler),
        )
        .fallback(get(static_handler))
        .with_state(state)
}
