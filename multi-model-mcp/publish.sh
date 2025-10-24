#!/usr/bin/env bash
# Quick publish script for Multi-Model MCP extension

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}📦 Publishing Multi-Model MCP Extension${NC}"
echo ""

# Check for Open VSX token
if [ -z "${OPENVSX_TOKEN:-}" ]; then
    echo -e "${RED}✗ OPENVSX_TOKEN environment variable not set${NC}"
    echo ""
    echo "To publish, you need an Open VSX token:"
    echo "1. Go to https://open-vsx.org/"
    echo "2. Sign in with GitHub"
    echo "3. Go to User Settings → Tokens"
    echo "4. Generate a new token"
    echo "5. Export it: export OPENVSX_TOKEN='your-token'"
    echo ""
    exit 1
fi

# Check ovsx is installed
if ! command -v ovsx &> /dev/null; then
    echo -e "${YELLOW}📥 Installing ovsx publishing tool...${NC}"
    npm install -g ovsx
    echo -e "${GREEN}✓ ovsx installed${NC}"
    echo ""
fi

# Navigate to extension directory
cd "$(dirname "$0")/vscode-extension"

# Get current version
VERSION=$(node -p "require('./package.json').version")
echo -e "${BLUE}Current version: ${VERSION}${NC}"
echo ""

# Ask for confirmation
echo -e "${YELLOW}Ready to publish version ${VERSION} to Open VSX?${NC}"
read -p "Continue? (y/N) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Publishing cancelled."
    exit 0
fi

# Build if needed
if [ ! -f "multi-model-mcp-${VERSION}.vsix" ]; then
    echo -e "${BLUE}📦 Packaging extension...${NC}"
    npm run package
    echo -e "${GREEN}✓ Extension packaged${NC}"
    echo ""
fi

# Publish to Open VSX
echo -e "${BLUE}🚀 Publishing to Open VSX Registry...${NC}"
ovsx publish "multi-model-mcp-${VERSION}.vsix" -p "${OPENVSX_TOKEN}"

echo ""
echo -e "${GREEN}✅ Published successfully!${NC}"
echo ""
echo -e "${BLUE}Your extension is now available at:${NC}"
echo "https://open-vsx.org/extension/modular-misfits/multi-model-mcp"
echo ""
echo -e "${BLUE}Users can install it with:${NC}"
echo "codium --install-extension modular-misfits.multi-model-mcp"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Update README.md with installation instructions"
echo "2. Create a GitHub release: https://github.com/Solutions78/scripts/releases"
echo "3. Share on social media"
echo "4. Monitor for issues and feedback"
echo ""
