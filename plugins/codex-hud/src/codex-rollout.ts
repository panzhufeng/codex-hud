import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import * as readline from 'node:readline';
import type { AgentEntry, StdinData, TodoItem, ToolEntry, TranscriptData } from './types.js';

interface RolloutLine {
  timestamp?: string;
  type?: string;
  payload?: Record<string, unknown>;
}

interface CodexSnapshot {
  stdin: StdinData;
  transcript: TranscriptData;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value : undefined;
}

function asNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function parseTimestamp(value: unknown): Date {
  const date = typeof value === 'string' ? new Date(value) : new Date();
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function parseJsonObject(value: unknown): Record<string, unknown> {
  if (typeof value !== 'string') {
    return asRecord(value);
  }
  try {
    return asRecord(JSON.parse(value));
  } catch {
    return {};
  }
}

function compact(value: string, max = 48): string {
  const singleLine = value.replace(/\s+/g, ' ').trim();
  return singleLine.length > max ? `${singleLine.slice(0, max - 3)}...` : singleLine;
}

function toolTarget(name: string, args: Record<string, unknown>): string | undefined {
  if (name === 'exec_command') {
    return asString(args.cmd) ? compact(asString(args.cmd) as string) : undefined;
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

function statusFromPlan(value: unknown): TodoItem['status'] {
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

function todosFromUpdatePlan(args: Record<string, unknown>): TodoItem[] {
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
      } satisfies TodoItem;
    })
    .filter((item): item is TodoItem => item !== null);
}

function normalizeToolName(name: string): string {
  const last = name.split('.').pop() ?? name;
  return last
    .replace(/_command$/, '')
    .replace(/_/g, '-')
    .replace(/^exec$/, 'Bash');
}

function codexHome(): string {
  const home = os.homedir();
  const configured = (process.env.CODEX_HOME ?? '').trim();
  return configured ? path.resolve(configured.replace(/^~(?=$|[\\/])/, home)) : path.join(home, '.codex');
}

export function findLatestCodexSession(): string | null {
  const explicit = process.env.CODEX_HUD_SESSION ?? process.env.CODEX_SESSION_PATH;
  if (explicit && fs.existsSync(explicit)) {
    return path.resolve(explicit);
  }

  const sessionsDir = path.join(codexHome(), 'sessions');
  const candidates: Array<{ file: string; mtimeMs: number }> = [];
  const visit = (dir: string): void => {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        visit(fullPath);
      } else if (entry.isFile() && entry.name.startsWith('rollout-') && entry.name.endsWith('.jsonl')) {
        try {
          candidates.push({ file: fullPath, mtimeMs: fs.statSync(fullPath).mtimeMs });
        } catch {
          // Ignore files that disappear while scanning.
        }
      }
    }
  };
  visit(sessionsDir);
  candidates.sort((a, b) => b.mtimeMs - a.mtimeMs);
  return candidates[0]?.file ?? null;
}

export async function parseCodexRollout(filePath: string): Promise<CodexSnapshot | null> {
  if (!filePath || !fs.existsSync(filePath)) {
    return null;
  }

  const stdin: StdinData = {
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
  const transcript: TranscriptData = { tools: [], agents: [], todos: [] };
  const tools = new Map<string, ToolEntry>();
  const agents = new Map<string, AgentEntry>();
  let latestTodos: TodoItem[] = [];
  let sessionId: string | undefined;

  const stream = fs.createReadStream(filePath, { encoding: 'utf8' });
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
  for await (const line of rl) {
    if (!line.trim()) {
      continue;
    }
    let entry: RolloutLine;
    try {
      entry = JSON.parse(line) as RolloutLine;
    } catch {
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
        ? payload.add_dirs.filter((dir): dir is string => typeof dir === 'string')
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
      const tool: ToolEntry = {
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

    if (
      entry.type === 'response_item'
      && (payload.type === 'function_call_output' || payload.type === 'custom_tool_call_output')
    ) {
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

export async function loadLatestCodexSnapshot(): Promise<CodexSnapshot | null> {
  const latest = findLatestCodexSession();
  return latest ? parseCodexRollout(latest) : null;
}
