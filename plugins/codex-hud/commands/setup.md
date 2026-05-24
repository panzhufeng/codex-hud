---
description: Install, verify, repair, and run Codex HUD for the current machine.
---

# Codex HUD Setup

Use this command when the user asks to install, set up, verify, repair, or run Codex HUD.

## Preflight

1. Check that the repository marketplace is configured and the plugin is enabled:

```bash
codex plugin list | rg 'Marketplace `codex-hud`|codex-hud@codex-hud'
```

2. If the plugin is missing, install it from this repository marketplace:

```bash
codex plugin marketplace add /home/eric/Desktop/codex-hud
codex plugin add codex-hud@codex-hud
```

3. Locate the newest installed plugin runtime:

```bash
ls -d "${CODEX_HOME:-$HOME/.codex}"/plugins/cache/codex-hud/codex-hud/*/ 2>/dev/null | sort -V | tail -1
```

4. Check that Node.js is available:

```bash
command -v node && node --version
```

## Verify Rendering

Render the latest Codex session:

```bash
node /home/eric/Desktop/codex-hud/plugins/codex-hud/dist/index.js
```

Render a specific rollout file:

```bash
CODEX_HUD_SESSION="$HOME/.codex/sessions/YYYY/MM/DD/rollout-....jsonl" \
  node /home/eric/Desktop/codex-hud/plugins/codex-hud/dist/index.js
```

The output should include model, project, git, context, and usage lines. With activity enabled in config, it should also include tools, todos, agents, session time, and session tokens.

## Configure Native Codex Footer

Codex does not accept arbitrary command-backed footer text yet, but it does expose fixed built-in footer items through `[tui].status_line`. Configure the closest native footer with:

```bash
node /home/eric/Desktop/codex-hud/plugins/codex-hud/scripts/configure-codex-tui-statusline.mjs
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
