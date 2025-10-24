use crate::providers::ProviderType;
use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::sync::RwLock;

pub mod code_generation;
pub mod code_review;
pub mod context;
pub mod local_map;
pub mod model_switching;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolRequest {
    pub tool: String,
    pub arguments: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolResponse {
    pub success: bool,
    pub result: serde_json::Value,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

pub struct ToolExecutor {
    pub current_provider: Arc<RwLock<ProviderType>>,
    pub available_providers: Vec<ProviderType>,
    pub context: Arc<RwLock<context::ConversationContext>>,
}

impl ToolExecutor {
    pub fn new(providers: Vec<ProviderType>) -> Self {
        let default_provider = providers.first().cloned().unwrap();
        Self {
            current_provider: Arc::new(RwLock::new(default_provider)),
            available_providers: providers,
            context: Arc::new(RwLock::new(context::ConversationContext::new())),
        }
    }

    pub async fn execute(&self, request: ToolRequest) -> Result<ToolResponse> {
        match request.tool.as_str() {
            "generate_code" => {
                code_generation::execute(request.arguments, self.current_provider.clone()).await
            }
            "review_code" => {
                code_review::execute(request.arguments, self.current_provider.clone()).await
            }
            "switch_model" => {
                model_switching::execute(
                    request.arguments,
                    self.current_provider.clone(),
                    &self.available_providers,
                )
                .await
            }
            "list_models" => self.list_all_models().await,
            "add_context" => {
                context::add_context(request.arguments, self.context.clone()).await
            }
            "get_context" => context::get_context(self.context.clone()).await,
            "clear_context" => context::clear_context(self.context.clone()).await,
            "local_map" => local_map::execute(request.arguments).await,
            _ => Ok(ToolResponse {
                success: false,
                result: serde_json::Value::Null,
                error: Some(format!("Unknown tool: {}", request.tool)),
            }),
        }
    }

    async fn list_all_models(&self) -> Result<ToolResponse> {
        let mut all_models = Vec::new();

        for provider in &self.available_providers {
            let models = provider.list_models().await?;
            for model in models {
                all_models.push(serde_json::json!({
                    "provider": provider.name(),
                    "model": model,
                }));
            }
        }

        Ok(ToolResponse {
            success: true,
            result: serde_json::json!({ "models": all_models }),
            error: None,
        })
    }
}
