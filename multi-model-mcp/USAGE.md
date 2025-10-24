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
   - Anthropic: OAuth token in keychain (service: "Claude Code-credentials", account: your username) or set `ANTHROPIC_API_KEY` environment variable
   - OpenAI: API key in keychain (service: "devsecops-orchestrator", account: "OPENAI_API_KEY") or set `OPENAI_API_KEY` environment variable

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

### 6. Local Map

**Tool**: `local_map`

Enumerate files and directories from a starting path with depth control for contextual awareness.

**Input Parameters**:
- `path` (optional, default: "."): Starting directory path
- `depth` (optional, default: 2, min: 0, max: 6): Maximum depth to traverse
- `follow_symlinks` (optional, default: false): Whether to follow symbolic links

**Behavior**:
- Walks filesystem breadth-first from specified path up to depth
- Skips hidden entries (names starting with `.`)
- Excludes `node_modules` and `.git` directories
- Reports symlinks without traversing them (unless `follow_symlinks=true`)
- Enforces maximum 8,000 entries to prevent runaway traversals
- 2-second timeout for performance safety
- Returns file sizes for regular files, 0 for directories

**Output**:
```json
{
  "root": "/absolute/path/to/root",
  "entries": [
    {
      "name": "file.txt",
      "path": "/absolute/path/to/file.txt",
      "is_dir": false,
      "is_symlink": false,
      "size_bytes": 1024,
      "depth": 1
    }
  ],
  "truncated": true,
  "timed_out": true
}
```

**Example JSON-RPC call**:
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "local_map",
    "arguments": {
      "path": ".",
      "depth": 2
    }
  }
}
```

**Use Cases**:
- Get project structure for AI context
- Discover files before code generation
- Understand directory layout for refactoring
- Verify deployment artifacts

### 7. Misfit Mission Console

#### Misfit Chat

1. Open the **Misfit MCP** activity bar container and select **Misfit Chat**.
2. Choose a model from the dropdown (the last selection is remembered across sessions).
3. Type a request and press **Send** to run the default tool plan.
4. The response emphasizes Accomplishments and How-To steps; expand details for raw outputs.
5. Background activity is logged in `docs/versions.md` with timestamps, model, tool list, arguments, and change digests.
6. The chat watermark sources `mcp-server/src/assets/misfit.png` and renders at roughly 60% opacity when available.

#### Misfit Dashboard

1. Open **Misfit Dashboard** from the same container or run the command palette action `Multi-Model: Open Misfit Dashboard`.
2. The **Live Runs** tab streams queued and running tool calls with color-coded states, elapsed time, and cancel/remove controls.
3. Live runs auto-refresh every three seconds and react instantly to server events, keeping the queue self-auditing.
4. The **History** tab parses `docs/versions.md`, exposing filters for model and tool plus expandable entries that list created, modified, and deleted paths.
5. Click any file path within an entry to open it in the editor; use **Replay** to re-run the captured tool arguments.
6. A subtle Misfit watermark sits at the top-right (≈30% opacity) to brand the dashboard without distracting from telemetry.

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
   # Check Anthropic OAuth token (from Claude Code)
   security find-generic-password -s "Claude Code-credentials" -a "$USER" -w

   # Check OpenAI API key
   security find-generic-password -s "devsecops-orchestrator" -a "OPENAI_API_KEY" -w

   # Or use environment variables
   echo $ANTHROPIC_API_KEY
   echo $OPENAI_API_KEY
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
