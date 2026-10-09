import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildRunReport, formatFinal, formatProgress, planCheckpoint, readScheduledSettings, withTimeout } from '../price-hub/scheduled-refresh.ts';

const HOUR = 3_600_000;

function summary(storeSlug, status, importedSnapshots = 0) {
  return { storeSlug, status, products: 10, matchCandidates: 5, importRows: 5, importedSnapshots, upsertedListings: importedSnapshots, deactivatedListings: 0, warnings: [] };
}

test('resumes a young unfinished checkpoint of the same kind', () => {
  const existing = { runId: 'r1', startedAt: '2026-10-09T03:00:00.000Z', dryRun: false, storeSet: 'all', done: { a: summary('a', 'imported') } };
  const { checkpoint, resumed } = planCheckpoint(existing, new Date('2026-10-09T05:00:00.000Z'), false, 'all', 24 * HOUR);
  assert.equal(resumed, true);
  assert.equal(checkpoint, existing);
});

test('starts fresh when the checkpoint is stale, a different mode, or a different store set', () => {
  const existing = { runId: 'r1', startedAt: '2026-10-09T03:00:00.000Z', dryRun: false, storeSet: 'all', done: { a: summary('a', 'imported') } };
  const now = new Date('2026-10-10T04:00:00.000Z');
  assert.equal(planCheckpoint(existing, now, false, 'all', 24 * HOUR).resumed, false);
  assert.equal(planCheckpoint(existing, new Date('2026-10-09T04:00:00.000Z'), true, 'all', 24 * HOUR).resumed, false);
  assert.equal(planCheckpoint(existing, new Date('2026-10-09T04:00:00.000Z'), false, 'a', 24 * HOUR).resumed, false);
  const fresh = planCheckpoint(null, now, false, 'all', 24 * HOUR).checkpoint;
  assert.deepEqual(fresh.done, {});
  assert.equal(fresh.startedAt, now.toISOString());
});

test('run report classifies ok, partial and incomplete runs', () => {
  const base = { runId: 'r', startedAt: '2026-10-09T03:00:00.000Z', dryRun: false, storeSet: 'all' };
  const at = new Date('2026-10-09T06:30:00.000Z');
  assert.equal(buildRunReport({ ...base, done: { a: summary('a', 'imported', 3), b: summary('b', 'imported', 4) } }, ['a', 'b'], at).status, 'ok');
  const partial = buildRunReport({ ...base, done: { a: summary('a', 'imported', 3), b: summary('b', 'failed') } }, ['a', 'b'], at);
  assert.equal(partial.status, 'partial');
  assert.deepEqual(partial.problemStores, ['b (failed)']);
  assert.equal(partial.importedSnapshots, 3);
  const incomplete = buildRunReport({ ...base, done: { a: summary('a', 'imported') } }, ['a', 'b'], at);
  assert.equal(incomplete.status, 'incomplete');
  assert.equal(incomplete.storesNotReached, 1);
  assert.match(formatFinal(incomplete), /1 not reached/);
  assert.match(formatFinal(partial), /3 h 30 min/);
});

test('progress line counts finished stores', () => {
  const checkpoint = { runId: 'r', startedAt: '2026-10-09T03:00:00.000Z', dryRun: false, storeSet: 'all', done: { a: summary('a', 'imported', 2), b: summary('b', 'skipped') } };
  const line = formatProgress(checkpoint, ['a', 'b', 'c'], new Date('2026-10-09T03:45:00.000Z'));
  assert.match(line, /^2\/3 stores done in 45 min — 0 failed, 1 skipped; 2 snapshots/);
});

test('settings use defaults and reject bad values', () => {
  const settings = readScheduledSettings({});
  assert.equal(settings.storeTimeoutMs, 60 * 60_000);
  assert.equal(settings.storeRetries, 1);
  assert.equal(settings.retryDelayMs, 5 * 60_000);
  assert.equal(settings.ntfyTopic, '');
  assert.equal(readScheduledSettings({ PRICE_HUB_STORE_RETRIES: '0', NTFY_SERVER: 'https://ntfy.example/' }).ntfyServer, 'https://ntfy.example');
  assert.throws(() => readScheduledSettings({ PRICE_HUB_STORE_TIMEOUT_MIN: '0' }), /greater than zero/);
  assert.throws(() => readScheduledSettings({ PRICE_HUB_RUN_DEADLINE_H: 'x' }), /non-negative/);
});

test('withTimeout rejects slow work and passes fast work through', async () => {
  assert.equal(await withTimeout(Promise.resolve(7), 1000, 'fast'), 7);
  await assert.rejects(withTimeout(new Promise((resolve) => setTimeout(resolve, 200)), 10, 'slow'), /slow timed out/);
});
