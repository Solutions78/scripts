#!/usr/bin/env bash
# mcp-chromium-setup.sh
# Raspberry Pi aarch64, Debian 13. Sets up a Python MCP server that controls Chromium via Playwright
# and wires it into VSCodium through the Continue extension. Idempotent.

set -euo pipefail

# ---- Paths
MCP_ROOT="${HOME}/.local/share/mcp-chromium"
ENV_DIR="${MCP_ROOT}/venv"
SRV="${MCP_ROOT}/mcp_chromium_server.py"
LOG_DIR="${MCP_ROOT}/logs"
mkdir -p "${MCP_ROOT}" "${LOG_DIR}"

# ---- Ensure codium present
if ! command -v codium >/dev/null 2>&1; then
  echo "Codium is not on PATH. Install VSCodium first." >&2
  exit 1
fi

# ---- Create venv and install deps
python3 -m venv "${ENV_DIR}"
# shellcheck disable=SC1091
source "${ENV_DIR}/bin/activate"
pip install --upgrade pip wheel
# MCP Python SDK + Playwright
pip install "mcp>=1.1.0" "playwright>=1.47.0"

# Install Chromium for Playwright (arm64 build)
python -m playwright install chromium

# ---- Write the MCP server
cat > "${SRV}" <<'PY'
#!/usr/bin/env python3
# mcp_chromium_server.py
# A minimal MCP server that provides tools to control Chromium via Playwright.
# Tools:
#   init_browser(headless: bool = True)
#   open_url(url: str)
#   eval_js(expression: str)
#   screenshot(selector: Optional[str] = None)
#   click(selector: str)
#   type(selector: str, text: str, delay_ms: int = 0)
#   wait_for(selector: str, timeout_ms: int = 10000)
#   get_console_logs()
#   get_network_events()

import asyncio
import base64
import json
import os
from typing import Any, Dict, List, Optional

from mcp.server import Server
from mcp.types import (
    Tool, TextContent, ImageContent, ImageType, ToolResult, CallToolResult
)

from playwright.async_api import async_playwright, Browser, Page

server = Server("mcp-chromium")
_browser: Optional[Browser] = None
_page: Optional[Page] = None
_console: List[Dict[str, Any]] = []
_network: List[Dict[str, Any]] = []

async def _ensure_page(headless: bool = True) -> Page:
    global _browser, _page
    if _page and not _page.is_closed():
        return _page
    if _browser is None:
        pw = await async_playwright().start()
        _browser = await pw.chromium.launch(headless=headless)
    ctx = await _browser.new_context()
    _page = await ctx.new_page()

    _page.on("console", lambda msg: _console.append({
        "type": msg.type(),
        "text": msg.text(),
        "location": msg.location,
    }))
    _page.on("request", lambda req: _network.append({
        "type": "request",
        "method": req.method(),
        "url": req.url,
        "headers": req.headers,
    }))
    _page.on("response", lambda resp: _network.append({
        "type": "response",
        "url": resp.url,
        "status": resp.status,
        "headers": resp.headers(),
    }))
    return _page

@server.tool()
async def init_browser(headless: bool = True) -> ToolResult:
    """Initialize a Chromium browser session. Call once per session or to switch headless mode."""
    await _ensure_page(headless=headless)
    return ToolResult(
        content=[TextContent(type="text", text=json.dumps({"ok": True, "headless": headless}))],
        is_error=False
    )

@server.tool()
async def open_url(url: str) -> ToolResult:
    """Open a URL in the active page and wait for network idle."""
    page = await _ensure_page()
    await page.goto(url, wait_until="networkidle")
    title = await page.title()
    return ToolResult(content=[TextContent(type="text", text=json.dumps({"ok": True, "title": title}))])

@server.tool()
async def eval_js(expression: str) -> ToolResult:
    """Evaluate a JavaScript expression in the page context and return the result as JSON."""
    page = await _ensure_page()
    try:
        result = await page.evaluate(expression)
        return ToolResult(content=[TextContent(type="text", text=json.dumps({"result": result}))])
    except Exception as e:
        return ToolResult(content=[TextContent(type="text", text=str(e))], is_error=True)

@server.tool()
async def screenshot(selector: Optional[str] = None) -> ToolResult:
    """Take a PNG screenshot of the full page or a specific selector, return as data URL."""
    page = await _ensure_page()
    if selector:
        el = await page.query_selector(selector)
        if el is None:
            return ToolResult(content=[TextContent(type="text", text=f"Selector not found: {selector}")], is_error=True)
        png = await el.screenshot(type="png")
    else:
        png = await page.screenshot(full_page=True, type="png")
    b64 = base64.b64encode(png).decode("ascii")
    return ToolResult(content=[ImageContent(type="image", data=b64, mime_type=ImageType.Png)])

@server.tool()
async def click(selector: str) -> ToolResult:
    """Click the first element matching selector."""
    page = await _ensure_page()
    await page.click(selector, timeout=10000)
    return ToolResult(content=[TextContent(type="text", text=json.dumps({"ok": True}))])

@server.tool()
async def type(selector: str, text: str, delay_ms: int = 0) -> ToolResult:
    """Type text into an element matching selector."""
    page = await _ensure_page()
    await page.fill(selector, "")
    await page.type(selector, text, delay=delay_ms)
    return ToolResult(content=[TextContent(type="text", text=json.dumps({"ok": True}))])

@server.tool()
async def wait_for(selector: str, timeout_ms: int = 10000) -> ToolResult:
    """Wait for a selector to appear."""
    page = await _ensure_page()
    await page.wait_for_selector(selector, timeout=timeout_ms)
    return ToolResult(content=[TextContent(type="text", text=json.dumps({"ok": True}))])

@server.tool()
async def get_console_logs() -> ToolResult:
    """Return collected console logs since last call."""
    global _console
    out = _console
    _console = []
    return ToolResult(content=[TextContent(type="text", text=json.dumps(out))])

@server.tool()
async def get_network_events() -> ToolResult:
    """Return collected network request/response events since last call."""
    global _network
    out = _network
    _network = []
    return ToolResult(content=[TextContent(type="text", text=json.dumps(out))])

async def main() -> None:
    # stdio transport
    await server.run_stdio_async()

if __name__ == "__main__":
    asyncio.run(main())
PY

chmod +x "${SRV}"

# ---- Write a generic MCP servers registry (used by some clients)
MCP_REG="${HOME}/.mcp/servers.json"
mkdir -p "$(dirname "${MCP_REG}")"
cat > "${MCP_REG}" <<JSON
{
  "servers": {
    "chromium": {
      "command": "${ENV_DIR}/bin/python",
      "args": ["${SRV}"],
      "env": {}
    }
  }
}
JSON

# ---- Install Continue (VSCode/Codium MCP client) and wire it
codium --install-extension continue.continue --force || true

CONT_DIR="${HOME}/.continue"
CONT_CFG="${CONT_DIR}/config.json"
mkdir -p "${CONT_DIR}"

# Create or update Continue config with MCP server
if [ -f "${CONT_CFG}" ]; then
  # Merge carefully: if "mcpServers" exists, replace/merge chromium
  python3 - <<'PY' "${CONT_CFG}" "${ENV_DIR}" "${SRV}"
import json, os, sys
cfg_path, env_dir, srv_path = sys.argv[1], sys.argv[2], sys.argv[3]
cfg = {}
if os.path.exists(cfg_path):
    with open(cfg_path, 'r') as f:
        try: cfg = json.load(f)
        except Exception: cfg = {}
mcp = cfg.get("mcpServers", {})
mcp["chromium"] = {
    "command": f"{env_dir}/bin/python",
    "args": [srv_path],
    "env": {}
}
cfg["mcpServers"] = mcp
os.makedirs(os.path.dirname(cfg_path), exist_ok=True)
with open(cfg_path, 'w') as f:
    json.dump(cfg, f, indent=2)
print("Updated", cfg_path)
PY
else
  cat > "${CONT_CFG}" <<JSON
{
  "models": [],
  "mcpServers": {
    "chromium": {
      "command": "${ENV_DIR}/bin/python",
      "args": ["${SRV}"],
      "env": {}
    }
  }
}
JSON
fi

# ---- Suggest minimal Codium settings for Continue keybinds
CONF_DIR="$HOME/.config/VSCodium/User"
SETTINGS="$CONF_DIR/settings.json"
mkdir -p "$CONF_DIR"
if [ ! -f "$SETTINGS" ]; then
  echo '{}' > "$SETTINGS"
fi

# Append a harmless tweak to encourage Continue panel discoverability
python3 - <<'PY' "${SETTINGS}"
import json, sys, os
pth = sys.argv[1]
with open(pth) as f:
    try: s=json.load(f)
    except Exception: s={}
s.setdefault("workbench.activityBar.visible", True)
os.makedirs(os.path.dirname(pth), exist_ok=True)
with open(pth, 'w') as f: json.dump(s, f, indent=2)
print("Updated", pth)
PY

echo "MCP Chromium server installed."
echo "Path: ${SRV}"
echo "Start or reload Codium, open Continue sidebar, and you should see the MCP server available as 'chromium'."
