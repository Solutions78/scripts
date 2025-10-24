# Multi-Model MCP Assistant

🤖 **Multi-model code development assistant using Anthropic Claude and OpenAI GPT via Model Context Protocol (MCP)**

## Features

- **🔨 Code Generation**: Generate production-ready code from natural language prompts
- **🔍 Code Review**: Get comprehensive analysis for bugs, security, performance, and style
- **🔄 Model Switching**: Seamlessly switch between Anthropic Claude and OpenAI GPT models
- **📚 Context Management**: Track files and conversation context across operations
- **🔐 Secure Authentication**: Uses OAuth tokens from your system keychain

## Quick Start

### Sidebar Chat

Open the sidebar view under Misfit MCP or run the command “Multi-Model: Open Misfit Chat.” The chat shows a centered translucent Modular Misfits watermark and a welcome line: “Welcome Misfit, what we breaking today?” Pick a model from the dropdown. Each prompt runs in the background, logs a concise entry in docs/versions.md, and the UI only lists Accomplishments and How to use it for that run. Use the refresh button to reload models from the MCP server.

### Available Commands

Press `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows/Linux) and type:

- **Multi-Model: Generate Code** - Generate code from a prompt
- **Multi-Model: Review Code** - Get detailed code review
- **Multi-Model: Switch AI Provider** - Switch between Claude and GPT
- **Multi-Model: List Available Models** - View all available models
- **Multi-Model: Add File to Context** - Add current file to context
- **Multi-Model: Clear Context** - Reset conversation context

## Usage Examples

### Generate Code

1. Open Command Palette (`Cmd+Shift+P`)
2. Type: `Multi-Model: Generate Code`
3. Enter your prompt: "Create a binary search function in Python"
4. Select language
5. Generated code opens in new editor

### Review Code

1. Open a file and select code (or leave unselected for full file review)
2. Open Command Palette
3. Type: `Multi-Model: Review Code`
4. Detailed review opens in side panel with:
   - Summary of code quality
   - Issues found (bugs, security, anti-patterns)
   - Suggested improvements
   - Positive aspects

### Switch Models

1. Open Command Palette
2. Type: `Multi-Model: Switch AI Provider`
3. Choose:
   - **Anthropic (Claude)** - Claude 3.5 Sonnet, Claude 3 Opus, etc.
   - **OpenAI (GPT)** - GPT-4 Turbo, GPT-4, etc.

## Supported Models

### Anthropic Claude
- Claude 3.5 Sonnet (latest, default)
- Claude 3.5 Haiku (fast)
- Claude 3 Opus (most capable)

### OpenAI GPT
- GPT-4 Turbo (latest)
- GPT-4
- GPT-3.5 Turbo

## Requirements

### Prerequisites
- **VSCodium** or VS Code
- **Rust** (for MCP server)
- **Node.js** 18+ (for extension)

### Authentication
This extension uses OAuth tokens from your system:
- **Anthropic**: Claude Code OAuth token from keychain
- **OpenAI**: API key or OAuth token from keychain

No API keys are stored in the extension. All authentication uses your local system keychain.

## Configuration

Open Settings (`Cmd+,`) and search for "Multi-Model MCP":

```json
{
  "multiModelMcp.serverPath": "",  // Auto-detected if empty
  "multiModelMcp.debugMode": false // Enable for verbose logging
}
```

### Server Path
By default, the extension auto-detects the MCP server location. If you need to specify it manually:

```json
{
  "multiModelMcp.serverPath": "/path/to/multi-model-mcp/mcp-server/target/release/multi-model-mcp"
}
```

### Debug Mode
Enable debug logging to troubleshoot issues:

```json
{
  "multiModelMcp.debugMode": true
}
```

View logs: **View → Output → Multi-Model MCP**

## Architecture

```
┌─────────────────────────────┐
│   VSCodium Extension        │
│   (TypeScript)              │
└──────────┬──────────────────┘
           │ JSON-RPC over stdio
           ▼
┌─────────────────────────────┐
│   MCP Server (Rust)         │
│   - OAuth Token Management  │
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

### Commands Don't Appear in Palette

**Solution**: Reload VSCodium window
```
Cmd+Shift+P → Developer: Reload Window
```

### Server Won't Start

**Check logs:**
1. View → Output
2. Select "Multi-Model MCP" from dropdown
3. Look for error messages

**Common issues:**
- OAuth token not found in keychain
- Server binary not built
- Permission errors

**Fix:**
```bash
cd /path/to/multi-model-mcp
./install-prerequisites.sh
./build.sh
```

### No API Keys Found

The extension looks for OAuth tokens in your system keychain:

**Anthropic:**
- Service: `Claude Code-credentials`
- Account: `tony`

**OpenAI:**
- Service: `OpenAI-OAuth` (or falls back to API key)

**Manual override:**
```bash
export ANTHROPIC_OAUTH_TOKEN="your-token"
export OPENAI_API_KEY="your-key"
```

### Extension Not Responding

1. Check MCP server is running:
   - View → Output → Multi-Model MCP
2. Restart extension:
   - Disable and re-enable in Extensions panel
3. Reload window:
   - Cmd+Shift+P → Developer: Reload Window

## Privacy & Security

✅ **Local Processing**: MCP server runs locally on your machine
✅ **Secure Storage**: OAuth tokens stored in system keychain
✅ **No Telemetry**: Zero data collection or tracking
✅ **Open Source**: Full source code available

**Your data never leaves your machine** except for API calls to Anthropic/OpenAI.

## Development

### Building from Source

```bash
# Clone repository
git clone https://github.com/Solutions78/scripts.git
cd scripts/multi-model-mcp

# Install prerequisites
./install-prerequisites.sh

# Build everything
./build.sh

# Install extension
codium --install-extension vscode-extension/multi-model-mcp-*.vsix
```

### Project Structure

```
multi-model-mcp/
├── mcp-server/         # Rust MCP server
│   ├── src/
│   │   ├── auth/       # OAuth token extraction
│   │   ├── providers/  # Anthropic & OpenAI clients
│   │   └── tools/      # Code gen, review, etc.
│   └── Cargo.toml
└── vscode-extension/   # TypeScript extension
    ├── src/
    │   ├── extension.ts    # Command handlers
    │   └── mcpClient.ts    # Server communication
    └── package.json
```

## Contributing

Found a bug? Want to add a feature?

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

**Repository**: https://github.com/Solutions78/scripts

## License

MIT License - See LICENSE.md for details

## Credits

Built with ❤️ by the **Modular Misfits**

- Rust MCP Server: High-performance, type-safe
- TypeScript Extension: Native VSCodium integration
- OAuth Security: Keychain-based authentication

## Support

- **Issues**: https://github.com/Solutions78/scripts/issues
- **Documentation**: https://github.com/Solutions78/scripts/tree/master/multi-model-mcp
- **Discussions**: https://github.com/Solutions78/scripts/discussions

---

**Made with 🦀 Rust and ⚡ TypeScript**
