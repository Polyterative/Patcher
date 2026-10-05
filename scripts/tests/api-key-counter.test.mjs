import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ApiKeyCounter } from '../../cloudflare/public-api/src/index.ts';

const KEY_A = '11111111-1111-4111-8111-111111111111';
const KEY_B = '22222222-2222-4222-8222-222222222222';
const JULY = '2026-07-01T00:00:00.000Z';
const AUGUST = '2026-08-01T00:00:00.000Z';

function setup({ reporter = new FakeReporter(), start = '2026-07-24T11:02:00.000Z', env = {} } = {}) {
  const backing = { values: new Map(), alarm: null };
  const logs = [];
  const clockRef = { now: new Date(start) };
  const counter = new ApiKeyCounter(
    new FakeState(backing),
    env,
    { reporter: reporter ?? undefined, clock: () => clockRef.now, logger: { error: line => logs.push(JSON.parse(line)) } }
  );
  return { backing, logs, clockRef, counter, reporter };
}

function consume(counter, keyId, limits) {
  return counter.fetch(new Request('https://quota.local/consume', {
    method: 'POST',
    body: JSON.stringify({ keyId, limits }),
  }));
}

test('rejects a different key id once the object is bound to a key (409) without touching usage', async () => {
  const { counter, backing } = setup();
  assert.equal((await consume(counter, KEY_A, { monthly: 10, perMinute: 10 })).status, 200);
  const before = structuredClone(backing.values.get('counter'));

  const response = await consume(counter, KEY_B, { monthly: 10, perMinute: 10 });
  assert.equal(response.status, 409);
  assert.equal((await response.json()).error.code, 'key_id_mismatch');
  assert.deepEqual(backing.values.get('counter'), before);
  assert.equal(backing.values.get('limits').keyId, KEY_A);
});

test('blocked requests never increment counters or enqueue usage reports', async () => {
  const { counter, backing, reporter } = setup();
  assert.equal((await consume(counter, KEY_A, { monthly: 100, perMinute: 2 })).status, 200);
  assert.equal((await consume(counter, KEY_A, { monthly: 100, perMinute: 2 })).status, 200);

  for (let i = 0; i < 25; i += 1) {
    const blocked = await consume(counter, KEY_A, { monthly: 100, perMinute: 2 });
    assert.equal(blocked.status, 429);
  }
  assert.equal(backing.values.get('counter').usedMonth, 2);
  assert.equal(backing.values.get('counter').usedMinute, 2);
  assert.equal(backing.values.get('usageReports').entries[JULY].pendingCount, 2);

  await counter.alarm();
  assert.deepEqual(reporter.calls, [{ keyId: KEY_A, monthStart: JULY, usedMonth: 2 }]);
});

test('minute block reports window, retry-after and quota headers; next minute is allowed again', async () => {
  const { counter, clockRef } = setup({ start: '2026-07-24T11:02:45.000Z' });
  await consume(counter, KEY_A, { monthly: 100, perMinute: 1 });
  const blocked = await consume(counter, KEY_A, { monthly: 100, perMinute: 1 });
  const body = await blocked.json();

  assert.equal(blocked.status, 429);
  assert.equal(body.reason, 'per_minute_quota_exceeded');
  assert.equal(body.window, 'minute');
  assert.equal(body.retry_after_seconds, 15);
  assert.equal(blocked.headers.get('Retry-After'), '15');
  assert.equal(blocked.headers.get('X-RateLimit-Remaining-Minute'), '0');
  assert.equal(blocked.headers.get('X-RateLimit-Remaining-Month'), '99');
  assert.equal(blocked.headers.get('Cache-Control'), 'no-store');

  clockRef.now = new Date('2026-07-24T11:03:00.000Z');
  assert.equal((await consume(counter, KEY_A, { monthly: 100, perMinute: 1 })).status, 200);
});

test('month exhaustion blocks until the next UTC month even across minute boundaries', async () => {
  const { counter, clockRef } = setup({ start: '2026-07-31T23:58:00.000Z' });
  assert.equal((await consume(counter, KEY_A, { monthly: 2, perMinute: 10 })).status, 200);
  assert.equal((await consume(counter, KEY_A, { monthly: 2, perMinute: 10 })).status, 200);

  clockRef.now = new Date('2026-07-31T23:59:30.000Z');
  const blocked = await consume(counter, KEY_A, { monthly: 2, perMinute: 10 });
  const body = await blocked.json();
  assert.equal(blocked.status, 429);
  assert.equal(body.window, 'month');
  assert.equal(body.reason, 'monthly_quota_exceeded');
  assert.equal(body.retry_after_seconds, 30);

  clockRef.now = new Date('2026-08-01T00:00:00.000Z');
  assert.equal((await consume(counter, KEY_A, { monthly: 2, perMinute: 10 })).status, 200);
});

test('lowering limits applies immediately and is persisted for the key', async () => {
  const { counter, backing } = setup();
  for (let i = 0; i < 3; i += 1) {
    assert.equal((await consume(counter, KEY_A, { monthly: 100, perMinute: 100 })).status, 200);
  }
  const blocked = await consume(counter, KEY_A, { monthly: 3, perMinute: 100 });
  assert.equal(blocked.status, 429);
  assert.deepEqual(backing.values.get('limits'), { keyId: KEY_A, monthlyQuota: 3, perMinuteQuota: 100 });

  const raised = await consume(counter, KEY_A, { monthly: 4, perMinute: 100 });
  assert.equal(raised.status, 200);
});

test('concurrent consumes never exceed the per-minute limit', async () => {
  const { counter, backing } = setup();
  const responses = await Promise.all(
    Array.from({ length: 20 }, () => consume(counter, KEY_A, { monthly: 1000, perMinute: 5 }))
  );
  const statuses = responses.map(r => r.status);
  assert.equal(statuses.filter(s => s === 200).length, 5);
  assert.equal(statuses.filter(s => s === 429).length, 15);
  assert.equal(backing.values.get('counter').usedMinute, 5);
});

test('usage consumed while a flush is in flight is not lost', async () => {
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  const reporter = {
    calls: [],
    async recordApiKeyUsage(keyId, monthStart, usedMonth) {
      this.calls.push({ keyId, monthStart, usedMonth });
      await gate;
    },
  };
  const { counter, backing } = setup({ reporter });
  await consume(counter, KEY_A, { monthly: 100, perMinute: 100 });
  const flush = counter.alarm();
  await new Promise(resolve => setImmediate(resolve));
  await consume(counter, KEY_A, { monthly: 100, perMinute: 100 });
  release();
  await flush;

  const entry = backing.values.get('usageReports').entries[JULY];
  assert.equal(reporter.calls[0].usedMonth, 1);
  assert.equal(entry.pendingCount, 2);
  assert.equal(entry.flushedCount, 1);

  await counter.alarm();
  assert.equal(reporter.calls.at(-1).usedMonth, 2);
  assert.equal(backing.values.get('usageReports').entries[JULY].flushedCount, 2);
});

test('flush failure on the first month stops before the next month and keeps both queued', async () => {
  const reporter = new FakeReporter({ failTimes: 1 });
  const { counter, backing, clockRef, logs } = setup({ reporter, start: '2026-07-31T23:59:00.000Z' });
  await consume(counter, KEY_A, { monthly: 10, perMinute: 10 });
  clockRef.now = new Date('2026-08-01T00:00:00.000Z');
  await consume(counter, KEY_A, { monthly: 10, perMinute: 10 });

  await counter.alarm();
  assert.equal(reporter.calls.length, 1);
  assert.equal(reporter.calls[0].monthStart, JULY);
  assert.deepEqual(Object.keys(backing.values.get('usageReports').entries).sort(), [JULY, AUGUST]);
  assert.equal(logs[0].event, 'public_api_usage_flush_failed');
  assert.equal(logs[0].error, 'simulated reporter outage');

  clockRef.now = new Date(backing.alarm);
  await counter.alarm();
  assert.deepEqual(reporter.calls.slice(1).map(c => c.monthStart), [JULY, AUGUST]);
  assert.equal(backing.values.get('usageReports').consecutiveFailures, 0);
});

test('a successful flush resets the backoff so the next failure restarts at 30s', async () => {
  const reporter = new FakeReporter({ failTimes: 2 });
  const { counter, backing, clockRef } = setup({ reporter });
  await consume(counter, KEY_A, { monthly: 100, perMinute: 100 });
  await counter.alarm();
  clockRef.now = new Date(backing.alarm);
  await counter.alarm();
  assert.equal(backing.values.get('usageReports').consecutiveFailures, 2);
  clockRef.now = new Date(backing.alarm);
  await counter.alarm();
  assert.equal(backing.values.get('usageReports').consecutiveFailures, 0);

  await consume(counter, KEY_A, { monthly: 100, perMinute: 100 });
  reporter.failTimes = 1;
  clockRef.now = new Date(clockRef.now.getTime() + 60_000);
  await counter.alarm();
  assert.equal(backing.alarm, clockRef.now.getTime() + 30_000);
});

test('missing usage reporter binding logs a failure and schedules a retry instead of throwing', async () => {
  const { counter, backing, logs } = setup({ reporter: null });
  assert.equal((await consume(counter, KEY_A, { monthly: 10, perMinute: 10 })).status, 200);
  await counter.alarm();
  assert.equal(logs.length, 1);
  assert.match(logs[0].error, /usage reporter binding is not configured/);
  assert.ok(backing.alarm > 0);
  assert.equal(backing.values.get('usageReports').entries[JULY].flushedCount, 0);
});

test('alarm with nothing pending is a no-op and does not reschedule', async () => {
  const { counter, backing, reporter } = setup();
  await counter.alarm();
  assert.equal(reporter.calls.length, 0);
  assert.equal(backing.alarm, null);
});

test('threshold flush fires at 500 pending uses and flush alarm is re-armed', async () => {
  const { counter, reporter, backing } = setup();
  for (let i = 0; i < 499; i += 1) {
    await consume(counter, KEY_A, { monthly: 10_000, perMinute: 10_000 });
  }
  assert.equal(reporter.calls.length, 0);
  await consume(counter, KEY_A, { monthly: 10_000, perMinute: 10_000 });
  assert.deepEqual(reporter.calls, [{ keyId: KEY_A, monthStart: JULY, usedMonth: 500 }]);
  assert.ok(backing.alarm === null || backing.alarm > 0);
});

test('payload validation rejects bad key ids and limits with 400 and no state written', async () => {
  const { counter, backing } = setup();
  const badKeys = ['', 'not-a-uuid', KEY_A.toUpperCase().replace(/-/g, ''), '11111111-1111-6111-8111-111111111111',
    '11111111-1111-4111-c111-111111111111', `${KEY_A}x`, ` ${KEY_A}`, 123, null, ['x']];
  for (const keyId of badKeys) {
    const res = await consume(counter, keyId, { monthly: 1, perMinute: 1 });
    assert.equal(res.status, 400, `keyId ${JSON.stringify(keyId)}`);
    assert.equal((await res.json()).error.code, 'malformed_payload');
  }
  const badLimits = [
    { monthly: 0, perMinute: 1 }, { monthly: 1, perMinute: 0 }, { monthly: -1, perMinute: 1 },
    { monthly: 1.5, perMinute: 1 }, { monthly: '5', perMinute: 1 }, { monthly: 1, perMinute: null },
    { monthly: null, perMinute: 1 }, { monthly: 1 }, { perMinute: 1 }, {}, null, 'x', [],
  ];
  for (const limits of badLimits) {
    const res = await consume(counter, KEY_A, limits);
    assert.equal(res.status, 400, `limits ${JSON.stringify(limits)}`);
  }
  assert.equal(backing.values.size, 0);
});

test('accepts upper-case UUIDs and rejects non-object / invalid JSON bodies', async () => {
  const { counter } = setup();
  assert.equal((await consume(counter, KEY_A.toUpperCase(), { monthly: 1, perMinute: 1 })).status, 200);
  for (const body of ['null', '42', '"str"', '{not json', '']) {
    const res = await counter.fetch(new Request('https://quota.local/consume', { method: 'POST', body }));
    assert.equal(res.status, 400, `body ${body}`);
  }
});

test('Allow header and security headers are set on error responses', async () => {
  const { counter } = setup();
  const res = await counter.fetch(new Request('https://quota.local/consume', { method: 'PUT' }));
  assert.equal(res.status, 405);
  assert.equal(res.headers.get('Allow'), 'POST');
  assert.equal(res.headers.get('X-Content-Type-Options'), 'nosniff');
  assert.equal(res.headers.get('Cache-Control'), 'no-store');
});

class FakeState {
  constructor(backing) {
    this.storage = new FakeStorage(backing);
  }
}

class FakeStorage {
  constructor(backing) {
    this.backing = backing;
  }
  async get(key) { return structuredCloneOrUndef(this.backing.values.get(key)); }
  async put(key, value) { this.backing.values.set(key, structuredClone(value)); }
  async delete(key) { return this.backing.values.delete(key); }
  // Real Durable Objects serialize transactions; model that with a promise chain.
  async transaction(closure) {
    const run = (this.backing.lock ?? Promise.resolve()).then(() => closure(this));
    this.backing.lock = run.catch(() => undefined);
    return run;
  }
  async getAlarm() { return this.backing.alarm; }
  async setAlarm(time) { this.backing.alarm = time instanceof Date ? time.getTime() : time; }
}

class FakeReporter {
  constructor({ failTimes = 0 } = {}) {
    this.failTimes = failTimes;
    this.calls = [];
  }
  async recordApiKeyUsage(keyId, monthStart, usedMonth) {
    this.calls.push({ keyId, monthStart, usedMonth });
    if (this.failTimes > 0) {
      this.failTimes -= 1;
      throw new Error('simulated reporter outage');
    }
  }
}

function structuredCloneOrUndef(value) {
  return value === undefined ? undefined : structuredClone(value);
}
