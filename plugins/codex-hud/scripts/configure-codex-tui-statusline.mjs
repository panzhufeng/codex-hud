#!/usr/bin/env node
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

const DEFAULT_ITEMS = [
  'model-with-reasoning',
  'task-progress',
  'current-dir',
  'git-branch',
  'context-used',
  'five-hour-limit',
  'weekly-limit',
];

function usage() {
  console.log(`Usage:
  node scripts/configure-codex-tui-statusline.mjs [options]

Options:
  --config /path/to/config.toml
  --items model-with-reasoning,current-dir,git-branch,context-used,five-hour-limit,weekly-limit
  --no-colors
  --dry-run
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

function defaultConfigPath() {
  const root = expandHome(process.env.CODEX_HOME || path.join(os.homedir(), '.codex'));
  return path.join(path.resolve(root), 'config.toml');
}

function timestamp() {
  return new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
}

function findSection(lines, sectionName) {
  const header = `[${sectionName}]`;
  const start = lines.findIndex((line) => line.trim() === header);
  if (start === -1) return null;
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i += 1) {
    if (/^\s*\[[^\]]+\]\s*$/.test(lines[i])) {
      end = i;
      break;
    }
  }
  return { start, end };
}

function removeTomlKey(lines, start, end, key) {
  const out = [...lines];
  for (let i = end - 1; i > start; i -= 1) {
    if (!new RegExp(`^\\s*${key}\\s*=`).test(out[i])) continue;
    let deleteEnd = i + 1;
    if (out[i].includes('[') && !out[i].includes(']')) {
      for (let j = i + 1; j < end; j += 1) {
        deleteEnd = j + 1;
        if (out[j].includes(']')) break;
      }
    }
    out.splice(i, deleteEnd - i);
  }
  return out;
}

function formatStatusLine(items, useColors) {
  const itemLines = items.map((item, index) => {
    const suffix = index === items.length - 1 ? '' : ',';
    return `  "${item}"${suffix}`;
  });
  return [
    'status_line = [',
    ...itemLines,
    ']',
    `status_line_use_colors = ${useColors ? 'true' : 'false'}`,
  ];
}

function updateTuiSection(source, items, useColors) {
  const sourceHadTrailingNewline = source.endsWith('\n');
  let lines = source.length > 0 ? source.replace(/\n$/, '').split('\n') : [];
  let section = findSection(lines, 'tui');

  if (!section) {
    if (lines.length > 0 && lines[lines.length - 1].trim() !== '') lines.push('');
    lines.push('[tui]');
    section = { start: lines.length - 1, end: lines.length };
  }

  lines = removeTomlKey(lines, section.start, section.end, 'status_line');
  section = findSection(lines, 'tui');
  lines = removeTomlKey(lines, section.start, section.end, 'status_line_use_colors');
  section = findSection(lines, 'tui');

  lines.splice(section.start + 1, 0, ...formatStatusLine(items, useColors));
  return `${lines.join('\n')}${sourceHadTrailingNewline || lines.length > 0 ? '\n' : ''}`;
}

const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  usage();
  process.exit(0);
}

let configFile = defaultConfigPath();
let items = DEFAULT_ITEMS;
let useColors = true;
let dryRun = false;
let print = false;

try {
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    const next = () => {
      const value = args[++i];
      if (!value) throw new Error(`${arg} requires a value`);
      return value;
    };

    if (arg === '--config') configFile = path.resolve(expandHome(next()));
    else if (arg === '--items') items = next().split(',').map((item) => item.trim()).filter(Boolean);
    else if (arg === '--no-colors') useColors = false;
    else if (arg === '--dry-run') dryRun = true;
    else if (arg === '--print') print = true;
    else throw new Error(`Unknown option: ${arg}`);
  }

  if (items.length === 0) throw new Error('--items must include at least one status line item');

  const existing = fs.existsSync(configFile) ? fs.readFileSync(configFile, 'utf8') : '';
  const updated = updateTuiSection(existing, items, useColors);

  if (print || dryRun) {
    process.stdout.write(updated);
  }

  if (!dryRun) {
    fs.mkdirSync(path.dirname(configFile), { recursive: true });
    if (fs.existsSync(configFile) && existing !== updated) {
      fs.copyFileSync(configFile, `${configFile}.codex-hud.${timestamp()}.bak`);
    }
    fs.writeFileSync(configFile, updated, 'utf8');
    if (!print) console.log(`Wrote ${configFile}`);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  usage();
  process.exit(1);
}

