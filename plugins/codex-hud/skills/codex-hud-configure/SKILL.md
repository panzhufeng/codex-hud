---
name: codex-hud-configure
description: Configure Codex HUD display options including layout, presets, language, activity lines, git style, custom line, usage, session duration, and session token display while preserving advanced manual overrides.
---

# Codex HUD Configure

Use this skill when the user asks to configure, customize, enable, disable, reset, or localize Codex HUD.

## Config Location

Codex HUD reads and writes:

```text
${CODEX_HUD_CONFIG_DIR:-${CODEX_HOME:-~/.codex}}/plugins/codex-hud/config.json
```

Always read the existing file first if it exists and preserve keys the user did not ask to change.

## Scripted Configuration

From the plugin root:

```bash
node scripts/configure.mjs --preset full --layout expanded --language en
```

Common options:

```bash
node scripts/configure.mjs --preset essential
node scripts/configure.mjs --preset minimal
node scripts/configure.mjs --layout compact-separators
node scripts/configure.mjs --language zh-Hans
node scripts/configure.mjs --show tools,agents,todos,sessionTokens
node scripts/configure.mjs --hide usage,speed,counts
node scripts/configure.mjs --git-style files
node scripts/configure.mjs --custom-line "Ship small, verify hard"
node scripts/configure.mjs --clear-custom-line
```

## Presets

- `full`: tools, agents, todos, config counts, token breakdown, usage, duration, session name, session tokens, and git enabled.
- `essential`: tools, agents, todos, duration, and git enabled; quieter informational counters disabled.
- `minimal`: core model/context HUD and git enabled; activity and informational counters disabled.

## Guided Flow

For a new user, ask at most these six questions:

- Layout: `expanded`, `compact`, or `compact-separators`
- Preset: `full`, `essential`, or `minimal`
- Language: `en` or `zh-Hans`
- Turn off: enabled elements they do not want
- Turn on: disabled elements they do want
- Custom line: skip, set, or clear

For an existing config, prioritize:

- Turn off currently enabled activity/info elements
- Turn on currently disabled activity/info elements
- Git style: `branch`, `dirty`, `full`, or `files`
- Layout or preset reset
- Language
- Custom line

## Element Keys

- `tools` -> `display.showTools`
- `agents` -> `display.showAgents`
- `todos` -> `display.showTodos`
- `project` -> `display.showProject`
- `counts` -> `display.showConfigCounts`
- `tokens` -> `display.showTokenBreakdown`
- `speed` -> `display.showSpeed`
- `usage` -> `display.showUsage`
- `duration` -> `display.showDuration`
- `sessionName` -> `display.showSessionName`
- `sessionTokens` -> `display.showSessionTokens`
- `git` -> `gitStatus.enabled`
