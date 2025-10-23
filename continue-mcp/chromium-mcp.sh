bash -eu <<'SETUP'
# 1) Prereqs
if ! command -v brew >/dev/null 2>&1; then
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
  eval "$(/opt/homebrew/bin/brew shellenv 2>/dev/null || /usr/local/bin/brew shellenv)"
fi
brew install node jq >/dev/null

# 2) Workspace
mkdir -p ~/.mcp/servers/chromium-mcp/src
cd ~/.mcp/servers/chromium-mcp

# 3) Package files
cat > package.json <<'JSON'
{
  "name": "chromium-mcp",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "start": "tsx src/index.ts"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.2.0",
    "playwright": "^1.48.0"
  },
  "devDependencies": {
    "tsx": "^4.19.0",
    "typescript": "^5.6.3"
  }
}
JSON

cat > tsconfig.json <<'JSON'
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "skipLibCheck": true,
    "esModuleInterop": true
  },
  "include": ["src"]
}
JSON

# 4) Server implementation
cat > src/index.ts <<'TS'
import { Server, Tool, JSONSchema } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { chromium, Browser, Page } from "playwright";
import fs from "node:fs/promises";
import { exec as cpExec } from "node:child_process";
import { promisify } from "node:util";
const exec = promisify(cpExec);

let browser: Browser | null = null;
let page: Page | null = null;

async function ensureBrowser() {
  if (!browser) browser = await chromium.launch({ headless: true });
  if (!page) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    page = await ctx.newPage();
    page.on("console", msg => console.log(JSON.stringify({ type: "console", text: msg.text() })));
  }
  return page;
}

const openUrl: Tool = {
  name: "open_url",
  description: "Open a URL in headless Chromium and wait for network idle",
  inputSchema: {
    type: "object",
    properties: { url: { type: "string" } },
    required: ["url"],
    additionalProperties: false
  } as JSONSchema,
  async execute({ url }) {
    const p = await ensureBrowser();
    await p.goto(url, { waitUntil: "networkidle" });
    const title = await p.title();
    return { content: [{ type: "text", text: `Opened ${url} with title: ${title}` }] };
  }
};

const evalJs: Tool = {
  name: "eval_js",
  description: "Evaluate JavaScript in the active page and return the stringified result",
  inputSchema: {
    type: "object",
    properties: { code: { type: "string" } },
    required: ["code"],
    additionalProperties: false
  } as JSONSchema,
  async execute({ code }) {
    const p = await ensureBrowser();
    const result = await p.evaluate((c: string) => {
      try { return { ok: true, value: String(eval(c)) }; }
      catch (e) { return { ok: false, error: String(e) }; }
    }, code);
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  }
};

const click: Tool = {
  name: "click_selector",
  description: "Click a CSS selector on the active page",
  inputSchema: {
    type: "object",
    properties: { selector: { type: "string" }, waitFor: { type: "string", nullable: true } },
    required: ["selector"],
    additionalProperties: false
  } as JSONSchema,
  async execute({ selector, waitFor }) {
    const p = await ensureBrowser();
    await p.click(selector);
    if (waitFor) await p.waitForSelector(waitFor, { state: "visible" });
    return { content: [{ type: "text", text: `Clicked ${selector}` }] };
  }
};

const typeText: Tool = {
  name: "type_text",
  description: "Type text into a CSS selector on the active page",
  inputSchema: {
    type: "object",
    properties: { selector: { type: "string" }, text: { type: "string" }, clear: { type: "boolean", default: true } },
    required: ["selector", "text"],
    additionalProperties: false
  } as JSONSchema,
  async execute({ selector, text, clear }) {
    const p = await ensureBrowser();
    await p.focus(selector);
    if (clear) await p.fill(selector, "");
    await p.type(selector, text);
    return { content: [{ type: "text", text: `Typed into ${selector}` }] };
  }
};

const screenshot: Tool = {
  name: "screenshot",
  description: "Take a PNG screenshot of the active page",
  inputSchema: {
    type: "object",
    properties: { path: { type: "string" } },
    required: ["path"],
    additionalProperties: false
  } as JSONSchema,
  async execute({ path }) {
    const p = await ensureBrowser();
    await p.screenshot({ path, fullPage: true });
    return { content: [{ type: "text", text: `Saved screenshot to ${path}` }] };
  }
};

const consoleLogs: Tool = {
  name: "get_console_logs",
  description: "Fetch recent console messages from the page session",
  inputSchema: { type: "object", properties: {}, additionalProperties: false } as JSONSchema,
  async execute() {
    return { content: [{ type: "text", text: "Console events are streamed to STDOUT as they occur" }] };
  }
};

const readFile: Tool = {
  name: "read_file",
  description: "Read a UTF-8 text file from disk",
  inputSchema: {
    type: "object",
    properties: { path: { type: "string" } },
    required: ["path"],
    additionalProperties: false
  } as JSONSchema,
  async execute({ path }) {
    const data = await fs.readFile(path, "utf8");
    return { content: [{ type: "text", text: data }] };
  }
};

const sh: Tool = {
  name: "sh",
  description: "Execute a shell command and return stdout and stderr",
  inputSchema: {
    type: "object",
    properties: { cmd: { type: "string" } },
    required: ["cmd"],
    additionalProperties: false
  } as JSONSchema,
  async execute({ cmd }) {
    const { stdout, stderr } = await exec(cmd);
    return { content: [{ type: "text", text: JSON.stringify({ stdout, stderr }) }] };
  }
};

const transport = new StdioServerTransport();
const server = new Server(
  {
    name: "chromium-mcp",
    version: "0.1.0",
    description: "Headless Chromium and system helpers via MCP"
  },
  { capabilities: { tools: {} } }
);

server.addTool(openUrl);
server.addTool(evalJs);
server.addTool(click);
server.addTool(typeText);
server.addTool(screenshot);
server.addTool(consoleLogs);
server.addTool(readFile);
server.addTool(sh);

await server.connect(transport);

process.on("SIGINT", async () => {
  if (browser) await browser.close();
  process.exit(0);
});
TS

# 5) Install deps and browser
npm install >/dev/null
npx playwright install chromium >/dev/null

# 6) Convenience runner
cat > run.sh <<'SH'
#!/usr/bin/env bash
cd "$(dirname "$0")"
npm run start
SH
chmod +x run.sh

echo "OK"
SETUP
