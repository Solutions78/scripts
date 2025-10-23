use super::ToolResponse;
use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConversationContext {
    files: HashMap<String, String>,
    notes: Vec<String>,
    metadata: HashMap<String, String>,
}

impl ConversationContext {
    pub fn new() -> Self {
        Self {
            files: HashMap::new(),
            notes: Vec::new(),
            metadata: HashMap::new(),
        }
    }

    pub fn add_file(&mut self, path: String, content: String) {
        self.files.insert(path, content);
    }

    pub fn add_note(&mut self, note: String) {
        self.notes.push(note);
    }

    pub fn set_metadata(&mut self, key: String, value: String) {
        self.metadata.insert(key, value);
    }

    pub fn clear(&mut self) {
        self.files.clear();
        self.notes.clear();
        self.metadata.clear();
    }
}

#[derive(Debug, Deserialize)]
struct AddContextArgs {
    #[serde(flatten)]
    content: ContextContent,
}

#[derive(Debug, Deserialize)]
#[serde(tag = "type")]
enum ContextContent {
    #[serde(rename = "file")]
    File { path: String, content: String },
    #[serde(rename = "note")]
    Note { note: String },
    #[serde(rename = "metadata")]
    Metadata { key: String, value: String },
}

pub async fn add_context(
    args: serde_json::Value,
    context: Arc<RwLock<ConversationContext>>,
) -> Result<ToolResponse> {
    let args: AddContextArgs = serde_json::from_value(args)?;
    let mut ctx = context.write().await;

    match args.content {
        ContextContent::File { path, content } => {
            ctx.add_file(path.clone(), content);
            Ok(ToolResponse {
                success: true,
                result: serde_json::json!({
                    "message": format!("Added file: {}", path),
                }),
                error: None,
            })
        }
        ContextContent::Note { note } => {
            ctx.add_note(note.clone());
            Ok(ToolResponse {
                success: true,
                result: serde_json::json!({
                    "message": "Added note to context",
                }),
                error: None,
            })
        }
        ContextContent::Metadata { key, value } => {
            let value_clone = value.clone();
            ctx.set_metadata(key.clone(), value);
            Ok(ToolResponse {
                success: true,
                result: serde_json::json!({
                    "message": format!("Set metadata: {} = {}", key, value_clone),
                }),
                error: None,
            })
        }
    }
}

pub async fn get_context(
    context: Arc<RwLock<ConversationContext>>,
) -> Result<ToolResponse> {
    let ctx = context.read().await;
    Ok(ToolResponse {
        success: true,
        result: serde_json::json!({
            "files": ctx.files,
            "notes": ctx.notes,
            "metadata": ctx.metadata,
        }),
        error: None,
    })
}

pub async fn clear_context(
    context: Arc<RwLock<ConversationContext>>,
) -> Result<ToolResponse> {
    let mut ctx = context.write().await;
    ctx.clear();
    Ok(ToolResponse {
        success: true,
        result: serde_json::json!({
            "message": "Context cleared",
        }),
        error: None,
    })
}
