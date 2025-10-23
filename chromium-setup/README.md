# 🌐 Chromium MCP Setup

**Browser Automation MCP Server for AI Assistants**

Set up a Model Context Protocol (MCP) server that gives your AI assistant direct control over a real Chromium browser via Playwright. Perfect for web scraping, testing, debugging, and automation tasks.

## 🎯 What Is This?

This script installs a **Python-based MCP server** that provides browser automation tools to AI assistants (like Continue in VSCodium). Your AI can then:

- 🌍 Open URLs and navigate websites
- 🖱️ Click elements, fill forms, and interact with pages
- 📸 Take screenshots of full pages or specific elements
- 🔍 Execute JavaScript and extract data
- 📊 Monitor console logs and network traffic
- ⚡ Wait for dynamic content to load
- 🤖 Automate repetitive browser tasks

## 📋 Prerequisites

### System Requirements
- **OS**: Linux (Debian/Ubuntu), Raspberry Pi (aarch64), or macOS
- **Python**: 3.8 or higher
- **VSCodium**: Must be installed first (see [../codium-setup/](../codium-setup/))

### What Gets Installed
- Python virtual environment
- MCP Python SDK (>=1.1.0)
- Playwright (>=1.47.0)
- Chromium browser (ARM64 build for Raspberry Pi)
- Continue extension for VSCodium
- MCP server script

## 🚀 Installation

### Quick Start

```bash
cd chromium-setup
./mcp-chromium-setup.sh
```

The script is **idempotent** - safe to run multiple times!

### What Happens During Setup

1. ✅ Verifies VSCodium is installed
2. ✅ Creates Python virtual environment at `~/.local/share/mcp-chromium/`
3. ✅ Installs MCP SDK and Playwright
4. ✅ Downloads Chromium browser
5. ✅ Generates MCP server script
6. ✅ Configures Continue extension
7. ✅ Updates VSCodium settings

### Installation Output

```
Creating virtual environment...
Installing dependencies...
Writing MCP server...
Configuring Continue extension...
MCP Chromium server installed.
Path: ~/.local/share/mcp-chromium/mcp_chromium_server.py
```

## 🔧 Configuration

The script automatically configures Continue extension. If you need to manually edit:

**Continue Config** (`~/.continue/config.json`):
```json
{
  "mcpServers": {
    "chromium": {
      "command": "/Users/tony/.local/share/mcp-chromium/venv/bin/python",
      "args": ["/Users/tony/.local/share/mcp-chromium/mcp_chromium_server.py"],
      "env": {}
    }
  }
}
```

## 🛠️ Available Tools

Once installed, your AI assistant has access to these browser automation tools:

### `init_browser(headless: bool = True)`
Initialize a Chromium browser session.
```python
# Headless mode (no window)
init_browser(headless=True)

# With visible window (for debugging)
init_browser(headless=False)
```

### `open_url(url: str)`
Open a URL and wait for network to be idle.
```python
open_url("https://example.com")
```

### `eval_js(expression: str)`
Execute JavaScript in the page context.
```python
eval_js("document.title")
eval_js("Array.from(document.querySelectorAll('a')).map(a => a.href)")
```

### `screenshot(selector: Optional[str] = None)`
Take a PNG screenshot, returns base64-encoded image.
```python
# Full page screenshot
screenshot()

# Screenshot of specific element
screenshot("div.main-content")
```

### `click(selector: str)`
Click an element matching the CSS selector.
```python
click("button#submit")
click("a.nav-link")
```

### `type(selector: str, text: str, delay_ms: int = 0)`
Type text into an input element.
```python
type("input#username", "myuser")
type("textarea", "Hello world", delay_ms=50)
```

### `wait_for(selector: str, timeout_ms: int = 10000)`
Wait for an element to appear on the page.
```python
wait_for("div.loaded")
wait_for("img.thumbnail", timeout_ms=5000)
```

### `get_console_logs()`
Retrieve collected browser console messages.
```python
get_console_logs()
# Returns: [{"type": "log", "text": "...", "location": {...}}, ...]
```

### `get_network_events()`
Retrieve collected network requests and responses.
```python
get_network_events()
# Returns: [{"type": "request", "method": "GET", "url": "...", ...}, ...]
```

## 💡 Usage Examples

### In Continue Extension

Start VSCodium and open the Continue sidebar. Example prompts:

**Navigate and Screenshot:**
```
Use the chromium MCP server to:
1. Open https://example.com
2. Take a screenshot
3. Show me the title
```

**Form Interaction:**
```
Use chromium tools to:
1. Open https://example.com/search
2. Type "MCP servers" in the search box with selector "input#q"
3. Click the search button
4. Wait for results to load
5. Screenshot the results
```

**Data Extraction:**
```
Use chromium to:
1. Open https://news.ycombinator.com
2. Evaluate this JS: document.querySelectorAll('.titleline > a').forEach(a => console.log(a.textContent))
3. Get console logs
```

**Debugging:**
```
Open https://myapp.local in chromium with headless=False
Then execute: console.log(window.myAppState)
Get console logs and show me the state
```

## 🐛 Troubleshooting

### Server Not Visible in Continue

**Solution**: Restart VSCodium completely.

```bash
# Kill all VSCodium processes
pkill -9 codium

# Restart VSCodium
codium
```

### "codium: command not found"

**Solution**: Install VSCodium first.

```bash
cd ../codium-setup
./codium-setup.sh
```

### Permission Errors

**Solution**: Ensure the script and MCP server are executable.

```bash
chmod +x mcp-chromium-setup.sh
chmod +x ~/.local/share/mcp-chromium/mcp_chromium_server.py
```

### Playwright/Chromium Installation Failed

**Solution**: Install manually and re-run.

```bash
source ~/.local/share/mcp-chromium/venv/bin/activate
python -m playwright install chromium
deactivate
```

### MCP Server Crashes

**Solution**: Check logs in the Continue output panel or terminal.

```bash
# Run server manually to see errors
source ~/.local/share/mcp-chromium/venv/bin/activate
python ~/.local/share/mcp-chromium/mcp_chromium_server.py
```

### Browser Can't Access Localhost

**Solution**: Use `127.0.0.1` instead of `localhost` in URLs, or configure network settings.

## 📁 Installation Paths

```
~/.local/share/mcp-chromium/
├── venv/                    # Python virtual environment
├── logs/                    # Log files (if configured)
└── mcp_chromium_server.py   # MCP server script

~/.continue/
└── config.json              # Continue MCP configuration

~/.mcp/
└── servers.json             # Generic MCP registry (for other clients)
```

## 🔄 Updating

```bash
# Activate virtual environment
source ~/.local/share/mcp-chromium/venv/bin/activate

# Update dependencies
pip install --upgrade mcp playwright

# Reinstall Chromium
python -m playwright install chromium

deactivate
```

## 🗑️ Uninstalling

```bash
# Remove MCP server
rm -rf ~/.local/share/mcp-chromium

# Remove Continue configuration (manual edit)
# Edit ~/.continue/config.json and remove "chromium" from mcpServers

# Remove Continue extension (optional)
codium --uninstall-extension continue.continue
```

## 🎯 Advanced Usage

### Custom MCP Server

Edit the server script to add new tools:

```bash
nano ~/.local/share/mcp-chromium/mcp_chromium_server.py
```

Add new `@server.tool()` functions following the existing patterns.

### Debugging Mode

Run server with visible browser:

```python
# In Continue, use:
init_browser(headless=False)
```

Watch browser actions in real-time!

### Network Monitoring

```python
# Clear previous events
get_network_events()

# Navigate and perform actions
open_url("https://example.com")
click("button#load-more")

# Get all requests/responses since last clear
events = get_network_events()
```

### Multi-Page Workflows

```python
# Open page
open_url("https://example.com")

# Login
type("input#username", "user")
type("input#password", "pass")
click("button#login")
wait_for("div.dashboard")

# Navigate to section
click("a[href='/settings']")
wait_for("form#settings")

# Take screenshot
screenshot()
```

## 🔐 Security Considerations

- **Runs locally**: All browser automation happens on your machine
- **No external calls**: MCP communicates via stdio (standard in/out)
- **Sandboxed**: Chromium runs in its own process
- **API keys**: Never expose credentials through browser automation

## 📚 Additional Resources

- [MCP Specification](https://modelcontextprotocol.io/)
- [Playwright Documentation](https://playwright.dev/)
- [Continue Extension](https://continue.dev/)
- [Python MCP SDK](https://github.com/modelcontextprotocol/python-sdk)

## 🎬 Example Workflows

### Web Scraping

```
Open https://quotes.toscrape.com
Evaluate: Array.from(document.querySelectorAll('.quote')).map(q => ({
  text: q.querySelector('.text').textContent,
  author: q.querySelector('.author').textContent
}))
Get console logs
```

### Automated Testing

```
Open http://localhost:3000
Type "admin" in input#username
Type "password" in input#password
Click button[type="submit"]
Wait for div.dashboard with timeout 5000ms
Screenshot div.dashboard
Evaluate: document.querySelector('.user-name').textContent
```

### Performance Monitoring

```
Clear network events
Open https://example.com
Wait 3 seconds
Get network events
Show me all requests with status >= 400
```

## 🤝 Contributing

Improvements? Bug fixes? PRs welcome!

---

*Part of the [Modular Misfits Scripts Collection](../)*
