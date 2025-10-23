use anyhow::Result;
use async_trait::async_trait;
use serde::{Deserialize, Serialize};

pub mod anthropic;
pub mod openai;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Message {
    pub role: String,
    pub content: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CompletionRequest {
    pub messages: Vec<Message>,
    pub model: String,
    pub max_tokens: Option<u32>,
    pub temperature: Option<f32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CompletionResponse {
    pub content: String,
    pub model: String,
    pub usage: Option<UsageInfo>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UsageInfo {
    pub input_tokens: u32,
    pub output_tokens: u32,
}

#[async_trait]
pub trait Provider: Send + Sync {
    async fn complete(&self, request: CompletionRequest) -> Result<CompletionResponse>;
    async fn list_models(&self) -> Result<Vec<String>>;
    fn name(&self) -> &str;
}

#[derive(Clone)]
pub enum ProviderType {
    Anthropic(anthropic::AnthropicProvider),
    OpenAI(openai::OpenAIProvider),
}

impl ProviderType {
    pub async fn complete(&self, request: CompletionRequest) -> Result<CompletionResponse> {
        match self {
            Self::Anthropic(p) => p.complete(request).await,
            Self::OpenAI(p) => p.complete(request).await,
        }
    }

    pub async fn list_models(&self) -> Result<Vec<String>> {
        match self {
            Self::Anthropic(p) => p.list_models().await,
            Self::OpenAI(p) => p.list_models().await,
        }
    }

    pub fn name(&self) -> &str {
        match self {
            Self::Anthropic(p) => p.name(),
            Self::OpenAI(p) => p.name(),
        }
    }
}
