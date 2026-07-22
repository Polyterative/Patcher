#!/usr/bin/env node
/**
 * Duplicate runtime-singleton dependency guard.
 *
 * Regression guard for the v6.5.0–v6.5.1 incident (fixed in v6.5.2 by
 * `pnpm dedupe`, commit a3f82fae): the pnpm 9→10 lockfile regeneration left
 * TWO peer-qualified snapshots of @angular/forms@22.0.5 in pnpm-lock.yaml.
 * The production bundle therefore shipped two copies of @angular/forms, i.e.
 * two distinct NG_VALUE_ACCESSOR InjectionToken objects. Angular Material's
 * ControlValueAccessors registered under one token while [formControl]
 * injected the other, so mat-select / mat-autocomplete selections silently
 * never reached the FormControl and forms could not be submitted.
 *
 * Two rules, both deterministic from the lockfile alone:
 *
 *   R1  Runtime-singleton packages must have exactly ONE snapshot in the
 *       `snapshots:` section (grouped by package NAME — two different
 *       versions are just as fatal as two peer-variants of one version).
 *
 *   R2  No legacy pnpm-9 peer-suffix hashes. pnpm 9 compressed long peer
 *       sets into 26-char base32 hashes, pnpm 10 uses 32-char hex. The
 *       v6.5.x bad lockfile carried stale base32 hashes for
 *       @angular/material / ssr / build under packageManager pnpm@10 —
 *       exactly the inconsistency that made pnpm lay out a second
 *       peer-resolved copy of @angular/forms. `pnpm dedupe` regenerates
 *       these keys.
 *
 * Run: node scripts/checks/check-dep-duplicates.cjs [--lockfile <path>]
 * Fix: pnpm dedupe
 */

const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..', '..');

// Packages that must exist exactly once in the runtime dependency graph.
// Duplicates split DI tokens (NG_VALUE_ACCESSOR, NG_VALIDATORS, ...) or
// class identity (rxjs Observable instanceof checks, zone patching).
const SINGLETONS = [
  '@angular/core',
  '@angular/common',
  '@angular/forms',
  '@angular/router',
  '@angular/platform-browser',
  '@angular/platform-browser-dynamic',
  '@angular/animations',
  '@angular/material',
  '@angular/cdk',
  'rxjs',
  'zone.js'
];

function parseArgs() {
  const args = process.argv.slice(2);
  const idx = args.indexOf('--lockfile');
  if (idx !== -1) {
    if (!args[idx + 1]) {
      console.error('check-dep-duplicates: --lockfile requires a path argument');
      process.exit(2);
    }
    return path.resolve(args[idx + 1]);
  }
  return path.join(repoRoot, 'pnpm-lock.yaml');
}

/**
 * Extracts snapshot keys (package instances) from the `snapshots:` section.
 * Keys are 2-space-indented, optionally single-quoted, and end with ':', e.g.
 *   '@angular/forms@22.0.5(@angular/common@...)(rxjs@7.8.2)':
 *   tslib@2.8.1:
 */
function collectSnapshotKeys(lockfileText) {
  const keys = [];
  let inSnapshots = false;
  for (const line of lockfileText.split('\n')) {
    if (/^snapshots:\s*$/.test(line)) {
      inSnapshots = true;
      continue;
    }
    if (inSnapshots && /^\S/.test(line)) break; // next top-level section
    if (!inSnapshots) continue;
    const match = line.match(/^  (?:'([^']+)'|([^\s'][^:]*)):/);
    if (match) keys.push(match[1] || match[2]);
  }
  return keys;
}

/** '@angular/forms@22.0.5(peerA)(peerB)' -> { name: '@angular/forms', bare: '@angular/forms@22.0.5' } */
function parseKey(key) {
  const bare = key.split('(')[0];
  const at = bare.lastIndexOf('@');
  if (at <= 0) return null; // no version separator (defensive)
  return { name: bare.slice(0, at), bare };
}

/**
 * R2: legacy pnpm-9 peer-suffix hash, e.g. '(6inihcidjymtcro427k7dvhw7m)'.
 * Opaque hash groups contain no '@'; pnpm 10 emits 32-char lowercase hex.
 * Anything opaque that is NOT 32-char hex is a stale pnpm-9 key.
 */
function findLegacyPeerHashes(key) {
  const legacy = [];
  for (const match of key.matchAll(/\(([a-z0-9]+)\)/g)) {
    // Groups of pure [a-z0-9] are opaque peer hashes (explicit peers always
    // contain '@' and '.'). Valid pnpm-10 hashes are 32-char lowercase hex.
    if (!/^[0-9a-f]{32}$/.test(match[1])) legacy.push(match[1]);
  }
  return legacy;
}

function main() {
  const lockfilePath = parseArgs();
  if (!fs.existsSync(lockfilePath)) {
    console.error(`check-dep-duplicates: lockfile not found: ${lockfilePath}`);
    process.exit(2);
  }

  const keys = collectSnapshotKeys(fs.readFileSync(lockfilePath, 'utf8'));
  if (keys.length === 0) {
    console.error('check-dep-duplicates: no snapshot keys found — lockfile format changed? Update this script.');
    process.exit(2);
  }

  const byName = new Map();
  const legacyHashKeys = [];
  for (const key of keys) {
    const parsed = parseKey(key);
    if (!parsed) continue;
    if (findLegacyPeerHashes(key).length > 0) legacyHashKeys.push(key);
    if (!SINGLETONS.includes(parsed.name)) continue;
    if (!byName.has(parsed.name)) byName.set(parsed.name, []);
    byName.get(parsed.name).push(key);
  }

  const duplicated = [...byName.entries()].filter(([, instances]) => instances.length > 1);

  if (duplicated.length === 0 && legacyHashKeys.length === 0) {
    console.log(`check-dep-duplicates: OK — ${byName.size} singleton packages, one instance each, no stale peer hashes (${path.basename(lockfilePath)})`);
    process.exit(0);
  }

  console.error('check-dep-duplicates: FAIL\n');
  for (const [name, instances] of duplicated) {
    console.error(`  [R1] ${name} has ${instances.length} snapshot instances:`);
    for (const instance of instances) {
      console.error(`    - ${instance.length > 120 ? instance.slice(0, 117) + '...' : instance}`);
    }
  }
  for (const key of legacyHashKeys) {
    console.error(`  [R2] legacy pnpm-9 peer-suffix hash in snapshot key: ${key.length > 120 ? key.slice(0, 117) + '...' : key}`);
  }
  console.error(
    '\nWhy this is fatal: either state can make the bundle ship a second copy'
    + '\nof a runtime-singleton package (this happened to @angular/forms in'
    + '\nv6.5.0–v6.5.1). Two copies mean two distinct DI InjectionToken objects'
    + '\n(e.g. NG_VALUE_ACCESSOR): Material form controls register on one token'
    + '\nwhile [formControl] injects the other, so selections silently never'
    + '\nreach the FormControl and forms cannot be submitted.'
    + '\n\nFix: run `pnpm dedupe` and commit the updated pnpm-lock.yaml.'
  );
  process.exit(1);
}

main();
