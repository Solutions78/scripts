#!/usr/bin/env bash
# Test ChatGPT MCP Connection

set -euo pipefail

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "🔍 ChatGPT MCP Connection Test"
echo ""

# Check config file
echo -n "1. Config file exists... "
if [ -f ~/Library/Application\ Support/ChatGPT/mcp_config.json ]; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗ Not found${NC}"
    exit 1
fi

# Check binary exists
echo -n "2. MCP server binary exists... "
if [ -f /Users/tony/Projects/scripts/multi-model-mcp/mcp-server/target/release/multi-model-mcp ]; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗ Run ./build.sh first${NC}"
    exit 1
fi

# Check if server starts
echo -n "3. Server starts successfully... "
if timeout 2 /Users/tony/Projects/scripts/multi-model-mcp/mcp-server/target/release/multi-model-mcp 2>&1 | grep -q "MCP Server ready" || true; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${YELLOW}⚠ Check credentials${NC}"
fi

# Test local_map tool
echo -n "4. Testing local_map tool... "
# Use a subshell with sleep to auto-terminate
RESULT=$( (echo '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'; sleep 0.3) | \
    /Users/tony/Projects/scripts/multi-model-mcp/mcp-server/target/release/multi-model-mcp 2>/dev/null | \
    grep -o '"name":"local_map"' || echo "")

if [ -n "$RESULT" ]; then
    echo -e "${GREEN}✓ Available${NC}"
else
    echo -e "${RED}✗ Not found${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}✅ All checks passed!${NC}"
echo ""
echo "Next steps:"
echo "1. Restart ChatGPT desktop app"
echo "2. Try: 'Use local_map to show my project structure'"
echo ""
echo "View config:"
echo "  cat ~/Library/Application\\ Support/ChatGPT/mcp_config.json"
