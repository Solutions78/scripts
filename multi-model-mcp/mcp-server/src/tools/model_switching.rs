use super::ToolResponse;
use crate::providers::ProviderType;
use anyhow::Result;
use serde::Deserialize;
use std::sync::Arc;
use tokio::sync::RwLock;

#[derive(Debug, Deserialize)]
struct SwitchModelArgs {
    provider: String, // "anthropic" or "openai"
    model: Option<String>,
}

pub async fn execute(
    args: serde_json::Value,
    current_provider: Arc<RwLock<ProviderType>>,
    available_providers: &[ProviderType],
) -> Result<ToolResponse> {
    let args: SwitchModelArgs = serde_json::from_value(args)?;

    // Find the requested provider
    let new_provider = available_providers
        .iter()
        .find(|p| p.name() == args.provider.to_lowercase())
        .ok_or_else(|| {
            anyhow::anyhow!("Provider '{}' not found or not configured", args.provider)
        })?;

    // Update the current provider
    let mut provider_lock = current_provider.write().await;
    *provider_lock = new_provider.clone();

    let model_info = if let Some(model) = args.model {
        format!("Switched to provider '{}' with model '{}'", args.provider, model)
    } else {
        format!(
            "Switched to provider '{}' (using default model)",
            args.provider
        )
    };

    Ok(ToolResponse {
        success: true,
        result: serde_json::json!({
            "message": model_info,
            "provider": args.provider,
        }),
        error: None,
    })
}
