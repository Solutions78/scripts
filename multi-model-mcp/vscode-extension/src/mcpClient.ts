import * as vscode from "vscode";
import { spawn, ChildProcessWithoutNullStreams } from "child_process";
import * as path from "path";

export type ModelInfo = { id: string; label?: string };
export type ToolCallRequest = { name: string; arguments: any };
export type ToolResult = { content?: any;[k: string]: any };

export class McpClient {
    private proc?: ChildProcessWithoutNullStreams;
    private nextId = 1;
    private pending = new Map<number, (val: any, err?: any) => void>();
    private buffer = "";
    private out: vscode.OutputChannel;

    constructor(out: vscode.OutputChannel, private context: vscode.ExtensionContext) {
        this.out = out;
    }

    private async ensureRunning(): Promise<void> {
        if (this.proc && !this.proc.killed) return;

        const ws = vscode.workspace.workspaceFolders?.[0]?.uri;
        if (!ws) throw new Error("No workspace open");

        // Prefer configured serverPath, fall back to workspace target binary
        const cfg = vscode.workspace.getConfiguration();
        const configured = cfg.get<string>("multiModelMcp.serverPath");
        const isCustomPath = configured && configured.trim().length > 0;
        const serverPath = isCustomPath ? configured! : path.join(ws.fsPath, "mcp-server", "target", "release", "multi-model-mcp");

        // Security: Warn user about custom server paths
        if (isCustomPath) {
            const proceed = await vscode.window.showWarningMessage(
                `Custom MCP server path detected: ${serverPath}. Only run trusted binaries.`,
                "Trust and Continue",
                "Cancel"
            );
            if (proceed !== "Trust and Continue") {
                throw new Error("User declined to run custom server path");
            }
        }

        // Validate server path exists and is a file
        try {
            const stats = await vscode.workspace.fs.stat(vscode.Uri.file(serverPath));
            if (stats.type !== vscode.FileType.File) {
                throw new Error(`Server path is not a regular file: ${serverPath}`);
            }
        } catch (e) {
            throw new Error(`Invalid server path: ${serverPath}. ${e}`);
        }

        this.out.appendLine(`Starting MCP server: ${serverPath}`);

        this.proc = spawn(serverPath, [], { cwd: path.dirname(serverPath) });
        this.proc.stdout.setEncoding("utf8");
        this.proc.stderr.setEncoding("utf8");

        this.proc.stdout.on("data", (chunk: string) => {
            this.buffer += chunk.toString();
            let idx: number;
            while ((idx = this.buffer.indexOf("\n")) >= 0) {
                const line = this.buffer.slice(0, idx).trim();
                this.buffer = this.buffer.slice(idx + 1);
                if (!line) continue;
                try {
                    const msg = JSON.parse(line);
                    const id = msg.id;
                    const resolver = this.pending.get(id);
                    if (resolver) {
                        this.pending.delete(id);
                        resolver(msg.result ?? msg, undefined);
                    } else {
                        // unsolicited
                        this.out.appendLine(`Unsolicited: ${line}`);
                    }
                } catch {
                    // noisy logs are printed to stderr, so stdout should be JSON
                    this.out.appendLine(`Non JSON on stdout: ${line}`);
                }
            }
        });

        this.proc.stderr.on("data", (d: string) => {
            const lines = d.toString().trim().split('\n');
            for (const line of lines) {
                // Redact potential secrets from logs
                const redacted = line
                    .replace(/Bearer [A-Za-z0-9_-]+/g, "Bearer [REDACTED]")
                    .replace(/sk-ant-[A-Za-z0-9_-]+/g, "sk-ant-[REDACTED]")
                    .replace(/sk-[A-Za-z0-9]+/g, "sk-[REDACTED]")
                    .replace(/(access_token|api_key|token|password)":\s*"[^"]+"/gi, '$1": "[REDACTED]"')
                    .replace(/(accessToken|apiKey|refreshToken)":\s*"[^"]+"/g, '$1: "[REDACTED]"');
                this.out.appendLine(`[server] ${redacted}`);
            }
        });

        this.proc.on("exit", (code) => {
            this.out.appendLine(`MCP server exited ${code}`);
        });

        // initialize JSON RPC
        await this.send({ method: "initialize", params: {} });
    }

    private async send(payload: any, timeoutMs: number = 30000): Promise<any> {
        await this.ensureRunning();
        const id = this.nextId++;
        const msg = { jsonrpc: "2.0", id, ...payload };
        const line = JSON.stringify(msg) + "\n";
        return new Promise((resolve, reject) => {
            // Set up timeout that clears the pending request
            const timer = setTimeout(() => {
                const resolver = this.pending.get(id);
                if (resolver) {
                    this.pending.delete(id);
                    this.out.appendLine(`Request ${id} timed out after ${timeoutMs}ms`);
                    reject(new Error(`MCP request timed out after ${timeoutMs}ms`));
                }
            }, timeoutMs);

            // Store resolver with timer cleanup
            this.pending.set(id, (val, err) => {
                clearTimeout(timer);
                this.pending.delete(id);
                err ? reject(err) : resolve(val);
            });

            this.proc!.stdin.write(line, "utf8");
        });
    }

    async listModels(): Promise<ModelInfo[]> {
        // call tools/call list_models
        const res = await this.send({
            method: "tools/call",
            params: { name: "list_models", arguments: {} }
        });
        const content = res?.content?.[0]?.text || res?.content || res;
        try {
            const parsed = typeof content === "string" ? JSON.parse(content) : content;
            const items = parsed.models || parsed || [];
            return items.map((m: any) => ({ id: m.id ?? m, label: m.label ?? m.id ?? String(m) }));
        } catch {
            // fallback to simple mapping
            if (Array.isArray(content)) {
                return content.map((m: any) => ({ id: m.id ?? String(m) }));
            }
            return [];
        }
    }

    async runTools(requests: ToolCallRequest[]): Promise<ToolResult[]> {
        const out: ToolResult[] = [];
        for (const r of requests) {
            const res = await this.send({
                method: "tools/call",
                params: { name: r.name, arguments: r.arguments || {} }
            });
            out.push(res);
        }
        return out;
    }

    // Best effort file change detector: compare current explorer state
    async detectFileChanges(): Promise<{ created: string[]; modified: string[]; deleted: string[] }> {
        // Minimal stub. Real implementation would snapshot mtime and compare.
        return { created: [], modified: [], deleted: [] };
    }
}
