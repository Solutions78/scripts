#!/usr/bin/env bash

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔍 Checking prerequisites for Multi-Model MCP...${NC}"
echo ""

MISSING_DEPS=()

# Check for Rust/Cargo
echo -n "Checking for Rust/Cargo... "
if command -v cargo &> /dev/null; then
    RUST_VERSION=$(cargo --version | awk '{print $2}')
    echo -e "${GREEN}✓ Found (${RUST_VERSION})${NC}"
else
    echo -e "${RED}✗ Not found${NC}"
    MISSING_DEPS+=("rust")
fi

# Check for Node.js
echo -n "Checking for Node.js... "
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo -e "${GREEN}✓ Found (${NODE_VERSION})${NC}"
else
    echo -e "${RED}✗ Not found${NC}"
    MISSING_DEPS+=("node")
fi

# Check for npm
echo -n "Checking for npm... "
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    echo -e "${GREEN}✓ Found (v${NPM_VERSION})${NC}"
else
    echo -e "${RED}✗ Not found${NC}"
    MISSING_DEPS+=("npm")
fi

# Check for API keys in keychain
echo -n "Checking for Anthropic API key... "
if security find-generic-password -s "devsecops-orchestrator" -a "CLAUDE_API_KEY" -w &> /dev/null; then
    echo -e "${GREEN}✓ Found in keychain${NC}"
else
    echo -e "${YELLOW}⚠ Not found in keychain (can use env var)${NC}"
fi

echo -n "Checking for OpenAI API key... "
if security find-generic-password -s "devsecops-orchestrator" -a "OPENAI_API_KEY" -w &> /dev/null; then
    echo -e "${GREEN}✓ Found in keychain${NC}"
else
    echo -e "${YELLOW}⚠ Not found in keychain (can use env var)${NC}"
fi

echo ""

# If missing dependencies, offer to install
if [ ${#MISSING_DEPS[@]} -eq 0 ]; then
    echo -e "${GREEN}✓ All prerequisites are installed!${NC}"
    exit 0
fi

echo -e "${YELLOW}Missing dependencies: ${MISSING_DEPS[*]}${NC}"
echo ""
echo "Would you like to install them now? (y/n)"
read -r INSTALL_CHOICE

if [[ ! "$INSTALL_CHOICE" =~ ^[Yy]$ ]]; then
    echo ""
    echo "Please install the missing dependencies manually:"
    echo ""
    for dep in "${MISSING_DEPS[@]}"; do
        case $dep in
            rust)
                echo "  ${BLUE}Rust:${NC}"
                echo "    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh"
                echo "    source ~/.cargo/env"
                echo ""
                ;;
            node|npm)
                echo "  ${BLUE}Node.js:${NC}"
                if [[ "$OSTYPE" == "darwin"* ]]; then
                    echo "    brew install node"
                else
                    echo "    Visit https://nodejs.org/ to download"
                fi
                echo ""
                ;;
        esac
    done
    exit 1
fi

echo ""
echo -e "${BLUE}Installing missing dependencies...${NC}"
echo ""

# Install Rust
if [[ " ${MISSING_DEPS[*]} " =~ " rust " ]]; then
    echo -e "${BLUE}Installing Rust...${NC}"
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y

    # Source cargo env for current session
    export PATH="$HOME/.cargo/bin:$PATH"
    source "$HOME/.cargo/env" 2>/dev/null || true

    echo -e "${GREEN}✓ Rust installed${NC}"
    echo ""
fi

# Install Node.js
if [[ " ${MISSING_DEPS[*]} " =~ " node " ]] || [[ " ${MISSING_DEPS[*]} " =~ " npm " ]]; then
    echo -e "${BLUE}Installing Node.js...${NC}"

    if [[ "$OSTYPE" == "darwin"* ]]; then
        # Check if Homebrew is installed
        if command -v brew &> /dev/null; then
            brew install node
            echo -e "${GREEN}✓ Node.js installed${NC}"
        else
            echo -e "${RED}✗ Homebrew not found. Please install Node.js manually from https://nodejs.org/${NC}"
            exit 1
        fi
    else
        echo -e "${YELLOW}Please install Node.js manually from https://nodejs.org/${NC}"
        exit 1
    fi
    echo ""
fi

echo ""
echo -e "${GREEN}✓ All dependencies installed successfully!${NC}"
echo ""
echo -e "${YELLOW}Note: You may need to restart your terminal or run:${NC}"
echo -e "  source ~/.cargo/env"
echo -e "  source ~/.zshrc  # or ~/.bashrc"
