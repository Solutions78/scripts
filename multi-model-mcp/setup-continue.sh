#!/usr/bin/env bash
# Setup Continue extension with Multi-Model MCP server
# Provides chat sidebar interface with Claude and GPT models

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Setting up Continue Extension with Multi-Model MCP${NC}"
echo ""

# 1. Check VSCodium is installed
echo -e "${BLUE}Step 1: Checking VSCodium installation...${NC}"
if ! command -v codium &> /dev/null; then
    echo -e "${RED}✗ VSCodium not found. Please install it first.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ VSCodium found${NC}"
echo ""

# 2. Check MCP server is built
echo -e "${BLUE}Step 2: Checking MCP server...${NC}"
MCP_SERVER_PATH="/Users/tony/Projects/scripts/multi-model-mcp/mcp-server/target/release/multi-model-mcp"

if [ ! -f "$MCP_SERVER_PATH" ]; then
    echo -e "${YELLOW}⚠ MCP server not built yet. Building now...${NC}"
    cd "$(dirname "$0")"
    ./build.sh
    echo ""
fi

if [ ! -f "$MCP_SERVER_PATH" ]; then
    echo -e "${RED}✗ Failed to build MCP server${NC}"
    exit 1
fi
echo -e "${GREEN}✓ MCP server found at: $MCP_SERVER_PATH${NC}"
echo ""

# 3. Install Continue extension
echo -e "${BLUE}Step 3: Installing Continue extension...${NC}"
if codium --list-extensions | grep -q "continue.continue"; then
    echo -e "${GREEN}✓ Continue extension already installed${NC}"
else
    codium --install-extension continue.continue
    echo -e "${GREEN}✓ Continue extension installed${NC}"
fi
echo ""

# 4. Create Continue configuration directory
echo -e "${BLUE}Step 4: Configuring Continue...${NC}"
CONTINUE_DIR="$HOME/.continue"
CONTINUE_CONFIG="$CONTINUE_DIR/config.json"

mkdir -p "$CONTINUE_DIR"

# Backup existing config if it exists
if [ -f "$CONTINUE_CONFIG" ]; then
    BACKUP="$CONTINUE_CONFIG.backup.$(date +%Y%m%d-%H%M%S)"
    cp "$CONTINUE_CONFIG" "$BACKUP"
    echo -e "${YELLOW}📦 Backed up existing config to: $BACKUP${NC}"
fi

# 5. Write Continue configuration
cat > "$CONTINUE_CONFIG" <<EOF
{
  "models": [
    {
      "title": "Claude 3.5 Sonnet (via MCP)",
      "provider": "anthropic",
      "model": "claude-3-5-sonnet-20241022",
      "apiKey": "via-mcp-server"
    },
    {
      "title": "Claude 3 Opus (via MCP)",
      "provider": "anthropic",
      "model": "claude-3-opus-20240229",
      "apiKey": "via-mcp-server"
    },
    {
      "title": "GPT-4 Turbo (via MCP)",
      "provider": "openai",
      "model": "gpt-4-turbo-preview",
      "apiKey": "via-mcp-server"
    },
    {
      "title": "GPT-4 (via MCP)",
      "provider": "openai",
      "model": "gpt-4",
      "apiKey": "via-mcp-server"
    }
  ],
  "tabAutocompleteModel": {
    "title": "Claude 3.5 Haiku",
    "provider": "anthropic",
    "model": "claude-3-5-haiku-20241022",
    "apiKey": "via-mcp-server"
  },
  "mcpServers": {
    "multi-model": {
      "command": "$MCP_SERVER_PATH",
      "args": [],
      "env": {}
    }
  },
  "allowAnonymousTelemetry": false,
  "enableControlServerBeta": false
}
EOF

echo -e "${GREEN}✓ Continue configuration created${NC}"
echo ""

# 6. Instructions
echo -e "${GREEN}✅ Setup complete!${NC}"
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}📖 How to Use:${NC}"
echo ""
echo "1. ${GREEN}Reload VSCodium:${NC}"
echo "   • Cmd+Shift+P → 'Developer: Reload Window'"
echo ""
echo "2. ${GREEN}Open Continue Chat Sidebar:${NC}"
echo "   • Click the Continue icon in the left sidebar"
echo "   • Or press: Cmd+L (Mac) / Ctrl+L (Linux)"
echo ""
echo "3. ${GREEN}Start Chatting:${NC}"
echo "   • Type your question or code request"
echo "   • Select model from dropdown at top of chat"
echo "   • Available models:"
echo "     - Claude 3.5 Sonnet (default)"
echo "     - Claude 3 Opus"
echo "     - GPT-4 Turbo"
echo "     - GPT-4"
echo ""
echo "4. ${GREEN}Special Features:${NC}"
echo "   • Highlight code → Right-click → 'Continue: Edit'"
echo "   • '@' to reference files"
echo "   • '/edit' for inline code editing"
echo "   • '/comment' for adding comments"
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${YELLOW}🔍 Troubleshooting:${NC}"
echo ""
echo "If chat doesn't appear:"
echo "  1. Reload window (Cmd+Shift+P → Reload Window)"
echo "  2. Check Continue icon in left sidebar"
echo "  3. View → Output → Select 'Continue' from dropdown"
echo ""
echo "If MCP server fails:"
echo "  • Check logs: View → Output → 'Continue'"
echo "  • Verify OAuth token: ./install-prerequisites.sh"
echo ""
echo -e "${GREEN}Happy coding with AI! 🤖${NC}"
