# 🤖 AI CLI Setup

**Your AI Command Line Companions - All in One Script**

This directory contains scripts to install and configure multiple AI CLI tools, bringing the power of Claude, GPT, and Gemini right into your terminal.

## 🌟 What Gets Installed

### Anthropic Claude Code CLI
- Latest Claude models in your terminal
- Stream responses in real-time
- Context-aware conversations
- Project-specific configurations

### OpenAI Codex CLI
- GPT-4 and GPT-3.5 Turbo access
- Code generation and explanation
- Chat-style interactions
- Customizable model selection

### Google Gemini CLI
- Google's Gemini models
- Multi-modal capabilities
- Browser-based or API key authentication
- Fast inference

## 📋 Prerequisites

### System Requirements
- **OS**: Linux (Debian/Ubuntu), Raspberry Pi, or macOS
- **Architecture**: x86_64 or aarch64 (ARM64)
- **Shell**: bash or zsh

### What You'll Need
- `curl` for downloads
- `build-essential` or build tools for native modules
- `python3` and `pip` for some dependencies
- Active internet connection

**The script will install:**
- Node.js 22.x LTS (via NodeSource)
- npm (Node Package Manager)
- All required CLI tools

## 🚀 Installation

### Quick Start

```bash
cd AI-CLI-setup
./install-ai-cli.sh
```

The script will:
1. ✅ Install system prerequisites (curl, build tools, Python)
2. ✅ Install Node.js 22.x LTS
3. ✅ Configure npm to use a user-local prefix (`~/.npm-global`)
4. ✅ Install all three AI CLIs globally
5. ❓ Prompt for API keys (optional)
6. ✅ Add PATH exports to your shell RC file
7. ✅ Verify installations

### What Happens During Installation

```
[1/6] Installing system prerequisites
[2/6] Installing Node.js 22.x
[3/6] Configuring npm to use a user prefix
[4/6] Installing CLIs to $HOME
[5/6] Capturing API keys (optional, press Enter to skip)
[6/6] Verifying installations
```

### API Key Setup

During installation, you'll be prompted for:

1. **OpenAI API Key** (`OPENAI_API_KEY`)
   - Get yours at: https://platform.openai.com/api-keys
   - Used by Codex CLI

2. **Anthropic API Key** (`ANTHROPIC_API_KEY`)
   - Get yours at: https://console.anthropic.com/
   - Used by Claude Code CLI

3. **Google API Key** (`GOOGLE_API_KEY`)
   - Get yours at: https://aistudio.google.com/app/apikey
   - Optional - can use browser auth instead

**You can skip any or all** during installation and set them up later.

## 🔧 Post-Installation

### Activate Your New Shell Environment

```bash
# Reload your shell configuration
source ~/.bashrc  # or ~/.zshrc for zsh users

# Or just open a new terminal
```

### Verify Everything Works

```bash
# Check versions
codex --version
claude --version
gemini --version

# Test basic commands
codex --help
claude --help
gemini --help
```

## 💡 Usage Examples

### Using Codex (OpenAI)

```bash
# Set default model
codex config set model gpt-4-turbo

# Ask a question
codex "Explain recursion in Python"

# Generate code
codex "Write a function to find prime numbers"

# Interactive chat
codex chat
```

### Using Claude

```bash
# Check authentication
claude auth status

# Start a conversation
claude "What's the difference between async and sync in JavaScript?"

# Use with files
claude "Review this code" < script.js

# Configure default model
claude config set model claude-3-5-sonnet-20241022
```

### Using Gemini

```bash
# Login via browser
gemini auth login

# Or use API key (already set if you provided it during install)
export GOOGLE_API_KEY="your-key-here"

# Ask questions
gemini "Explain quantum computing simply"

# Generate content
gemini "Write a haiku about programming"
```

## 🔐 Managing API Keys

### Set Keys After Installation

If you skipped key setup during installation:

```bash
# Add to your shell RC file (~/.bashrc or ~/.zshrc)
echo 'export OPENAI_API_KEY="sk-..."' >> ~/.bashrc
echo 'export ANTHROPIC_API_KEY="sk-ant-..."' >> ~/.bashrc
echo 'export GOOGLE_API_KEY="..."' >> ~/.bashrc

# Reload
source ~/.bashrc
```

### Verify Keys Are Set

```bash
echo $OPENAI_API_KEY
echo $ANTHROPIC_API_KEY
echo $GOOGLE_API_KEY
```

### Using macOS Keychain (Recommended)

```bash
# Store in keychain
security add-generic-password -s "AI-CLI" -a "OPENAI_API_KEY" -w "sk-..."
security add-generic-password -s "AI-CLI" -a "ANTHROPIC_API_KEY" -w "sk-ant-..."
security add-generic-password -s "AI-CLI" -a "GOOGLE_API_KEY" -w "..."

# Retrieve when needed
export OPENAI_API_KEY=$(security find-generic-password -s "AI-CLI" -a "OPENAI_API_KEY" -w)
```

## 🐛 Troubleshooting

### "command not found: codex/claude/gemini"

**Solution**: Your PATH isn't set up correctly.

```bash
# Add to ~/.bashrc or ~/.zshrc
export PATH="$HOME/.npm-global/bin:$PATH"

# Reload
source ~/.bashrc
```

### "Permission denied" when installing

**Solution**: Don't use `sudo` with npm! The script sets up a user-local prefix.

```bash
# If you accidentally used sudo, fix permissions:
sudo chown -R $USER:$USER ~/.npm-global
```

### Node.js version is too old

**Solution**: The script installs Node.js 22.x. If you have an older version:

```bash
# Remove old Node (if installed via apt)
sudo apt remove nodejs

# Re-run the script
./install-ai-cli.sh
```

### API key not working

**Solution**: Verify the key format and permissions.

```bash
# Test OpenAI key
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"

# Test Anthropic key
curl https://api.anthropic.com/v1/models \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01"
```

### Installation hangs

**Solution**: Check your internet connection and try again. The script is idempotent (safe to re-run).

## 📚 Additional Resources

### Official Documentation
- [OpenAI Codex Docs](https://platform.openai.com/docs/)
- [Anthropic Claude Docs](https://docs.anthropic.com/)
- [Google Gemini Docs](https://ai.google.dev/)

### Getting API Keys
- [OpenAI API Keys](https://platform.openai.com/api-keys)
- [Anthropic Console](https://console.anthropic.com/)
- [Google AI Studio](https://aistudio.google.com/app/apikey)

## 🔄 Updating CLIs

```bash
# Update all at once
npm update -g @openai/codex @anthropic-ai/claude-code @google/gemini-cli

# Or individually
npm update -g @openai/codex
npm update -g @anthropic-ai/claude-code
npm update -g @google/gemini-cli
```

## 🗑️ Uninstalling

```bash
# Remove CLIs
npm uninstall -g @openai/codex @anthropic-ai/claude-code @google/gemini-cli

# Remove Node.js (if desired)
sudo apt remove nodejs

# Clean up npm cache
rm -rf ~/.npm-global
```

## 💪 Advanced Usage

### Using Multiple Models

```bash
# Compare responses
codex "Explain event loops" > openai-response.txt
claude "Explain event loops" > claude-response.txt
gemini "Explain event loops" > gemini-response.txt

# Use diff to compare
diff openai-response.txt claude-response.txt
```

### Scripting with AI CLIs

```bash
#!/bin/bash
# Generate documentation for all Python files

for file in *.py; do
    echo "Documenting $file..."
    claude "Generate docstrings for this Python file" < "$file" > "${file}.docs.md"
done
```

### Context-Aware Conversations

```bash
# Provide context from files
cat mycode.js | codex "Refactor this for better performance"

# Multi-turn conversations
claude chat < conversation-history.txt
```

## 🎯 Pro Tips

1. **Set default models** early to avoid specifying them each time
2. **Use environment files** (`.env`) for projects with different API keys
3. **Alias common commands** in your shell RC for faster access
4. **Pipe outputs** to files for later review
5. **Combine CLIs** - use different models for different tasks

## 📝 Script Contents

- `install-ai-cli.sh` - Main installation script
- `install-claude-cli-sh` - (If standalone Claude installer exists)

## 🤝 Contributing

Found an issue or want to improve the script? PRs welcome!

---

*Part of the [Modular Misfits Scripts Collection](../)*
