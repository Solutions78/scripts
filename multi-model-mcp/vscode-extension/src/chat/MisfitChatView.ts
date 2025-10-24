import * as vscode from "vscode";
import { McpClient, ToolCallRequest, ToolResult } from "../mcpClient";
import { ensureVersionsDoc, appendEntry } from "../versionsTracker";
import * as path from "path";

export class MisfitChatView implements vscode.WebviewViewProvider {
    private view?: vscode.WebviewView;
    private currentModel?: string;

    constructor(
        private readonly context: vscode.ExtensionContext,
        private readonly client: McpClient,
        private readonly out: vscode.OutputChannel
    ) { }

    public resolveWebviewView(
        webviewView: vscode.WebviewView
    ): void | Thenable<void> {
        this.view = webviewView;
        const webview = webviewView.webview;
        webview.options = {
            enableScripts: true,
            localResourceRoots: [this.context.extensionUri]
        };

        const scriptUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this.context.extensionUri, "out", "chat", "view.js")
        );
        const styleUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this.context.extensionUri, "media", "misfitChat.css")
        );

        const nonce = Math.random().toString(36).slice(2);
        this.loadWatermark(webview).then((watermarkData) => {
            webview.html = this.getHtml(scriptUri, styleUri, nonce, watermarkData);
        });

        webview.onDidReceiveMessage(async (msg) => {
            switch (msg.type) {
                case "ready":
                    await this.pushWelcome();
                    await this.pushModels();
                    break;

                case "refreshModels":
                    await this.pushModels();
                    break;

                case "selectModel":
                    this.currentModel = msg.model;
                    await this.context.globalState.update("misfit.selectedModel", this.currentModel);
                    break;

                case "sendPrompt":
                    await this.handlePrompt(msg.prompt);
                    break;
            }
        });
    }

    public async refreshModels() {
        await this.pushModels();
    }

    private async pushWelcome() {
        this.post({
            type: "welcome",
            text: "Welcome Misfit, what we breaking today?"
        });
    }

    private async pushModels() {
        try {
            const models = await this.client.listModels();
            const last = this.context.globalState.get<string>("misfit.selectedModel");
            const selected = last || (models[0]?.id ?? "");
            this.currentModel = selected;
            this.post({ type: "models", models, selected });
        } catch (e: any) {
            this.post({ type: "error", message: `Model listing failed: ${e?.message || e}` });
        }
    }

    private async handlePrompt(prompt: string) {
        const model = this.currentModel;
        if (!model) {
            this.post({ type: "error", message: "No model selected" });
            return;
        }

        // Minimal plan: use generate_code for free text prompts.
        // You can extend this to route to other tools based on intent.
        const plan: ToolCallRequest[] = [
            {
                name: "generate_code",
                arguments: { prompt, model }
            }
        ];

        this.post({ type: "working", working: true });

        const workspaceFolders = vscode.workspace.workspaceFolders || [];
        const root = workspaceFolders[0]?.uri;
        if (root) {
            await ensureVersionsDoc(root);
        }

        let results: ToolResult[] = [];
        let summaryAccomplishments: string[] = [];
        let summaryHowTo: string[] = [];
        let rawForDetails: any[] = [];

        try {
            results = await this.client.runTools(plan);

            // Build terse summaries
            const fileHints = await this.client.detectFileChanges(); // best effort
            summaryAccomplishments.push("Planned and executed 1 tool call");
            summaryAccomplishments.push("Generated code from the prompt");

            if (fileHints.created.length || fileHints.modified.length || fileHints.deleted.length) {
                summaryAccomplishments.push(
                    `File changes: +${fileHints.created.length} ~${fileHints.modified.length} -${fileHints.deleted.length}`
                );
            }

            summaryHowTo.push("Open the created or modified files that appear in the explorer");
            summaryHowTo.push("Review the code and run your project build as usual");
            summaryHowTo.push("Use the refresh models button to switch provider or model if needed");

            rawForDetails = results.map(r => r.content ?? r);

            // Append to docs/versions.md
            if (root) {
                await appendEntry(root, {
                    timestamp: new Date().toISOString(),
                    model,
                    tools: plan.map(p => p.name),
                    arguments: plan.map(p => p.arguments),
                    fileDigest: fileHints
                });
            }

            this.post({
                type: "result",
                accomplishments: summaryAccomplishments,
                howTo: summaryHowTo,
                details: rawForDetails
            });
        } catch (e: any) {
            const msg = e?.message || String(e);
            this.post({
                type: "result",
                accomplishments: [],
                howTo: [],
                details: [{ error: msg }],
                failed: true
            });
            if (root) {
                await appendEntry(root, {
                    timestamp: new Date().toISOString(),
                    model,
                    tools: plan.map(p => p.name),
                    arguments: plan.map(p => p.arguments),
                    error: msg,
                    fileDigest: { created: [], modified: [], deleted: [] }
                });
            }
        } finally {
            this.post({ type: "working", working: false });
        }
    }

    private post(payload: any) {
        this.view?.webview.postMessage(payload);
    }

    private async loadWatermark(webview: vscode.Webview): Promise<string | undefined> {
        try {
            const workspaceFolders = vscode.workspace.workspaceFolders || [];
            if (!workspaceFolders.length) return undefined;
            const root = workspaceFolders[0].uri;
            const logoPath = vscode.Uri.joinPath(root, "mcp-server", "src", "assets", "misfit.png");
            const bin = await vscode.workspace.fs.readFile(logoPath);
            const base64 = Buffer.from(bin).toString("base64");
            return `data:image/png;base64,${base64}`;
        } catch {
            return undefined;
        }
    }

    private getHtml(scriptUri: vscode.Uri, styleUri: vscode.Uri, nonce: string, watermark?: string) {
        const csp = `default-src 'none'; img-src ${watermark ? "data:" : "'none'"}; style-src 'unsafe-inline' ${this.view?.webview.cspSource}; script-src 'nonce-${nonce}';`;
        const wmDiv = watermark
            ? `<div class="watermark"><img src="${watermark}" alt="Misfit watermark" /></div>`
            : `<div class="watermark"><div style="opacity:.6;font-size:1.2rem">Modular Misfits</div></div>`;

        return /* html */ `
<!DOCTYPE html>
<html lang="en">
<head>
<meta http-equiv="Content-Security-Policy" content="${csp}">
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link href="${styleUri}" rel="stylesheet">
<title>Misfit Chat</title>
</head>
<body>
  ${wmDiv}
  <div id="app">
    <div class="topbar">
      <span class="welcome">Welcome Misfit, what we breaking today?</span>
      <div class="controls">
        <select id="model"></select>
        <span id="busy" title="working" class="busy" hidden>working…</span>
        <button id="refresh">Refresh Models</button>
      </div>
    </div>

    <div class="inputRow">
      <input id="prompt" type="text" placeholder="Type a request and hit Send" />
      <button id="send">Send</button>
    </div>

    <div id="results"></div>
  </div>

  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
    }
}
