// Type declaration for VSCode webview API
declare function acquireVsCodeApi(): {
    postMessage(message: any): void;
    getState(): any;
    setState(state: any): void;
};

export {};

const vscode = acquireVsCodeApi();

const modelSelect = () => document.getElementById("model") as HTMLSelectElement;
const busy = () => document.getElementById("busy") as HTMLSpanElement;
const refreshBtn = () => document.getElementById("refresh") as HTMLButtonElement;
const sendBtn = () => document.getElementById("send") as HTMLButtonElement;
const promptInput = () => document.getElementById("prompt") as HTMLInputElement;
const results = () => document.getElementById("results") as HTMLDivElement;

function setBusy(on: boolean) {
    if (on) busy().removeAttribute("hidden");
    else busy().setAttribute("hidden", "true");
}

function addResult(accomplishments: string[], howTo: string[], details?: any, failed?: boolean) {
    const root = document.createElement("div");
    root.className = "card";

    const acc = document.createElement("div");
    acc.className = "section";
    acc.innerHTML = "<h3>Accomplishments</h3>" + listify(accomplishments);
    root.appendChild(acc);

    const how = document.createElement("div");
    how.className = "section";
    how.innerHTML = "<h3>How to use it</h3>" + listify(howTo);
    root.appendChild(how);

    const detWrap = document.createElement("details");
    const sum = document.createElement("summary");
    sum.textContent = failed ? "Details (failure)" : "Details";
    detWrap.appendChild(sum);
    const pre = document.createElement("pre");
    pre.textContent = pretty(details);
    detWrap.appendChild(pre);
    root.appendChild(detWrap);

    results().prepend(root);
}

function listify(items: string[]) {
    if (!items || !items.length) return "<ul><li>Nothing to report</li></ul>";
    return "<ul>" + items.map(x => `<li>${escapeHtml(x)}</li>`).join("") + "</ul>";
}

function pretty(o: any) {
    if (!o) return "";
    try { return JSON.stringify(o, null, 2); } catch { return String(o); }
}

function escapeHtml(s: string) {
    return s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c]!));
}

window.addEventListener("message", (e) => {
    const msg = e.data;
    switch (msg.type) {
        case "welcome":
            // already rendered in header
            break;
        case "models":
            modelSelect().innerHTML = "";
            for (const m of msg.models) {
                const opt = document.createElement("option");
                opt.value = m.id;
                opt.textContent = m.label || m.id;
                if (m.id === msg.selected) opt.selected = true;
                modelSelect().appendChild(opt);
            }
            break;
        case "working":
            setBusy(!!msg.working);
            break;
        case "result":
            addResult(msg.accomplishments || [], msg.howTo || [], msg.details, msg.failed);
            break;
        case "error":
            addResult([], [], [{ error: msg.message }], true);
            break;
    }
});

refreshBtn().addEventListener("click", () => vscode.postMessage({ type: "refreshModels" }));
modelSelect().addEventListener("change", () => vscode.postMessage({ type: "selectModel", model: modelSelect().value }));
sendBtn().addEventListener("click", send);
promptInput().addEventListener("keydown", (ev) => { if (ev.key === "Enter") send(); });

function send() {
    const text = promptInput().value.trim();
    if (!text) return;
    vscode.postMessage({ type: "sendPrompt", prompt: text });
    promptInput().value = "";
}

vscode.postMessage({ type: "ready" });
