---
name: codex-hud
description: Set up, run, or configure Codex HUD, a local terminal HUD that renders Codex session context, usage limits, active tools, agents, todos, git state, and session metadata from Codex rollout JSONL files.
---

# Codex HUD

Use this skill when the user asks to install, set up, run, inspect, or configure Codex HUD.

## What It Does

Codex HUD is a Codex plugin adaptation of `jarrodwatts/claude-hud`.

- Reads Codex session rollout JSONL files under `$CODEX_HOME/sessions` or `~/.codex/sessions`.
- Renders a terminal HUD with model, project, git branch, context, usage limits, tool activity, agent activity, todo progress, session duration, and optional metadata.
- Uses `CODEX_HUD_SESSION=/path/to/rollout.jsonl` to render a specific session.
- Stores config at `${CODEX_HUD_CONFIG_DIR:-${CODEX_HOME:-~/.codex}}/plugins/codex-hud/config.json`.

Codex currently does not expose Claude Code's native `statusLine` API. This plugin therefore provides the same renderer and Codex-native session adapter, but it cannot attach itself below the Codex input box unless Codex adds an equivalent host API.

## Run The HUD

From the plugin root:

```bash
node dist/index.js
```

For a specific Codex session:

```bash
CODEX_HUD_SESSION="$HOME/.codex/sessions/YYYY/MM/DD/rollout-....jsonl" node dist/index.js
```

During local development from the repository:

```bash
cd plugins/codex-hud
npm run hud
```

## Configure

Read the current config if present:

```bash
CONFIG_DIR="${CODEX_HUD_CONFIG_DIR:-${CODEX_HOME:-$HOME/.codex}}/plugins/codex-hud"
test -f "$CONFIG_DIR/config.json" && cat "$CONFIG_DIR/config.json"
```

Write only the fields the user chooses to customize. Preserve advanced fields not being edited.
Common settings:

- `language`: `en` or `zh-Hans`
- `lineLayout`: `expanded` or `compact`
- `display.showTools`: show tool activity
- `display.showAgents`: show agent activity
- `display.showTodos`: show todo progress
- `display.showUsage`: show Codex rate limit usage
- `display.showSessionTokens`: show session token totals
- `gitStatus.enabled`: show git branch

For scripted configuration, prefer:

```bash
node scripts/configure.mjs --preset full --layout expanded --language en
```

For detailed setup or configuration flows, use the companion `codex-hud-setup`
and `codex-hud-configure` skills.

## Development Notes

- Plugin manifest: `.codex-plugin/plugin.json`
- Codex marketplace entry: repository root `.agents/plugins/marketplace.json`
- Main adapter: `src/codex-rollout.ts`
- Renderer inherited from claude-hud: `src/render/`

After changing TypeScript, run:

```bash
npm run build
npm test
python3 /home/eric/.codex/skills/.system/plugin-creator/scripts/validate_plugin.py .
```
