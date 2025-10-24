#!/usr/bin/env bash

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "🚀 Building Multi-Model MCP Server and Extension"
echo ""

# Check prerequisites
echo -e "${BLUE}Checking prerequisites...${NC}"
if [ -f "./install-prerequisites.sh" ]; then
    ./install-prerequisites.sh
    if [ $? -ne 0 ]; then
        echo ""
        echo -e "${YELLOW}Please install missing prerequisites and try again.${NC}"
        exit 1
    fi
else
    echo -e "${YELLOW}Warning: install-prerequisites.sh not found, skipping checks${NC}"
fi

# Source cargo env if it exists (for fresh Rust installs)
if [ -f "$HOME/.cargo/env" ]; then
    source "$HOME/.cargo/env"
fi

echo ""

# Build Rust server
echo -e "${BLUE}Step 1: Building Rust MCP server...${NC}"
cd mcp-server
cargo build --release
echo -e "${GREEN}✓ Rust server built successfully${NC}"
echo ""

# Build TypeScript extension
echo -e "${BLUE}Step 2: Building VSCodium extension...${NC}"
cd ../vscode-extension

# Clean install to avoid dependency conflicts
if [ -d "node_modules" ]; then
    echo "Cleaning old node_modules..."
    rm -rf node_modules package-lock.json
fi

npm install
npm run compile
echo -e "${GREEN}✓ Extension compiled successfully${NC}"
echo ""

# Package extension
echo -e "${BLUE}Step 3: Packaging extension...${NC}"
npm run package
echo -e "${GREEN}✓ Extension packaged successfully${NC}"
echo ""

echo -e "${GREEN}🎉 Build complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Install the extension: code --install-extension vscode-extension/multi-model-mcp-*.vsix"
echo "2. The extension will automatically use the built server binary"
echo ""
