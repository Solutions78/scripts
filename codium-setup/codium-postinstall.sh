#!/bin/bash
# VSCodium hardening and Python dev setup for Raspberry Pi (aarch64)
# Idempotent, safe, and mildly opinionated.

set -euo pipefail

# 1) Ensure Codium is present
if ! command -v codium >/dev/null 2>&1; then
  echo "codium is not on PATH. Install VSCodium first, then rerun."
  exit 1
fi

# 2) Install extensions
EXT=(
  ms-python.python
  ms-python.vscode-pylance
  ms-toolsai.jupyter
  ms-toolsai.jupyter-keymap
  ms-toolsai.jupyter-renderers
  ms-azuretools.vscode-docker
  ms-vscode.cpptools
  eamodio.gitlens
  mhutchie.git-graph
  VisualStudioExptTeam.vscodeintellicode
  esbenp.prettier-vscode
  streetsidesoftware.code-spell-checker
)

echo "Installing extensions..."
for e in "${EXT[@]}"; do
  codium --install-extension "$e" --force || true
done

# 3) Write settings with backup
CONF_DIR="$HOME/.config/VSCodium/User"
SETTINGS="$CONF_DIR/settings.json"
mkdir -p "$CONF_DIR"

TS=$(date +"%Y%m%d-%H%M%S")
if [ -f "$SETTINGS" ]; then
  cp -f "$SETTINGS" "$SETTINGS.bak.$TS"
  echo "Backed up existing settings to $SETTINGS.bak.$TS"
fi

cat > "$SETTINGS" <<'JSON'
{
  "files.autoSave": "afterDelay",
  "files.autoSaveDelay": 800,
  "files.trimTrailingWhitespace": true,
  "files.insertFinalNewline": true,

  "editor.formatOnSave": true,
  "editor.defaultFormatter": "ms-python.python",
  "editor.tabSize": 4,
  "editor.rulers": [100],
  "editor.minimap.enabled": false,
  "editor.renderWhitespace": "selection",
  "editor.guides.bracketPairs": true,

  "telemetry.telemetryLevel": "off",
  "redhat.telemetry.enabled": false,
  "gitlens.advanced.telemetry.enabled": false,
  "workbench.startupEditor": "none",
  "update.showReleaseNotes": false,
  "extensions.autoCheckUpdates": false,
  "extensions.autoUpdate": false,

  "terminal.integrated.defaultProfile.linux": "bash",

  "python.formatting.provider": "black",
  "python.formatting.blackArgs": ["-l", "100"],
  "python.analysis.typeCheckingMode": "basic",
  "python.analysis.autoImportCompletions": true,
  "python.languageServer": "Pylance",
  "python.showStartPage": false,
  "python.testing.pytestEnabled": true,

  "jupyter.sendSelectionToInteractiveWindow": true,
  "jupyter.askForKernelRestart": false,

  "git.confirmSync": false,
  "git.autofetch": true
}
JSON

echo "Wrote curated settings to $SETTINGS"

echo "Done. Launch with: codium"
