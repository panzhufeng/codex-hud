import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import * as path from 'node:path';
import { tmpdir } from 'node:os';
import { parseCodexRollout } from '../dist/codex-rollout.js';

test('parseCodexRollout converts Codex session events into HUD context', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'codex-hud-rollout-'));
  const rollout = path.join(dir, 'rollout-test.jsonl');
  const lines = [
    {
      timestamp: '2026-05-24T00:00:00.000Z',
      type: 'session_meta',
      payload: { id: '019e57bd-abcdef', cwd: '/tmp/project', model_provider: 'openai' },
    },
    {
      timestamp: '2026-05-24T00:00:01.000Z',
      type: 'turn_context',
      payload: { cwd: '/tmp/project', model: 'gpt-5.5', add_dirs: ['/tmp/lib'] },
    },
    {
      timestamp: '2026-05-24T00:00:02.000Z',
      type: 'response_item',
      payload: {
        type: 'function_call',
        name: 'exec_command',
        call_id: 'call_1',
        arguments: JSON.stringify({ cmd: 'npm test' }),
      },
    },
    {
      timestamp: '2026-05-24T00:00:03.000Z',
      type: 'response_item',
      payload: { type: 'function_call_output', call_id: 'call_1', output: 'ok' },
    },
    {
      timestamp: '2026-05-24T00:00:04.000Z',
      type: 'response_item',
      payload: {
        type: 'function_call',
        name: 'update_plan',
        call_id: 'call_plan',
        arguments: JSON.stringify({
          plan: [
            { step: 'Inspect repo', status: 'completed' },
            { step: 'Build plugin', status: 'in_progress' },
          ],
        }),
      },
    },
    {
      timestamp: '2026-05-24T00:00:05.000Z',
      type: 'event_msg',
      payload: {
        type: 'token_count',
        info: {
          model_context_window: 1000,
          last_token_usage: {
            input_tokens: 300,
            cached_input_tokens: 100,
            output_tokens: 25,
          },
          total_token_usage: {
            input_tokens: 1200,
            cached_input_tokens: 400,
            output_tokens: 75,
          },
        },
        rate_limits: {
          primary: { used_percent: 12, resets_at: 1779600000 },
          secondary: { used_percent: 3, resets_at: 1780200000 },
        },
      },
    },
  ];

  try {
    await writeFile(rollout, `${lines.map((line) => JSON.stringify(line)).join('\n')}\n`, 'utf8');
    const snapshot = await parseCodexRollout(rollout);

    assert.equal(snapshot?.stdin.cwd, '/tmp/project');
    assert.equal(snapshot?.stdin.model?.display_name, 'gpt-5.5');
    assert.deepEqual(snapshot?.stdin.workspace?.added_dirs, ['/tmp/lib']);
    assert.equal(snapshot?.stdin.context_window?.context_window_size, 1000);
    assert.equal(snapshot?.stdin.context_window?.current_usage?.input_tokens, 200);
    assert.equal(snapshot?.stdin.context_window?.current_usage?.cache_read_input_tokens, 100);
    assert.equal(snapshot?.stdin.rate_limits?.five_hour?.used_percentage, 12);
    assert.equal(snapshot?.transcript.tools[0]?.name, 'Bash');
    assert.equal(snapshot?.transcript.tools[0]?.status, 'completed');
    assert.equal(snapshot?.transcript.todos.length, 2);
    assert.equal(snapshot?.transcript.todos[1]?.status, 'in_progress');
    assert.equal(snapshot?.transcript.sessionName, '019e57bd');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
