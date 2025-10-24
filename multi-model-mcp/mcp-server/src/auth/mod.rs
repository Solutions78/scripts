use anyhow::Result;
use keyring::Entry;
use serde::Deserialize;
use std::env;

pub mod anthropic;
pub mod openai;

#[derive(Debug, Deserialize)]
struct ClaudeOAuthData {
    #[serde(rename = "claudeAiOauth")]
    claude_ai_oauth: OAuthTokens,
}

#[derive(Debug, Deserialize)]
struct OAuthTokens {
    #[serde(rename = "accessToken")]
    access_token: String,
    #[serde(rename = "refreshToken")]
    #[allow(dead_code)]
    refresh_token: String,
    #[serde(rename = "expiresAt")]
    #[allow(dead_code)]
    expires_at: u64,
}

/// Credential source priority: environment -> keychain OAuth
#[derive(Debug, Clone)]
pub struct Credentials {
    pub anthropic_token: Option<String>,
    pub openai_token: Option<String>,
}

impl Credentials {
    pub fn load() -> Result<Self> {
        Ok(Self {
            anthropic_token: Self::load_anthropic()?,
            openai_token: Self::load_openai()?,
        })
    }

    fn load_anthropic() -> Result<Option<String>> {
        // Try environment variable first (for manual override)
        if let Ok(token) = env::var("ANTHROPIC_API_KEY") {
            tracing::debug!("Loaded Anthropic credentials from environment");
            return Ok(Some(token));
        }

        // Get current username dynamically
        let username = env::var("USER")
            .or_else(|_| env::var("USERNAME"))
            .unwrap_or_else(|_| {
                tracing::warn!("Could not determine username, using 'default'");
                "default".to_string()
            });

        // Extract OAuth token from Claude Code credentials
        match Entry::new("Claude Code-credentials", &username) {
            Ok(entry) => match entry.get_password() {
                Ok(json_str) => {
                    match serde_json::from_str::<ClaudeOAuthData>(&json_str) {
                        Ok(oauth_data) => {
                            tracing::debug!("Loaded Anthropic credentials from keychain");
                            tracing::info!("Anthropic provider authentication: success");
                            Ok(Some(oauth_data.claude_ai_oauth.access_token))
                        }
                        Err(e) => {
                            tracing::debug!("Failed to parse OAuth data: {}", e);
                            Ok(None)
                        }
                    }
                }
                Err(_) => {
                    tracing::debug!("No Claude Code OAuth token found in keychain for user '{}'", username);
                    Ok(None)
                }
            },
            Err(e) => {
                tracing::debug!("Could not access keychain: {}", e);
                Ok(None)
            }
        }
    }

    fn load_openai() -> Result<Option<String>> {
        // Try environment variable first
        if let Ok(token) = env::var("OPENAI_API_KEY") {
            tracing::debug!("Loaded OpenAI credentials from environment");
            tracing::info!("OpenAI provider authentication: success");
            return Ok(Some(token));
        }

        // For OpenAI, check for stored OAuth tokens
        match Entry::new("OpenAI-OAuth", "oauth-token") {
            Ok(entry) => match entry.get_password() {
                Ok(token) => {
                    tracing::debug!("Loaded OpenAI credentials from keychain (OAuth)");
                    tracing::info!("OpenAI provider authentication: success");
                    Ok(Some(token))
                }
                Err(_) => {
                    tracing::debug!("No OpenAI OAuth token found, checking API key fallback");
                    // Fallback to API key if OAuth not available
                    Self::load_openai_api_key()
                }
            },
            Err(_) => {
                tracing::debug!("Could not access keychain for OpenAI OAuth");
                Self::load_openai_api_key()
            }
        }
    }

    fn load_openai_api_key() -> Result<Option<String>> {
        // Fallback to API key for OpenAI (since OAuth might not be configured)
        match Entry::new("devsecops-orchestrator", "OPENAI_API_KEY") {
            Ok(entry) => match entry.get_password() {
                Ok(key) => {
                    tracing::debug!("Loaded OpenAI credentials from keychain (API key)");
                    tracing::info!("OpenAI provider authentication: success");
                    Ok(Some(key))
                }
                Err(_) => {
                    tracing::debug!("No OpenAI credentials found");
                    Ok(None)
                }
            },
            Err(_) => Ok(None),
        }
    }

    #[allow(dead_code)]
    pub fn has_anthropic(&self) -> bool {
        self.anthropic_token.is_some()
    }

    #[allow(dead_code)]
    pub fn has_openai(&self) -> bool {
        self.openai_token.is_some()
    }
}
