import * as vscode from "vscode";
import * as path from "path";
import { EventEmitter } from "events";

export const versionsTrackerEvents = new EventEmitter();

export async function ensureVersionsDoc(root: vscode.Uri) {
    const docsDir = vscode.Uri.joinPath(root, "docs");
    const versions = vscode.Uri.joinPath(docsDir, "versions.md");
    try {
        await vscode.workspace.fs.createDirectory(docsDir);
    } catch { }
    try {
        await vscode.workspace.fs.stat(versions);
    } catch {
        const seed = Buffer.from("# Versions log\n\nThis file records background actions taken by the Misfit Chat client.\n\n");
        await vscode.workspace.fs.writeFile(versions, seed);
    }
}

type FileDigest = { created: string[]; modified: string[]; deleted: string[] };

export async function appendEntry(root: vscode.Uri, entry: {
    timestamp: string;
    model: string;
    tools: string[];
    arguments: any[];
    fileDigest: FileDigest;
    error?: string;
}) {
    const versions = vscode.Uri.joinPath(root, "docs", "versions.md");
    const prev = await vscode.workspace.fs.readFile(versions);
    const lines = new TextDecoder().decode(prev);

    const block = [
        `## ${entry.timestamp}`,
        `Model: ${entry.model}`,
        `Tools: ${entry.tools.join(", ")}`,
        `Args: \`${json(entry.arguments)}\``,
        entry.error ? `Error: ${escapeMd(entry.error)}` : undefined,
        `Changes: +${entry.fileDigest.created.length} ~${entry.fileDigest.modified.length} -${entry.fileDigest.deleted.length}`,
        entry.fileDigest.created.length ? "Created:\n" + bullets(entry.fileDigest.created) : undefined,
        entry.fileDigest.modified.length ? "Modified:\n" + bullets(entry.fileDigest.modified) : undefined,
        entry.fileDigest.deleted.length ? "Deleted:\n" + bullets(entry.fileDigest.deleted) : undefined,
        "\n"
    ].filter(Boolean).join("\n");

    const next = lines + "\n" + block;
    await vscode.workspace.fs.writeFile(versions, Buffer.from(next, "utf8"));
    queueMicrotask(() => versionsTrackerEvents.emit("runRecorded", entry));
}

function bullets(items: string[]) {
    return items.map(p => `- ${p}`).join("\n");
}
function json(x: any) { try { return JSON.stringify(x); } catch { return String(x); } }
function escapeMd(s: string) { return s.replace(/[\r\n]/g, " "); }
