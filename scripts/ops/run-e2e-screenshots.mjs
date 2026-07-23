#!/usr/bin/env node
/**
 * Guard script for authenticated docs screenshot captures.
 * Skips before touching screenshot output when credentials are unavailable.
 */
import {spawnSync} from 'node:child_process';
import {existsSync, mkdirSync, readFileSync, rmSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {
  buildTargetGrep,
  knownTargetIds,
  resolveScreenshotTarget
} from '../../e2e/screenshots/target-selection.cjs';

const rootDir = fileURLToPath(new URL('../..', import.meta.url));
const outputDir = resolve(rootDir, 'src/assets/screenshots/major-area-screenshots');
const blockedDir = resolve(outputDir, '.blocked');
const screenshotSpec = 'e2e/screenshots/auth-major-area-screenshots.spec.ts';
const screenshotConfig = 'playwright.screenshots.config.ts';
const blockedForwardedOptions = new Set([
  '--project',
  '--project=',
  '--reporter',
  '--reporter='
]);
const forwardedOptionsWithValue = new Set([
  '--config',
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
  '--video',
  '--workers',
  '-c'
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
  let requestedTargetId;
  let hasConfigOverride = false;
  let hasWorkersOverride = false;

  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (arg === '--') {
      continue;
    }

    if (arg === '--file' || arg.startsWith('--file=')) {
      throw new Error('--file is not supported for docs screenshots. Use --target=<id>, for example --target=home.');
    }

    if (arg === '--target') {
      requestedTargetId = args[index + 1];
      if (!requestedTargetId || requestedTargetId.startsWith('-')) {
        throw new Error('--target requires a screenshot target id, for example --target=home.');
      }
      index++;
      continue;
    }

    if (arg.startsWith('--target=')) {
      requestedTargetId = arg.slice('--target='.length);
      continue;
    }

    const blocked = [...blockedForwardedOptions].some(option => arg === option || arg.startsWith(option));

    if (blocked) {
      if (!arg.includes('=') && args[index + 1] && !args[index + 1].startsWith('-')) {
        index++;
      }
      console.warn(`[e2e-screenshots] Ignoring ${ arg }; project and reporter are fixed by this runner.`);
      continue;
    }

    if (arg === '--config' || arg === '-c') {
      hasConfigOverride = true;
    }
    if (arg.startsWith('--config=')) {
      hasConfigOverride = true;
    }
    if (arg === '--workers') {
      hasWorkersOverride = true;
    }
    if (arg.startsWith('--workers=')) {
      hasWorkersOverride = true;
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

  const requestedTarget = requestedTargetId ? resolveScreenshotTarget(requestedTargetId) : undefined;

  if (requestedTargetId && !requestedTarget) {
    throw new Error(
      `Unknown screenshot target "${ requestedTargetId }". Known targets: ${ knownTargetIds().join(', ')}.`
    );
  }

  if (requestedTarget) {
    forwarded.push('--grep', buildTargetGrep(requestedTarget));
  }

  if (!hasConfigOverride) {
    forwarded.unshift('--config', screenshotConfig);
  }

  if (!hasWorkersOverride) {
    forwarded.unshift(`--workers=${ requestedTarget ? 1 : 8 }`);
  }

  return {
    forwarded,
    requestedTarget
  };
}

function runGenerateEnv() {
  const result = spawnSync(process.execPath, ['generate-env.js'], {stdio: 'inherit', cwd: rootDir});

  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function assertProductionScreenshotEnvironment() {
  const prodEnvPath = resolve(rootDir, 'src/environments/environment.prod.ts');
  const prodEnv = readFileSync(prodEnvPath, 'utf8');
  const requiredFragments = [
    'production: true',
    'collectionsEnabled: false',
    'coolReactionsEnabled: false',
    'marketplaceEnabled: false'
  ];
  const missing = requiredFragments.filter(fragment => !prodEnv.includes(fragment));

  if (missing.length) {
    throw new Error(
      `Generated production environment is not safe for docs screenshots; missing ${ missing.join(', ') } in src/environments/environment.prod.ts.`
    );
  }
}

const {
  forwarded,
  requestedTarget
} = normalizeForwardedArgs(process.argv.slice(2));

loadDotEnv();

if (!hasCredentials()) {
  console.warn('[e2e-screenshots] Skipping screenshot capture: E2E_TEST_EMAIL and E2E_TEST_PASSWORD are not set. Existing src/assets/screenshots/major-area-screenshots files were left untouched.');
  process.exit(0);
}

runGenerateEnv();
assertProductionScreenshotEnvironment();

if (requestedTarget) {
  rmSync(resolve(outputDir, requestedTarget.fileName), {force: true});
  rmSync(resolve(blockedDir, `${ requestedTarget.id }.txt`), {force: true});
} else {
  rmSync(outputDir, {recursive: true, force: true});
}
mkdirSync(outputDir, {recursive: true});

const args = [
  'exec',
  'playwright',
  'test',
  '--reporter=list',
  '--project=chromium-screenshots',
  screenshotSpec,
  ...forwarded
];
const result = spawnSync('pnpm', args, {stdio: 'inherit', cwd: rootDir});

if (result.error) {
  throw result.error;
}
process.exit(result.status ?? 1);
