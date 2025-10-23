import * as vscode from 'vscode';
import * as path from 'path';
import { MCPClient } from './mcpClient';

let mcpClient: MCPClient | undefined;

export async function activate(context: vscode.ExtensionContext) {
    console.log('Multi-Model MCP extension activated');

    // Initialize MCP client
    try {
        mcpClient = new MCPClient(context);
        await mcpClient.start();
        vscode.window.showInformationMessage('Multi-Model MCP: Server started successfully');
    } catch (error) {
        vscode.window.showErrorMessage(`Multi-Model MCP: Failed to start server: ${error}`);
        console.error('Failed to start MCP server:', error);
    }

    // Register commands
    context.subscriptions.push(
        vscode.commands.registerCommand('multiModelMcp.generateCode', async () => {
            await generateCodeCommand();
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('multiModelMcp.reviewCode', async () => {
            await reviewCodeCommand();
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('multiModelMcp.switchModel', async () => {
            await switchModelCommand();
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('multiModelMcp.listModels', async () => {
            await listModelsCommand();
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('multiModelMcp.addContext', async () => {
            await addContextCommand();
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('multiModelMcp.clearContext', async () => {
            await clearContextCommand();
        })
    );
}

async function generateCodeCommand() {
    if (!mcpClient) {
        vscode.window.showErrorMessage('MCP server not initialized');
        return;
    }

    const prompt = await vscode.window.showInputBox({
        prompt: 'Enter code generation prompt',
        placeHolder: 'e.g., Create a function to parse JSON with error handling'
    });

    if (!prompt) {
        return;
    }

    const language = await vscode.window.showQuickPick(
        ['TypeScript', 'Python', 'Rust', 'JavaScript', 'Go', 'Java', 'C++', 'Other'],
        { placeHolder: 'Select programming language' }
    );

    try {
        const result = await mcpClient.callTool('generate_code', {
            prompt,
            language: language?.toLowerCase()
        });

        const code = result.code;
        const doc = await vscode.workspace.openTextDocument({
            content: code,
            language: language?.toLowerCase()
        });
        await vscode.window.showTextDocument(doc);

        vscode.window.showInformationMessage(`Code generated using ${result.model}`);
    } catch (error) {
        vscode.window.showErrorMessage(`Failed to generate code: ${error}`);
    }
}

async function reviewCodeCommand() {
    if (!mcpClient) {
        vscode.window.showErrorMessage('MCP server not initialized');
        return;
    }

    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showWarningMessage('No active editor');
        return;
    }

    const selection = editor.selection;
    const code = selection.isEmpty
        ? editor.document.getText()
        : editor.document.getText(selection);

    if (!code.trim()) {
        vscode.window.showWarningMessage('No code selected');
        return;
    }

    const language = editor.document.languageId;

    vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: 'Reviewing code...',
        cancellable: false
    }, async () => {
        try {
            const result = await mcpClient!.callTool('review_code', {
                code,
                language
            });

            const review = result.review;
            const panel = vscode.window.createWebviewPanel(
                'codeReview',
                'Code Review',
                vscode.ViewColumn.Beside,
                {}
            );

            panel.webview.html = `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body {
                            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                            padding: 20px;
                            line-height: 1.6;
                        }
                        h1, h2, h3 { color: #333; }
                        pre { background: #f4f4f4; padding: 10px; border-radius: 4px; }
                        code { background: #f4f4f4; padding: 2px 6px; border-radius: 3px; }
                    </style>
                </head>
                <body>
                    <h1>Code Review</h1>
                    <p><em>Model: ${result.model}</em></p>
                    <div>${review.replace(/\n/g, '<br>')}</div>
                </body>
                </html>
            `;

            vscode.window.showInformationMessage('Code review complete');
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to review code: ${error}`);
        }
    });
}

async function switchModelCommand() {
    if (!mcpClient) {
        vscode.window.showErrorMessage('MCP server not initialized');
        return;
    }

    const provider = await vscode.window.showQuickPick(
        ['Anthropic (Claude)', 'OpenAI (GPT)'],
        { placeHolder: 'Select AI provider' }
    );

    if (!provider) {
        return;
    }

    const providerName = provider.includes('Anthropic') ? 'anthropic' : 'openai';

    try {
        const result = await mcpClient.callTool('switch_model', {
            provider: providerName
        });

        vscode.window.showInformationMessage(result.message);
    } catch (error) {
        vscode.window.showErrorMessage(`Failed to switch model: ${error}`);
    }
}

async function listModelsCommand() {
    if (!mcpClient) {
        vscode.window.showErrorMessage('MCP server not initialized');
        return;
    }

    try {
        const result = await mcpClient.callTool('list_models', {});

        const models = result.models as Array<{ provider: string; model: string }>;
        const modelList = models.map(m => `${m.provider}: ${m.model}`).join('\n');

        vscode.window.showInformationMessage(`Available Models:\n${modelList}`, { modal: true });
    } catch (error) {
        vscode.window.showErrorMessage(`Failed to list models: ${error}`);
    }
}

async function addContextCommand() {
    if (!mcpClient) {
        vscode.window.showErrorMessage('MCP server not initialized');
        return;
    }

    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showWarningMessage('No active editor');
        return;
    }

    const filePath = editor.document.fileName;
    const content = editor.document.getText();

    try {
        await mcpClient.callTool('add_context', {
            type: 'file',
            path: filePath,
            content
        });

        vscode.window.showInformationMessage(`Added ${path.basename(filePath)} to context`);
    } catch (error) {
        vscode.window.showErrorMessage(`Failed to add context: ${error}`);
    }
}

async function clearContextCommand() {
    if (!mcpClient) {
        vscode.window.showErrorMessage('MCP server not initialized');
        return;
    }

    try {
        await mcpClient.callTool('clear_context', {});
        vscode.window.showInformationMessage('Context cleared');
    } catch (error) {
        vscode.window.showErrorMessage(`Failed to clear context: ${error}`);
    }
}

export function deactivate() {
    if (mcpClient) {
        mcpClient.stop();
    }
}
