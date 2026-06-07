#!/usr/bin/env node
/**
 * Layering & file-size guard.
 *
 * Enforces architectural rules from internaldocs/ARCHITECTURE.md so that
 * agent-generated code stays inside the documented Component → Data Service
 * → API Service → Supabase pipeline. Existing violations are recorded in
 * scripts/.layering-baseline.json so the build does not break, but no NEW
 * violations are allowed.
 *
 * Run: node scripts/check-layering.cjs
 * Update baseline: node scripts/check-layering.cjs --update-baseline
 *
 * Rules:
 *   R1  Non-data-service component files must not import SupabaseService
 *       directly. Use a co-located <feature>-data.service.ts.
 *   R2  Files outside src/app/features/backend/ must not import
 *       DatabaseStrings. Expose query data via SupabaseService methods.
 *   R3  Files in src/app/features/backend/ must not import a *-data.service.
 *       API services must not depend on component-scoped data services.
 *   R4  *.ts files > 500 lines (excluding *.spec.ts, database.types.ts,
 *       supabase-queries.ts) get a size warning so agents split them.
 */

const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');

const repoRoot = path.resolve(__dirname, '..');
const baselinePath = path.join(__dirname, '.layering-baseline.json');
const updateBaseline = process.argv.includes('--update-baseline');

const DOC_ARCH = 'internaldocs/ARCHITECTURE.md';
const DOC_BACKEND = 'internaldocs/patterns/BACKEND_METHODS.md';
const DOC_REACTIVE = 'internaldocs/patterns/REACTIVE_SERVICES.md';

const SIZE_LIMIT = 500;
const SIZE_HARD_LIMIT = 1000;

function listTsFiles() {
  return childProcess
    .execFileSync(
      'find',
      ['src/app', '-type', 'f', '-name', '*.ts', '-not', '-name', '*.spec.ts'],
      { cwd: repoRoot, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 }
    )
    .trim()
    .split('\n')
    .filter(Boolean);
}

function read(rel) {
  return fs.readFileSync(path.join(repoRoot, rel), 'utf8');
}

function isComponent(rel) {
  return (
    rel.startsWith('src/app/components/') &&
    !rel.endsWith('-data.service.ts') &&
    !rel.endsWith('.types.ts') &&
    !rel.endsWith('.constants.ts')
  );
}

function isInBackend(rel) {
  return rel.startsWith('src/app/features/backend/');
}

// True API-service files live directly in features/backend/ (supabase*.ts,
// DatabaseStrings.ts, etc.). Subfolders like admin-panel-root/ contain
// admin-only feature UI and are exempt from R3.
function isApiServiceFile(rel) {
  if (!isInBackend(rel)) return false;
  const tail = rel.slice('src/app/features/backend/'.length);
  if (tail.includes('/')) return false;
  if (tail.endsWith('.component.ts')) return false;
  return true;
}

function importsSupabaseService(src) {
  return /from\s+['"][^'"]*backend\/supabase\.service['"]/m.test(src);
}

function importsDatabaseStrings(src) {
  return /from\s+['"][^'"]*DatabaseStrings['"]/m.test(src);
}

function importsDataService(src) {
  return /from\s+['"][^'"]*-data\.service['"]/m.test(src);
}

const files = listTsFiles();
const violations = { R1: [], R2: [], R3: [], R4: [], R4_HARD: [] };

for (const rel of files) {
  const src = read(rel);

  if (isComponent(rel) && importsSupabaseService(src)) {
    violations.R1.push(rel);
  }

  if (
    !isInBackend(rel) &&
    rel !== 'src/app/features/backend/DatabaseStrings.ts' &&
    importsDatabaseStrings(src)
  ) {
    violations.R2.push(rel);
  }

  if (isApiServiceFile(rel) && importsDataService(src)) {
    violations.R3.push(rel);
  }

  if (
    !rel.endsWith('database.types.ts') &&
    !rel.endsWith('supabase-queries.ts')
  ) {
    const lines = src.split('\n').length;
    if (lines > SIZE_HARD_LIMIT) {
      violations.R4_HARD.push({ file: rel, lines });
    } else if (lines > SIZE_LIMIT) {
      violations.R4.push({ file: rel, lines });
    }
  }
}

// ── Baseline handling ────────────────────────────────────────────────────────
function ruleListToSet(list) {
  return new Set(list.map((v) => (typeof v === 'string' ? v : v.file)));
}

let baseline = { R1: [], R2: [], R3: [], R4: [] };
if (fs.existsSync(baselinePath)) {
  baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
}

if (updateBaseline) {
  const allR4 = new Set([
    ...ruleListToSet(violations.R4),
    ...ruleListToSet(violations.R4_HARD)
  ]);
  const next = {
    _comment:
      'Grandfathered layering violations. Do not add by hand — run `node scripts/check-layering.cjs --update-baseline`. New violations should NOT be added; refactor instead.',
    R1: [...ruleListToSet(violations.R1)].sort(),
    R2: [...ruleListToSet(violations.R2)].sort(),
    R3: [...ruleListToSet(violations.R3)].sort(),
    R4: [...allR4].sort()
  };
  fs.writeFileSync(baselinePath, JSON.stringify(next, null, 2) + '\n');
  console.log(`Baseline updated: ${baselinePath}`);
  process.exit(0);
}

const baselineSets = {
  R1: new Set(baseline.R1 || []),
  R2: new Set(baseline.R2 || []),
  R3: new Set(baseline.R3 || []),
  R4: new Set(baseline.R4 || [])
};

const newViolations = {
  R1: violations.R1.filter((f) => !baselineSets.R1.has(f)),
  R2: violations.R2.filter((f) => !baselineSets.R2.has(f)),
  R3: violations.R3.filter((f) => !baselineSets.R3.has(f)),
  R4: violations.R4.filter((v) => !baselineSets.R4.has(v.file)),
  R4_HARD: violations.R4_HARD.filter((v) => !baselineSets.R4.has(v.file))
};

const totalNew =
  newViolations.R1.length +
  newViolations.R2.length +
  newViolations.R3.length +
  newViolations.R4_HARD.length;

if (totalNew === 0 && newViolations.R4.length === 0) {
  process.exit(0);
}

if (newViolations.R1.length) {
  console.error(
    `\nR1 — Component imports SupabaseService directly (${newViolations.R1.length} new):`
  );
  for (const f of newViolations.R1) console.error(`  - ${f}`);
  console.error(
    `Fix: introduce a co-located <feature>-data.service.ts (component-provided @Injectable()),\n     move the SupabaseService call there, inject the data service into the component.\n     See ${DOC_ARCH} §Service Layers and ${DOC_REACTIVE}.`
  );
}

if (newViolations.R2.length) {
  console.error(
    `\nR2 — File outside features/backend/ imports DatabaseStrings (${newViolations.R2.length} new):`
  );
  for (const f of newViolations.R2) console.error(`  - ${f}`);
  console.error(
    `Fix: DatabaseStrings is a backend-internal registry. Expose what you need through a\n     SupabaseService method instead of importing the registry from a feature/component.\n     See ${DOC_BACKEND}.`
  );
}

if (newViolations.R3.length) {
  console.error(
    `\nR3 — API service imports a component-scoped *-data.service (${newViolations.R3.length} new):`
  );
  for (const f of newViolations.R3) console.error(`  - ${f}`);
  console.error(
    `Fix: invert the dependency. API services must not depend on component-scoped state.\n     Move shared logic into the API service or a root service. See ${DOC_ARCH}.`
  );
}

if (newViolations.R4_HARD.length) {
  console.error(
    `\nR4 — File exceeds ${SIZE_HARD_LIMIT}-line hard limit (${newViolations.R4_HARD.length} new):`
  );
  for (const v of newViolations.R4_HARD)
    console.error(`  - ${v.file} (${v.lines} lines)`);
  console.error(
    `Fix: split into smaller cohesive units. Large files are illegible to agents and humans alike.`
  );
}

if (newViolations.R4.length) {
  console.warn(
    `\nR4 (warn) — File exceeds ${SIZE_LIMIT}-line soft limit (${newViolations.R4.length} new):`
  );
  for (const v of newViolations.R4)
    console.warn(`  - ${v.file} (${v.lines} lines)`);
  console.warn(
    `Consider splitting before this becomes a hard violation at ${SIZE_HARD_LIMIT} lines.`
  );
}

console.error(
  '\nIf the violation is intentional and the rule is wrong here, update\nscripts/.layering-baseline.json via `node scripts/check-layering.cjs --update-baseline`\nand justify in the commit message.'
);

process.exit(totalNew > 0 ? 1 : 0);
