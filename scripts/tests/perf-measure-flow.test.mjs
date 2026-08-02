import assert from 'node:assert/strict';
import test from 'node:test';

import {
  calculateDurationMetrics,
  parseArguments,
  summarizeRuns,
} from '../perf/measure-flow.mjs';

test('parses a valid flow measurement request', () => {
  assert.deepEqual(
    parseArguments([
      '--flow', 'home',
      '--url', 'http://127.0.0.1:5557/',
      '--runs', '5',
      '--settle-ms', '1000',
    ]),
    {
      flow: 'home',
      url: 'http://127.0.0.1:5557/',
      runs: 5,
      settleMs: 1000,
    }
  );
});

test('accepts pnpm argument forwarding', () => {
  assert.equal(
    parseArguments(['--', '--flow', 'home', '--url', 'http://127.0.0.1:5557/']).flow,
    'home'
  );
});

test('rejects invalid measurement inputs', () => {
  assert.throws(
    () => parseArguments(['--flow', '../home', '--url', 'http://127.0.0.1:5557/']),
    /flow/
  );
  assert.throws(
    () => parseArguments(['--flow', 'home', '--url', 'not-a-url']),
    /URL/
  );
  assert.throws(
    () => parseArguments(['--flow', 'home', '--url', 'http://127.0.0.1:5557/', '--runs', '0']),
    /runs/
  );
});

test('summarizes cold and warm measurements using medians', () => {
  const summary = summarizeRuns([
    {
      cacheState: 'cold',
      totalTransferBytes: 900,
      requestCount: 9,
      lcpMs: 300,
    },
    {
      cacheState: 'cold',
      totalTransferBytes: 1_100,
      requestCount: 11,
      lcpMs: 500,
    },
    {
      cacheState: 'cold',
      totalTransferBytes: 1_000,
      requestCount: 10,
      lcpMs: 400,
    },
    {
      cacheState: 'warm',
      totalTransferBytes: 110,
      requestCount: 2,
      lcpMs: 80,
    },
    {
      cacheState: 'warm',
      totalTransferBytes: 90,
      requestCount: 4,
      lcpMs: 60,
    },
    {
      cacheState: 'warm',
      totalTransferBytes: 100,
      requestCount: 3,
      lcpMs: 70,
    },
  ]);

  assert.deepEqual(summary.cold, {
    totalTransferBytes: 1_000,
    requestCount: 10,
    lcpMs: 400,
  });
  assert.deepEqual(summary.warm, {
    totalTransferBytes: 100,
    requestCount: 3,
    lcpMs: 70,
  });
});

test('calculates navigation durations from cumulative CDP counters', () => {
  assert.deepEqual(
    calculateDurationMetrics(
      {
        LayoutDuration: 1,
        RecalcStyleDuration: 0.2,
        ScriptDuration: 2,
        TaskDuration: 4,
      },
      {
        LayoutDuration: 1.05,
        RecalcStyleDuration: 0.25,
        ScriptDuration: 2.4,
        TaskDuration: 4.9,
      }
    ),
    {
      taskDurationMs: 900,
      scriptDurationMs: 400,
      layoutDurationMs: 100,
    }
  );
});
