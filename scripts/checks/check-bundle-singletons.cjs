#!/usr/bin/env node
/**
 * Bundle runtime-singleton guard.
 *
 * Regression guard for the v6.5.0–v6.5.1 incident (fixed in v6.5.2 by
 * `pnpm dedupe`, commit a3f82fae): a lockfile inconsistency made the
 * production bundle ship TWO copies of @angular/forms. Two copies mean two
 * distinct NG_VALUE_ACCESSOR InjectionToken objects, so Material form
 * controls silently disconnected from [formControl] and forms could not be
 * submitted. The lockfile-level guard is check-dep-duplicates.cjs; this
 * script is the last line of defense on the EMITTED chunks themselves.
 *
 * For each singleton library we grep every dist .js chunk for behavioral
 * markers — class member names that survive esbuild minification (esbuild
 * does not mangle property names by default). A library counts as present
 * in a chunk only if ALL of its markers appear (corroboration avoids false
 * positives from unrelated code). The check FAILS if a library's markers
 * appear in more than one chunk, i.e. the runtime was duplicated.
 *
 * Run: node scripts/checks/check-bundle-singletons.cjs [distDir]
 *      (default distDir: dist/Patcher/browser — run `pnpm build` first)
 * Fix: pnpm dedupe, rebuild, and verify with this script.
 */

const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..', '..');
const distDir = path.resolve(repoRoot, process.argv[2] || 'dist/Patcher/browser');

// Each entry: a runtime-singleton library and markers that identify its core.
// Add more libraries here as needed (e.g. rxjs, @angular/core) — keep the
// markers to internal member names unlikely to appear in app code.
const SINGLETON_MARKERS = [
  {
    name: '@angular/forms',
    markers: ['_anyControlsTouched', '_forEachChild']
  }
];

function listChunks(dir) {
  return fs
    .readdirSync(dir)
    .filter(file => file.endsWith('.js'))
    .map(file => path.join(dir, file));
}

function main() {
  if (!fs.existsSync(distDir)) {
    console.error(`check-bundle-singletons: dist dir not found: ${distDir}`);
    console.error('Run `pnpm build` first, or pass the output dir as the first argument.');
    process.exit(2);
  }

  const chunks = listChunks(distDir);
  if (chunks.length === 0) {
    console.error(`check-bundle-singletons: no .js chunks in ${distDir} — wrong directory?`);
    process.exit(2);
  }

  let failed = false;

  for (const {name, markers} of SINGLETON_MARKERS) {
    const containing = [];
    for (const chunk of chunks) {
      const source = fs.readFileSync(chunk, 'utf8');
      if (markers.every(marker => source.includes(marker))) {
        containing.push(path.basename(chunk));
      }
    }

    if (containing.length === 1) {
      console.log(`check-bundle-singletons: OK — ${name} core in exactly one chunk (${containing[0]})`);
    } else if (containing.length === 0) {
      failed = true;
      console.error(
        `check-bundle-singletons: FAIL — ${name} markers (${markers.join(', ')}) found in NO chunk.`
        + '\nEither the build output moved or the markers no longer survive'
        + '\nminification — update SINGLETON_MARKERS in this script.'
      );
    } else {
      failed = true;
      console.error(
        `check-bundle-singletons: FAIL — ${name} core found in ${containing.length} chunks:`
        + `\n  ${containing.join('\n  ')}`
        + '\n\nThe bundle contains duplicate copies of a runtime-singleton library.'
        + '\nDuplicate copies split DI tokens (e.g. NG_VALUE_ACCESSOR): Material'
        + '\nform controls register on one token while [formControl] injects the'
        + '\nother, so UI selections silently never reach the FormControl (this'
        + '\nshipped as the v6.5.0–v6.5.1 broken module-add form).'
        + '\n\nFix: run `pnpm dedupe`, commit pnpm-lock.yaml, rebuild, re-check.'
      );
    }
  }

  process.exit(failed ? 1 : 0);
}

main();
