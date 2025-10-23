use super::{CompletionRequest, CompletionResponse, Provider, UsageInfo};
use anyhow::{Context, Result};
use async_trait::async_trait;
use reqwest::Client;
use serde::{Deserialize, Serialize};

const OPENAI_API_BASE: &str = "https://api.openai.com/v1";

#[derive(Debug, Clone)]
pub struct OpenAIProvider {
    client: Client,
    api_key: String,
}

impl OpenAIProvider {
    pub fn new(api_key: String) -> Self {
        Self {
            client: Client::new(),
            api_key,
        }
    }
}

#[derive(Debug, Serialize)]
struct OpenAIRequest {
    model: String,
    messages: Vec<OpenAIMessage>,
    #[serde(skip_serializing_if = "Option::is_none")]
    max_tokens: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    temperature: Option<f32>,
}

#[derive(Debug, Serialize, Deserialize)]
struct OpenAIMessage {
    role: String,
    content: String,
}

#[derive(Debug, Deserialize)]
struct OpenAIResponse {
    choices: Vec<Choice>,
    model: String,
    usage: Usage,
}

#[derive(Debug, Deserialize)]
struct Choice {
    message: OpenAIMessage,
}

#[derive(Debug, Deserialize)]
struct Usage {
    prompt_tokens: u32,
    completion_tokens: u32,
}

#[derive(Debug, Deserialize)]
struct ModelsResponse {
    data: Vec<ModelInfo>,
}

#[derive(Debug, Deserialize)]
struct ModelInfo {
    id: String,
}

#[async_trait]
impl Provider for OpenAIProvider {
    async fn complete(&self, request: CompletionRequest) -> Result<CompletionResponse> {
        let messages: Vec<OpenAIMessage> = request
            .messages
            .into_iter()
            .map(|m| OpenAIMessage {
                role: m.role,
                content: m.content,
            })
            .collect();

        let req = OpenAIRequest {
            model: request.model.clone(),
            messages,
            max_tokens: request.max_tokens,
            temperature: request.temperature,
        };

        let response = self
            .client
            .post(format!("{}/chat/completions", OPENAI_API_BASE))
            .header("Authorization", format!("Bearer {}", self.api_key))
            .header("content-type", "application/json")
            .json(&req)
            .send()
            .await
            .context("Failed to send request to OpenAI")?;

        if !response.status().is_success() {
            let status = response.status();
            let text = response.text().await.unwrap_or_default();
            anyhow::bail!("OpenAI API error {}: {}", status, text);
        }

        let openai_response: OpenAIResponse = response
            .json()
            .await
            .context("Failed to parse OpenAI response")?;

        let content = openai_response
            .choices
            .first()
            .map(|c| c.message.content.clone())
            .unwrap_or_default();

        Ok(CompletionResponse {
            content,
            model: openai_response.model,
            usage: Some(UsageInfo {
                input_tokens: openai_response.usage.prompt_tokens,
                output_tokens: openai_response.usage.completion_tokens,
            }),
        })
    }

    async fn list_models(&self) -> Result<Vec<String>> {
        let response = self
            .client
            .get(format!("{}/models", OPENAI_API_BASE))
            .header("Authorization", format!("Bearer {}", self.api_key))
            .send()
            .await
            .context("Failed to list OpenAI models")?;

        if !response.status().is_success() {
            let status = response.status();
            let text = response.text().await.unwrap_or_default();
            anyhow::bail!("OpenAI API error {}: {}", status, text);
        }

        let models_response: ModelsResponse = response
            .json()
            .await
            .context("Failed to parse OpenAI models response")?;

        Ok(models_response
            .data
            .into_iter()
            .filter(|m| m.id.starts_with("gpt-"))
            .map(|m| m.id)
            .collect())
    }

    fn name(&self) -> &str {
        "openai"
    }
}
