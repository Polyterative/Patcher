import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  DEFAULT_HARD_TIMEOUT_MS,
  runWithHardTimeout
} from '../ops/lib/hard-timeout-runner.mjs';

test('runWithHardTimeout: resolves with the child exit code on a fast, well-behaved command', async () => {
  const exitCode = await runWithHardTimeout('node', ['-e', 'process.exit(0)']);
  assert.equal(exitCode, 0);
});

test('runWithHardTimeout: propagates a non-zero exit code', async () => {
  const exitCode = await runWithHardTimeout('node', ['-e', 'process.exit(7)']);
  assert.equal(exitCode, 7);
});

test('runWithHardTimeout: resolves with 1 (not a rejection) for a nonexistent command', async () => {
  const exitCode = await runWithHardTimeout('definitely-not-a-real-binary-xyz', []);
  assert.equal(exitCode, 1);
});

test('runWithHardTimeout: force-kills a hanging process once the timeout elapses', async () => {
  // A process that ignores SIGTERM (Node's default handling for SIGTERM does
  // terminate it, so simulate an unkillable-by-signal hang using an infinite
  // loop that never checks for signals) and never exits on its own.
  const script = 'setInterval(() => {}, 1000);';
  const exitCode = await runWithHardTimeout('node', ['-e', script], { timeoutMs: 200 });
  assert.equal(exitCode, 124);
});

test('DEFAULT_HARD_TIMEOUT_MS: is a generous, positive ceiling (15 minutes)', () => {
  assert.equal(DEFAULT_HARD_TIMEOUT_MS, 15 * 60 * 1000);
});
