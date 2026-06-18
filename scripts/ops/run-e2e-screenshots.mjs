#!/usr/bin/env node
/**
 * Guard script for authenticated docs screenshot captures.
 * Skips before touching screenshot output when credentials are unavailable.
 */
import {spawnSync} from 'node:child_process';
import {existsSync, mkdirSync, readFileSync, rmSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const rootDir = fileURLToPath(new URL('../..', import.meta.url));
const outputDir = resolve(rootDir, 'src/assets/screenshots/major-area-screenshots');
const screenshotSpec = 'e2e/screenshots/auth-major-area-screenshots.spec.ts';
const blockedForwardedOptions = new Set([
  '--project',
  '--project=',
  '--reporter',
  '--reporter=',
  '--workers',
  '--workers=',
  '--config',
  '--config=',
  '-c'
]);
const forwardedOptionsWithValue = new Set([
  '--grep',
  '--grep-invert',
  '--timeout',
  '--global-timeout',
  '--max-failures',
  '--retries',
  '--repeat-each',
  '--shard',
  '--trace',
  '--screenshot',
  '--video'
]);

function loadDotEnv() {
  const envPath = resolve(rootDir, '.env');
  if (!existsSync(envPath)) {
    return;
  }

  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([\w]+)\s*=\s*(.*)$/);
    if (!match) {
      continue;
    }

    const value = match[2].replace(/^[\'"]|[\'"]$/g, '').trim();
    if (value) {
      process.env[match[1]] ??= value;
    }
  }
}

function hasCredentials() {
  return Boolean(process.env['E2E_TEST_EMAIL']?.trim()) && Boolean(process.env['E2E_TEST_PASSWORD']?.trim());
}

function normalizeForwardedArgs(args) {
  const forwarded = [];

  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (arg === '--') {
      continue;
    }

    const blocked = [...blockedForwardedOptions].some(option => arg === option || arg.startsWith(option));

    if (blocked) {
      if (!arg.includes('=') && args[index + 1] && !args[index + 1].startsWith('-')) {
        index++;
      }
      console.warn(`[e2e-screenshots] Ignoring ${ arg }; project, reporter, workers, and config are fixed by this runner.`);
      continue;
    }

    if (arg === '--include') {
      if (args[index + 1]) {
        forwarded.push(args[index + 1].replace(/^\*\*\//, ''));
        index++;
      }
      continue;
    }

    if (arg.startsWith('--include=')) {
      forwarded.push(arg.slice('--include='.length).replace(/^\*\*\//, ''));
      continue;
    }

    if (!arg.startsWith('-')) {
      console.warn(`[e2e-screenshots] Ignoring positional argument ${ arg }; this runner always targets ${ screenshotSpec }.`);
      continue;
    }

    forwarded.push(arg);
    if (forwardedOptionsWithValue.has(arg) && args[index + 1] && !args[index + 1].startsWith('-')) {
      forwarded.push(args[index + 1]);
      index++;
    }
  }

  return forwarded;
}

loadDotEnv();

if (!hasCredentials()) {
  console.warn('[e2e-screenshots] Skipping screenshot capture: E2E_TEST_EMAIL and E2E_TEST_PASSWORD are not set. Existing src/assets/screenshots/major-area-screenshots files were left untouched.');
  process.exit(0);
}

rmSync(outputDir, {recursive: true, force: true});
mkdirSync(outputDir, {recursive: true});

const args = [
  'exec',
  'playwright',
  'test',
  '--reporter=list',
  '--workers=8',
  '--project=chromium-screenshots',
  screenshotSpec,
  ...normalizeForwardedArgs(process.argv.slice(2))
];
const result = spawnSync('pnpm', args, {stdio: 'inherit', cwd: rootDir});

if (result.error) {
  throw result.error;
}
process.exit(result.status ?? 1);
