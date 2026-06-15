#!/usr/bin/env node
/**
 * Doc-freshness lint.
 *
 * Catches the most common ways the agent docs rot:
 *   D1  Broken relative markdown links inside AGENTS.md, CLAUDE.md, and
 *       internaldocs/**.md. Anchors (#section) are checked for existence
 *       only loosely (file must exist; we do not validate the slug).
 *   D2  Personas listed in internaldocs/agents/README.md must exist as files.
 *   D3  Each plan file in internaldocs/workflow/plans/ must contain a
 *       "## Decision log" section so future agents can find it without
 *       guessing.
 *   D4  CURRENT_FEATURE.md must either show "_No active feature._" or have
 *       all three Layer headings populated.
 *
 * Run: node scripts/checks/check-docs.cjs
 */

const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..', '..');
const errors = [];

function read(rel) {
  return fs.readFileSync(path.join(repoRoot, rel), 'utf8');
}

function listMd(dir) {
  const out = [];
  function walk(d) {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile() && entry.name.endsWith('.md')) {
        out.push(path.relative(repoRoot, full));
      }
    }
  }
  walk(path.join(repoRoot, dir));
  return out;
}

// ── D1: broken relative markdown links ───────────────────────────────────────
const linkRe = /\[([^\]]+)\]\(([^)]+)\)/g;

const docFiles = ['AGENTS.md', 'CLAUDE.md', ...listMd('internaldocs')];

for (const rel of docFiles) {
  const src = read(rel);
  const dir = path.dirname(rel);

  // Strip fenced code blocks before scanning for links — examples & templates
  // commonly contain placeholder paths like ./plans/<slug>.md.
  const stripped = src.replace(/```[\s\S]*?```/g, '');

  let m;
  while ((m = linkRe.exec(stripped)) !== null) {
    let target = m[2].trim();
    if (
      /^https?:\/\//.test(target) ||
      target.startsWith('mailto:') ||
      target.startsWith('#') ||
      target.includes('<') // skip placeholders like <slug>
    ) {
      continue;
    }
    // Strip anchor & query
    target = target.split('#')[0].split('?')[0];
    if (!target) continue;
    const resolved = path.normalize(path.join(repoRoot, dir, target));
    if (!fs.existsSync(resolved)) {
      errors.push(
        `D1 ${rel}: broken link "${m[2]}" (resolved to ${path.relative(repoRoot, resolved)})`
      );
    }
  }
}

// ── D2: personas referenced from agents/README.md exist ──────────────────────
const personaIndex = read('internaldocs/agents/README.md');
const personaRe = /\[`([a-z-]+\.md)`\]\(\.\/([a-z-]+\.md)\)/g;
let pm;
while ((pm = personaRe.exec(personaIndex)) !== null) {
  const file = pm[2];
  if (!fs.existsSync(path.join(repoRoot, 'internaldocs/agents', file))) {
    errors.push(`D2 internaldocs/agents/README.md references missing persona file: ${file}`);
  }
}

// ── D3: every plan file has a Decision log section ───────────────────────────
const plansDir = path.join(repoRoot, 'internaldocs/workflow/plans');
if (fs.existsSync(plansDir)) {
  for (const f of fs.readdirSync(plansDir)) {
    if (!f.endsWith('.md') || f === 'README.md') continue;
    const src = read(path.relative(repoRoot, path.join(plansDir, f)));
    if (!/^##\s+Decision log/m.test(src)) {
      errors.push(
        `D3 internaldocs/workflow/plans/${f}: missing "## Decision log" section`
      );
    }
  }
}

// ── D4: CURRENT_FEATURE.md is either empty or fully populated ────────────────
const cf = read('internaldocs/workflow/CURRENT_FEATURE.md');
const activeIdx = cf.indexOf('## Active');
const templateIdx = cf.indexOf('## Empty template');
if (activeIdx >= 0 && templateIdx > activeIdx) {
  const activeBody = cf.slice(activeIdx, templateIdx);
  if (!/_No active feature\._/.test(activeBody)) {
    const hasLayer1 = /Layer 1/.test(activeBody);
    const hasLayer2 = /Layer 2/.test(activeBody);
    const hasLayer3 = /Layer 3/.test(activeBody);
    if (!(hasLayer1 && hasLayer2 && hasLayer3)) {
      errors.push(
        'D4 internaldocs/workflow/CURRENT_FEATURE.md: Active feature missing one of Layer 1/2/3 headings.\n' +
          '   Fix: define all three layers (MVP -> Structural -> Polish) before starting work,\n' +
          '   or reset Active to "_No active feature._" if no feature is in flight.'
      );
    }
  }
}

if (errors.length === 0) {
  process.exit(0);
}

console.error('\nDoc-freshness lint failed:\n');
for (const e of errors) console.error(`  - ${e}`);
console.error(
  '\nFix: update the offending file. If a link points at a doc that was deliberately removed,\n' +
    '     update the link or remove the reference. See internaldocs/README.md.'
);
process.exit(1);
