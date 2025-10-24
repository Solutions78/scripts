# Multi-Model MCP Server

A Model Context Protocol (MCP) server with VSCodium extension that provides multi-model code development assistance using Anthropic Claude and OpenAI GPT models.

## 🌟 Key Features

### Code Development Tools
- **🔨 Code Generation**: Generate production-ready code from natural language prompts
- **🔍 Code Review**: Comprehensive analysis for bugs, security, performance, and style
- **🔄 Model Switching**: Seamlessly switch between Anthropic Claude and OpenAI GPT
- **📚 Context Management**: Track files and conversation context across operations
- **🗺️ Local Map**: Enumerate project structure with depth control for contextual awareness

### Technical Highlights
- **🦀 Rust-powered MCP server**: High-performance, type-safe implementation
- **🔐 Secure token management**: Hybrid OAuth extraction from system keychain
- **⚡ Real-time communication**: JSON-RPC over stdio for low latency
- **🎨 Native VSCodium integration**: First-class editor experience

## 📁 Architecture

```
multi-model-mcp/
├── mcp-server/         # Rust MCP server
│   ├── src/
│   │   ├── auth/       # OAuth token extraction
│   │   ├── providers/  # Anthropic & OpenAI clients
│   │   ├── tools/      # Code generation, review, etc.
│   │   └── main.rs     # JSON-RPC server
│   └── Cargo.toml
├── vscode-extension/   # TypeScript extension
│   ├── src/
│   │   ├── extension.ts    # Command handlers
│   │   └── mcpClient.ts    # Server communication
│   └── package.json
├── build.sh            # One-command build script
└── USAGE.md           # Comprehensive usage guide
```

## 🚀 Quick Start

### Prerequisites

See [REQUIREMENTS.md](REQUIREMENTS.md) for detailed requirements.

**Quick Check**:
- **Rust** 1.70+ ([Install](https://rustup.rs/))
- **Node.js** 18+ ([Install](https://nodejs.org/))
- **API Credentials**: Anthropic and/or OpenAI API keys

### Installation

```bash
# 1. Navigate to project
cd /Users/tony/Projects/scripts/multi-model-mcp

# 2. Install prerequisites (checks and optionally installs)
./install-prerequisites.sh

# 3. Build everything
./build.sh

# 4. Install the extension
code --install-extension vscode-extension/multi-model-mcp-*.vsix
# Or for VSCodium:
codium --install-extension vscode-extension/multi-model-mcp-*.vsix

# 5. Reload your editor
```

### Setting Up Credentials

The server automatically detects credentials from your macOS keychain:
- ✅ Anthropic (Claude): OAuth token from service `Claude Code-credentials` (account: your username)
- ✅ OpenAI (GPT): API key from service `devsecops-orchestrator` (account: `OPENAI_API_KEY`)

Alternatively, set environment variables:
```bash
export ANTHROPIC_API_KEY="your-key-here"
export OPENAI_API_KEY="your-key-here"
```

## 📖 Usage

See [USAGE.md](USAGE.md) for comprehensive documentation.

### Quick Examples

**Generate Code**:
```
Cmd/Ctrl+Shift+P → "Multi-Model: Generate Code"
→ Prompt: "Create a binary search tree in Rust"
→ Select language: Rust
→ View generated code
```

**Review Code**:
```
1. Select code in editor
2. Cmd/Ctrl+Shift+P → "Multi-Model: Review Code"
3. View detailed review in side panel
```

**Switch Models**:
```
Cmd/Ctrl+Shift+P → "Multi-Model: Switch AI Provider"
→ Choose: Anthropic (Claude) or OpenAI (GPT)
```

## 🏗️ Technical Details

### MCP Server (Rust)

- **Protocol**: JSON-RPC 2.0 over stdin/stdout
- **Tools Exposed**:
  - `generate_code`: Code generation with context
  - `review_code`: Multi-aspect code analysis
  - `switch_model`: Dynamic provider switching
  - `list_models`: Enumerate available models
  - `add_context`, `get_context`, `clear_context`: Context management
  - `local_map`: Filesystem enumeration with depth control and filtering

### Extension (TypeScript)

- **Activation**: On startup
- **Communication**: Spawns and manages Rust server process
- **UI**: Native VS Code commands, webviews, quick picks
- **Logging**: Output channel "Multi-Model MCP"

### Supported Models

**Anthropic**:
- Claude 3.5 Sonnet (default)
- Claude 3.5 Haiku
- Claude 3 Opus

**OpenAI**:
- GPT-4 Turbo (default)
- GPT-4
- GPT-3.5 Turbo

## 🔧 Configuration

VSCode settings:

```json
{
  "multiModelMcp.serverPath": "",  // Auto-detected if empty
  "multiModelMcp.debugMode": false // Enable for verbose logging
}
```

## 🐛 Troubleshooting

**Server won't start**:
```bash
# Check server binary exists
ls -la mcp-server/target/release/multi-model-mcp

# Test server manually
./mcp-server/target/release/multi-model-mcp --debug
```

**No API keys found**:
```bash
# Verify Anthropic OAuth token (from Claude Code)
security find-generic-password -s "Claude Code-credentials" -a "$USER" -w

# Verify OpenAI API key
security find-generic-password -s "devsecops-orchestrator" -a "OPENAI_API_KEY" -w

# Or check environment variables
echo $ANTHROPIC_API_KEY
echo $OPENAI_API_KEY
```

**Extension logs**:
- Open "Output" panel → Select "Multi-Model MCP" from dropdown

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🎯 Roadmap

- [ ] Streaming responses for real-time feedback
- [ ] Custom prompt templates
- [ ] Multi-file context analysis
- [ ] Integration with Cursor and other IDEs
- [ ] Token usage analytics and cost tracking
- [ ] Custom model fine-tuning support

---

Built with ❤️ by Modular Misfits
