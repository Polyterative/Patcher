import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  ApiKeyMetadataCache,
  resetDefaultApiKeyMetadataCache,
  verifyApiKeyMetadata,
} from '../../cloudflare/public-api/src/api-key-metadata-cache.ts';
import {
  createHyperdriveApiKeyMetadataProvider,
  normalizeRecordUsageInput,
  normalizeVerifyApiKeyRow,
  normalizeVerifyApiKeyRows,
} from '../../cloudflare/public-api/src/database.ts';

const ID = '11111111-1111-4111-8111-111111111111';
const PROFILE = '22222222-2222-4222-8222-222222222222';
const meta = (n = 1) => ({ id: ID, profileId: PROFILE, tierCode: 'pro', monthlyQuota: n, perMinuteQuota: n });
const digest = n => n.toString(16).padStart(64, '0');

test('cache rejects invalid sizes and TTLs (a TTL over 60s would delay key revocation)', () => {
  for (const size of [0, -1, 1.5, NaN, Infinity]) {
    assert.throws(() => new ApiKeyMetadataCache(size, 1000), /maxEntries/, String(size));
  }
  for (const ttl of [0, -1, 1.5, NaN, 60_001, Infinity]) {
    assert.throws(() => new ApiKeyMetadataCache(10, ttl), /ttlMs/, String(ttl));
  }
  assert.doesNotThrow(() => new ApiKeyMetadataCache(1, 1));
  assert.doesNotThrow(() => new ApiKeyMetadataCache(10, 60_000));
});

test('entries expire exactly at the TTL boundary and are evicted on read', () => {
  const cache = new ApiKeyMetadataCache(10, 1000);
  cache.set(digest(1), meta(), 5000);
  assert.deepEqual(cache.get(digest(1), 5999), meta());
  assert.equal(cache.get(digest(1), 6000), null);
  assert.equal(cache.get(digest(1), 5000), null, 'expired entry must be gone, not resurrected by an earlier clock');
});

test('reads do not extend the TTL', () => {
  const cache = new ApiKeyMetadataCache(10, 1000);
  cache.set(digest(1), meta(), 0);
  assert.ok(cache.get(digest(1), 900));
  assert.ok(cache.get(digest(1), 999));
  assert.equal(cache.get(digest(1), 1000), null);
});

test('re-setting a key refreshes its value and TTL', () => {
  const cache = new ApiKeyMetadataCache(10, 1000);
  cache.set(digest(1), meta(1), 0);
  cache.set(digest(1), meta(2), 800);
  assert.equal(cache.get(digest(1), 1500).monthlyQuota, 2);
  assert.equal(cache.get(digest(1), 1800), null);
});

test('evicts the least recently used entry, and a read counts as use', () => {
  const cache = new ApiKeyMetadataCache(2, 1000);
  cache.set(digest(1), meta(1), 0);
  cache.set(digest(2), meta(2), 0);
  cache.get(digest(1), 1);
  cache.set(digest(3), meta(3), 2);
  assert.ok(cache.get(digest(1), 3));
  assert.equal(cache.get(digest(2), 3), null);
  assert.ok(cache.get(digest(3), 3));
});

test('never grows beyond maxEntries under a flood of distinct keys', () => {
  const cache = new ApiKeyMetadataCache(5, 1000);
  for (let i = 0; i < 1000; i += 1) {
    cache.set(digest(i), meta(), 0);
  }
  let present = 0;
  for (let i = 0; i < 1000; i += 1) {
    if (cache.get(digest(i), 1)) present += 1;
  }
  assert.equal(present, 5);
});

test('clear removes everything', () => {
  const cache = new ApiKeyMetadataCache(5, 1000);
  cache.set(digest(1), meta(), 0);
  cache.clear();
  assert.equal(cache.get(digest(1), 1), null);
});

test('verifyApiKeyMetadata caches positives only and never caches unknown keys', async () => {
  const cache = new ApiKeyMetadataCache(10, 1000);
  let calls = 0;
  let answer = null;
  const provider = { async verifyApiKeyHash() { calls += 1; return answer; } };

  assert.deepEqual(await verifyApiKeyMetadata(digest(1), provider, { cache, nowMs: 0 }), { ok: false, code: 'invalid_key' });
  assert.deepEqual(await verifyApiKeyMetadata(digest(1), provider, { cache, nowMs: 1 }), { ok: false, code: 'invalid_key' });
  assert.equal(calls, 2, 'a negative result must be re-checked every time so newly created keys work immediately');

  answer = meta();
  assert.equal((await verifyApiKeyMetadata(digest(1), provider, { cache, nowMs: 2 })).ok, true);
  assert.equal((await verifyApiKeyMetadata(digest(1), provider, { cache, nowMs: 3 })).ok, true);
  assert.equal(calls, 3);
});

test('a revoked key is rejected as soon as the cached entry expires', async () => {
  const cache = new ApiKeyMetadataCache(10, 1000);
  let revoked = false;
  const provider = { async verifyApiKeyHash() { return revoked ? null : meta(); } };

  assert.equal((await verifyApiKeyMetadata(digest(1), provider, { cache, nowMs: 0 })).ok, true);
  revoked = true;
  assert.equal((await verifyApiKeyMetadata(digest(1), provider, { cache, nowMs: 999 })).ok, true);
  assert.deepEqual(await verifyApiKeyMetadata(digest(1), provider, { cache, nowMs: 1000 }), { ok: false, code: 'invalid_key' });
});

test('provider errors propagate and are not cached', async () => {
  const cache = new ApiKeyMetadataCache(10, 1000);
  let fail = true;
  const provider = { async verifyApiKeyHash() { if (fail) throw new Error('db down'); return meta(); } };

  await assert.rejects(() => verifyApiKeyMetadata(digest(1), provider, { cache, nowMs: 0 }), /db down/);
  fail = false;
  assert.equal((await verifyApiKeyMetadata(digest(1), provider, { cache, nowMs: 1 })).ok, true);
});

test('different digests never share cache entries', async () => {
  const cache = new ApiKeyMetadataCache(10, 1000);
  const provider = { async verifyApiKeyHash(d) { return d === digest(1) ? meta(1) : null; } };
  assert.equal((await verifyApiKeyMetadata(digest(1), provider, { cache, nowMs: 0 })).ok, true);
  assert.equal((await verifyApiKeyMetadata(digest(2), provider, { cache, nowMs: 1 })).ok, false);
});

test('the default cache is shared across calls and can be reset', async () => {
  resetDefaultApiKeyMetadataCache();
  let calls = 0;
  const provider = { async verifyApiKeyHash() { calls += 1; return meta(); } };
  await verifyApiKeyMetadata(digest(9), provider, { nowMs: 0 });
  await verifyApiKeyMetadata(digest(9), provider, { nowMs: 1 });
  assert.equal(calls, 1);
  resetDefaultApiKeyMetadataCache();
  await verifyApiKeyMetadata(digest(9), provider, { nowMs: 2 });
  assert.equal(calls, 2);
});

test('the hyperdrive provider validates the digest before touching the database', async () => {
  const provider = createHyperdriveApiKeyMetadataProvider({ connectionString: 'postgres://invalid.invalid/db' });
  for (const bad of ['', 'abc', 'G'.repeat(64), digest(255).toUpperCase(), `${digest(1)}0`, `${digest(1).slice(1)}`, "'; drop table x; --", ' '.repeat(64)]) {
    await assert.rejects(() => provider.verifyApiKeyHash(bad), /SHA-256 hex/, JSON.stringify(bad));
  }
});

test('verify_api_key rows are normalised strictly', () => {
  const row = { id: ID, profile_id: PROFILE, tier_code: 'pro', monthly_quota: 10, per_minute_quota: 5 };
  assert.deepEqual(normalizeVerifyApiKeyRow(row), { id: ID, profileId: PROFILE, tierCode: 'pro', monthlyQuota: 10, perMinuteQuota: 5 });
  const invalid = [
    { ...row, id: 'nope' }, { ...row, id: null }, { ...row, profile_id: '123' }, { ...row, id: ID.replace('4111', '7111') },
    { ...row, tier_code: '' }, { ...row, tier_code: '   ' }, { ...row, tier_code: null }, { ...row, tier_code: 5 },
    { ...row, monthly_quota: 0 }, { ...row, monthly_quota: -1 }, { ...row, monthly_quota: 1.5 }, { ...row, monthly_quota: '10' },
    { ...row, per_minute_quota: 0 }, { ...row, per_minute_quota: null }, { ...row, per_minute_quota: NaN },
  ];
  for (const bad of invalid) {
    assert.throws(() => normalizeVerifyApiKeyRow(bad), /verify_api_key returned/, JSON.stringify(bad));
  }
});

test('zero rows mean an unknown key, more than one row is a hard error', () => {
  assert.equal(normalizeVerifyApiKeyRows([]), null);
  const row = { id: ID, profile_id: PROFILE, tier_code: 'pro', monthly_quota: 10, per_minute_quota: 5 };
  assert.throws(() => normalizeVerifyApiKeyRows([row, row]), /more than one row/);
  assert.equal(normalizeVerifyApiKeyRows([row]).id, ID);
});

test('usage report input must be a UUID, a non-negative integer and a first-of-month date', () => {
  assert.deepEqual(normalizeRecordUsageInput(ID, '2026-07-01T00:00:00.000Z', 0), { keyId: ID, monthStartDate: '2026-07-01', usedMonth: 0 });
  assert.deepEqual(normalizeRecordUsageInput(ID, '2026-07-01', 5), { keyId: ID, monthStartDate: '2026-07-01', usedMonth: 5 });
  assert.throws(() => normalizeRecordUsageInput('x', '2026-07-01', 1), /UUID/);
  for (const used of [-1, 1.5, NaN, Infinity, '5']) {
    assert.throws(() => normalizeRecordUsageInput(ID, '2026-07-01', used), /nonnegative integer/, String(used));
  }
  for (const month of ['2026-07-02T00:00:00.000Z', '2026-07-15', '', 'July', '2026/07/01', '26-07-01']) {
    assert.throws(() => normalizeRecordUsageInput(ID, month, 1), /first day of a month/, month);
  }
});

test('KNOWN GAP: month numbers outside 01-12 pass the first-of-month check and would fail in Postgres', { todo: 'validate the month range before sending' }, () => {
  for (const month of ['2026-13-01', '2026-00-01']) {
    assert.throws(() => normalizeRecordUsageInput(ID, month, 1), month);
  }
});
