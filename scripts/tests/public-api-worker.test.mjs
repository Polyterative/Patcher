import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { test } from 'node:test';
import {
  bytesToHex,
  hmacApiKey,
  parseApiKeyAuthorization,
} from '../../cloudflare/public-api/src/auth.ts';
import {
  toCacheEntry,
  toOutgoingResponse,
} from '../../cloudflare/public-api/src/cache.ts';
import { handlePublicApiRequest } from '../../cloudflare/public-api/src/index.ts';
import { consumeQuota } from '../../cloudflare/public-api/src/quota.ts';
import { normalizeApiRequest } from '../../cloudflare/public-api/src/request.ts';

const rawKeyBytes = Uint8Array.from({ length: 16 }, (_, index) => index);
const rawKey = `pk_live_${Buffer.from(rawKeyBytes).toString('base64url')}`;
const pepperBytes = Uint8Array.from({ length: 32 }, (_, index) => 255 - index);
const pepper = Buffer.from(pepperBytes).toString('base64');

test('parses only well-formed Bearer API keys', () => {
  assert.deepEqual(parseApiKeyAuthorization(null), {
    ok: false,
    code: 'missing_authorization',
  });
  assert.deepEqual(parseApiKeyAuthorization(`Basic ${rawKey}`), {
    ok: false,
    code: 'malformed_authorization',
  });
  assert.deepEqual(parseApiKeyAuthorization('Bearer pk_live_short'), {
    ok: false,
    code: 'malformed_authorization',
  });

  const parsed = parseApiKeyAuthorization(`Bearer ${rawKey}`);
  assert.equal(parsed.ok, true);
  assert.deepEqual(parsed.ok ? parsed.rawKeyBytes : null, rawKeyBytes);
});

test('matches the HMAC-SHA256 byte contract used by Postgres', async () => {
  const expected = createHmac('sha256', pepperBytes).update(rawKeyBytes).digest('hex');
  const actual = bytesToHex(await hmacApiKey(rawKeyBytes, pepper));
  assert.equal(actual, expected);
});

test('normalizes query parameters into an authorization-independent cache key', () => {
  const normalized = normalizeApiRequest(
    'https://api.patcher.xyz/v1/modules?include=tags,ins&hp=8'
  );
  assert.equal(normalized.ok, true);
  assert.equal(
    normalized.ok ? normalized.cacheKey : null,
    'GET /v1/modules?hp=8&include=ins%2Ctags&limit=50'
  );

  const unknown = normalizeApiRequest(
    'https://api.patcher.xyz/v1/modules?internal=true'
  );
  assert.deepEqual(unknown, {
    ok: false,
    code: 'unknown_parameter',
    parameter: 'internal',
  });

  const invalidCursor = normalizeApiRequest(
    'https://api.patcher.xyz/v1/modules?cursor=not-a-cursor'
  );
  assert.deepEqual(invalidCursor, {
    ok: false,
    code: 'invalid_parameter',
    parameter: 'cursor',
  });

  const cursor = Buffer.from(
    JSON.stringify({ v: 1, s: 'Áudio', id: 42 })
  ).toString('base64url');
  const validCursor = normalizeApiRequest(
    `https://api.patcher.xyz/v1/modules?cursor=${cursor}`
  );
  assert.equal(validCursor.ok, true);
});

test('keeps per-key quota headers out of shared cache entries', async () => {
  const origin = new Response('{"data":[]}', {
    headers: {
      'Content-Type': 'application/json',
      ETag: '"body-hash"',
      'X-RateLimit-Remaining-Month': '4999',
    },
  });
  const cached = toCacheEntry(origin);
  assert.equal(cached.headers.get('x-ratelimit-remaining-month'), null);
  assert.equal(await origin.text(), '{"data":[]}');

  const outgoing = toOutgoingResponse(
    cached,
    { 'X-RateLimit-Remaining-Month': '12' },
    'HIT'
  );
  assert.equal(outgoing.headers.get('x-ratelimit-remaining-month'), '12');
  assert.equal(outgoing.headers.get('x-cache'), 'HIT');
});

test('enforces exact minute and month quota boundaries with UTC rollover', () => {
  const now = new Date('2026-07-24T11:02:48.000Z');
  const first = consumeQuota(null, { monthly: 2, perMinute: 1 }, now);
  assert.equal(first.allowed, true);

  const blockedMinute = consumeQuota(first.state, { monthly: 2, perMinute: 1 }, now);
  assert.deepEqual(
    { allowed: blockedMinute.allowed, window: blockedMinute.allowed ? null : blockedMinute.window },
    { allowed: false, window: 'minute' }
  );

  const nextMinute = consumeQuota(
    first.state,
    { monthly: 2, perMinute: 1 },
    new Date('2026-07-24T11:03:00.000Z')
  );
  assert.equal(nextMinute.allowed, true);

  const blockedMonth = consumeQuota(
    nextMinute.state,
    { monthly: 2, perMinute: 10 },
    new Date('2026-07-24T11:03:01.000Z')
  );
  assert.deepEqual(
    { allowed: blockedMonth.allowed, window: blockedMonth.allowed ? null : blockedMonth.window },
    { allowed: false, window: 'month' }
  );
});

test('worker rejects missing auth before reaching the unconfigured origin', async () => {
  const unauthorized = await handlePublicApiRequest(
    new Request('https://api.patcher.xyz/v1/modules'),
    {}
  );
  assert.equal(unauthorized.status, 401);
  const unauthorizedBody = await unauthorized.json();
  assert.equal(unauthorizedBody.error.code, 'missing_authorization');
  assert.match(unauthorizedBody.error.request_id, /^[0-9a-f-]{36}$/);
  assert.equal(
    unauthorized.headers.get('x-request-id'),
    unauthorizedBody.error.request_id
  );

  const configuredLater = await handlePublicApiRequest(
    new Request('https://api.patcher.xyz/v1/modules', {
      headers: { Authorization: `Bearer ${rawKey}` },
    }),
    {}
  );
  assert.equal(configuredLater.status, 503);
  assert.equal((await configuredLater.json()).error.code, 'origin_not_configured');
});
