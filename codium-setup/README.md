# 💻 VSCodium Setup

**Free and Open Source Visual Studio Code Alternative**

Because we like our code editors like we like our coffee: **free, open source, and without telemetry**.

VSCodium is a community-driven, freely-licensed binary distribution of Microsoft's VS Code, stripped of all telemetry and tracking.

## 🎯 What Gets Installed

### Two-Script Setup

1. **`codium-setup.sh`** - Installs VSCodium itself
2. **`codium-postinstall.sh`** - Configures VSCodium with essential extensions and settings

### Extensions Included

**Python Development:**
- `ms-python.python` - Python language support
- `ms-python.vscode-pylance` - Fast Python IntelliSense
- `ms-toolsai.jupyter` - Jupyter notebook support
- `ms-toolsai.jupyter-keymap` - Jupyter keybindings
- `ms-toolsai.jupyter-renderers` - Rich output rendering

**Development Tools:**
- `ms-azuretools.vscode-docker` - Docker support
- `ms-vscode.cpptools` - C/C++ IntelliSense

**Git & Version Control:**
- `eamodio.gitlens` - Advanced Git features
- `mhutchie.git-graph` - Visual Git history

**Code Quality:**
- `VisualStudioExptTeam.vscodeintellicode` - AI-assisted IntelliSense
- `esbenp.prettier-vscode` - Code formatter
- `streetsidesoftware.code-spell-checker` - Spell checking

### Opinionated Settings

The post-install script configures sensible defaults:

**Editor:**
- Auto-save after 800ms delay
- Format on save (using Black for Python)
- Trim trailing whitespace
- Insert final newline
- 100-character ruler
- Bracket pair guides

**Privacy:**
- All telemetry disabled (VSCodium, GitLens, RedHat)
- No startup editor
- No release notes popup
- Manual extension updates

**Python:**
- Black formatter (100 char line length)
- Pylance language server
- Basic type checking
- Pytest enabled
- Auto-import completions

**Git:**
- Auto-fetch enabled
- No sync confirmations

## 📋 Prerequisites

### System Requirements
- **OS**: Linux (Debian/Ubuntu), Raspberry Pi, or macOS
- **Architecture**: x86_64 or aarch64 (ARM64)
- Root/sudo access for installation

### What You'll Need
- Internet connection
- `curl` or `wget`
- Package manager (`apt`, `brew`, etc.)

## 🚀 Installation

### Complete Setup (Recommended)

```bash
cd codium-setup

# Step 1: Install VSCodium
./codium-setup.sh

# Step 2: Configure with extensions and settings
./codium-postinstall.sh
```

### VSCodium Only

```bash
./codium-setup.sh
```

### Extensions & Settings Only

```bash
# If VSCodium is already installed
./codium-postinstall.sh
```

## 🔧 What Happens During Installation

### codium-setup.sh

Installs VSCodium from official repositories:

**Linux (Debian/Ubuntu):**
```bash
# Adds VSCodium repository
# Installs GPG key
# Updates package list
# Installs codium package
```

**Raspberry Pi:**
```bash
# Adds ARM64-compatible repository
# Installs VSCodium for aarch64
```

**macOS:**
```bash
# Uses Homebrew cask
brew install --cask vscodium
```

### codium-postinstall.sh

1. ✅ Verifies VSCodium is installed
2. ✅ Installs 12 essential extensions
3. ✅ Backs up existing settings (if any)
4. ✅ Writes curated `settings.json`
5. ✅ Configures Python, Git, and editor preferences

## 📁 Configuration Files

### Settings Location

```
~/.config/VSCodium/User/
├── settings.json           # Main configuration
└── settings.json.bak.*     # Automatic backups
```

### Backup System

Every time you run `codium-postinstall.sh`, your existing settings are backed up:

```
settings.json.bak.20251023-140530
settings.json.bak.20251022-093045
```

## 💡 Post-Installation

### Launch VSCodium

```bash
codium
```

### Open a Project

```bash
codium /path/to/project
```

### Install Additional Extensions

```bash
# Via command line
codium --install-extension <extension-id>

# Or use the Extensions panel in VSCodium (Ctrl+Shift+X)
```

## 🎨 Customization

### Modify Default Settings

Edit the settings before running post-install:

```bash
nano codium-postinstall.sh

# Find the settings.json section (line ~45)
# Adjust to your preferences
```

Or edit after installation:

```bash
# Open settings
codium ~/.config/VSCodium/User/settings.json

# Or use UI: Ctrl+, (Command+, on macOS)
```

### Add More Extensions

Edit `codium-postinstall.sh` and add to the `EXT` array:

```bash
EXT=(
  ms-python.python
  ms-python.vscode-pylance
  # ... existing extensions ...
  your-publisher.your-extension  # Add here
)
```

### Custom Keybindings

Create or edit:
```bash
nano ~/.config/VSCodium/User/keybindings.json
```

## 🐛 Troubleshooting

### "codium: command not found"

**Solution**: Ensure installation completed and PATH is set.

```bash
# Check if installed
which codium

# Add to PATH if needed (Linux)
export PATH="$PATH:/usr/bin"

# Reinstall if missing
./codium-setup.sh
```

### Extensions Fail to Install

**Solution**: Install manually or check Open VSX registry.

```bash
# Check extension marketplace
codium --list-extensions

# Install specific extension
codium --install-extension ms-python.python

# Or use the UI (Ctrl+Shift+X)
```

### Settings Not Applied

**Solution**: Check settings file exists and is valid JSON.

```bash
# View settings
cat ~/.config/VSCodium/User/settings.json

# Validate JSON
python3 -m json.tool ~/.config/VSCodium/User/settings.json

# Re-run post-install
./codium-postinstall.sh
```

### Python Extension Not Working

**Solution**: Ensure Python is installed.

```bash
# Check Python
python3 --version

# Install if missing
sudo apt install python3 python3-pip  # Debian/Ubuntu
brew install python3                  # macOS

# Reload VSCodium
```

### Telemetry Still Enabled

**Solution**: VSCodium has no telemetry by default, but extensions might.

Check the settings:
```json
{
  "telemetry.telemetryLevel": "off",
  "redhat.telemetry.enabled": false,
  "gitlens.advanced.telemetry.enabled": false
}
```

## 🔄 Updating

### Update VSCodium

```bash
# Linux
sudo apt update && sudo apt upgrade codium

# macOS
brew upgrade vscodium
```

### Update Extensions

```bash
# Update all extensions
codium --update-extensions

# Or manually via UI
```

### Reapply Settings

```bash
# Backup will be created automatically
./codium-postinstall.sh
```

## 🗑️ Uninstalling

### Remove VSCodium

```bash
# Linux
sudo apt remove codium
sudo rm /etc/apt/sources.list.d/vscodium.list

# macOS
brew uninstall --cask vscodium
```

### Remove Extensions & Settings

```bash
rm -rf ~/.config/VSCodium
rm -rf ~/.vscode-oss  # Extension data
```

## 🆚 VSCodium vs VS Code

| Feature | VSCodium | VS Code |
|---------|----------|---------|
| **License** | MIT (Free) | Microsoft (Proprietary) |
| **Telemetry** | None | Enabled by default |
| **Extensions** | Open VSX | Microsoft Marketplace |
| **Branding** | Open source | Microsoft |
| **Updates** | Community | Microsoft |
| **Privacy** | ✅ Complete | ⚠️ Tracks usage |

### Extension Availability

Most VS Code extensions work in VSCodium via [Open VSX](https://open-vsx.org/). Some Microsoft-specific extensions may not be available.

## 🔐 Security & Privacy

### Why VSCodium?

- **No telemetry**: Zero data collection
- **Open source**: Auditable code
- **Community-driven**: Not controlled by one corporation
- **Same features**: All VS Code functionality without tracking

### What's Removed?

- Telemetry endpoints
- Crash reporting
- Usage statistics
- Update notifications to Microsoft servers
- Proprietary Microsoft branding

## 📚 Additional Resources

- [VSCodium Official Site](https://vscodium.com/)
- [VSCodium GitHub](https://github.com/VSCodium/vscodium)
- [Open VSX Registry](https://open-vsx.org/)
- [VS Code Docs](https://code.visualstudio.com/docs) (Most apply to VSCodium)

## 🎯 Pro Tips

1. **Use workspaces** - Save project-specific settings
2. **Enable auto-save** - Already configured in post-install!
3. **Learn shortcuts** - `Ctrl+Shift+P` for command palette
4. **Use integrated terminal** - `` Ctrl+` `` (backtick)
5. **Git integration** - Use built-in source control panel

### Recommended Workflow

```bash
# Open project
cd ~/projects/myapp
codium .

# Or from within VSCodium:
# File > Open Folder...
```

### Python Development

```bash
# Select Python interpreter: Ctrl+Shift+P → "Python: Select Interpreter"
# Run file: Ctrl+F5
# Debug: F5
# Open Jupyter: Create .ipynb file
```

## 🤝 Contributing

Found a better extension? Want to improve default settings? PRs welcome!

Suggestions for additions:
- JavaScript/TypeScript developers
- Rust developers
- Go developers
- Web developers (HTML/CSS/React)

## 📝 Script Contents

- `codium-setup.sh` - VSCodium installation
- `codium-postinstall.sh` - Extensions and configuration

Both scripts are **idempotent** - safe to run multiple times!

---

*Part of the [Modular Misfits Scripts Collection](../)*
