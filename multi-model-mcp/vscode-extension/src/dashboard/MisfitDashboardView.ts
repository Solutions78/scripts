import * as vscode from "vscode";
import * as path from "path";
import {
    McpClient,
    RunEventName,
    RunHistory,
    ToolCallRequest,
    ToolRunSummary
} from "../mcpClient";
import { versionsTrackerEvents } from "../versionsTracker";

type HistoryEntry = {
    timestamp: string;
    model: string;
    tools: string[];
    arguments: any[];
    error?: string;
    created: string[];
    modified: string[];
    deleted: string[];
    changes?: string;
};

type HistoryPayload = {
    entries: HistoryEntry[];
    models: string[];
    tools: string[];
};

export class MisfitDashboardView implements vscode.WebviewViewProvider {
    private view?: vscode.WebviewView;
    private runListenerDisposables: Array<() => void> = [];
    private versionsListener?: (...args: any[]) => void;

    constructor(
        private readonly context: vscode.ExtensionContext,
        private readonly client: McpClient,
        private readonly out: vscode.OutputChannel
    ) { }

    resolveWebviewView(webviewView: vscode.WebviewView): void | Thenable<void> {
        this.view = webviewView;
        const webview = webviewView.webview;

        webview.options = {
            enableScripts: true,
            localResourceRoots: [this.context.extensionUri]
        };

        const scriptUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this.context.extensionUri, "out", "dashboard", "view.js")
        );
        const styleUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this.context.extensionUri, "media", "misfitDashboard.css")
        );

        const nonce = Math.random().toString(36).slice(2);

        return this.loadWatermark(webview).then((watermark) => {
            webview.html = this.getHtml(scriptUri, styleUri, nonce, watermark);
            this.attachRunListeners();
            this.attachVersionsListener();
            webview.onDidReceiveMessage((msg) => this.onMessage(msg));
            webviewView.onDidDispose(() => {
                this.detachRunListeners();
                this.detachVersionsListener();
            });
        });
    }

    private attachRunListeners() {
        if (this.runListenerDisposables.length) return;
        const events: RunEventName[] = [
            "runQueued",
            "runStarted",
            "runProgress",
            "runFinished",
            "runFailed",
            "runCancelled",
            "historyUpdated"
        ];

        for (const event of events) {
            if (event === "historyUpdated") {
                const listener = (payload: RunHistory) => {
                    this.post({ type: "liveRuns", history: payload });
                };
                this.client.onRunEvent(event, listener as any);
                this.runListenerDisposables.push(() => this.client.offRunEvent(event, listener as any));
            } else {
                const listener = (payload: ToolRunSummary) => {
                    this.post({ type: "runEvent", event, run: payload });
                };
                this.client.onRunEvent(event, listener as any);
                this.runListenerDisposables.push(() => this.client.offRunEvent(event, listener as any));
            }
        }
    }

    private detachRunListeners() {
        while (this.runListenerDisposables.length) {
            const dispose = this.runListenerDisposables.pop();
            if (dispose) dispose();
        }
    }

    private attachVersionsListener() {
        if (this.versionsListener) return;
        this.versionsListener = async () => {
            await this.pushHistory();
        };
        versionsTrackerEvents.on("runRecorded", this.versionsListener);
    }

    private detachVersionsListener() {
        if (this.versionsListener) {
            versionsTrackerEvents.off("runRecorded", this.versionsListener);
            this.versionsListener = undefined;
        }
    }

    private async onMessage(msg: any) {
        switch (msg?.type) {
            case "ready":
                this.pushLiveRuns();
                await this.pushHistory();
                break;
            case "pollLiveRuns":
                this.pushLiveRuns();
                break;
            case "requestHistory":
                await this.pushHistory();
                break;
            case "cancelRun":
                if (typeof msg.id === "number") {
                    const cancelled = this.client.cancelRun(msg.id);
                    if (!cancelled) {
                        vscode.window.showWarningMessage(`Unable to cancel run ${msg.id}`);
                    }
                }
                break;
            case "openPath":
                if (typeof msg.path === "string") {
                    await this.openPath(msg.path);
                }
                break;
            case "replayEntry":
                await this.replayEntry(msg);
                break;
        }
    }

    private pushLiveRuns() {
        const history = this.client.getRunHistory();
        this.post({ type: "liveRuns", history });
    }

    private async pushHistory() {
        try {
            const payload = await this.loadHistory();
            this.post({ type: "historyData", history: payload });
        } catch (err: any) {
            this.post({ type: "historyError", message: err?.message || String(err) });
        }
    }

    private async replayEntry(msg: any) {
        if (!Array.isArray(msg?.tools) || !Array.isArray(msg?.arguments)) return;
        const tools: string[] = msg.tools;
        const args: any[] = msg.arguments;
        if (!tools.length) return;

        const plan: ToolCallRequest[] = tools.map((name, idx) => ({
            name,
            arguments: args[idx] ?? {}
        }));

        this.post({ type: "replayQueued", tools });
        this.client.runTools(plan).catch((err) => {
            const message = err?.message || String(err);
            this.out.appendLine(`[dashboard] Replay failed: ${message}`);
            vscode.window.showErrorMessage(`Replay failed: ${message}`);
        });
    }

    private async openPath(targetPath: string) {
        const workspace = vscode.workspace.workspaceFolders?.[0];
        if (!workspace) {
            vscode.window.showWarningMessage("No workspace open for Misfit Dashboard");
            return;
        }

        const fileUri = vscode.Uri.file(path.join(workspace.uri.fsPath, targetPath));
        try {
            const doc = await vscode.workspace.openTextDocument(fileUri);
            await vscode.window.showTextDocument(doc, { preview: false });
        } catch (err: any) {
            vscode.window.showWarningMessage(`Unable to open ${targetPath}: ${err?.message || err}`);
        }
    }

    private async loadHistory(): Promise<HistoryPayload> {
        const workspace = vscode.workspace.workspaceFolders?.[0];
        if (!workspace) {
            return { entries: [], models: [], tools: [] };
        }

        const docUri = vscode.Uri.joinPath(workspace.uri, "docs", "versions.md");
        let content = "";
        try {
            const buf = await vscode.workspace.fs.readFile(docUri);
            content = new TextDecoder().decode(buf);
        } catch {
            return { entries: [], models: [], tools: [] };
        }

        const entries = this.parseHistory(content);
        const models = Array.from(new Set(entries.map((e) => e.model).filter(Boolean))).sort();
        const tools = Array.from(new Set(entries.flatMap((e) => e.tools))).sort();

        return { entries, models, tools };
    }

    private parseHistory(content: string): HistoryEntry[] {
        const sections = content.split(/\n(?=##\s+)/g).filter((section) => section.trim().startsWith("##"));
        const entries: HistoryEntry[] = [];

        for (const section of sections) {
            const lines = section.split(/\r?\n/).map((line) => line.trim()).filter((line) => line.length);
            if (!lines.length) continue;
            const header = lines[0];
            const timestamp = header.replace(/^##\s*/, "");
            const entry: HistoryEntry = {
                timestamp,
                model: "",
                tools: [],
                arguments: [],
                created: [],
                modified: [],
                deleted: []
            };

            for (let i = 1; i < lines.length; i++) {
                const line = lines[i];
                if (line.startsWith("Model:")) {
                    entry.model = line.slice(6).trim();
                } else if (line.startsWith("Tools:")) {
                    entry.tools = line.slice(6).split(",").map((t) => t.trim()).filter(Boolean);
                } else if (line.startsWith("Args:")) {
                    const raw = line.replace(/^Args:\s*`/, "").replace(/`$/, "");
                    try {
                        const parsed = JSON.parse(raw);
                        entry.arguments = Array.isArray(parsed) ? parsed : [parsed];
                    } catch {
                        entry.arguments = [raw];
                    }
                } else if (line.startsWith("Error:")) {
                    entry.error = line.slice(6).trim();
                } else if (line.startsWith("Changes:")) {
                    entry.changes = line.slice(8).trim();
                } else if (line.startsWith("Created:")) {
                    const result = this.consumeList(lines, i + 1);
                    entry.created = result.items;
                    i = result.nextIndex - 1;
                } else if (line.startsWith("Modified:")) {
                    const result = this.consumeList(lines, i + 1);
                    entry.modified = result.items;
                    i = result.nextIndex - 1;
                } else if (line.startsWith("Deleted:")) {
                    const result = this.consumeList(lines, i + 1);
                    entry.deleted = result.items;
                    i = result.nextIndex - 1;
                }
            }

            entries.push(entry);
        }

        return entries;
    }

    private consumeList(lines: string[], startIndex: number): { items: string[]; nextIndex: number } {
        const items: string[] = [];
        let idx = startIndex;
        while (idx < lines.length) {
            const line = lines[idx];
            if (!line.startsWith("- ")) break;
            items.push(line.slice(2).trim());
            idx++;
        }
        return { items, nextIndex: idx };
    }

    private async loadWatermark(webview: vscode.Webview): Promise<string | undefined> {
        try {
            const workspace = vscode.workspace.workspaceFolders?.[0];
            if (!workspace) return undefined;
            const logoPath = vscode.Uri.joinPath(workspace.uri, "mcp-server", "src", "assets", "misfit.png");
            const bin = await vscode.workspace.fs.readFile(logoPath);
            return `data:image/png;base64,${Buffer.from(bin).toString("base64")}`;
        } catch {
            return undefined;
        }
    }

    private getHtml(scriptUri: vscode.Uri, styleUri: vscode.Uri, nonce: string, watermark?: string) {
        const csp = [
            "default-src 'none'",
            `img-src ${watermark ? "data:" : ""} ${this.view?.webview.cspSource ?? ""}`.trim(),
            `style-src 'unsafe-inline' ${this.view?.webview.cspSource ?? ""}`.trim(),
            `script-src 'nonce-${nonce}'`
        ].join("; ");

        const wm = watermark
            ? `<img src="${watermark}" alt="Misfit watermark" />`
            : `<span>Misfit</span>`;

        return /* html */ `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="${csp}">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="stylesheet" href="${styleUri}">
<title>Misfit Dashboard</title>
</head>
<body>
  <div class="watermark">${wm}</div>
  <div id="dashboard">
    <div class="tabs">
      <button class="tab active" data-tab="live">Live Runs</button>
      <button class="tab" data-tab="history">History</button>
    </div>
    <div class="panels">
      <section id="live" class="panel active">
        <div class="panel-head">
          <h2>Live Run Queue</h2>
          <span class="auto-refresh">Auto refresh 3s</span>
        </div>
        <div class="live-columns">
          <div>
            <h3>Active & Queued</h3>
            <div id="liveQueue" class="card-list"></div>
          </div>
          <div>
            <h3>Recently Finished</h3>
            <div id="liveCompleted" class="card-list"></div>
          </div>
        </div>
      </section>
      <section id="history" class="panel">
        <div class="panel-head">
          <h2>Run History</h2>
          <div class="filters">
            <label>Model
              <select id="filterModel">
                <option value="">All</option>
              </select>
            </label>
            <label>Tool
              <select id="filterTool">
                <option value="">All</option>
              </select>
            </label>
            <button id="refreshHistory">Refresh</button>
          </div>
        </div>
        <div id="historyList" class="card-list"></div>
      </section>
    </div>
  </div>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
    }

    private post(payload: any) {
        this.view?.webview.postMessage(payload);
    }
}
