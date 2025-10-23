import * as vscode from 'vscode';
import * as child_process from 'child_process';
import * as path from 'path';
import * as readline from 'readline';

interface JsonRpcRequest {
    jsonrpc: string;
    id: number;
    method: string;
    params?: any;
}

interface JsonRpcResponse {
    jsonrpc: string;
    id: number;
    result?: any;
    error?: {
        code: number;
        message: string;
    };
}

export class MCPClient {
    private serverProcess: child_process.ChildProcess | undefined;
    private requestId = 0;
    private pendingRequests = new Map<number, {
        resolve: (value: any) => void;
        reject: (reason: any) => void;
    }>();
    private context: vscode.ExtensionContext;
    private outputChannel: vscode.OutputChannel;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.outputChannel = vscode.window.createOutputChannel('Multi-Model MCP');
    }

    async start(): Promise<void> {
        const config = vscode.workspace.getConfiguration('multiModelMcp');
        let serverPath = config.get<string>('serverPath');
        const debugMode = config.get<boolean>('debugMode', false);

        // Auto-detect server path if not configured
        if (!serverPath) {
            // Try to find the server binary in the extension directory or workspace
            const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
            if (workspaceRoot) {
                serverPath = path.join(workspaceRoot, 'multi-model-mcp', 'mcp-server', 'target', 'release', 'multi-model-mcp');
            }
        }

        if (!serverPath) {
            throw new Error('Server path not configured and could not auto-detect');
        }

        this.outputChannel.appendLine(`Starting MCP server: ${serverPath}`);

        const args = debugMode ? ['--debug'] : [];
        this.serverProcess = child_process.spawn(serverPath, args, {
            stdio: ['pipe', 'pipe', 'pipe']
        });

        if (!this.serverProcess.stdin || !this.serverProcess.stdout || !this.serverProcess.stderr) {
            throw new Error('Failed to open server stdio streams');
        }

        // Handle stderr for logging
        this.serverProcess.stderr.on('data', (data) => {
            this.outputChannel.appendLine(`[Server] ${data.toString()}`);
        });

        // Handle stdout for JSON-RPC responses
        const rl = readline.createInterface({
            input: this.serverProcess.stdout,
            crlfDelay: Infinity
        });

        rl.on('line', (line) => {
            try {
                const response: JsonRpcResponse = JSON.parse(line);
                this.handleResponse(response);
            } catch (error) {
                this.outputChannel.appendLine(`Failed to parse response: ${line}`);
            }
        });

        this.serverProcess.on('error', (error) => {
            this.outputChannel.appendLine(`Server error: ${error.message}`);
            vscode.window.showErrorMessage(`MCP Server error: ${error.message}`);
        });

        this.serverProcess.on('exit', (code) => {
            this.outputChannel.appendLine(`Server exited with code ${code}`);
            if (code !== 0 && code !== null) {
                vscode.window.showErrorMessage(`MCP Server exited with code ${code}`);
            }
        });

        // Initialize the server
        await this.sendRequest('initialize', {
            protocolVersion: '1.0',
            capabilities: {}
        });

        this.outputChannel.appendLine('Server initialized successfully');
    }

    stop(): void {
        if (this.serverProcess) {
            this.serverProcess.kill();
            this.serverProcess = undefined;
        }
    }

    async callTool(toolName: string, arguments_: any): Promise<any> {
        const response = await this.sendRequest('tools/call', {
            name: toolName,
            arguments: arguments_
        });

        // Extract the actual result from MCP response format
        if (response.content && Array.isArray(response.content)) {
            const textContent = response.content.find((c: any) => c.type === 'text');
            if (textContent) {
                return JSON.parse(textContent.text);
            }
        }

        return response;
    }

    private async sendRequest(method: string, params?: any): Promise<any> {
        if (!this.serverProcess || !this.serverProcess.stdin) {
            throw new Error('Server not running');
        }

        const id = ++this.requestId;
        const request: JsonRpcRequest = {
            jsonrpc: '2.0',
            id,
            method,
            params
        };

        return new Promise((resolve, reject) => {
            this.pendingRequests.set(id, { resolve, reject });

            const requestJson = JSON.stringify(request) + '\n';
            this.outputChannel.appendLine(`-> ${method} (${id})`);

            this.serverProcess!.stdin!.write(requestJson, (error) => {
                if (error) {
                    this.pendingRequests.delete(id);
                    reject(error);
                }
            });

            // Timeout after 30 seconds
            setTimeout(() => {
                if (this.pendingRequests.has(id)) {
                    this.pendingRequests.delete(id);
                    reject(new Error('Request timeout'));
                }
            }, 30000);
        });
    }

    private handleResponse(response: JsonRpcResponse): void {
        const pending = this.pendingRequests.get(response.id);
        if (!pending) {
            this.outputChannel.appendLine(`Received response for unknown request ${response.id}`);
            return;
        }

        this.pendingRequests.delete(response.id);
        this.outputChannel.appendLine(`<- Response (${response.id})`);

        if (response.error) {
            pending.reject(new Error(response.error.message));
        } else {
            pending.resolve(response.result);
        }
    }
}
