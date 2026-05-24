#!/usr/bin/env node
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { DEFAULT_CONFIG } from '../dist/config.js';

const ELEMENTS = {
  tools: ['display', 'showTools'],
  agents: ['display', 'showAgents'],
  todos: ['display', 'showTodos'],
  project: ['display', 'showProject'],
  counts: ['display', 'showConfigCounts'],
  tokens: ['display', 'showTokenBreakdown'],
  speed: ['display', 'showSpeed'],
  usage: ['display', 'showUsage'],
  duration: ['display', 'showDuration'],
  sessionName: ['display', 'showSessionName'],
  sessionTokens: ['display', 'showSessionTokens'],
  git: ['gitStatus', 'enabled'],
};

function usage() {
  console.log(`Usage:
  node scripts/configure.mjs [options]

Options:
  --preset full|essential|minimal
  --layout expanded|compact|compact-separators
  --language en|zh-Hans
  --show tools,agents,todos,usage,sessionTokens
  --hide tools,agents,todos,usage,sessionTokens
  --git-style branch|dirty|full|files
  --custom-line "text"
  --clear-custom-line
  --print
`);
}

function expandHome(value) {
  if (!value) return value;
  if (value === '~') return os.homedir();
  if (value.startsWith('~/') || value.startsWith('~\\')) {
    return path.join(os.homedir(), value.slice(2));
  }
  return value;
}

function configPath() {
  const root = expandHome(process.env.CODEX_HUD_CONFIG_DIR || process.env.CODEX_HOME || path.join(os.homedir(), '.codex'));
  return path.join(path.resolve(root), 'plugins', 'codex-hud', 'config.json');
}

function deepMerge(base, overrides) {
  const out = Array.isArray(base) ? [...base] : { ...base };
  for (const [key, value] of Object.entries(overrides ?? {})) {
    if (value && typeof value === 'object' && !Array.isArray(value) && base?.[key] && typeof base[key] === 'object' && !Array.isArray(base[key])) {
      out[key] = deepMerge(base[key], value);
    } else {
      out[key] = value;
    }
  }
  return out;
}

function readConfig(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return {};
  }
}

function setPath(config, keys, value) {
  let target = config;
  for (const key of keys.slice(0, -1)) {
    target[key] = target[key] && typeof target[key] === 'object' ? target[key] : {};
    target = target[key];
  }
  target[keys[keys.length - 1]] = value;
}

function setElements(config, csv, value) {
  for (const raw of csv.split(',')) {
    const key = raw.trim();
    if (!key) continue;
    const pathKeys = ELEMENTS[key];
    if (!pathKeys) {
      throw new Error(`Unknown element: ${key}`);
    }
    setPath(config, pathKeys, value);
  }
}

function applyPreset(config, preset) {
  if (!['full', 'essential', 'minimal'].includes(preset)) {
    throw new Error(`Invalid preset: ${preset}`);
  }
  const full = preset === 'full';
  const essential = preset === 'essential';
  setPath(config, ['display', 'showTools'], full || essential);
  setPath(config, ['display', 'showAgents'], full || essential);
  setPath(config, ['display', 'showTodos'], full || essential);
  setPath(config, ['display', 'showConfigCounts'], full);
  setPath(config, ['display', 'showTokenBreakdown'], full);
  setPath(config, ['display', 'showUsage'], full);
  setPath(config, ['display', 'showDuration'], full || essential);
  setPath(config, ['display', 'showSessionName'], full);
  setPath(config, ['display', 'showSessionTokens'], full);
  setPath(config, ['gitStatus', 'enabled'], true);
  setPath(config, ['gitStatus', 'showDirty'], true);
  setPath(config, ['gitStatus', 'showAheadBehind'], false);
  setPath(config, ['gitStatus', 'showFileStats'], false);
}

function applyLayout(config, layout) {
  if (layout === 'expanded') {
    config.lineLayout = 'expanded';
    config.showSeparators = false;
  } else if (layout === 'compact') {
    config.lineLayout = 'compact';
    config.showSeparators = false;
  } else if (layout === 'compact-separators') {
    config.lineLayout = 'compact';
    config.showSeparators = true;
  } else {
    throw new Error(`Invalid layout: ${layout}`);
  }
}

function applyGitStyle(config, style) {
  const styles = {
    branch: [true, false, false, false],
    dirty: [true, true, false, false],
    full: [true, true, true, false],
    files: [true, true, false, true],
  };
  const values = styles[style];
  if (!values) {
    throw new Error(`Invalid git style: ${style}`);
  }
  const [enabled, showDirty, showAheadBehind, showFileStats] = values;
  config.gitStatus = {
    ...(config.gitStatus ?? {}),
    enabled,
    showDirty,
    showAheadBehind,
    showFileStats,
  };
}

const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  usage();
  process.exit(0);
}

const file = configPath();
const config = deepMerge(DEFAULT_CONFIG, readConfig(file));

try {
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    const next = () => {
      const value = args[++i];
      if (!value) throw new Error(`${arg} requires a value`);
      return value;
    };
    if (arg === '--preset') applyPreset(config, next());
    else if (arg === '--layout') applyLayout(config, next());
    else if (arg === '--language') {
      const language = next();
      if (!['en', 'zh-Hans'].includes(language)) throw new Error(`Invalid language: ${language}`);
      config.language = language;
    } else if (arg === '--show') setElements(config, next(), true);
    else if (arg === '--hide') setElements(config, next(), false);
    else if (arg === '--git-style') applyGitStyle(config, next());
    else if (arg === '--custom-line') setPath(config, ['display', 'customLine'], next().slice(0, 80));
    else if (arg === '--clear-custom-line') setPath(config, ['display', 'customLine'], '');
    else if (arg === '--print') {
      // Handled after writes.
    } else {
      throw new Error(`Unknown option: ${arg}`);
    }
  }

  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(config, null, 2)}\n`, 'utf8');
  if (args.includes('--print')) {
    console.log(JSON.stringify(config, null, 2));
  } else {
    console.log(`Wrote ${file}`);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  usage();
  process.exit(1);
}
