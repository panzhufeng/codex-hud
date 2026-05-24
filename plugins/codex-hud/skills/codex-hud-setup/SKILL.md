---
name: codex-hud-setup
description: Install or verify Codex HUD, locate the installed plugin runtime, check Node.js, render a sample HUD from the latest Codex rollout JSONL, and explain Codex host limitations compared with claude-hud statusLine setup.
---

# Codex HUD Setup

Use this skill when the user asks to set up, install, verify, repair, or run Codex HUD.

## Setup Flow

1. Confirm the plugin is installed and enabled:

```bash
codex plugin list | grep -E 'codex-hud@(codex-hud|personal)|Marketplace `codex-hud`'
```

If it is not listed and the repository is already cloned, install the repository marketplace and plugin from the repository root:

```bash
cd /path/to/codex-hud
codex plugin marketplace add "$PWD"
codex plugin add codex-hud@codex-hud
```

If the repository is not cloned yet:

```bash
git clone git@github.com:panzhufeng/codex-hud.git
cd codex-hud
codex plugin marketplace add "$PWD"
codex plugin add codex-hud@codex-hud
```

Use `https://github.com/panzhufeng/codex-hud.git` when SSH keys are not configured.

2. Locate the installed plugin runtime. This cache layout covers both repository and personal marketplace installs:

```bash
PLUGIN_ROOT="$(ls -d "${CODEX_HOME:-$HOME/.codex}"/plugins/cache/*/codex-hud/*/ 2>/dev/null | sort -V | tail -1)"
printf '%s\n' "$PLUGIN_ROOT"
```

3. Check Node.js:

```bash
command -v node && node --version
```

4. Render a HUD snapshot from the latest Codex session:

```bash
node "$PLUGIN_ROOT/dist/index.js"
```

Or render a specific rollout file:

```bash
CODEX_HUD_SESSION="$HOME/.codex/sessions/YYYY/MM/DD/rollout-....jsonl" \
  node "$PLUGIN_ROOT/dist/index.js"
```

5. Optionally configure Codex's native fixed footer to show the closest built-in fields:

```bash
node "$PLUGIN_ROOT/scripts/configure-codex-tui-statusline.mjs"
```

This updates `${CODEX_HOME:-~/.codex}/config.toml` with `[tui].status_line` entries for model/reasoning, task progress, current directory, git branch, context usage, five-hour limit, and weekly limit. It creates a timestamped backup before replacing existing status line keys.

## Codex Host Limitation

`claude-hud` installs itself as a Claude Code `statusLine` command. Codex CLI 0.133.0 exposes plugin skills, marketplace installation, hooks, and a fixed native `[tui].status_line` list, but no equivalent command-backed host API that pins arbitrary stdout below the input box. Codex HUD therefore verifies by rendering a snapshot command, exposes setup/configure skills, and can configure the closest native fixed footer. If Codex adds a command-backed statusline hook later, wire the generated command to the installed `dist/index.js`.

## Expected Success

The rendered output should include model, project, git, context, and usage lines. With config enabling activity, it should also include tools, todos, agents, and session tokens.
