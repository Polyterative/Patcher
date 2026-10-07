#!/usr/bin/env node
// Static dark-mode guard. Reports, per SCSS file under src/:
//   R1  var(--x, fallback) where --x is never defined anywhere (and is not a Material --mat-*/--mdc-* token):
//       the fallback silently wins in dark mode (e.g. `var(--mat-sys-surface, #fff)`).
//   R2  hard-coded light surfaces (#fff, white, near-white rgba/hex) on background / background-color
//       in a file that has no dark handling (html.dark / :host-context(html.dark) / var(--app-*)).
// Use --update-baseline to grandfather current findings; the check only fails on NEW ones.
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..', 'src');
const BASELINE = path.join(__dirname, '.theme-tokens-baseline.json');
const update = process.argv.includes('--update-baseline');

const files = [];
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.(scss|css)$/.test(e.name)) files.push(p);
  }
})(ROOT);

const defined = new Set();
const defRe = /(^|[^a-zA-Z0-9-])(--[a-zA-Z0-9-]+)\s*:/g;
const text = new Map();
for (const f of files) {
  const t = fs.readFileSync(f, 'utf8');
  text.set(f, t);
  let m;
  while ((m = defRe.exec(t))) defined.add(m[2]);
}
// Variables set from TS/HTML (style bindings, setProperty).
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.(ts|html)$/.test(e.name) && !/\.spec\.ts$/.test(e.name)) {
      const t = fs.readFileSync(p, 'utf8');
      for (const m of t.matchAll(/--[a-zA-Z0-9-]+/g)) defined.add(m[0]);
    }
  }
})(ROOT);

const isLight = (v) => {
  v = v.trim().toLowerCase();
  if (v === 'white' || v === '#fff' || v === '#ffffff') return true;
  let m = v.match(/^#([0-9a-f]{6})$/);
  if (m) {
    const n = parseInt(m[1], 16);
    return ((n >> 16) & 255) > 225 && ((n >> 8) & 255) > 225 && (n & 255) > 225;
  }
  m = v.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)/);
  if (m) return +m[1] > 225 && +m[2] > 225 && +m[3] > 225 && (m[4] === undefined || +m[4] >= 0.5);
  return false;
};

const findings = [];
for (const f of files) {
  const rel = path.relative(path.resolve(ROOT, '..'), f);
  if (/theme-(dark|tokens)\.scss$/.test(rel)) continue;
  const t = text.get(f);
  const lines = t.split('\n');
  const hasDark = /html\.dark|\[data-theme=.?dark|prefers-color-scheme:\s*dark/.test(t);
  lines.forEach((line, i) => {
    if (/^\s*\/\//.test(line)) return;
    for (const m of line.matchAll(/var\((--[a-zA-Z0-9-]+)\s*,\s*([^)]+(?:\([^)]*\))?[^)]*)\)/g)) {
      if (/^--(mat|mdc)-/.test(m[1]) && !/^--mat-sys-/.test(m[1])) continue;
      if (!defined.has(m[1])) findings.push({ file: rel, rule: 'R1', key: `${m[1]}`, line: i + 1, text: line.trim() });
    }
    const bg = line.match(/^\s*background(?:-color)?\s*:\s*(.+?);?\s*$/);
    if (bg && !hasDark && !/var\(--app-/.test(bg[1])) {
      const parts = bg[1].match(/#[0-9a-fA-F]{3,6}\b|rgba?\([^)]*\)|\bwhite\b/g) || [];
      if (parts.length && parts.every(isLight) === false ? parts.some(isLight) : parts.length && parts.every(isLight)) {
        findings.push({ file: rel, rule: 'R2', key: bg[1].slice(0, 60), line: i + 1, text: line.trim() });
      }
    }
  });
}

const sig = (x) => `${x.rule}|${x.file}|${x.key}`;
if (update) {
  fs.writeFileSync(BASELINE, JSON.stringify([...new Set(findings.map(sig))].sort(), null, 2) + '\n');
  console.log(`theme-tokens baseline written: ${new Set(findings.map(sig)).size} entries`);
  process.exit(0);
}
const base = new Set(fs.existsSync(BASELINE) ? JSON.parse(fs.readFileSync(BASELINE, 'utf8')) : []);
const fresh = findings.filter((x) => !base.has(sig(x)));
if (process.argv.includes('--all')) {
  for (const x of findings) console.log(`${x.rule} ${x.file}:${x.line}  ${x.text}`);
  console.log(`\n${findings.length} total (${fresh.length} new)`);
  process.exit(0);
}
if (fresh.length) {
  for (const x of fresh) console.error(`${x.rule} ${x.file}:${x.line}  ${x.text}`);
  console.error(
    `\ncheck-theme-tokens: ${fresh.length} new dark-mode hazard(s). R1: use a defined --app-* token instead of an undefined var with a light fallback. R2: use var(--app-surface*) or add an html.dark override.`
  );
  process.exit(1);
}
console.log(`check-theme-tokens: clean (${findings.length} grandfathered).`);
