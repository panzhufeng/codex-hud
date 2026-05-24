---
description: Install, verify, repair, and run Codex HUD for the current machine.
---

# Codex HUD Setup

Use this command when the user asks to install, set up, verify, repair, or run Codex HUD.

## Preflight

1. Check whether Codex HUD is already visible to Codex:

```bash
codex plugin list | grep -E 'codex-hud@(codex-hud|personal)|Marketplace `codex-hud`'
```

2. If the plugin is missing and the user has cloned this repository, install it from the repository root:

```bash
cd /path/to/codex-hud
codex plugin marketplace add "$PWD"
codex plugin add codex-hud@codex-hud
```

If the user has not cloned the repository yet:

```bash
git clone git@github.com:panzhufeng/codex-hud.git
cd codex-hud
codex plugin marketplace add "$PWD"
codex plugin add codex-hud@codex-hud
```

Use `https://github.com/panzhufeng/codex-hud.git` instead of the SSH URL if SSH keys are not configured.

3. Locate the newest installed plugin runtime. This works for both repository marketplaces and the default personal marketplace:

```bash
PLUGIN_ROOT="$(ls -d "${CODEX_HOME:-$HOME/.codex}"/plugins/cache/*/codex-hud/*/ 2>/dev/null | sort -V | tail -1)"
printf '%s\n' "$PLUGIN_ROOT"
```

4. Check that Node.js is available:

```bash
command -v node && node --version
```

## Verify Rendering

Render the latest Codex session from the installed plugin runtime:

```bash
node "$PLUGIN_ROOT/dist/index.js"
```

Render a specific rollout file:

```bash
CODEX_HUD_SESSION="$HOME/.codex/sessions/YYYY/MM/DD/rollout-....jsonl" \
  node "$PLUGIN_ROOT/dist/index.js"
```

The output should include model, project, git, context, and usage lines. With activity enabled in config, it should also include tools, todos, agents, session time, and session tokens.

## Configure Native Codex Footer

Codex does not accept arbitrary command-backed footer text yet, but it does expose fixed built-in footer items through `[tui].status_line`. Configure the closest native footer with:

```bash
node "$PLUGIN_ROOT/scripts/configure-codex-tui-statusline.mjs"
```

This writes:

```toml
[tui]
status_line = [
  "model-with-reasoning",
  "task-progress",
  "current-dir",
  "git-branch",
  "context-used",
  "five-hour-limit",
  "weekly-limit",
]
status_line_use_colors = true
```

The script creates a timestamped backup before changing an existing `config.toml`.

## Codex Host Limitation

`claude-hud` wires itself into Claude Code through the native `statusLine.command` host API. Codex CLI currently has plugin commands, skills, MCP/apps, hooks config, and a fixed built-in `[tui].status_line` list, but no command-backed statusline provider that can pin arbitrary ANSI HUD output below the input area.

If a future Codex release adds a command-backed statusline, point it at the installed `dist/index.js` runtime and keep `COLUMNS` set to the terminal width.
