#!/usr/bin/env bash
# Install Codex CLI, Claude Code CLI, and Gemini CLI on Raspberry Pi (aarch64, Debian 13)
# Safe for repeated runs. No root-owned npm globals.

set -euo pipefail

# ---------- helpers ----------
append_line_once() {
  local line="$1" file="$2"
  grep -Fqx "$line" "$file" 2>/dev/null || echo "$line" >> "$file"
}

detect_shell_rc() {
  # Prefer the current shell rc, fall back to bashrc
  local shname
  shname="$(ps -p $$ -o comm= || true)"
  case "$shname" in
    zsh) echo "$HOME/.zshrc" ;;
    bash) echo "$HOME/.bashrc" ;;
    *) echo "$HOME/.bashrc" ;;
  esac
}

# ---------- prerequisites ----------
echo "[1/6] Installing system prerequisites"
sudo apt update
sudo apt install -y curl ca-certificates build-essential python3 python3-pip git

# ---------- Node.js LTS via NodeSource ----------
echo "[2/6] Installing Node.js 22.x"
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
echo "Node: $(node -v)  npm: $(npm -v)"

# ---------- npm global prefix in HOME ----------
echo "[3/6] Configuring npm to use a user prefix"
NPM_HOME="$HOME/.npm-global"
mkdir -p "$NPM_HOME/bin"
npm config set prefix "$NPM_HOME"
PROFILE_RC="$(detect_shell_rc)"
append_line_once "export PATH=\"$NPM_HOME/bin:\$PATH\"" "$PROFILE_RC"

# Ensure current session picks it up
export PATH="$NPM_HOME/bin:$PATH"

# ---------- Install CLIs ----------
echo "[4/6] Installing CLIs to \$HOME"
npm install -g @openai/codex @anthropic-ai/claude-code @google/gemini-cli

# ---------- API keys and auth ----------
echo "[5/6] Capturing API keys (optional, press Enter to skip)"
read -r -p "OpenAI API key for Codex (OPENAI_API_KEY): " OPENAI_API_KEY_INPUT || true
read -r -p "Anthropic API key for Claude (ANTHROPIC_API_KEY): " ANTHROPIC_API_KEY_INPUT || true
read -r -p "Google AI Studio key for Gemini (GOOGLE_API_KEY) or leave blank to sign in later: " GOOGLE_API_KEY_INPUT || true

if [ -n "${OPENAI_API_KEY_INPUT:-}" ]; then
  append_line_once "export OPENAI_API_KEY=\"$OPENAI_API_KEY_INPUT\"" "$PROFILE_RC"
fi
if [ -n "${ANTHROPIC_API_KEY_INPUT:-}" ]; then
  append_line_once "export ANTHROPIC_API_KEY=\"$ANTHROPIC_API_KEY_INPUT\"" "$PROFILE_RC"
fi
if [ -n "${GOOGLE_API_KEY_INPUT:-}" ]; then
  append_line_once "export GOOGLE_API_KEY=\"$GOOGLE_API_KEY_INPUT\"" "$PROFILE_RC"
fi

# ---------- Smoke tests ----------
echo "[6/6] Verifying installations"
echo "codex version:   $(codex --version || echo 'not found in PATH')"
echo "claude version:  $(claude --version || echo 'not found in PATH')"
echo "gemini version:  $(gemini --version || echo 'not found in PATH')"

cat <<'TIP'

Done. Open a new terminal, or run:
  source ~/.bashrc   # or ~/.zshrc

Quick tests:
  codex --help
  claude --help
  gemini --help

Auth notes:
  Codex uses OPENAI_API_KEY. Set a default model with: codex config set model gpt-4.1-mini
  Claude uses ANTHROPIC_API_KEY. You can run: claude auth status
  Gemini can use GOOGLE_API_KEY, or run: gemini auth login   to complete a browser sign in.

If npm reports permission errors, confirm PATH includes ~/.npm-global/bin and avoid sudo for npm.
TIP
