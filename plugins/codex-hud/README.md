# Codex HUD Plugin

English | [中文](#中文)

This directory contains the installable Codex plugin package for Codex HUD, adapted from [`jarrodwatts/claude-hud`](https://github.com/jarrodwatts/claude-hud).

## Run Locally

```bash
npm ci
npm run build
node dist/index.js
```

Install this plugin from the repository root:

```bash
cd ../..
codex plugin marketplace add "$PWD"
codex plugin add codex-hud@codex-hud
```

Render a specific Codex session:

```bash
CODEX_HUD_SESSION="$HOME/.codex/sessions/YYYY/MM/DD/rollout-....jsonl" \
  node dist/index.js
```

## Configure HUD Output

```bash
node scripts/configure.mjs --preset full --layout expanded --language en
node scripts/configure.mjs --language zh-Hans
node scripts/configure.mjs --show tools,agents,todos,sessionTokens
node scripts/configure.mjs --git-style files
```

Config is stored in:

```text
${CODEX_HUD_CONFIG_DIR:-${CODEX_HOME:-~/.codex}}/plugins/codex-hud/config.json
```

## Configure Native Codex Footer

Codex currently supports a fixed built-in TUI footer, not an arbitrary command-backed statusline. Configure the closest native footer with:

```bash
node scripts/configure-codex-tui-statusline.mjs
```

## Plugin Surfaces

```text
commands/setup.md
commands/configure.md
skills/codex-hud/SKILL.md
skills/codex-hud-setup/SKILL.md
skills/codex-hud-configure/SKILL.md
scripts/configure.mjs
scripts/configure-codex-tui-statusline.mjs
scripts/codex-hud
```

## Limitation

Codex CLI does not currently expose Claude Code's `statusLine.command` host API. The plugin can render the same HUD style from Codex rollout files and configure Codex's closest native footer, but the full ANSI HUD cannot yet be pinned below the Codex input area by the host.

---

# 中文

[English](#codex-hud-plugin) | 中文

这个目录是 Codex HUD 的可安装 Codex 插件包，基于 [`jarrodwatts/claude-hud`](https://github.com/jarrodwatts/claude-hud) 改造。

## 本地运行

```bash
npm ci
npm run build
node dist/index.js
```

从仓库根目录安装插件：

```bash
cd ../..
codex plugin marketplace add "$PWD"
codex plugin add codex-hud@codex-hud
```

渲染指定 Codex 会话：

```bash
CODEX_HUD_SESSION="$HOME/.codex/sessions/YYYY/MM/DD/rollout-....jsonl" \
  node dist/index.js
```

## 配置 HUD 输出

```bash
node scripts/configure.mjs --preset full --layout expanded --language en
node scripts/configure.mjs --language zh-Hans
node scripts/configure.mjs --show tools,agents,todos,sessionTokens
node scripts/configure.mjs --git-style files
```

配置文件位置：

```text
${CODEX_HUD_CONFIG_DIR:-${CODEX_HOME:-~/.codex}}/plugins/codex-hud/config.json
```

## 配置 Codex 原生 Footer

当前 Codex 支持固定字段的原生 TUI footer，但不支持任意命令输出的 statusline。可以用下面的脚本配置当前最接近 HUD 的原生 footer：

```bash
node scripts/configure-codex-tui-statusline.mjs
```

## 插件入口

```text
commands/setup.md
commands/configure.md
skills/codex-hud/SKILL.md
skills/codex-hud-setup/SKILL.md
skills/codex-hud-configure/SKILL.md
scripts/configure.mjs
scripts/configure-codex-tui-statusline.mjs
scripts/codex-hud
```

## 限制

当前 Codex CLI 没有 Claude Code 的 `statusLine.command` host API。这个插件可以从 Codex rollout 文件渲染同款 HUD，并配置 Codex 当前最接近的原生 footer，但还不能由 Codex host 把完整 ANSI HUD 固定显示在输入区下方。
