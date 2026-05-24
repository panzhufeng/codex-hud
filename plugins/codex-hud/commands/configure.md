---
description: Configure Codex HUD layout, language, presets, activity lines, git style, usage, and session token display.
---

# Configure Codex HUD

Use this command when the user asks to configure, customize, localize, reset, enable, or disable Codex HUD display options.

## Config Location

Read the current config first if it exists:

```text
${CODEX_HUD_CONFIG_DIR:-${CODEX_HOME:-~/.codex}}/plugins/codex-hud/config.json
```

Preserve any advanced keys the user did not ask to change.

## Scripted Configuration

From the plugin root:

```bash
node scripts/configure.mjs --preset full --layout expanded --language en
```

Common changes:

```bash
node scripts/configure.mjs --preset essential
node scripts/configure.mjs --preset minimal
node scripts/configure.mjs --layout compact
node scripts/configure.mjs --layout compact-separators
node scripts/configure.mjs --language zh-Hans
node scripts/configure.mjs --show tools,agents,todos,sessionTokens
node scripts/configure.mjs --hide usage,speed,counts
node scripts/configure.mjs --git-style files
node scripts/configure.mjs --custom-line "Ship small, verify hard"
node scripts/configure.mjs --clear-custom-line
```

## Guided Flow

For a new user, ask at most six questions:

1. Layout: `expanded`, `compact`, or `compact-separators`
2. Preset: `full`, `essential`, or `minimal`
3. Language: `en` or `zh-Hans`
4. Turn off enabled elements they do not want
5. Turn on disabled elements they do want
6. Custom line: skip, set, or clear

For an existing config, prioritize:

1. Turn off currently enabled activity or info elements
2. Turn on currently disabled activity or info elements
3. Git style: `branch`, `dirty`, `full`, or `files`
4. Layout change or preset reset
5. Language
6. Custom line

## Presets

- `full`: tools, agents, todos, config counts, token breakdown, usage, duration, session name, session tokens, and git enabled.
- `essential`: tools, agents, todos, duration, and git enabled; quieter informational counters disabled.
- `minimal`: core model/context HUD and git enabled; activity and informational counters disabled.

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

Always keep `display.showModel` and `display.showContextBar` enabled.

