# Publishing Multi-Model MCP Extension

Guide to publishing the extension to Open VSX Registry (for VSCodium) and VS Code Marketplace.

## Option 1: Open VSX Registry (VSCodium)

**Open VSX** is the open-source extension registry used by VSCodium, Gitpod, Theia, and other VS Code alternatives.

### Prerequisites

1. **Create an Open VSX account**:
   - Go to https://open-vsx.org/
   - Sign in with GitHub

2. **Generate a Personal Access Token**:
   - Go to https://open-vsx.org/user-settings/tokens
   - Click "Generate New Token"
   - Give it a name (e.g., "multi-model-mcp-publish")
   - Copy the token (save it securely!)

### Install Publishing Tool

```bash
npm install -g ovsx
```

### Publish to Open VSX

```bash
cd /Users/tony/Projects/scripts/multi-model-mcp/vscode-extension

# Package the extension
npm run package

# Publish to Open VSX
ovsx publish multi-model-mcp-0.1.0.vsix -p YOUR_ACCESS_TOKEN
```

**Or create a publisher namespace first:**

```bash
# Create publisher (one-time)
ovsx create-namespace modular-misfits -p YOUR_ACCESS_TOKEN

# Then publish
ovsx publish multi-model-mcp-0.1.0.vsix -p YOUR_ACCESS_TOKEN
```

### After Publishing

Your extension will be available at:
```
https://open-vsx.org/extension/modular-misfits/multi-model-mcp
```

Users can install via:
```bash
codium --install-extension modular-misfits.multi-model-mcp
```

Or search "Multi-Model MCP" in VSCodium Extensions panel.

---

## Option 2: VS Code Marketplace (Microsoft)

**Note**: Microsoft's marketplace requires a Microsoft/Azure account and has stricter requirements.

### Prerequisites

1. **Create Azure DevOps account**:
   - Go to https://dev.azure.com/
   - Sign in with Microsoft account

2. **Create a Personal Access Token**:
   - Go to User Settings → Personal Access Tokens
   - Click "New Token"
   - Name: "vscode-publish"
   - Organization: All accessible organizations
   - Scopes: Select "Marketplace (Manage)"
   - Copy the token

3. **Create a Publisher**:
   - Go to https://marketplace.visualstudio.com/manage
   - Click "Create Publisher"
   - Publisher ID: `modular-misfits`
   - Display Name: `Modular Misfits`

### Publish to VS Code Marketplace

```bash
cd /Users/tony/Projects/scripts/multi-model-mcp/vscode-extension

# Login (one-time)
npx vsce login modular-misfits

# Publish
npx vsce publish
```

**Or publish manually:**

```bash
# Package
npx vsce package

# Upload at https://marketplace.visualstudio.com/manage/publishers/modular-misfits
```

### After Publishing

Your extension will be available at:
```
https://marketplace.visualstudio.com/items?itemName=modular-misfits.multi-model-mcp
```

---

## Option 3: Both Registries (Recommended)

Publish to **both** registries to reach the widest audience:

```bash
cd /Users/tony/Projects/scripts/multi-model-mcp/vscode-extension

# Build once
npm run package

# Publish to Open VSX
ovsx publish multi-model-mcp-0.1.0.vsix -p $OPENVSX_TOKEN

# Publish to VS Code Marketplace
npx vsce publish -p $VSCODE_TOKEN
```

---

## Pre-Publishing Checklist

Before publishing, make sure:

- [x] README.md is complete and well-formatted
- [x] LICENSE.md is present
- [x] Icon (icon.png) is included
- [x] package.json has all required fields:
  - [x] `name`
  - [x] `displayName`
  - [x] `description`
  - [x] `version`
  - [x] `publisher`
  - [x] `repository`
  - [x] `license`
  - [x] `icon`
  - [x] `categories`
  - [x] `engines`
- [x] .vscodeignore excludes unnecessary files
- [x] Extension has been tested locally
- [x] All commands work as expected
- [x] No sensitive data in code

---

## Automated Publishing Script

Create `.github/workflows/publish.yml` for automatic releases:

```yaml
name: Publish Extension

on:
  push:
    tags:
      - 'v*'

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: |
          cd multi-model-mcp/vscode-extension
          npm install

      - name: Build Rust server
        run: |
          cd multi-model-mcp/mcp-server
          cargo build --release

      - name: Package extension
        run: |
          cd multi-model-mcp/vscode-extension
          npm run package

      - name: Publish to Open VSX
        run: |
          cd multi-model-mcp/vscode-extension
          npx ovsx publish *.vsix -p ${{ secrets.OPENVSX_TOKEN }}

      - name: Publish to VS Code Marketplace
        run: |
          cd multi-model-mcp/vscode-extension
          npx vsce publish -p ${{ secrets.VSCODE_TOKEN }}
```

---

## Version Management

### Bump Version

```bash
cd vscode-extension

# Patch (0.1.0 → 0.1.1)
npm version patch

# Minor (0.1.0 → 0.2.0)
npm version minor

# Major (0.1.0 → 1.0.0)
npm version major
```

This updates `package.json` and creates a git tag.

### Publish New Version

```bash
# Commit changes
git add .
git commit -m "Bump version to 0.2.0"
git push

# Create and push tag
git tag v0.2.0
git push --tags

# Publish
npm run package
ovsx publish *.vsix -p $OPENVSX_TOKEN
npx vsce publish -p $VSCODE_TOKEN
```

---

## Updating Published Extension

To update after publishing:

1. Make your changes
2. Update version in `package.json`
3. Update CHANGELOG.md (recommended)
4. Rebuild and republish:

```bash
npm run package
ovsx publish multi-model-mcp-0.2.0.vsix -p $TOKEN
```

Users will be notified of updates automatically.

---

## Extension Statistics

After publishing, you can view:

**Open VSX:**
- https://open-vsx.org/extension/modular-misfits/multi-model-mcp
- Downloads, ratings, reviews

**VS Code Marketplace:**
- https://marketplace.visualstudio.com/manage
- Installs, ratings, Q&A

---

## Unpublishing

**Open VSX:**
```bash
ovsx unpublish modular-misfits.multi-model-mcp -p $TOKEN
```

**VS Code Marketplace:**
```bash
npx vsce unpublish modular-misfits.multi-model-mcp -p $TOKEN
```

**Note**: Unpublishing may have restrictions. Read each platform's policies.

---

## Quick Start Publishing

**For the impatient:**

```bash
# 1. Get Open VSX token from https://open-vsx.org/user-settings/tokens
export OPENVSX_TOKEN="your-token-here"

# 2. Install publishing tool
npm install -g ovsx

# 3. Publish
cd /Users/tony/Projects/scripts/multi-model-mcp/vscode-extension
npm run package
ovsx publish multi-model-mcp-0.1.0.vsix -p $OPENVSX_TOKEN

# Done! 🎉
```

Your extension is now live and discoverable!

---

## Support & Maintenance

After publishing:

1. **Monitor issues**: Check GitHub issues regularly
2. **Respond to reviews**: Engage with users on marketplace
3. **Update regularly**: Fix bugs, add features
4. **Keep dependencies updated**: Security patches
5. **Maintain documentation**: Keep README current

---

## Best Practices

✅ **Do:**
- Semantic versioning (MAJOR.MINOR.PATCH)
- Maintain CHANGELOG.md
- Test thoroughly before publishing
- Respond to user feedback
- Keep dependencies updated

❌ **Don't:**
- Break existing functionality in minor versions
- Publish with known bugs
- Include sensitive data
- Ignore user issues
- Violate marketplace policies

---

## Resources

- **Open VSX**: https://open-vsx.org/
- **Open VSX Publishing**: https://github.com/eclipse/openvsx/wiki/Publishing-Extensions
- **VS Code Publishing**: https://code.visualstudio.com/api/working-with-extensions/publishing-extension
- **Extension Guidelines**: https://code.visualstudio.com/api/references/extension-guidelines

---

**Ready to publish? Follow the Quick Start above!** 🚀
