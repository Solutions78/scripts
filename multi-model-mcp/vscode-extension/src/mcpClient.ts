import * as vscode from "vscode";
import { spawn, ChildProcessWithoutNullStreams } from "child_process";
import * as path from "path";
import { EventEmitter } from "events";

export type ModelInfo = { id: string; label?: string };
export type ToolCallRequest = { name: string; arguments: any };
export type ToolResult = { content?: any;[k: string]: any };

export type RunState = "queued" | "running" | "done" | "failed" | "cancelled";

export interface ToolRunSummary {
    id: number;
    tool: string;
    model: string;
    state: RunState;
    arguments: any;
    enqueuedAt: number;
    startedAt?: number;
    finishedAt?: number;
    elapsedMs: number;
    result?: ToolResult;
    error?: string;
    cancelled?: boolean;
}

export type RunEventName =
    | "runQueued"
    | "runStarted"
    | "runProgress"
    | "runFinished"
    | "runFailed"
    | "runCancelled"
    | "historyUpdated";

export type RunHistory = { queue: ToolRunSummary[]; completed: ToolRunSummary[] };

type ToolRunInternal = ToolRunSummary & {
    request: ToolCallRequest;
    resolve?: (res: ToolResult) => void;
    reject?: (err: any) => void;
    cancelFn?: () => void;
    timer?: NodeJS.Timeout;
    settled?: boolean;
};

export class McpClient {
    private proc?: ChildProcessWithoutNullStreams;
    private nextId = 1;
    private pending = new Map<number, (val: any, err?: any) => void>();
    private buffer = "";
    private out: vscode.OutputChannel;
    private runEmitter = new EventEmitter();
    private runQueue: ToolRunInternal[] = [];
    private completedRuns: ToolRunSummary[] = [];
    private activeRun?: ToolRunInternal;
    private runIdCounter = 1;
    private draining = false;

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
            const { completion } = this.enqueueToolCall(r);
            const res = await completion;
            out.push(res);
        }
        return out;
    }

    // Best effort file change detector: compare current explorer state
    async detectFileChanges(): Promise<{ created: string[]; modified: string[]; deleted: string[] }> {
        // Minimal stub. Real implementation would snapshot mtime and compare.
        return { created: [], modified: [], deleted: [] };
    }

    enqueueToolCall(request: ToolCallRequest, meta?: { model?: string }): { id: number; completion: Promise<ToolResult> } {
        const id = this.runIdCounter++;
        const model = meta?.model ?? this.extractModel(request.arguments);
        const run: ToolRunInternal = {
            id,
            tool: request.name,
            model,
            state: "queued",
            arguments: request.arguments,
            enqueuedAt: Date.now(),
            elapsedMs: 0,
            request
        };

        const completion = new Promise<ToolResult>((resolve, reject) => {
            run.resolve = resolve;
            run.reject = reject;
        });

        this.runQueue.push(run);
        this.emitRunEvent("runQueued", run);
        this.emitHistory();
        this.drainQueue();

        return { id, completion };
    }

    onRunEvent(event: RunEventName, listener: (payload: ToolRunSummary | RunHistory) => void): void {
        this.runEmitter.on(event, listener);
    }

    offRunEvent(event: RunEventName, listener: (payload: ToolRunSummary | RunHistory) => void): void {
        this.runEmitter.off(event, listener);
    }

    getRunHistory(): RunHistory {
        const queue: ToolRunSummary[] = [];
        if (this.activeRun) queue.push(this.cloneRun(this.activeRun));
        for (const run of this.runQueue) {
            queue.push(this.cloneRun(run));
        }
        return {
            queue,
            completed: this.completedRuns.map(r => ({ ...r }))
        };
    }

    cancelRun(runId: number): boolean {
        if (this.activeRun && this.activeRun.id === runId) {
            const run = this.activeRun;
            if (run.state !== "running") return false;
            run.cancelled = true;
            if (run.cancelFn) run.cancelFn();
            return true;
        }

        const idx = this.runQueue.findIndex(r => r.id === runId);
        if (idx >= 0) {
            const [run] = this.runQueue.splice(idx, 1);
            run.cancelled = true;
            run.state = "cancelled";
            run.finishedAt = Date.now();
            run.elapsedMs = this.calculateElapsed(run);
            run.reject?.(new Error("Cancelled"));
            this.recordCompletion(run);
            this.emitRunEvent("runCancelled", run);
            this.emitHistory();
            return true;
        }
        return false;
    }

    private extractModel(args: any): string {
        if (!args) return "unknown";
        if (typeof args === "string") return args;
        if (typeof args.model === "string") return args.model;
        if (Array.isArray(args)) {
            const first = args.find((item) => typeof item === "object" && item?.model);
            if (first && typeof first.model === "string") return first.model;
        }
        return "unknown";
    }

    private async drainQueue(): Promise<void> {
        if (this.draining) return;
        this.draining = true;
        try {
            while (this.runQueue.length > 0) {
                const run = this.runQueue.shift();
                if (!run) break;
                if (run.cancelled) {
                    this.recordCompletion(run);
                    continue;
                }
                this.activeRun = run;
                await this.processRun(run);
                this.activeRun = undefined;
            }
        } finally {
            this.draining = false;
            this.emitHistory();
        }
    }

    private async processRun(run: ToolRunInternal): Promise<void> {
        run.state = "running";
        run.startedAt = Date.now();
        run.elapsedMs = this.calculateElapsed(run);
        this.emitRunEvent("runStarted", run);
        this.emitHistory();

        this.startProgressTimer(run);

        try {
            const result = await this.executeToolCall(run);
            if (run.cancelled) {
                throw new Error("Cancelled");
            }
            run.result = result;
            run.state = "done";
            run.finishedAt = Date.now();
            run.elapsedMs = this.calculateElapsed(run);
            run.resolve?.(result);
            this.emitRunEvent("runProgress", run);
            this.emitRunEvent("runFinished", run);
            this.recordCompletion(run);
        } catch (err: any) {
            if (run.cancelled) {
                const cancelledError = err instanceof Error ? err : new Error("Cancelled");
                run.state = "cancelled";
                run.error = cancelledError.message;
                run.reject?.(cancelledError);
                run.finishedAt = Date.now();
                run.elapsedMs = this.calculateElapsed(run);
                this.recordCompletion(run);
                this.emitRunEvent("runCancelled", run);
            } else {
                run.state = "failed";
                run.error = err?.message || String(err);
                run.finishedAt = Date.now();
                run.elapsedMs = this.calculateElapsed(run);
                run.reject?.(err);
                this.emitRunEvent("runFailed", run);
                this.recordCompletion(run);
            }
        } finally {
            this.stopProgressTimer(run);
            run.resolve = undefined;
            run.reject = undefined;
            run.cancelFn = undefined;
            run.settled = true;
        }
    }

    private executeToolCall(run: ToolRunInternal): Promise<ToolResult> {
        return new Promise<ToolResult>((resolve, reject) => {
            let settled = false;
            run.cancelFn = () => {
                if (settled) return;
                settled = true;
                run.cancelled = true;
                reject(new Error("Cancelled"));
            };

            this.send({
                method: "tools/call",
                params: { name: run.request.name, arguments: run.request.arguments || {} }
            }).then((res) => {
                if (settled || run.cancelled) return;
                settled = true;
                resolve(res);
            }).catch((err) => {
                if (settled || run.cancelled) return;
                settled = true;
                reject(err);
            });
        });
    }

    private startProgressTimer(run: ToolRunInternal) {
        this.stopProgressTimer(run);
        run.timer = setInterval(() => {
            if (run.cancelled) {
                this.stopProgressTimer(run);
                return;
            }
            run.elapsedMs = this.calculateElapsed(run);
            this.emitRunEvent("runProgress", run);
        }, 1000);
    }

    private stopProgressTimer(run: ToolRunInternal) {
        if (run.timer) {
            clearInterval(run.timer);
            run.timer = undefined;
        }
    }

    private recordCompletion(run: ToolRunInternal) {
        const snapshot = this.cloneRun(run);
        if (!this.completedRuns.some(r => r.id === snapshot.id)) {
            this.completedRuns.push(snapshot);
            if (this.completedRuns.length > 100) {
                this.completedRuns = this.completedRuns.slice(-100);
            }
        } else {
            this.completedRuns = this.completedRuns.map(r => (r.id === snapshot.id ? snapshot : r));
        }
        this.emitHistory();
    }

    private emitRunEvent(event: RunEventName, run: ToolRunInternal | ToolRunSummary | undefined) {
        if (event === "historyUpdated") {
            this.runEmitter.emit(event, this.getRunHistory());
            return;
        }

        if (!run) return;
        const snapshot = this.cloneRun(run);
        this.runEmitter.emit(event, snapshot);
    }

    private emitHistory() {
        this.emitRunEvent("historyUpdated", undefined);
    }

    private cloneRun(run: ToolRunInternal | ToolRunSummary): ToolRunSummary {
        return {
            id: run.id,
            tool: run.tool,
            model: run.model,
            state: run.state,
            arguments: run.arguments,
            enqueuedAt: run.enqueuedAt,
            startedAt: run.startedAt,
            finishedAt: run.finishedAt,
            elapsedMs: this.calculateElapsed(run),
            result: run.result,
            error: run.error,
            cancelled: run.cancelled
        };
    }

    private calculateElapsed(run: { startedAt?: number; enqueuedAt: number; finishedAt?: number }): number {
        const start = run.startedAt ?? run.enqueuedAt;
        const end = run.finishedAt ?? Date.now();
        return Math.max(0, end - start);
    }
}
