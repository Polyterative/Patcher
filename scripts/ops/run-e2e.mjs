#!/usr/bin/env node
/**
 * Thin wrapper around `playwright test` that adds a hard wall-clock timeout
 * (see scripts/ops/lib/hard-timeout-runner.mjs) so `pnpm test:e2e` /
 * `pnpm test:e2e:ci` can never hang a shell forever, even if Playwright's
 * own webServer teardown gets stuck on a lingering Angular CLI dev-server
 * child process.
 *
 * All CLI args are forwarded verbatim to `playwright test`.
 */
import {fileURLToPath} from 'node:url';
import {runWithHardTimeout} from './lib/hard-timeout-runner.mjs';

const rootDir = fileURLToPath(new URL('../..', import.meta.url));
const args = ['test', ...process.argv.slice(2)];

const exitCode = await runWithHardTimeout('playwright', args, {
  cwd: rootDir,
  label: 'playwright test'
});

process.exit(exitCode);
