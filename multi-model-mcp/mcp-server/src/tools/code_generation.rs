use super::ToolResponse;
use crate::providers::{CompletionRequest, Message, ProviderType};
use anyhow::Result;
use serde::Deserialize;
use std::sync::Arc;
use tokio::sync::RwLock;

#[derive(Debug, Deserialize)]
struct GenerateCodeArgs {
    prompt: String,
    language: Option<String>,
    #[serde(default)]
    context: Vec<String>,
    model: Option<String>,
}

pub async fn execute(
    args: serde_json::Value,
    provider: Arc<RwLock<ProviderType>>,
) -> Result<ToolResponse> {
    let args: GenerateCodeArgs = serde_json::from_value(args)?;

    let language = args.language.unwrap_or_else(|| "generic".to_string());
    let mut system_message = format!(
        "You are an expert {} developer. Generate clean, efficient, and well-documented code.",
        language
    );

    if !args.context.is_empty() {
        system_message.push_str("\n\nContext:\n");
        for ctx in &args.context {
            system_message.push_str(&format!("- {}\n", ctx));
        }
    }

    let messages = vec![
        Message {
            role: "system".to_string(),
            content: system_message,
        },
        Message {
            role: "user".to_string(),
            content: args.prompt,
        },
    ];

    let model = args.model.unwrap_or_else(|| {
        // Default models
        match provider.blocking_read().name() {
            "anthropic" => "claude-3-5-sonnet-20241022".to_string(),
            "openai" => "gpt-4-turbo-preview".to_string(),
            _ => "default".to_string(),
        }
    });

    let request = CompletionRequest {
        messages,
        model,
        max_tokens: Some(4096),
        temperature: Some(0.7),
    };

    let provider = provider.read().await;
    let response = provider.complete(request).await?;

    Ok(ToolResponse {
        success: true,
        result: serde_json::json!({
            "code": response.content,
            "model": response.model,
            "usage": response.usage,
        }),
        error: None,
    })
}
