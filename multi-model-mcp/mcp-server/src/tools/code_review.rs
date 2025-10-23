use super::ToolResponse;
use crate::providers::{CompletionRequest, Message, ProviderType};
use anyhow::Result;
use serde::Deserialize;
use std::sync::Arc;
use tokio::sync::RwLock;

#[derive(Debug, Deserialize)]
struct ReviewCodeArgs {
    code: String,
    language: Option<String>,
    focus: Option<Vec<String>>, // e.g., ["security", "performance", "style"]
    model: Option<String>,
}

pub async fn execute(
    args: serde_json::Value,
    provider: Arc<RwLock<ProviderType>>,
) -> Result<ToolResponse> {
    let args: ReviewCodeArgs = serde_json::from_value(args)?;

    let language = args.language.unwrap_or_else(|| "unknown".to_string());
    let mut system_message = format!(
        "You are an expert code reviewer specializing in {}. \
         Analyze the code for issues, improvements, and best practices.",
        language
    );

    if let Some(focus_areas) = args.focus {
        if !focus_areas.is_empty() {
            system_message.push_str("\n\nFocus on these areas:\n");
            for area in &focus_areas {
                system_message.push_str(&format!("- {}\n", area));
            }
        }
    }

    system_message.push_str(
        "\n\nProvide your review in the following format:\n\
         1. **Summary**: Brief overview of code quality\n\
         2. **Issues**: List any bugs, security concerns, or anti-patterns\n\
         3. **Improvements**: Suggestions for optimization and better practices\n\
         4. **Positive**: What the code does well",
    );

    let messages = vec![
        Message {
            role: "system".to_string(),
            content: system_message,
        },
        Message {
            role: "user".to_string(),
            content: format!("Please review this code:\n\n```{}\n{}\n```", language, args.code),
        },
    ];

    let model = args.model.unwrap_or_else(|| {
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
        temperature: Some(0.3), // Lower temperature for more focused reviews
    };

    let provider = provider.read().await;
    let response = provider.complete(request).await?;

    Ok(ToolResponse {
        success: true,
        result: serde_json::json!({
            "review": response.content,
            "model": response.model,
            "usage": response.usage,
        }),
        error: None,
    })
}
