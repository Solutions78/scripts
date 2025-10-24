declare function acquireVsCodeApi(): {
    postMessage(message: any): void;
    getState(): any;
    setState(state: any): void;
};

export {};

const vscode = acquireVsCodeApi();

type RunState = "queued" | "running" | "done" | "failed" | "cancelled";

type ToolRunSummary = {
    id: number;
    tool: string;
    model: string;
    state: RunState;
    arguments: any;
    enqueuedAt: number;
    startedAt?: number;
    finishedAt?: number;
    elapsedMs: number;
    result?: any;
    error?: string;
};

type RunHistory = {
    queue: ToolRunSummary[];
    completed: ToolRunSummary[];
};

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

const tabs = Array.from(document.querySelectorAll<HTMLButtonElement>(".tab"));
const panels = Array.from(document.querySelectorAll<HTMLElement>(".panel"));
const liveQueue = document.getElementById("liveQueue") as HTMLDivElement;
const liveCompleted = document.getElementById("liveCompleted") as HTMLDivElement;
const historyList = document.getElementById("historyList") as HTMLDivElement;
const filterModel = document.getElementById("filterModel") as HTMLSelectElement;
const filterTool = document.getElementById("filterTool") as HTMLSelectElement;
const refreshHistoryBtn = document.getElementById("refreshHistory") as HTMLButtonElement;

let runHistory: RunHistory = { queue: [], completed: [] };
let historyData: HistoryPayload = { entries: [], models: [], tools: [] };

tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
        const tabId = tab.dataset.tab;
        if (!tabId) return;

        tabs.forEach((t) => t.classList.toggle("active", t === tab));
        panels.forEach((panel) => panel.classList.toggle("active", panel.id === tabId));
    });
});

filterModel.addEventListener("change", () => renderHistory());
filterTool.addEventListener("change", () => renderHistory());
refreshHistoryBtn.addEventListener("click", () => vscode.postMessage({ type: "requestHistory" }));

liveQueue.addEventListener("click", (event) => {
    const target = event.target as HTMLElement;
    if (target.classList.contains("cancel")) {
        const id = Number(target.dataset.id);
        if (!Number.isNaN(id)) {
            vscode.postMessage({ type: "cancelRun", id });
        }
    }
});

historyList.addEventListener("click", (event) => {
    const target = event.target as HTMLElement;
    if (target.classList.contains("replay")) {
        const index = Number(target.dataset.index);
        if (Number.isNaN(index)) return;
        const entry = historyData.entries[index];
        if (!entry) return;
        vscode.postMessage({
            type: "replayEntry",
            tools: entry.tools,
            arguments: entry.arguments,
            timestamp: entry.timestamp
        });
    } else if (target.classList.contains("file-link")) {
        const file = target.dataset.path;
        if (file) {
            vscode.postMessage({ type: "openPath", path: file });
        }
    }
});

setInterval(() => vscode.postMessage({ type: "pollLiveRuns" }), 3000);

window.addEventListener("message", (event) => {
    const message = event.data;
    switch (message.type) {
        case "liveRuns":
            if (message.history) {
                runHistory = message.history as RunHistory;
                renderLiveRuns();
            }
            break;
        case "runEvent":
            updateRunHistory(message.event as RunEventName, message.run as ToolRunSummary);
            break;
        case "historyData":
            historyData = message.history as HistoryPayload;
            populateFilters();
            renderHistory();
            break;
        case "historyError":
            historyList.innerHTML = `<div class="hint">${escapeHtml(message.message || "Unable to load history")}</div>`;
            break;
        case "replayQueued":
            // no-op placeholder for future toast integration
            console.log("Replay queued", message.tools);
            break;
    }
});

type RunEventName =
    | "runQueued"
    | "runStarted"
    | "runProgress"
    | "runFinished"
    | "runFailed"
    | "runCancelled";

function updateRunHistory(event: RunEventName, run: ToolRunSummary) {
    if (!run) return;
    const queue = [...runHistory.queue];
    const completed = [...runHistory.completed];
    const queueIndex = queue.findIndex((r) => r.id === run.id);
    const completedIndex = completed.findIndex((r) => r.id === run.id);

    const upsertQueue = () => {
        if (queueIndex >= 0) queue[queueIndex] = run;
        else queue.push(run);
    };

    if (event === "runQueued") {
        upsertQueue();
    } else if (event === "runStarted" || event === "runProgress") {
        upsertQueue();
    } else if (event === "runFinished" || event === "runFailed" || event === "runCancelled") {
        if (queueIndex >= 0) queue.splice(queueIndex, 1);
        if (event !== "runCancelled" || run.state !== "queued") {
            if (completedIndex >= 0) completed[completedIndex] = run;
            else completed.push(run);
        }
    }

    runHistory = { queue, completed };
    renderLiveRuns();
}

function renderLiveRuns() {
    renderRunList(liveQueue, runHistory.queue, { allowCancel: true, emptyText: "No runs queued" });
    const recent = [...runHistory.completed].slice(-10).reverse();
    renderRunList(liveCompleted, recent, { allowCancel: false, emptyText: "No recent results" });
}

function renderRunList(container: HTMLElement, runs: ToolRunSummary[], options: { allowCancel: boolean; emptyText: string }) {
    if (!runs.length) {
        container.innerHTML = `<div class="hint">${escapeHtml(options.emptyText)}</div>`;
        return;
    }

    container.innerHTML = "";
    for (const run of runs) {
        const card = document.createElement("div");
        card.className = `run-card state-${run.state}`;
        card.dataset.id = String(run.id);
        card.title = tooltipForArgs(run.arguments);

        const header = document.createElement("div");
        header.className = "run-head";
        header.innerHTML = `
            <span class="tool">${escapeHtml(run.tool)}</span>
            <span class="model">${escapeHtml(run.model)}</span>
        `;

        const meta = document.createElement("div");
        meta.className = "run-meta";

        const state = document.createElement("span");
        state.className = "state";
        state.textContent = labelForState(run.state);

        const elapsed = document.createElement("span");
        elapsed.className = "elapsed";
        elapsed.textContent = formatElapsed(run.elapsedMs);

        meta.append(state, elapsed);

        if (options.allowCancel && (run.state === "running" || run.state === "queued")) {
            const btn = document.createElement("button");
            btn.className = "cancel";
            btn.dataset.id = String(run.id);
            btn.textContent = run.state === "queued" ? "Remove" : "Cancel";
            meta.appendChild(btn);
        }

        card.append(header, meta);

        if (run.error && (run.state === "failed" || run.state === "cancelled")) {
            const err = document.createElement("div");
            err.className = "run-error";
            err.textContent = run.error;
            card.appendChild(err);
        }
        container.appendChild(card);
    }
}

function populateFilters() {
    populateSelect(filterModel, historyData.models);
    populateSelect(filterTool, historyData.tools);
}

function populateSelect(select: HTMLSelectElement, values: string[]) {
    const prev = select.value;
    select.innerHTML = "";
    const anyOpt = document.createElement("option");
    anyOpt.value = "";
    anyOpt.textContent = "All";
    select.appendChild(anyOpt);
    for (const value of values) {
        const opt = document.createElement("option");
        opt.value = value;
        opt.textContent = value;
        if (value === prev) opt.selected = true;
        select.appendChild(opt);
    }
}

function renderHistory() {
    const model = filterModel.value;
    const tool = filterTool.value;
    const entries = historyData.entries.filter((entry) => {
        const matchModel = !model || entry.model === model;
        const matchTool = !tool || entry.tools.includes(tool);
        return matchModel && matchTool;
    });

    if (!entries.length) {
        historyList.innerHTML = `<div class="hint">No matching history</div>`;
        return;
    }

    historyList.innerHTML = "";
    entries.forEach((entry, index) => {
        const card = document.createElement("div");
        card.className = "history-card";

        const head = document.createElement("div");
        head.className = "history-head";

        const headLeft = document.createElement("div");
        const ts = document.createElement("span");
        ts.className = "timestamp";
        ts.textContent = entry.timestamp;
        const mdl = document.createElement("span");
        mdl.className = "model";
        mdl.textContent = entry.model;
        headLeft.append(ts, mdl);

        const headRight = document.createElement("div");
        headRight.className = "actions";
        const replayBtn = document.createElement("button");
        replayBtn.className = "replay";
        replayBtn.dataset.index = String(index);
        replayBtn.textContent = "Replay";
        headRight.appendChild(replayBtn);

        head.append(headLeft, headRight);

        const tools = document.createElement("div");
        tools.className = "history-tools";
        tools.textContent = entry.tools.join(", ");
        tools.title = entry.arguments.map((args, idx) => `${entry.tools[idx] || idx}: ${tooltipForArgs(args)}`).join("\n");

        const summary = document.createElement("div");
        summary.className = "history-summary";
        summary.textContent = entry.changes || "";

        const details = document.createElement("details");
        details.innerHTML = `<summary>Details</summary>`;
        const detailBody = document.createElement("div");
        detailBody.className = "history-details";

        detailBody.appendChild(renderFileGroup("Created", entry.created));
        detailBody.appendChild(renderFileGroup("Modified", entry.modified));
        detailBody.appendChild(renderFileGroup("Deleted", entry.deleted));

        if (entry.error) {
            const err = document.createElement("div");
            err.className = "history-error";
            err.textContent = entry.error;
            detailBody.appendChild(err);
        }

        details.appendChild(detailBody);

        card.append(head, tools);
        if (entry.changes) card.appendChild(summary);
        card.appendChild(details);

        historyList.appendChild(card);
    });
}

function renderFileGroup(label: string, files: string[]): HTMLElement {
    const wrapper = document.createElement("div");
    wrapper.className = "file-group";
    const title = document.createElement("h4");
    title.textContent = label;
    wrapper.appendChild(title);

    if (!files.length) {
        const empty = document.createElement("div");
        empty.className = "hint";
        empty.textContent = "None";
        wrapper.appendChild(empty);
        return wrapper;
    }

    const list = document.createElement("div");
    list.className = "file-list";
    files.forEach((file) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "file-link";
        btn.dataset.path = file;
        btn.textContent = file;
        btn.title = file;
        list.appendChild(btn);
    });
    wrapper.appendChild(list);
    return wrapper;
}

function tooltipForArgs(args: any): string {
    try {
        return JSON.stringify(args, null, 2);
    } catch {
        return String(args);
    }
}

function labelForState(state: RunState): string {
    switch (state) {
        case "queued": return "Queued";
        case "running": return "Running";
        case "done": return "Done";
        case "failed": return "Failed";
        case "cancelled": return "Cancelled";
        default: return state;
    }
}

function formatElapsed(ms: number): string {
    if (!ms || ms <= 0) return "0s";
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    if (minutes === 0) return `${seconds}s`;
    return `${minutes}m ${seconds.toString().padStart(2, "0")}s`;
}

function escapeHtml(input: string): string {
    return input.replace(/[&<>"']/g, (ch) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "\"": "&quot;",
        "'": "&#39;"
    }[ch] as string));
}

// Kick things off
vscode.postMessage({ type: "ready" });
