# Prerequisites & Requirements

## System Requirements

- **Operating System**: macOS 10.15+, Linux, or Windows with WSL2
- **Memory**: 2GB RAM minimum (4GB recommended)
- **Disk Space**: 500MB for dependencies and build artifacts

## Required Software

### 1. Rust Toolchain (1.70+)

**Install via rustup**:
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source ~/.cargo/env
```

**Verify installation**:
```bash
cargo --version
# Should output: cargo 1.70.0 or higher
```

### 2. Node.js (18+) and npm

**macOS (via Homebrew)**:
```bash
brew install node
```

**Linux (via package manager)**:
```bash
# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Fedora
sudo dnf install nodejs npm
```

**Windows**:
Download from [nodejs.org](https://nodejs.org/)

**Verify installation**:
```bash
node --version  # Should be v18.0.0 or higher
npm --version   # Should be 8.0.0 or higher
```

### 3. VSCodium or VS Code

**VSCodium** (recommended):
```bash
# macOS
brew install --cask vscodium

# Linux
# See https://vscodium.com/#install
```

**VS Code**:
Download from [code.visualstudio.com](https://code.visualstudio.com/)

## API Credentials

You need API keys from at least one of the following providers:

### Anthropic (Claude)

1. Sign up at [console.anthropic.com](https://console.anthropic.com/)
2. Create an API key
3. Store in keychain:
   ```bash
   security add-generic-password -s "devsecops-orchestrator" \
     -a "CLAUDE_API_KEY" -w "sk-ant-api03-..."
   ```
   Or set environment variable:
   ```bash
   export ANTHROPIC_API_KEY="sk-ant-api03-..."
   ```

### OpenAI (GPT)

1. Sign up at [platform.openai.com](https://platform.openai.com/)
2. Create an API key
3. Store in keychain:
   ```bash
   security add-generic-password -s "devsecops-orchestrator" \
     -a "OPENAI_API_KEY" -w "sk-proj-..."
   ```
   Or set environment variable:
   ```bash
   export OPENAI_API_KEY="sk-proj-..."
   ```

## Automated Installation

Run the prerequisites installer:
```bash
cd /Users/tony/Projects/scripts/multi-model-mcp
./install-prerequisites.sh
```

This script will:
1. Check for all required dependencies
2. Offer to install missing ones automatically
3. Verify API key configuration

## Build Tools

The build process requires:
- `cargo` (Rust package manager) - installed with Rust
- `npm` (Node package manager) - installed with Node.js
- Standard Unix tools: `bash`, `chmod`, `mkdir`

## Optional Tools

### For Development

- **VS Code Extensions**:
  - Rust Analyzer (rust-lang.rust-analyzer)
  - ESLint (dbaeumer.vscode-eslint)

- **Debugging**:
  - `lldb` or `gdb` for Rust debugging
  - Chrome DevTools for extension debugging

### For Packaging

- `@vscode/vsce` (installed automatically via npm)

## Verification Checklist

Run this to verify all prerequisites:

```bash
# Check Rust
cargo --version
rustc --version

# Check Node.js
node --version
npm --version

# Check API keys (macOS)
security find-generic-password -s "devsecops-orchestrator" -a "CLAUDE_API_KEY" -w
security find-generic-password -s "devsecops-orchestrator" -a "OPENAI_API_KEY" -w

# Or check environment variables
echo $ANTHROPIC_API_KEY
echo $OPENAI_API_KEY
```

All commands should succeed and display version numbers or keys.

## Troubleshooting

### "cargo: command not found"

**Solution**: Install Rust and source the cargo environment:
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source ~/.cargo/env
```

### "node: command not found"

**Solution**: Install Node.js via your package manager or from nodejs.org

### "No API keys found"

**Solution**: Either:
1. Set environment variables in your shell RC file (~/.zshrc or ~/.bashrc)
2. Store in keychain using the commands above
3. The server will prompt if keys are missing

### Permission errors during build

**Solution**: Ensure build scripts are executable:
```bash
chmod +x build.sh install-prerequisites.sh
```

## Next Steps

Once all prerequisites are installed:

1. Run `./install-prerequisites.sh` to verify
2. Run `./build.sh` to build the project
3. Install the extension in VSCodium/VS Code
4. Start using the Multi-Model MCP!
