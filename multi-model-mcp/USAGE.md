# Multi-Model MCP - Usage Guide

## Overview

This extension provides a multi-model AI assistant for code development, leveraging both Anthropic Claude and OpenAI GPT models through a Model Context Protocol (MCP) server.

## Installation

### Prerequisites

1. **Rust toolchain** (1.70+):
   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   ```

2. **Node.js** (18+) and npm:
   ```bash
   # macOS
   brew install node

   # Or download from https://nodejs.org
   ```

3. **API Credentials**: Ensure you have either:
   - Anthropic API key in keychain (service: "devsecops-orchestrator", account: "CLAUDE_API_KEY")
   - OpenAI API key in keychain (service: "devsecops-orchestrator", account: "OPENAI_API_KEY")
   - Or set environment variables: `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`

### Build and Install

```bash
# Clone or navigate to the project
cd multi-model-mcp

# Run the build script
./build.sh

# Install the extension
code --install-extension vscode-extension/multi-model-mcp-*.vsix
# Or for VSCodium:
codium --install-extension vscode-extension/multi-model-mcp-*.vsix
```

## Features

### 1. Code Generation

**Command**: `Multi-Model: Generate Code`

Generate code from natural language prompts using either Claude or GPT.

**Example**:
- Prompt: "Create a TypeScript function to debounce async calls"
- Language: TypeScript
- Output: Complete, documented function code

### 2. Code Review

**Command**: `Multi-Model: Review Code`

Get comprehensive code reviews focusing on:
- Bugs and security issues
- Performance optimizations
- Style and best practices
- Positive aspects

**Usage**:
1. Select code in editor (or review entire file)
2. Run command
3. View detailed review in webview panel

### 3. Model Switching

**Command**: `Multi-Model: Switch AI Provider`

Dynamically switch between Anthropic Claude and OpenAI GPT.

**Providers**:
- **Anthropic (Claude)**: Claude 3.5 Sonnet, Claude 3 Opus, Claude 3 Haiku
- **OpenAI (GPT)**: GPT-4 Turbo, GPT-4, GPT-3.5 Turbo

### 4. List Models

**Command**: `Multi-Model: List Available Models`

View all models available from configured providers.

### 5. Context Management

**Add Context**: `Multi-Model: Add File to Context`
- Adds current file to conversation context
- Context persists across multiple operations

**Clear Context**: `Multi-Model: Clear Context`
- Removes all files and context from conversation

## Configuration

Open VSCode/Codium settings and search for "Multi-Model MCP":

```json
{
  "multiModelMcp.serverPath": "/path/to/multi-model-mcp/mcp-server/target/release/multi-model-mcp",
  "multiModelMcp.debugMode": false
}
```

## Architecture

```
┌─────────────────────────────┐
│   VSCodium/VS Code          │
│   Extension (TypeScript)    │
└──────────┬──────────────────┘
           │ JSON-RPC over stdio
           ▼
┌─────────────────────────────┐
│   MCP Server (Rust)         │
│   - Token Management        │
│   - Provider Abstraction    │
│   - Tool Execution          │
└──────────┬──────────────────┘
           │
     ┌─────┴─────┐
     ▼           ▼
┌─────────┐ ┌─────────┐
│Anthropic│ │ OpenAI  │
│   API   │ │   API   │
└─────────┘ └─────────┘
```

## Troubleshooting

### Server won't start

1. **Check credentials**:
   ```bash
   security find-generic-password -s "devsecops-orchestrator" -a "CLAUDE_API_KEY" -w
   security find-generic-password -s "devsecops-orchestrator" -a "OPENAI_API_KEY" -w
   ```

2. **Check server binary**:
   ```bash
   ./mcp-server/target/release/multi-model-mcp --version
   ```

3. **View logs**: Open "Output" panel and select "Multi-Model MCP" channel

### API errors

- Verify API keys are valid and not expired
- Check API rate limits and quotas
- Ensure network connectivity to api.anthropic.com and api.openai.com

### Extension not found

Make sure you're using the correct command:
- VS Code: `code --install-extension ...`
- VSCodium: `codium --install-extension ...`

## Development

### Running in Development Mode

1. Open the project in VS Code
2. Press `F5` to launch Extension Development Host
3. The extension will reload on code changes

### Testing the Server

```bash
cd mcp-server
cargo run -- --debug
# In another terminal:
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}' | cargo run
```

## Security Notes

- API keys are stored securely in system keychain
- Server runs locally, no data sent to third parties except AI providers
- All communication between extension and server is local (stdio)

## License

MIT

## Support

For issues and feature requests, see the project repository.
