import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import * as readline from 'node:readline';
function asRecord(value) {
    return value && typeof value === 'object' && !Array.isArray(value)
        ? value
        : {};
}
function asString(value) {
    return typeof value === 'string' && value.trim().length > 0 ? value : undefined;
}
function asNumber(value) {
    return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}
function parseTimestamp(value) {
    const date = typeof value === 'string' ? new Date(value) : new Date();
    return Number.isNaN(date.getTime()) ? new Date() : date;
}
function parseJsonObject(value) {
    if (typeof value !== 'string') {
        return asRecord(value);
    }
    try {
        return asRecord(JSON.parse(value));
    }
    catch {
        return {};
    }
}
function compact(value, max = 48) {
    const singleLine = value.replace(/\s+/g, ' ').trim();
    return singleLine.length > max ? `${singleLine.slice(0, max - 3)}...` : singleLine;
}
function toolTarget(name, args) {
    if (name === 'exec_command') {
        return asString(args.cmd) ? compact(asString(args.cmd)) : undefined;
    }
    if (name === 'apply_patch') {
        return 'patch';
    }
    if (name === 'view_image') {
        return asString(args.path);
    }
    if (name === 'read_mcp_resource') {
        return asString(args.uri);
    }
    if (name === 'update_plan') {
        return 'plan';
    }
    return asString(args.path)
        ?? asString(args.file_path)
        ?? asString(args.pattern)
        ?? asString(args.query)
        ?? asString(args.ref_id);
}
function statusFromPlan(value) {
    switch (value) {
        case 'completed':
        case 'complete':
        case 'done':
            return 'completed';
        case 'in_progress':
        case 'running':
            return 'in_progress';
        default:
            return 'pending';
    }
}
function todosFromUpdatePlan(args) {
    const plan = args.plan;
    if (!Array.isArray(plan)) {
        return [];
    }
    return plan
        .map((item) => {
        const record = asRecord(item);
        const content = asString(record.step);
        if (!content) {
            return null;
        }
        return {
            content,
            status: statusFromPlan(record.status),
        };
    })
        .filter((item) => item !== null);
}
function normalizeToolName(name) {
    const last = name.split('.').pop() ?? name;
    return last
        .replace(/_command$/, '')
        .replace(/_/g, '-')
        .replace(/^exec$/, 'Bash');
}
function codexHome() {
    const home = os.homedir();
    const configured = (process.env.CODEX_HOME ?? '').trim();
    return configured ? path.resolve(configured.replace(/^~(?=$|[\\/])/, home)) : path.join(home, '.codex');
}
export function findLatestCodexSession() {
    const explicit = process.env.CODEX_HUD_SESSION ?? process.env.CODEX_SESSION_PATH;
    if (explicit && fs.existsSync(explicit)) {
        return path.resolve(explicit);
    }
    const sessionsDir = path.join(codexHome(), 'sessions');
    const candidates = [];
    const visit = (dir) => {
        let entries;
        try {
            entries = fs.readdirSync(dir, { withFileTypes: true });
        }
        catch {
            return;
        }
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                visit(fullPath);
            }
            else if (entry.isFile() && entry.name.startsWith('rollout-') && entry.name.endsWith('.jsonl')) {
                try {
                    candidates.push({ file: fullPath, mtimeMs: fs.statSync(fullPath).mtimeMs });
                }
                catch {
                    // Ignore files that disappear while scanning.
                }
            }
        }
    };
    visit(sessionsDir);
    candidates.sort((a, b) => b.mtimeMs - a.mtimeMs);
    return candidates[0]?.file ?? null;
}
export async function parseCodexRollout(filePath) {
    if (!filePath || !fs.existsSync(filePath)) {
        return null;
    }
    const stdin = {
        transcript_path: filePath,
        cwd: process.cwd(),
        model: { display_name: 'Codex' },
        context_window: {
            context_window_size: 0,
            current_usage: {
                input_tokens: 0,
                output_tokens: 0,
                cache_read_input_tokens: 0,
                cache_creation_input_tokens: 0,
            },
        },
    };
    const transcript = { tools: [], agents: [], todos: [] };
    const tools = new Map();
    const agents = new Map();
    let latestTodos = [];
    let sessionId;
    const stream = fs.createReadStream(filePath, { encoding: 'utf8' });
    const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
    for await (const line of rl) {
        if (!line.trim()) {
            continue;
        }
        let entry;
        try {
            entry = JSON.parse(line);
        }
        catch {
            continue;
        }
        const payload = asRecord(entry.payload);
        const ts = parseTimestamp(entry.timestamp);
        if (!transcript.sessionStart) {
            transcript.sessionStart = ts;
        }
        if (entry.type === 'session_meta') {
            sessionId = asString(payload.id);
            stdin.cwd = asString(payload.cwd) ?? stdin.cwd;
            const provider = asString(payload.model_provider);
            if (provider) {
                stdin.model = { id: provider, display_name: 'Codex' };
            }
            continue;
        }
        if (entry.type === 'turn_context') {
            stdin.cwd = asString(payload.cwd) ?? stdin.cwd;
            const model = asString(payload.model);
            if (model) {
                stdin.model = { id: model, display_name: model };
            }
            const addedDirs = Array.isArray(payload.add_dirs)
                ? payload.add_dirs.filter((dir) => typeof dir === 'string')
                : [];
            stdin.workspace = {
                current_dir: stdin.cwd,
                project_dir: stdin.cwd,
                added_dirs: addedDirs,
            };
            continue;
        }
        if (entry.type === 'event_msg' && payload.type === 'token_count') {
            const info = asRecord(payload.info);
            const last = asRecord(info.last_token_usage);
            const total = asRecord(info.total_token_usage);
            const cachedInput = asNumber(last.cached_input_tokens) ?? 0;
            const inputTokens = Math.max(0, (asNumber(last.input_tokens) ?? 0) - cachedInput);
            stdin.context_window = {
                context_window_size: asNumber(info.model_context_window) ?? stdin.context_window?.context_window_size ?? 0,
                total_input_tokens: asNumber(total.input_tokens) ?? null,
                total_output_tokens: asNumber(total.output_tokens) ?? null,
                current_usage: {
                    input_tokens: inputTokens,
                    output_tokens: asNumber(last.output_tokens) ?? 0,
                    cache_creation_input_tokens: 0,
                    cache_read_input_tokens: cachedInput,
                },
            };
            const rateLimits = asRecord(payload.rate_limits);
            const primary = asRecord(rateLimits.primary);
            const secondary = asRecord(rateLimits.secondary);
            stdin.rate_limits = {
                five_hour: {
                    used_percentage: asNumber(primary.used_percent) ?? null,
                    resets_at: asNumber(primary.resets_at) ?? null,
                },
                seven_day: {
                    used_percentage: asNumber(secondary.used_percent) ?? null,
                    resets_at: asNumber(secondary.resets_at) ?? null,
                },
            };
            transcript.sessionTokens = {
                inputTokens: asNumber(total.input_tokens) ?? 0,
                outputTokens: asNumber(total.output_tokens) ?? 0,
                cacheCreationTokens: 0,
                cacheReadTokens: asNumber(total.cached_input_tokens) ?? 0,
            };
            continue;
        }
        if (entry.type === 'response_item' && payload.type === 'message' && payload.role === 'assistant') {
            transcript.lastAssistantResponseAt = ts;
            continue;
        }
        if (entry.type === 'response_item' && payload.type === 'function_call') {
            const callId = asString(payload.call_id);
            const rawName = asString(payload.name);
            if (!callId || !rawName) {
                continue;
            }
            const args = parseJsonObject(payload.arguments);
            if (rawName === 'update_plan') {
                latestTodos = todosFromUpdatePlan(args);
                continue;
            }
            const tool = {
                id: callId,
                name: normalizeToolName(rawName),
                target: toolTarget(rawName, args),
                status: 'running',
                startTime: ts,
            };
            tools.set(callId, tool);
            if (/agent|subagent|spawn/i.test(rawName)) {
                agents.set(callId, {
                    id: callId,
                    type: normalizeToolName(rawName),
                    description: tool.target,
                    status: 'running',
                    startTime: ts,
                });
            }
            continue;
        }
        if (entry.type === 'response_item'
            && (payload.type === 'function_call_output' || payload.type === 'custom_tool_call_output')) {
            const callId = asString(payload.call_id);
            if (!callId) {
                continue;
            }
            const output = asString(payload.output) ?? '';
            const failed = /\b(exit(ed)? with code [1-9]|error|failed|Traceback)\b/i.test(output);
            const tool = tools.get(callId);
            if (tool) {
                tool.status = failed ? 'error' : 'completed';
                tool.endTime = ts;
            }
            const agent = agents.get(callId);
            if (agent) {
                agent.status = 'completed';
                agent.endTime = ts;
            }
        }
    }
    transcript.tools = Array.from(tools.values()).slice(-20);
    transcript.agents = Array.from(agents.values()).slice(-10);
    transcript.todos = latestTodos;
    transcript.sessionName = sessionId ? sessionId.slice(0, 8) : path.basename(filePath, '.jsonl');
    return { stdin, transcript };
}
export async function loadLatestCodexSnapshot() {
    const latest = findLatestCodexSession();
    return latest ? parseCodexRollout(latest) : null;
}
//# sourceMappingURL=codex-rollout.js.map