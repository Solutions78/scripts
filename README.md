# 🎭 The Modular Misfits Script Collection

> *"Because life's too short to install things manually like it's 1995"*

Welcome, weary traveler, to our chaotic collection of shell scripts that actually work (most of the time). These are the scripts that the Modular Misfits use when we're too lazy to remember all those installation commands... which is basically always.

## 📁 What's in the Toolbox?

This repository is organized into focused modules, each handling a specific aspect of development environment setup:

### 🤖 [AI-CLI-setup](./AI-CLI-setup/)
**Your AI Command Line Companions**

Install and configure multiple AI CLI tools in one go:
- **Claude Code CLI** - Anthropic's Claude in your terminal
- **OpenAI Codex CLI** - GPT-powered coding assistant
- **Google Gemini CLI** - Google's AI at your fingertips

Perfect for developers who want AI assistance without leaving the comfort of bash.

**Quick Start:**
```bash
cd AI-CLI-setup
./install-ai-cli.sh
```

---

### 🌐 [chromium-setup](./chromium-setup/)
**Browser Automation MCP Server**

Set up a Model Context Protocol (MCP) server for Chromium browser automation using Playwright. Let your AI assistant control a real browser!

Features:
- Headless Chromium automation
- Python-based MCP server
- Integration with Continue extension
- Console logging and network monitoring

**Quick Start:**
```bash
cd chromium-setup
./mcp-chromium-setup.sh
```

---

### 💻 [codium-setup](./codium-setup/)
**VSCodium Installation & Configuration**

Because we like our code editors like we like our coffee: **free and open source**.

- `codium-setup.sh` - Install VSCodium (the telemetry-free VS Code)
- `codium-postinstall.sh` - Essential extensions for Python, Docker, Git, and more

**Quick Start:**
```bash
cd codium-setup
./codium-setup.sh
./codium-postinstall.sh
```

---

### 🔌 [continue-mcp](./continue-mcp/)
**Continue Extension MCP Integration**

A complete guide and scripts for setting up MCP servers with the Continue extension in VSCodium. Enables local AI tool execution for browser automation and system interaction.

Features:
- Node.js + Playwright setup
- TypeScript MCP server implementation
- Continue extension configuration
- Browser control tools (click, type, screenshot, eval JS)

**Quick Start:**
```bash
cd continue-mcp
# See README.md for detailed setup instructions
```

---

### 🚀 [multi-model-mcp](./multi-model-mcp/)
**Multi-Model AI Development Assistant**

A full-featured MCP server with Codium extension that provides multi-model AI assistance using both Anthropic Claude and OpenAI GPT models.

Features:
- Rust-based MCP server (high performance!)
- TypeScript VSCodium extension
- Code generation and review
- Dynamic model switching
- Context management
- Secure OAuth token handling

**Quick Start:**
```bash
cd multi-model-mcp
./install-prerequisites.sh
./build.sh
```

---

## 🚀 General Usage

Each directory is self-contained with its own README and setup instructions. Generally:

```bash
# Navigate to the tool you want
cd <directory-name>

# Read the specific README
cat README.md

# Run the setup script
./<script-name>.sh
```

## ⚠️ Important Notes

### Platform Compatibility

These scripts are primarily tested on:
- ✅ **macOS** (Apple Silicon & Intel)
- ✅ **Linux** (Debian/Ubuntu-based systems)
- ✅ **Raspberry Pi** (aarch64, Debian)
- ⚠️ **Windows** - Use WSL2 (Windows Subsystem for Linux)

### Before Running Scripts

1. **Always read the script first**: `cat script-name.sh`
2. **Check prerequisites**: Most READMEs list what you need
3. **Have backups**: We're not responsible for your data
4. **Use common sense**: `sudo` is not a magic wand

## 🔐 Security & API Keys

Many scripts handle API keys and sensitive credentials. We follow best practices:

- Keys stored in **system keychain** (macOS) or secure environment variables
- No hardcoded credentials in scripts
- Clear prompts before storing sensitive data
- Option to skip credential setup

**Never commit API keys to version control!**

## 🤝 Contributing

Found a bug? Want to add a script? Think our jokes are terrible?

**Pull requests welcome!** Just remember:
1. Keep it functional
2. Keep it funny (optional but encouraged)
3. Keep it open source
4. Don't be evil
5. Test on at least one platform before submitting

### Script Guidelines

- Use `#!/usr/bin/env bash` or `#!/usr/bin/env python3`
- Make scripts idempotent (safe to run multiple times)
- Provide helpful output messages
- Include a README in the directory
- Handle errors gracefully with `set -euo pipefail`

## 📖 Documentation

Each subdirectory contains:
- **README.md** - Overview, features, and usage
- **Scripts** - The actual automation
- **Configuration examples** - When applicable

Start with the main directory README, then dive into specifics!

## 🎮 The Modular Misfits

We're just a bunch of tech enthusiasts who believe that:
- Software should be free (as in freedom, and preferably as in beer)
- Automation beats repetition
- Good documentation includes bad jokes
- The best code is the code you don't have to write
- AI should help developers, not replace them

## 💡 Pro Tips

1. **Read before executing** - Even our scripts (especially our scripts)
2. **Check for updates** - `git pull` before running old scripts
3. **Customize** - These scripts are starting points, not gospel
4. **Share improvements** - Found a better way? PR it!
5. **Have fun** - Technology should be enjoyable

## 🐛 Troubleshooting

### "Permission denied" when running scripts

```bash
chmod +x script-name.sh
```

### "Command not found" errors

Make sure prerequisites are installed. Check the specific README for requirements.

### Scripts hang or fail

- Check your internet connection
- Verify API keys are set correctly
- Look for error messages in the output
- Check the specific directory's README for known issues

### Something broke my system

First: Don't panic.
Second: Check what changed with `git diff`
Third: Restore from backup (you have backups, right?)
Fourth: Open an issue with details

## 📜 License

See [LICENSE.md](LICENSE.md) for the boring legal stuff.

**TL;DR**: MIT License - Use it, modify it, share it, just give us credit (or a high-five, that works too).

## 🌟 Star This Repo

If these scripts saved you time, prevented a headache, or made you smile, consider giving us a star! It helps others discover these tools and motivates us to keep improving them.

## 📬 Stay in Touch

- **Issues**: Report bugs and request features via [GitHub Issues](https://github.com/Solutions78/scripts/issues)
- **Discussions**: Share your setups and ask questions
- **Pull Requests**: Contributions always welcome!

---

## 📚 Quick Links

| Directory | Purpose | Key Scripts |
|-----------|---------|-------------|
| [AI-CLI-setup](./AI-CLI-setup/) | AI CLI tools | `install-ai-cli.sh` |
| [chromium-setup](./chromium-setup/) | Browser automation MCP | `mcp-chromium-setup.sh` |
| [codium-setup](./codium-setup/) | VSCodium installation | `codium-setup.sh`, `codium-postinstall.sh` |
| [continue-mcp](./continue-mcp/) | Continue MCP integration | See README |
| [multi-model-mcp](./multi-model-mcp/) | Multi-AI assistant | `build.sh`, `install-prerequisites.sh` |

---

*Made with ❤️, ☕, and probably too much time on our hands by the Modular Misfits*

**Remember:** With great power comes great responsibility... but also great fun! 🎉
