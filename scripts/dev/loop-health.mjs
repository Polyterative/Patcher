#!/usr/bin/env node
/**
 * loop-health — one-shot situational snapshot for coordinator loops.
 *
 * Prints, without failing the build:
 *   H1  Dirty working tree (files that must be reconciled before selecting work)
 *   H2  Stale in-progress markers: TODO lines marked [~] (should be active or demoted to [!])
 *   H3  Approvals-ledger pending questions count (owner attention needed)
 *   H4  Layering-baseline size (fallback-queue burn-down target)
 *   H5  Docs check status (orphans / broken links via check-docs.cjs)
 *   H6  E2E credentials presence in root .env (existence only, never values)
 *
 * Run: pnpm loop:health
 * Exit code is always 0 — this is a report, not a gate.
 */

import { execSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

function sh(cmd) {
  try {
    return execSync(cmd, { cwd: repoRoot, encoding: 'utf8' }).trim();
  } catch (e) {
    return e.stdout ? String(e.stdout).trim() : '';
  }
}

function section(title) {
  console.log(`\n── ${title} ${'─'.repeat(Math.max(2, 60 - title.length))}`);
}

console.log('Patcher loop health snapshot');

// H1: dirty tree
section('H1 Working tree');
const status = sh('git status --short');
if (status) {
  console.log(status);
  console.log('→ Reconcile before selecting work (commit finished chunk / continue in-flight / ask user).');
} else {
  console.log('clean');
}

// H2 + H3: TODO markers and approvals ledger
const todoPath = path.join(repoRoot, 'internaldocs/workflow/TODO.md');
const todo = readFileSync(todoPath, 'utf8');

section('H2 In-progress / blocked markers');
const inProgress = todo.split('\n').filter((l) => l.trimStart().startsWith('- [~]'));
const blocked = todo.split('\n').filter((l) => l.trimStart().startsWith('- [!]'));
console.log(`[~] in progress: ${inProgress.length}`);
inProgress.forEach((l) => console.log(`  ${l.trim().slice(0, 100)}`));
console.log(`[!] blocked: ${blocked.length}`);
if (inProgress.length > 1) {
  console.log('→ More than one [~]: verify each is genuinely active; demote waiting tasks to [!].');
}

section('H3 Approvals ledger');
const pendingSection = todo.split(/^### Pending questions.*$/m)[1]?.split(/^### /m)[0] ?? '';
const pending = pendingSection.split('\n').filter((l) => l.trimStart().startsWith('- [ ]'));
console.log(`pending owner questions: ${pending.length}`);
pending.forEach((l) => console.log(`  ${l.trim().slice(0, 100)}`));
if (pending.length > 0) {
  console.log('→ Batch these for the product owner; do not re-ask answered ones.');
}

// H4: layering baseline
section('H4 Layering baseline (fallback burn-down)');
const baselinePath = path.join(repoRoot, 'scripts/checks/.layering-baseline.json');
if (existsSync(baselinePath)) {
  const baseline = JSON.parse(readFileSync(baselinePath, 'utf8'));
  const count = Array.isArray(baseline)
    ? baseline.length
    : Object.values(baseline).reduce((n, v) => n + (Array.isArray(v) ? v.length : 0), 0);
  console.log(`grandfathered entries: ${count}`);
  if (count > 0) console.log('→ Fallback queue item: refactor one entry out per idle cycle.');
} else {
  console.log('no baseline file');
}

// H5: docs check
section('H5 Docs check');
const docsOut = sh('node scripts/checks/check-docs.cjs 2>&1');
console.log(docsOut || 'pass');

// H6: E2E credentials in root .env (existence only — never print values)
section('H6 E2E credentials (.env)');
const envPath = path.join(repoRoot, '.env');
if (existsSync(envPath)) {
  const envKeys = readFileSync(envPath, 'utf8')
    .split('\n')
    .map((l) => l.split('=')[0].trim())
    .filter(Boolean);
  for (const key of ['E2E_TEST_EMAIL', 'E2E_TEST_PASSWORD']) {
    console.log(`${key}: ${envKeys.includes(key) ? 'present' : 'MISSING'}`);
  }
  if (!envKeys.includes('E2E_TEST_EMAIL') || !envKeys.includes('E2E_TEST_PASSWORD')) {
    console.log('→ Ask the user once, then write values into the gitignored root .env (see e2e/README.md).');
  }
} else {
  console.log('.env missing — run node generate-env.js, then add E2E credentials (see e2e/README.md).');
}

console.log('');
