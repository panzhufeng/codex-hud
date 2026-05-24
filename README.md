# Codex HUD

English | [中文](README.zh-CN.md)

Codex HUD is a Codex plugin adaptation of [`claude-hud`](https://github.com/jarrodwatts/claude-hud). It keeps the same terminal HUD renderer and adapts it to Codex by reading Codex rollout JSONL session files, exposing Codex plugin commands and skills, and optionally configuring Codex's built-in TUI footer to the closest available native fields.

## Demo

![Codex HUD preview](./codex-hub-preview-0523.png)

## What It Shows

- Model and reasoning effort
- Project path and git branch/status
- Context usage and token breakdown
- Five-hour and weekly usage limits when Codex records them
- Tool activity, todos, agents, session time, and session token totals
- English and Simplified Chinese HUD labels

## Repository Layout

```text
.agents/plugins/marketplace.json   # repository-local Codex marketplace
plugins/codex-hud/                 # Codex plugin source
plugins/codex-hud/dist/            # built runtime included for plugin installs
plugins/codex-hud/commands/        # /setup and /configure plugin commands
plugins/codex-hud/skills/          # Codex skills for setup/configuration
plugins/codex-hud/scripts/         # local configuration helpers
```

## Install From This Repository

Requirements:

- Codex CLI with plugin support. This repo has been verified with `codex-cli 0.133.0`.
- Git.
- Node.js 18 or newer for local HUD snapshots, footer configuration, and development commands.

```bash
git clone git@github.com:panzhufeng/codex-hud.git
cd codex-hud
codex plugin marketplace add "$PWD"
codex plugin add codex-hud@codex-hud
```

If SSH keys are not configured, clone with HTTPS instead:

```bash
git clone https://github.com/panzhufeng/codex-hud.git
```

Verify:

```bash
codex plugin list | grep -E 'codex-hud@codex-hud'
node plugins/codex-hud/dist/index.js
```

Then start a new Codex thread so the newly installed plugin skills and commands are loaded.

To upgrade later:

```bash
cd codex-hud
git pull
codex plugin marketplace add "$PWD"
codex plugin add codex-hud@codex-hud
```

## Global Personal Install

The repository marketplace install above is the recommended path for most users. For a machine-wide personal install, keep the plugin under `~/plugins/codex-hud` and register it in the default personal marketplace at `~/.agents/plugins/marketplace.json`:

```bash
mkdir -p ~/plugins ~/.agents/plugins
rsync -a --delete --exclude node_modules plugins/codex-hud/ ~/plugins/codex-hud/
```

If you do not already have a personal marketplace file, create one:

```bash
test -f ~/.agents/plugins/marketplace.json || cat > ~/.agents/plugins/marketplace.json <<'JSON'
{
  "name": "personal",
  "interface": {
    "displayName": "Personal"
  },
  "plugins": [
    {
      "name": "codex-hud",
      "source": {
        "source": "local",
        "path": "./plugins/codex-hud"
      },
      "policy": {
        "installation": "AVAILABLE",
        "authentication": "ON_INSTALL"
      },
      "category": "Productivity"
    }
  ]
}
JSON
```

If you already have a personal marketplace, add a `codex-hud` entry that points to `./plugins/codex-hud` while preserving your existing plugins. Then install:

```bash
codex plugin add codex-hud@personal
```

## Configure

Codex HUD stores its own display config at:

```text
${CODEX_HUD_CONFIG_DIR:-${CODEX_HOME:-~/.codex}}/plugins/codex-hud/config.json
```

Common presets:

```bash
cd plugins/codex-hud
node scripts/configure.mjs --preset full --layout expanded --language en
node scripts/configure.mjs --preset essential --layout compact-separators
node scripts/configure.mjs --language zh-Hans
node scripts/configure.mjs --show tools,agents,todos,sessionTokens
node scripts/configure.mjs --hide usage,speed,counts
node scripts/configure.mjs --git-style files
```

Configure Codex's native fixed footer to the closest available built-in fields:

```bash
node scripts/configure-codex-tui-statusline.mjs
```

This writes `[tui].status_line` in `~/.codex/config.toml` using native Codex items such as `model-with-reasoning`, `current-dir`, `git-branch`, `context-used`, `five-hour-limit`, and `weekly-limit`. A timestamped backup is created before changing an existing config.

## Plugin Commands

After installation, start a new Codex thread and use:

```text
/setup
/configure
```

The plugin also exposes setup and configuration skills that Codex can invoke when you ask it to install, verify, run, or customize Codex HUD.

## Development

```bash
cd plugins/codex-hud
npm ci
npm run build
npm test
node dist/index.js
```

Render a specific session:

```bash
CODEX_HUD_SESSION="$HOME/.codex/sessions/YYYY/MM/DD/rollout-....jsonl" \
  node dist/index.js
```

Validate the plugin manifest from the repository root:

```bash
python3 "${CODEX_HOME:-$HOME/.codex}/skills/.system/plugin-creator/scripts/validate_plugin.py" plugins/codex-hud
```

## Troubleshooting

- `codex plugin add codex-hud@codex-hud` cannot find the plugin: run `codex plugin marketplace add "$PWD"` from the repository root, then retry the add command.
- `node plugins/codex-hud/dist/index.js` prints only an initializing line: open at least one Codex session first, or pass `CODEX_HUD_SESSION=/path/to/rollout.jsonl`.
- The full HUD does not appear below the Codex input box: this is a current Codex platform limitation. Run `node plugins/codex-hud/scripts/configure-codex-tui-statusline.mjs` for the closest native footer.
- `node` is not found: install Node.js 18 or newer and rerun the command.

## Codex Platform Limitation

`claude-hud` uses Claude Code's native `statusLine.command` API to pin arbitrary command output below the input area. Codex CLI currently supports plugins, skills, commands, hooks, apps/MCP, and a fixed native `[tui].status_line` list, but it does not expose an equivalent command-backed statusline provider. Because of that, Codex HUD provides the renderer, session parser, commands, skills, config tools, and the closest native footer setup available today, but it cannot yet pin the full ANSI HUD in exactly the same place as `claude-hud`.

## Credits

Adapted from [`jarrodwatts/claude-hud`](https://github.com/jarrodwatts/claude-hud). The Codex rollout parser, Codex plugin packaging, setup/configure commands, and Codex TUI footer helper are specific to this repository.
