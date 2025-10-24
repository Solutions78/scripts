mod auth;
mod providers;
mod tools;

use anyhow::{Context, Result};
use clap::Parser;
use providers::{anthropic::AnthropicProvider, openai::OpenAIProvider, ProviderType};
use serde::{Deserialize, Serialize};
use std::io;
use tools::{ToolExecutor, ToolRequest};
use tracing::{error, info};

#[derive(Parser, Debug)]
#[command(name = "multi-model-mcp")]
#[command(about = "Multi-Model MCP Server for Anthropic and OpenAI", long_about = None)]
struct Args {
    /// Enable debug logging
    #[arg(short, long)]
    debug: bool,
}

#[derive(Debug, Serialize, Deserialize)]
struct JsonRpcRequest {
    jsonrpc: String,
    id: Option<serde_json::Value>,
    method: String,
    params: Option<serde_json::Value>,
}

#[derive(Debug, Serialize, Deserialize)]
struct JsonRpcResponse {
    jsonrpc: String,
    id: Option<serde_json::Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    result: Option<serde_json::Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    error: Option<JsonRpcError>,
}

#[derive(Debug, Serialize, Deserialize)]
struct JsonRpcError {
    code: i32,
    message: String,
}

#[tokio::main]
async fn main() -> Result<()> {
    let args = Args::parse();

    // Initialize logging
    let log_level = if args.debug { "debug" } else { "info" };
    tracing_subscriber::fmt()
        .with_env_filter(log_level)
        .with_writer(io::stderr)
        .init();

    info!("Starting Multi-Model MCP Server");

    // Load credentials
    let creds = auth::Credentials::load()
        .context("Failed to load credentials. Please check your keychain or environment variables.")?;

    // Initialize providers
    let mut providers = Vec::new();

    if let Some(anthropic_token) = creds.anthropic_token {
        info!("Anthropic provider initialized");
        providers.push(ProviderType::Anthropic(AnthropicProvider::new(
            anthropic_token,
        )));
    } else {
        error!("No Anthropic credentials found");
    }

    if let Some(openai_token) = creds.openai_token {
        info!("OpenAI provider initialized");
        providers.push(ProviderType::OpenAI(OpenAIProvider::new(openai_token)));
    } else {
        error!("No OpenAI credentials found");
    }

    if providers.is_empty() {
        anyhow::bail!("No providers configured. Please set up authentication credentials.");
    }

    let executor = ToolExecutor::new(providers);

    info!("MCP Server ready. Listening on stdin...");

    // Main server loop - read from stdin with timeout, write to stdout
    use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
    use tokio::time::{timeout, Duration};

    let stdin = tokio::io::stdin();
    let mut reader = BufReader::new(stdin);
    let mut stdout = tokio::io::stdout();
    let mut line = String::new();

    loop {
        line.clear();

        // Read with 60 second timeout to detect dead clients
        match timeout(Duration::from_secs(60), reader.read_line(&mut line)).await {
            Ok(Ok(0)) => {
                // EOF - client disconnected
                info!("Client disconnected (EOF), shutting down gracefully");
                break;
            }
            Ok(Ok(_)) => {
                // Successfully read a line
                if line.trim().is_empty() {
                    continue;
                }

                let request: JsonRpcRequest = match serde_json::from_str(&line) {
                    Ok(req) => req,
                    Err(e) => {
                        error!("Failed to parse JSON-RPC request: {}", e);
                        let error_response = JsonRpcResponse {
                            jsonrpc: "2.0".to_string(),
                            id: None,
                            result: None,
                            error: Some(JsonRpcError {
                                code: -32700,
                                message: format!("Parse error: {}", e),
                            }),
                        };
                        let response_json = serde_json::to_string(&error_response)?;
                        stdout.write_all(response_json.as_bytes()).await?;
                        stdout.write_all(b"\n").await?;
                        stdout.flush().await?;
                        continue;
                    }
                };

                let response = handle_request(request, &executor).await;
                let response_json = serde_json::to_string(&response)?;
                stdout.write_all(response_json.as_bytes()).await?;
                stdout.write_all(b"\n").await?;
                stdout.flush().await?;
            }
            Ok(Err(e)) => {
                // I/O error
                error!("Error reading from stdin: {}, shutting down", e);
                break;
            }
            Err(_) => {
                // Timeout - no input for 60 seconds
                // Check if client is still alive by continuing to read
                // This is normal for idle connections, just log at debug level
                tracing::debug!("No input received for 60s, checking if client is alive");
                continue;
            }
        }
    }

    info!("MCP Server shutting down");
    Ok(())
}

async fn handle_request(request: JsonRpcRequest, executor: &ToolExecutor) -> JsonRpcResponse {
    info!("Handling request: {}", request.method);

    match request.method.as_str() {
        "initialize" => JsonRpcResponse {
            jsonrpc: "2.0".to_string(),
            id: request.id,
            result: Some(serde_json::json!({
                "protocolVersion": "1.0",
                "serverInfo": {
                    "name": "multi-model-mcp",
                    "version": "0.1.0",
                },
                "capabilities": {
                    "tools": {
                        "listChanged": false,
                    }
                }
            })),
            error: None,
        },
        "tools/list" => JsonRpcResponse {
            jsonrpc: "2.0".to_string(),
            id: request.id,
            result: Some(serde_json::json!({
                "tools": [
                    {
                        "name": "generate_code",
                        "description": "Generate code based on a prompt",
                        "inputSchema": {
                            "type": "object",
                            "properties": {
                                "prompt": { "type": "string", "description": "Code generation prompt" },
                                "language": { "type": "string", "description": "Programming language" },
                                "context": { "type": "array", "items": { "type": "string" } },
                                "model": { "type": "string", "description": "Specific model to use" }
                            },
                            "required": ["prompt"]
                        }
                    },
                    {
                        "name": "review_code",
                        "description": "Review code for issues and improvements",
                        "inputSchema": {
                            "type": "object",
                            "properties": {
                                "code": { "type": "string", "description": "Code to review" },
                                "language": { "type": "string", "description": "Programming language" },
                                "focus": { "type": "array", "items": { "type": "string" }, "description": "Areas to focus on (security, performance, style)" },
                                "model": { "type": "string", "description": "Specific model to use" }
                            },
                            "required": ["code"]
                        }
                    },
                    {
                        "name": "switch_model",
                        "description": "Switch between AI providers (anthropic/openai)",
                        "inputSchema": {
                            "type": "object",
                            "properties": {
                                "provider": { "type": "string", "description": "Provider name: anthropic or openai" },
                                "model": { "type": "string", "description": "Specific model (optional)" }
                            },
                            "required": ["provider"]
                        }
                    },
                    {
                        "name": "list_models",
                        "description": "List all available models from all providers",
                        "inputSchema": {
                            "type": "object",
                            "properties": {}
                        }
                    },
                    {
                        "name": "add_context",
                        "description": "Add context (files, notes, metadata) to the conversation",
                        "inputSchema": {
                            "type": "object",
                            "properties": {
                                "type": { "type": "string", "enum": ["file", "note", "metadata"] },
                                "path": { "type": "string" },
                                "content": { "type": "string" },
                                "note": { "type": "string" },
                                "key": { "type": "string" },
                                "value": { "type": "string" }
                            },
                            "required": ["type"]
                        }
                    },
                    {
                        "name": "get_context",
                        "description": "Get all context for the current conversation",
                        "inputSchema": {
                            "type": "object",
                            "properties": {}
                        }
                    },
                    {
                        "name": "clear_context",
                        "description": "Clear all conversation context",
                        "inputSchema": {
                            "type": "object",
                            "properties": {}
                        }
                    },
                    {
                        "name": "local_map",
                        "description": "Enumerate files and directories from a starting path with depth control",
                        "inputSchema": {
                            "type": "object",
                            "properties": {
                                "path": {
                                    "type": "string",
                                    "description": "Starting path (default: current directory)",
                                    "default": "."
                                },
                                "depth": {
                                    "type": "integer",
                                    "description": "Maximum depth to traverse (0-6, default: 2)",
                                    "minimum": 0,
                                    "maximum": 6,
                                    "default": 2
                                },
                                "follow_symlinks": {
                                    "type": "boolean",
                                    "description": "Follow symbolic links (default: false)",
                                    "default": false
                                }
                            }
                        }
                    }
                ]
            })),
            error: None,
        },
        "tools/call" => {
            let params = request.params.unwrap_or(serde_json::Value::Null);
            let tool_name = params["name"].as_str().unwrap_or("");
            let arguments = params["arguments"].clone();

            let tool_request = ToolRequest {
                tool: tool_name.to_string(),
                arguments,
            };

            match executor.execute(tool_request).await {
                Ok(tool_response) => JsonRpcResponse {
                    jsonrpc: "2.0".to_string(),
                    id: request.id,
                    result: Some(serde_json::json!({
                        "content": [
                            {
                                "type": "text",
                                "text": serde_json::to_string_pretty(&tool_response.result).unwrap_or_default()
                            }
                        ]
                    })),
                    error: None,
                },
                Err(e) => JsonRpcResponse {
                    jsonrpc: "2.0".to_string(),
                    id: request.id,
                    result: None,
                    error: Some(JsonRpcError {
                        code: -32603,
                        message: format!("Tool execution failed: {}", e),
                    }),
                },
            }
        }
        _ => JsonRpcResponse {
            jsonrpc: "2.0".to_string(),
            id: request.id,
            result: None,
            error: Some(JsonRpcError {
                code: -32601,
                message: format!("Method not found: {}", request.method),
            }),
        },
    }
}
