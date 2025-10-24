import * as vscode from "vscode";
import { MisfitChatView } from "./chat/MisfitChatView";
import { MisfitDashboardView } from "./dashboard/MisfitDashboardView";
import { McpClient } from "./mcpClient";

let output: vscode.OutputChannel;

export async function activate(context: vscode.ExtensionContext) {
    output = vscode.window.createOutputChannel("Multi-Model MCP");
    output.appendLine("Extension activating");

    const client = new McpClient(output, context);
    const chatProvider = new MisfitChatView(context, client, output);
    const dashboardProvider = new MisfitDashboardView(context, client, output);

    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider("misfitChat.view", chatProvider, {
            webviewOptions: { retainContextWhenHidden: true }
        })
    );

    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider("misfitDashboard.view", dashboardProvider, {
            webviewOptions: { retainContextWhenHidden: true }
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand("multiModelMcp.openChat", async () => {
            await vscode.commands.executeCommand("workbench.view.extension.misfitContainer");
            await vscode.commands.executeCommand("workbench.view.extension.misfitChat.view.focus");
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand("multiModelMcp.refreshModels", async () => {
            chatProvider.refreshModels();
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand("multiModelMcp.openDashboard", async () => {
            await vscode.commands.executeCommand("workbench.view.extension.misfitContainer");
            await vscode.commands.executeCommand("workbench.view.extension.misfitDashboard.view.focus");
        })
    );

    output.appendLine("Extension activated");
}

export function deactivate() { }
