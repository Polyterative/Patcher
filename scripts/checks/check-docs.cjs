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
 *   D5  Orphaned docs: every .md under internaldocs/ (except archived plans in
 *       workflow/plans/done/) must be linked from at least one other doc, so
 *       agents can reach it from the internaldocs/README.md router.
 *   D6  CURRENT_FEATURE.md must carry an "Updated: YYYY-MM-DD" stamp; errors
 *       when missing or older than 30 days (warns from 14 days).
 *   D7  Pending questions in the TODO Approvals ledger must carry an
 *       "(added YYYY-MM-DD)" stamp; warns when older than 28 days.
 *   D8  COMPLETED.md entries dated 2026-07-21 or later must reference at least
 *       one backticked commit hash so evidence checks stay grep-cheap.
 *
 * Run: node scripts/checks/check-docs.cjs
 */

const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..', '..');
const errors = [];
const warnings = [];

function daysSince(isoDate) {
  return Math.floor((Date.now() - new Date(`${isoDate}T00:00:00`).getTime()) / 86400000);
}

function read(rel) {
  return fs.readFileSync(path.join(repoRoot, rel), 'utf8');
}

function listMd(dir) {
  const out = [];
  function walk(d) {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, entry.name);
      // internaldocs/security is private and gitignored (public repo) —
      // absent in fresh clones, so exclude it from doc lints entirely.
      if (entry.isDirectory() && entry.name === 'security'
        && path.relative(repoRoot, full) === path.join('internaldocs', 'security')) continue;
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

// All internaldocs .md files that are the target of at least one link (for D5).
const linkedTargets = new Set();

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
    } else {
      const relTarget = path.relative(repoRoot, resolved);
      if (relTarget !== rel) linkedTargets.add(relTarget);
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

// ── D6: CURRENT_FEATURE.md Updated: stamp freshness ──────────────────────────
{
  const updatedMatch = cf.match(/^Updated:\s*(\d{4}-\d{2}-\d{2})\s*$/m);
  if (!updatedMatch) {
    errors.push(
      'D6 internaldocs/workflow/CURRENT_FEATURE.md: missing "Updated: YYYY-MM-DD" stamp.\n' +
        '   Fix: add an Updated: line in the Active section and bump it whenever the file changes.'
    );
  } else {
    const age = daysSince(updatedMatch[1]);
    if (age > 30) {
      errors.push(
        `D6 internaldocs/workflow/CURRENT_FEATURE.md: Updated: ${updatedMatch[1]} is ${age} days old (limit 30).\n` +
          '   Fix: re-verify the Active section against reality (plans/, COMPLETED.md, git log), then bump the date.'
      );
    } else if (age > 14) {
      warnings.push(
        `D6 internaldocs/workflow/CURRENT_FEATURE.md: Updated: ${updatedMatch[1]} is ${age} days old — re-verify and bump soon.`
      );
    }
  }
}

// ── D7: Approvals-ledger pending questions must be dated ─────────────────────
{
  const todo = read('internaldocs/workflow/TODO.md');
  const pendingSection = todo.split(/^### Pending questions.*$/m)[1]?.split(/^### /m)[0] ?? '';
  const bullets = pendingSection.split(/\n(?=- \[ \])/).filter((b) => b.trimStart().startsWith('- [ ]'));
  for (const bullet of bullets) {
    const oneLine = bullet.replace(/\s+/g, ' ').trim();
    const added = oneLine.match(/\(added (\d{4}-\d{2}-\d{2})\)/);
    if (!added) {
      errors.push(
        `D7 internaldocs/workflow/TODO.md: pending question lacks an "(added YYYY-MM-DD)" stamp:\n` +
          `   "${oneLine.slice(0, 90)}..."\n` +
          '   Fix: append (added YYYY-MM-DD) so gate age is trackable.'
      );
    } else if (daysSince(added[1]) > 28) {
      warnings.push(
        `D7 internaldocs/workflow/TODO.md: pending question from ${added[1]} is over 28 days old — batch it for the owner or move it to Denials/ON HOLD: "${oneLine.slice(0, 70)}..."`
      );
    }
  }
}

// ── D8: new COMPLETED.md entries must cite a commit hash ─────────────────────
{
  const completed = read('internaldocs/workflow/COMPLETED.md');
  const entryRe = /^- \*\*(\d{4}-\d{2}-\d{2})\*\*(.*)$/gm;
  let m;
  while ((m = entryRe.exec(completed)) !== null) {
    if (m[1] >= '2026-07-21' && !/`[0-9a-f]{7,40}`/.test(m[2])) {
      errors.push(
        `D8 internaldocs/workflow/COMPLETED.md: entry dated ${m[1]} has no backticked commit hash.\n` +
          '   Fix: cite at least one checkpoint commit (e.g. `97f03387`) so future agents can verify evidence cheaply.'
      );
    }
  }
}

// ── D5: orphaned internaldocs files (unreachable from any other doc) ─────────
for (const rel of listMd('internaldocs')) {
  const norm = rel.split(path.sep).join('/');
  if (norm === 'internaldocs/README.md') continue; // the router itself
  if (norm.startsWith('internaldocs/workflow/plans/done/')) continue; // archive
  if (!linkedTargets.has(rel)) {
    errors.push(
      `D5 ${norm}: orphaned doc — not linked from any other doc.\n` +
        '   Fix: add it to the internaldocs/README.md index (or the doc that owns its topic),\n' +
        '   or delete/merge it if it is obsolete.'
    );
  }
}

if (warnings.length > 0) {
  console.warn('\nDoc-freshness warnings (non-blocking):\n');
  for (const w of warnings) console.warn(`  - ${w}`);
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
