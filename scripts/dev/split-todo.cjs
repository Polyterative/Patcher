#!/usr/bin/env node
/**
 * One-shot transform: split internaldocs/workflow/TODO.md into per-task plan
 * files under internaldocs/workflow/plans/, replacing TODO.md with a thin
 * index. Idempotent — re-running re-splits from the current TODO.md.
 *
 * Rationale (see internaldocs/workflow/plans/README.md): a 1500+ line TODO.md
 * is the "monolithic instruction file" anti-pattern. Per-task plan files keep
 * each unit small enough that an agent can fully load it without crowding out
 * the actual task context.
 *
 * Usage: node scripts/dev/split-todo.cjs
 *        node scripts/dev/split-todo.cjs --dry-run
 */

const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..', '..');
const todoPath = path.join(repoRoot, 'internaldocs/workflow/TODO.md');
const plansDir = path.join(repoRoot, 'internaldocs/workflow/plans');
const dryRun = process.argv.includes('--dry-run');

function slugify(s) {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

const raw = fs.readFileSync(todoPath, 'utf8');
const lines = raw.split('\n');

// Find the "## Active" section bounds and the start of the first "####".
let firstTaskLine = lines.findIndex((l) => /^####\s/.test(l));
if (firstTaskLine === -1) {
  console.error('No "#### " task headings found in TODO.md — already split?');
  process.exit(1);
}

const header = lines.slice(0, firstTaskLine).join('\n').trimEnd();

// Split tasks: each starts at "#### " and runs until the next "#### " or the
// next "### " (section heading) or "## " (top-level), whichever comes first.
// Track current section starting from line 0 so the first "### " before the
// first "#### " is captured. We just skip emitting tasks until firstTaskLine.
const tasks = [];
let currentSection = '';
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];

  if (/^###\s/.test(line) && !/^####\s/.test(line)) {
    currentSection = line.replace(/^###\s+/, '').trim();
    continue;
  }

  if (i < firstTaskLine) continue;

  if (/^####\s/.test(line)) {
    // Find end of this task block
    let end = lines.length;
    for (let j = i + 1; j < lines.length; j++) {
      if (/^####\s/.test(lines[j]) || /^###\s/.test(lines[j]) || /^##\s/.test(lines[j])) {
        end = j;
        break;
      }
    }
    const block = lines.slice(i, end).join('\n').trimEnd();
    const titleLine = line.replace(/^####\s+/, '').trim();
    tasks.push({ title: titleLine, section: currentSection, body: block });
    i = end - 1;
  }
}

// Build per-task plan files
const indexEntries = [];
const taskFiles = [];
const usedSlugs = new Set();

for (const t of tasks) {
  let slug = slugify(t.title.replace(/[A-Z]+:\s*/, ''));
  let unique = slug;
  let n = 1;
  while (usedSlugs.has(unique)) {
    unique = `${slug}-${++n}`;
  }
  usedSlugs.add(unique);
  const filename = `${unique}.md`;
  const fileBody = [
    `<!-- Auto-split from TODO.md by scripts/dev/split-todo.cjs. -->`,
    `<!-- Section: ${t.section || '(none)'} -->`,
    '',
    t.body,
    '',
    '## Decision log',
    '',
    '<!-- Append timestamped one-liners as the plan progresses. -->',
    '',
    ''
  ].join('\n');
  taskFiles.push({ filename, body: fileBody });

  // Index entry: status + section + link
  const status = /\[~\]/.test(t.body)
    ? 'IN PROGRESS'
    : /\[\s\]/.test(t.body)
    ? 'OPEN'
    : 'DONE';
  indexEntries.push({
    section: t.section || '(unsorted)',
    title: t.title,
    file: filename,
    status
  });
}

// Build new TODO.md
function buildIndex() {
  const grouped = new Map();
  for (const e of indexEntries) {
    if (!grouped.has(e.section)) grouped.set(e.section, []);
    grouped.get(e.section).push(e);
  }

  const out = [];
  out.push('# TODO');
  out.push('');
  out.push('> **Index of active and backlog tasks. Per-task detail lives in [plans/](./plans/).**');
  out.push('>');
  out.push('> **Rules for AI agents using this file:**');
  out.push('> 1. **Pick one task** by reading its plan file under `plans/`. Open the plan and update the');
  out.push('>    `## Decision log` section as you make non-obvious choices.');
  out.push('> 2. **Keep this index thin.** A task gets at most one line: status + title + link.');
  out.push('>    Backlog detail, layers, and acceptance criteria live in the plan file, not here.');
  out.push('> 3. **On completion**, move the one-line entry into [COMPLETED.md](./COMPLETED.md) with a date,');
  out.push('>    archive the plan file under `plans/done/`, and reset `CURRENT_FEATURE.md`.');
  out.push('> 4. **Do not duplicate strategy** already in `../product/PRINCIPLES.md` or `../product/ROADMAP.md`.');
  out.push('');
  out.push('## Legend');
  out.push('');
  out.push('- `[ ]` OPEN — `[~]` IN PROGRESS — `[x]` DONE');
  out.push('');
  out.push('---');
  out.push('');

  for (const [section, entries] of grouped) {
    out.push(`### ${section}`);
    out.push('');
    for (const e of entries) {
      const box = e.status === 'IN PROGRESS' ? '[~]' : e.status === 'DONE' ? '[x]' : '[ ]';
      out.push(`- ${box} **${e.title}** → [\`plans/${e.file}\`](./plans/${e.file})`);
    }
    out.push('');
  }

  return out.join('\n');
}

const newTodo = buildIndex();

if (dryRun) {
  console.log(`Would write ${taskFiles.length} plan files to ${plansDir}`);
  console.log(`Would replace ${todoPath} (${lines.length} lines → ${newTodo.split('\n').length} lines)`);
  for (const f of taskFiles.slice(0, 3)) {
    console.log(`  sample: plans/${f.filename}`);
  }
  process.exit(0);
}

if (!fs.existsSync(plansDir)) fs.mkdirSync(plansDir, { recursive: true });

for (const f of taskFiles) {
  fs.writeFileSync(path.join(plansDir, f.filename), f.body);
}

fs.writeFileSync(todoPath, newTodo);

console.log(`Wrote ${taskFiles.length} plan files to ${plansDir}`);
console.log(`Replaced ${todoPath} (${lines.length} → ${newTodo.split('\n').length} lines)`);
