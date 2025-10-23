use anyhow::Result;
use keyring::Entry;
use std::env;

pub mod anthropic;
pub mod openai;

/// Credential source priority: environment -> keychain -> config file
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
        // Try environment variable first
        if let Ok(token) = env::var("ANTHROPIC_API_KEY") {
            tracing::info!("Loaded Anthropic token from environment");
            return Ok(Some(token));
        }

        // Try keychain (where Claude Code stores it)
        match Entry::new("devsecops-orchestrator", "CLAUDE_API_KEY") {
            Ok(entry) => match entry.get_password() {
                Ok(password) => {
                    tracing::info!("Loaded Anthropic token from keychain");
                    Ok(Some(password))
                }
                Err(_) => {
                    tracing::warn!("No Anthropic token found in keychain");
                    Ok(None)
                }
            },
            Err(_) => {
                tracing::warn!("Could not access keychain for Anthropic token");
                Ok(None)
            }
        }
    }

    fn load_openai() -> Result<Option<String>> {
        // Try environment variable first
        if let Ok(token) = env::var("OPENAI_API_KEY") {
            tracing::info!("Loaded OpenAI token from environment");
            return Ok(Some(token));
        }

        // Try keychain
        match Entry::new("devsecops-orchestrator", "OPENAI_API_KEY") {
            Ok(entry) => match entry.get_password() {
                Ok(password) => {
                    tracing::info!("Loaded OpenAI token from keychain");
                    Ok(Some(password))
                }
                Err(_) => {
                    tracing::warn!("No OpenAI token found in keychain");
                    Ok(None)
                }
            },
            Err(_) => {
                tracing::warn!("Could not access keychain for OpenAI token");
                Ok(None)
            }
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
