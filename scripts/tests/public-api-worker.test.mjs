import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { HyperdriveCatalogueProvider } from '../../cloudflare/public-api/src/catalogue-provider.ts';
import {
  ApiKeyMetadataCache,
} from '../../cloudflare/public-api/src/api-key-metadata-cache.ts';
import {
  bytesToHex,
  hmacApiKey,
  parseApiKeyAuthorization,
} from '../../cloudflare/public-api/src/auth.ts';
import {
  toCacheEntry,
  toOutgoingResponse,
} from '../../cloudflare/public-api/src/cache.ts';
import {
  normalizeModuleRow,
  normalizeStandardRow,
  normalizeTagRow,
} from '../../cloudflare/public-api/src/catalogue-mapping.ts';
import {
  normalizeRecordUsageInput,
  normalizeVerifyApiKeyRow,
} from '../../cloudflare/public-api/src/database.ts';
import { ApiKeyCounter, handlePublicApiRequest } from '../../cloudflare/public-api/src/index.ts';
import { consumeQuota } from '../../cloudflare/public-api/src/quota.ts';
import { normalizeApiRequest } from '../../cloudflare/public-api/src/request.ts';

const rawKeyBytes = Uint8Array.from({ length: 16 }, (_, index) => index);
const rawKey = `pk_live_${Buffer.from(rawKeyBytes).toString('base64url')}`;
const rawKeyBytes2 = Uint8Array.from({ length: 16 }, (_, index) => 16 + index);
const rawKey2 = `pk_live_${Buffer.from(rawKeyBytes2).toString('base64url')}`;
const pepperBytes = Uint8Array.from({ length: 32 }, (_, index) => 255 - index);
const pepper = Buffer.from(pepperBytes).toString('base64');
const keyMetadata = {
  id: '99999999-9999-4999-8999-999999999999',
  profileId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  tierCode: 'pro',
  monthlyQuota: 1000,
  perMinuteQuota: 60,
};
const keyMetadata2 = {
  ...keyMetadata,
  id: '12345678-1234-4234-8234-123456789abc',
  profileId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
};
const moduleOne = {
  id: 1,
  name: 'Alpha VCO',
  description: 'Oscillator',
  hp: 8,
  standard: 1,
  manufacturer_id: 10,
  depth: 35,
  depth_max: null,
  is_diy: false,
  manual_url: 'https://example.test/manual.pdf',
  power_neg_12: 20,
  power_pos_12: 40,
  power_pos_5: 0,
  switches: [{ name: 'Range', positions: ['Low', 'High'] }],
  weight: 120,
};
const moduleTwo = {
  ...moduleOne,
  id: 2,
  name: 'Beta Filter',
  description: 'Filter',
  hp: 12,
};
const manufacturerOne = {
  id: 10,
  name: 'ACME Synth',
  description: 'Maker',
  tagline: 'Patch better',
  website_url: 'https://example.test',
  social_links: { instagram: 'acme' },
  logo: 'logo.svg',
};
const standardOne = { id: 1, name: 'Eurorack' };
const tagOne = { id: 5, name: 'Oscillator', type: 'source' };

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
    'GET /v1/modules?hp=8&include=ins%2Ctags&limit=50&sort=name'
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

  const zeroIdCursor = Buffer.from(
    JSON.stringify({ v: 1, s: '3U', id: 0 })
  ).toString('base64url');
  assert.equal(
    normalizeApiRequest(`https://api.patcher.xyz/v1/standards?cursor=${zeroIdCursor}`).ok,
    true
  );
  assert.equal(
    normalizeApiRequest('https://api.patcher.xyz/v1/modules?standard=0').ok,
    true
  );

  const unsupportedSort = normalizeApiRequest(
    'https://api.patcher.xyz/v1/modules?sort=updated'
  );
  assert.deepEqual(unsupportedSort, {
    ok: false,
    code: 'unsupported_parameter',
    parameter: 'sort',
  });

  const unsupportedSearch = normalizeApiRequest(
    'https://api.patcher.xyz/v1/modules?q=osc'
  );
  assert.deepEqual(unsupportedSearch, {
    ok: false,
    code: 'unsupported_parameter',
    parameter: 'q',
  });

  const manufacturerFilter = normalizeApiRequest(
    'https://api.patcher.xyz/v1/manufacturers?hp=8'
  );
  assert.deepEqual(manufacturerFilter, {
    ok: false,
    code: 'unknown_parameter',
    parameter: 'hp',
  });

  const idCursor = Buffer.from(
    JSON.stringify({ v: 1, s: 42, id: 42 })
  ).toString('base64url');
  const cursorMismatch = normalizeApiRequest(
    `https://api.patcher.xyz/v1/modules?cursor=${idCursor}&sort=name`
  );
  assert.deepEqual(cursorMismatch, {
    ok: false,
    code: 'invalid_parameter',
    parameter: 'cursor',
  });
});

test('keeps per-key quota headers out of shared cache entries', async () => {
  const origin = new Response('{"data":[]}', {
    headers: {
      'Content-Type': 'application/json',
      ETag: '"body-hash"',
      'X-RateLimit-Remaining-Month': '4999',
      'X-Request-ID': 'cached-request',
    },
  });
  const cached = toCacheEntry(origin, { freshSeconds: 60, swrSeconds: 120 }, 1000);
  assert.equal(cached.headers.get('x-ratelimit-remaining-month'), null);
  assert.equal(cached.headers.get('x-request-id'), null);
  assert.equal(await origin.text(), '{"data":[]}');

  const outgoing = toOutgoingResponse(
    cached,
    { 'X-RateLimit-Remaining-Month': '12' },
    'HIT',
    new Request('https://api.patcher.xyz/v1/modules'),
    'request-1'
  );
  assert.equal(outgoing.headers.get('x-ratelimit-remaining-month'), '12');
  assert.equal(outgoing.headers.get('x-cache'), 'HIT');
  assert.equal(outgoing.headers.get('cache-control'), 'private, no-store');
  assert.equal(outgoing.headers.get('x-patcher-cache-fresh-until'), null);
  assert.equal(outgoing.headers.get('x-request-id'), 'request-1');
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
    { API_KEY_PEPPER: pepper },
    createWorkerRuntime()
  );
  assert.equal(configuredLater.status, 503);
  assert.equal((await configuredLater.json()).error.code, 'origin_unavailable');
});

test('worker verifies metadata once inside fixed TTL but consumes quota every request', async () => {
  let nowMs = 10_000;
  const metadataProvider = new FakeMetadataProvider([keyMetadata]);
  const quotaNamespace = new FakeQuotaNamespace();
  const metadataCache = new ApiKeyMetadataCache(1000, 60_000);
  const runtime = {
    metadataProvider,
    quotaNamespace,
    metadataCache,
    clock: () => nowMs,
    logger: { error: () => undefined },
  };
  const env = { API_KEY_PEPPER: pepper };

  const first = await handlePublicApiRequest(authenticatedRequest(), env, runtime);
  nowMs += 59_999;
  const second = await handlePublicApiRequest(authenticatedRequest(), env, runtime);

  assert.equal(first.status, 503);
  assert.equal(second.status, 503);
  assert.equal(metadataProvider.calls.length, 1);
  assert.equal(quotaNamespace.stub.requests.length, 2);
  assert.equal(second.headers.get('x-ratelimit-limit-month'), String(keyMetadata.monthlyQuota));
});

test('worker re-verifies at exact metadata cache expiry without sliding extension', async () => {
  let nowMs = 0;
  const updatedMetadata = { ...keyMetadata, monthlyQuota: 2000, perMinuteQuota: 120 };
  const metadataProvider = new FakeMetadataProvider([keyMetadata, updatedMetadata]);
  const quotaNamespace = new FakeQuotaNamespace();
  const metadataCache = new ApiKeyMetadataCache(1000, 60_000);
  const runtime = {
    metadataProvider,
    quotaNamespace,
    metadataCache,
    clock: () => nowMs,
    logger: { error: () => undefined },
  };
  const env = { API_KEY_PEPPER: pepper };

  await handlePublicApiRequest(authenticatedRequest(), env, runtime);
  nowMs = 59_999;
  await handlePublicApiRequest(authenticatedRequest(), env, runtime);
  nowMs = 60_000;
  await handlePublicApiRequest(authenticatedRequest(), env, runtime);

  assert.equal(metadataProvider.calls.length, 2);
  assert.deepEqual(quotaNamespace.stub.requests.map(request => request.body.limits), [
    { monthly: 1000, perMinute: 60 },
    { monthly: 1000, perMinute: 60 },
    { monthly: 2000, perMinute: 120 },
  ]);
});

test('worker rejects valid-format unknown keys without consuming quota', async () => {
  const metadataProvider = new FakeMetadataProvider([null]);
  const quotaNamespace = new FakeQuotaNamespace();
  const response = await handlePublicApiRequest(
    authenticatedRequest(),
    { API_KEY_PEPPER: pepper },
    { metadataProvider, quotaNamespace, metadataCache: new ApiKeyMetadataCache(1000, 60_000) }
  );

  assert.equal(response.status, 401);
  assert.equal((await response.json()).error.code, 'invalid_key');
  assert.equal(quotaNamespace.stub.requests.length, 0);
});

test('worker fails closed when metadata verification throws', async () => {
  const metadataProvider = new FakeMetadataProvider([], { fail: true });
  const quotaNamespace = new FakeQuotaNamespace();
  const response = await handlePublicApiRequest(
    authenticatedRequest(),
    { API_KEY_PEPPER: pepper },
    { metadataProvider, quotaNamespace, metadataCache: new ApiKeyMetadataCache(1000, 60_000) }
  );

  assert.equal(response.status, 503);
  assert.equal((await response.json()).error.code, 'authentication_unavailable');
  assert.equal(quotaNamespace.stub.requests.length, 0);
});

test('worker fails closed when pepper, Hyperdrive, or Durable Object binding is missing', async () => {
  const missingPepper = await handlePublicApiRequest(
    authenticatedRequest(),
    {},
    createWorkerRuntime()
  );
  assert.equal(missingPepper.status, 503);
  assert.equal((await missingPepper.json()).error.code, 'configuration_error');

  const missingHyperdrive = await handlePublicApiRequest(
    authenticatedRequest(),
    { API_KEY_PEPPER: pepper, API_KEY_COUNTER: new FakeQuotaNamespace() }
  );
  assert.equal(missingHyperdrive.status, 503);
  assert.equal((await missingHyperdrive.json()).error.code, 'authentication_unavailable');

  const missingDurableObject = await handlePublicApiRequest(
    authenticatedRequest(),
    { API_KEY_PEPPER: pepper },
    {
      metadataProvider: new FakeMetadataProvider([keyMetadata]),
      metadataCache: new ApiKeyMetadataCache(1000, 60_000),
    }
  );
  assert.equal(missingDurableObject.status, 503);
  assert.equal((await missingDurableObject.json()).error.code, 'quota_unavailable');
});

test('worker sends only metadata ID and latest limits to the quota Durable Object', async () => {
  const metadataProvider = new FakeMetadataProvider([keyMetadata]);
  const quotaNamespace = new FakeQuotaNamespace();
  const response = await handlePublicApiRequest(
    authenticatedRequest(),
    { API_KEY_PEPPER: pepper },
    {
      metadataProvider,
      quotaNamespace,
      metadataCache: new ApiKeyMetadataCache(1000, 60_000),
    }
  );

  assert.equal(response.status, 503);
  assert.equal(response.headers.get('x-ratelimit-remaining-minute'), '59');
  assert.deepEqual(quotaNamespace.names, [keyMetadata.id]);
  assert.deepEqual(quotaNamespace.stub.requests[0].body, {
    keyId: keyMetadata.id,
    limits: { monthly: 1000, perMinute: 60 },
  });
  const digestHex = metadataProvider.calls[0];
  const serializedQuotaTraffic = JSON.stringify({
    names: quotaNamespace.names,
    requests: quotaNamespace.stub.requests,
  });
  assert.equal(serializedQuotaTraffic.includes(rawKey), false);
  assert.equal(serializedQuotaTraffic.includes(digestHex), false);
});

test('worker maps Durable Object 429 with request-specific quota headers and envelope', async () => {
  const quotaNamespace = new FakeQuotaNamespace({
    responseFactory: () => quotaResponse(429, { allowed: false }, { retryAfter: '12' }),
  });
  const response = await handlePublicApiRequest(
    authenticatedRequest(),
    { API_KEY_PEPPER: pepper },
    createWorkerRuntime({ quotaNamespace })
  );

  assert.equal(response.status, 429);
  assert.equal(response.headers.get('retry-after'), '12');
  assert.equal(response.headers.get('x-ratelimit-remaining-minute'), '59');
  const body = await response.json();
  assert.equal(body.error.code, 'rate_limit_exceeded');
  assert.match(body.error.request_id, /^[0-9a-f-]{36}$/);
});

test('worker fails closed on malformed or throwing Durable Object responses', async () => {
  const malformedQuota = new FakeQuotaNamespace({
    responseFactory: () => new Response(JSON.stringify({ allowed: true }), { status: 200 }),
  });
  const malformed = await handlePublicApiRequest(
    authenticatedRequest(),
    { API_KEY_PEPPER: pepper },
    createWorkerRuntime({ quotaNamespace: malformedQuota })
  );
  assert.equal(malformed.status, 503);
  assert.equal((await malformed.json()).error.code, 'quota_unavailable');

  const throwingQuota = new FakeQuotaNamespace({ throwOnFetch: true });
  const thrown = await handlePublicApiRequest(
    authenticatedRequest(),
    { API_KEY_PEPPER: pepper },
    createWorkerRuntime({ quotaNamespace: throwingQuota })
  );
  assert.equal(thrown.status, 503);
  assert.equal((await thrown.json()).error.code, 'quota_unavailable');
});

test('database named-query row and usage input validation is strict', () => {
  assert.deepEqual(normalizeVerifyApiKeyRow({
    id: keyMetadata.id,
    profile_id: keyMetadata.profileId,
    tier_code: keyMetadata.tierCode,
    monthly_quota: keyMetadata.monthlyQuota,
    per_minute_quota: keyMetadata.perMinuteQuota,
  }), keyMetadata);
  assert.throws(() => normalizeVerifyApiKeyRow({
    id: keyMetadata.id,
    profile_id: keyMetadata.profileId,
    tier_code: keyMetadata.tierCode,
    monthly_quota: 0,
    per_minute_quota: keyMetadata.perMinuteQuota,
  }), /invalid quotas/);
  assert.deepEqual(
    normalizeRecordUsageInput(keyMetadata.id, '2026-07-01T00:00:00.000Z', 0),
    { keyId: keyMetadata.id, monthStartDate: '2026-07-01', usedMonth: 0 }
  );
  assert.throws(
    () => normalizeRecordUsageInput(keyMetadata.id, '2026-07-02T00:00:00.000Z', 1),
    /first day/
  );
});

test('api key verification decodes the hex digest inside Postgres', () => {
  const databaseSource = readFileSync('cloudflare/public-api/src/database.ts', 'utf8');
  assert.match(
    databaseSource,
    /public\.verify_api_key\(decode\(\$\{digestHex\}, 'hex'\)\)/
  );
  assert.doesNotMatch(databaseSource, /digestBytea|\\\\x\$\{digestHex\}/);
});

test('catalogue row mapping fails closed on malformed database output', () => {
  assert.deepEqual(normalizeModuleRow(moduleOne), moduleOne);
  assert.deepEqual(normalizeStandardRow({ id: 0, name: '3U' }), { id: 0, name: '3U' });
  assert.deepEqual(
    normalizeTagRow({ id: 1, name: 'Oscillator', type: 4 }),
    { id: 1, name: 'Oscillator', type: 'source' }
  );
  assert.deepEqual(
    normalizeTagRow({ id: 1, name: 'Oscillator', type: 'source' }),
    { id: 1, name: 'Oscillator', type: 'source' }
  );
  assert.throws(
    () => normalizeTagRow({ id: 1, name: 'Oscillator', type: 'function' }),
    /recognized tag type/
  );
  assert.throws(
    () => normalizeModuleRow({ ...moduleOne, id: 0 }),
    /positive integer/
  );
  assert.throws(
    () => normalizeModuleRow({ ...moduleOne, is_diy: 'false' }),
    /boolean/
  );
});

test('Hyperdrive catalogue provider uses named parameterized batch queries', async () => {
  const sql = createCatalogueSql();
  const provider = new HyperdriveCatalogueProvider(sql);
  const page = await provider.listModules({
    cursor: null,
    fields: null,
    filters: { hp: 8, manufacturerId: 10, standard: 1, tag: 5 },
    include: ['ins', 'tags'],
    limit: 1,
    sort: 'name',
  });

  assert.equal(page.data.length, 1);
  assert.equal(page.data[0].ins.length, 1);
  assert.equal(page.data[0].tags[0].id, tagOne.id);
  assert.equal(sql.calls.length, 3);
  assert.equal(sql.calls.some(call => /select\s+\*/i.test(call.text)), false);
  assert.equal(sql.calls.filter(call => call.text.includes('api_v1_module_ins')).length, 1);
  assert.equal(sql.calls.filter(call => call.text.includes('join public.api_v1_tags')).length, 1);
  assert.ok(sql.calls[0].values.includes(8));
  assert.equal(sql.calls[0].text.includes('Alpha VCO'), false);
});

test('worker serves module list, detail, references, filters, fields, and includes', async () => {
  const catalogueProvider = new FakeCatalogueProvider();
  const runtime = createWorkerRuntime({ catalogueProvider, cacheStore: null });
  const env = { API_KEY_PEPPER: pepper };
  const list = await handlePublicApiRequest(
    authenticatedRequest(
      'GET',
      'https://api.patcher.xyz/v1/modules?manufacturer_id=10&hp=8&standard=1&tag=5&include=tags&fields=name'
    ),
    env,
    runtime
  );
  assert.equal(list.status, 200);
  assert.equal(list.headers.get('x-cache'), 'MISS');
  assert.match(list.headers.get('etag'), /^"[0-9a-f]{64}"$/);
  assert.equal(list.headers.get('cache-control'), 'private, no-store');
  assert.equal(list.headers.get('vary'), null);
  const listBody = await list.json();
  assert.deepEqual(Object.keys(listBody.data[0]), ['id', 'name', 'tags']);
  assert.deepEqual(listBody.data[0].tags, [tagOne]);
  assert.deepEqual(catalogueProvider.calls[0].options.filters, {
    hp: 8,
    manufacturerId: 10,
    standard: 1,
    tag: 5,
  });

  const zeroStandardProvider = new FakeCatalogueProvider();
  const zeroStandard = await handlePublicApiRequest(
    authenticatedRequest('GET', 'https://api.patcher.xyz/v1/modules?standard=0'),
    env,
    createWorkerRuntime({ catalogueProvider: zeroStandardProvider, cacheStore: null })
  );
  assert.equal(zeroStandard.status, 200);
  assert.equal(zeroStandardProvider.calls[0].options.filters.standard, 0);

  const detail = await handlePublicApiRequest(
    authenticatedRequest('GET', 'https://api.patcher.xyz/v1/modules/1?include=ins,outs,panels,tags'),
    env,
    createWorkerRuntime({ catalogueProvider: new FakeCatalogueProvider(), cacheStore: null })
  );
  assert.equal(detail.status, 200);
  const detailBody = await detail.json();
  assert.equal(detailBody.data.ins[0].name, 'Pitch');
  assert.equal(detailBody.data.outs[0].name, 'Audio');
  assert.equal(detailBody.data.panels[0].color, 'silver');

  const standards = await handlePublicApiRequest(
    authenticatedRequest('GET', 'https://api.patcher.xyz/v1/standards?sort=id'),
    env,
    createWorkerRuntime({ catalogueProvider: new FakeCatalogueProvider(), cacheStore: null })
  );
  assert.deepEqual(await standards.json(), {
    data: [standardOne],
    page: { next_cursor: null },
  });

  const tags = await handlePublicApiRequest(
    authenticatedRequest('GET', 'https://api.patcher.xyz/v1/tags?fields=name'),
    env,
    createWorkerRuntime({ catalogueProvider: new FakeCatalogueProvider(), cacheStore: null })
  );
  assert.deepEqual((await tags.json()).data[0], { id: tagOne.id, name: tagOne.name });
});

test('manufacturer detail supports include=modules without enabling list-only filters', async () => {
  const provider = new FakeCatalogueProvider();
  const response = await handlePublicApiRequest(
    authenticatedRequest('GET', 'https://api.patcher.xyz/v1/manufacturers/10?include=modules'),
    { API_KEY_PEPPER: pepper },
    createWorkerRuntime({ catalogueProvider: provider, cacheStore: null })
  );

  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.data.modules[0].manufacturer_id, 10);
  assert.equal(provider.calls[0].method, 'getManufacturer');

  const rejectedListInclude = await handlePublicApiRequest(
    authenticatedRequest('GET', 'https://api.patcher.xyz/v1/manufacturers?include=modules'),
    { API_KEY_PEPPER: pepper },
    createWorkerRuntime({ catalogueProvider: new FakeCatalogueProvider(), cacheStore: null })
  );
  assert.equal(rejectedListInclude.status, 400);
  assert.equal((await rejectedListInclude.json()).error.code, 'unknown_parameter');
});

test('detail zero and missing rows return 404 only after auth and quota', async () => {
  const quotaNamespace = new FakeQuotaNamespace();
  const zero = await handlePublicApiRequest(
    authenticatedRequest('GET', 'https://api.patcher.xyz/v1/modules/0'),
    { API_KEY_PEPPER: pepper },
    createWorkerRuntime({ quotaNamespace, catalogueProvider: new FakeCatalogueProvider() })
  );
  assert.equal(zero.status, 404);
  assert.equal(quotaNamespace.stub.requests.length, 1);

  const missing = await handlePublicApiRequest(
    authenticatedRequest('GET', 'https://api.patcher.xyz/v1/manufacturers/999'),
    { API_KEY_PEPPER: pepper },
    createWorkerRuntime({ catalogueProvider: new FakeCatalogueProvider(), cacheStore: null })
  );
  assert.equal(missing.status, 404);
  assert.equal((await missing.json()).error.code, 'not_found');
});

test('shared cache is auth-independent while auth and quota run per request', async () => {
  const metadataProvider = new FakeMetadataProvider([keyMetadata, keyMetadata2]);
  const quotaNamespace = new FakeQuotaNamespace();
  const cacheStore = new MemoryCacheStore();
  const catalogueProvider = new FakeCatalogueProvider();
  const runtime = createWorkerRuntime({
    metadataProvider,
    quotaNamespace,
    catalogueProvider,
    cacheStore,
  });

  const first = await handlePublicApiRequest(
    authenticatedRequest('GET', 'https://api.patcher.xyz/v1/modules', rawKey),
    { API_KEY_PEPPER: pepper },
    runtime
  );
  const second = await handlePublicApiRequest(
    authenticatedRequest('GET', 'https://api.patcher.xyz/v1/modules', rawKey2),
    { API_KEY_PEPPER: pepper },
    runtime
  );

  assert.equal(first.headers.get('x-cache'), 'MISS');
  assert.equal(second.headers.get('x-cache'), 'HIT');
  assert.equal(metadataProvider.calls.length, 2);
  assert.deepEqual(quotaNamespace.names, [keyMetadata.id, keyMetadata2.id]);
  assert.equal(catalogueProvider.calls.length, 1);
  const stored = [...cacheStore.entries.values()][0];
  assert.equal(stored.headers.get('x-request-id'), null);
  assert.equal(stored.headers.get('x-ratelimit-remaining-month'), null);
  assert.equal(stored.headers.get('authorization'), null);
});

test('ETag, 304, HEAD, and canonical cache keys are deterministic', async () => {
  const cacheStore = new MemoryCacheStore();
  const provider = new FakeCatalogueProvider();
  const runtime = createWorkerRuntime({ catalogueProvider: provider, cacheStore });
  const env = { API_KEY_PEPPER: pepper };
  const first = await handlePublicApiRequest(authenticatedRequest(), env, runtime);
  const etag = first.headers.get('etag');
  const second = await handlePublicApiRequest(
    authenticatedRequest('GET', 'https://api.patcher.xyz/v1/modules', rawKey, { 'If-None-Match': etag }),
    env,
    runtime
  );
  const head = await handlePublicApiRequest(
    authenticatedRequest('HEAD', 'https://api.patcher.xyz/v1/modules'),
    env,
    runtime
  );

  assert.equal(second.status, 304);
  assert.equal(await second.text(), '');
  assert.equal(second.headers.get('etag'), etag);
  assert.equal(second.headers.get('x-ratelimit-remaining-minute'), '59');
  assert.equal(head.status, 200);
  assert.equal(await head.text(), '');
  assert.equal(head.headers.get('etag'), etag);

  const limitOne = await handlePublicApiRequest(
    authenticatedRequest('GET', 'https://api.patcher.xyz/v1/modules?limit=1'),
    env,
    createWorkerRuntime({ catalogueProvider: new FakeCatalogueProvider(), cacheStore: new MemoryCacheStore() })
  );
  const limitTwo = await handlePublicApiRequest(
    authenticatedRequest('GET', 'https://api.patcher.xyz/v1/modules?limit=2'),
    env,
    createWorkerRuntime({ catalogueProvider: new FakeCatalogueProvider(), cacheStore: new MemoryCacheStore() })
  );
  assert.notEqual(limitOne.headers.get('etag'), limitTwo.headers.get('etag'));
});

test('stale cache entries serve immediately and schedule one refresh', async () => {
  let nowMs = 0;
  const cacheStore = new MemoryCacheStore();
  const provider = new FakeCatalogueProvider();
  const scheduled = [];
  const runtime = createWorkerRuntime({
    catalogueProvider: provider,
    cacheStore,
    clock: () => nowMs,
    scheduler: promise => scheduled.push(promise),
  });
  const env = { API_KEY_PEPPER: pepper };

  assert.equal((await handlePublicApiRequest(authenticatedRequest(), env, runtime)).headers.get('x-cache'), 'MISS');
  provider.modules = [{ ...moduleOne, name: 'Gamma VCO' }];
  nowMs = 3_600_001;
  const stale = await handlePublicApiRequest(authenticatedRequest(), env, runtime);
  assert.equal(stale.headers.get('x-cache'), 'STALE');
  assert.equal(scheduled.length, 1);
  await scheduled[0];

  const refreshed = await handlePublicApiRequest(authenticatedRequest(), env, runtime);
  assert.equal(refreshed.headers.get('x-cache'), 'HIT');
  assert.equal((await refreshed.json()).data[0].name, 'Gamma VCO');
});

test('cache failures fall through and origin failures return stable 503', async () => {
  const logs = [];
  const cacheFailure = await handlePublicApiRequest(
    authenticatedRequest(),
    { API_KEY_PEPPER: pepper },
    createWorkerRuntime({
      catalogueProvider: new FakeCatalogueProvider(),
      cacheStore: new ThrowingCacheStore(),
      logger: { error: line => logs.push(JSON.parse(line)) },
    })
  );
  assert.equal(cacheFailure.status, 200);
  assert.equal(cacheFailure.headers.get('x-cache'), 'MISS');
  assert.deepEqual(logs.map(log => log.event), [
    'public_api_cache_match_failed',
    'public_api_cache_put_failed',
  ]);

  const originFailure = await handlePublicApiRequest(
    authenticatedRequest(),
    { API_KEY_PEPPER: pepper },
    createWorkerRuntime({
      catalogueProvider: new FakeCatalogueProvider({ fail: true }),
      cacheStore: null,
      logger: { error: line => logs.push(JSON.parse(line)) },
    })
  );
  assert.equal(originFailure.status, 503);
  assert.equal((await originFailure.json()).error.code, 'origin_unavailable');
});

test('OpenAPI documents the implemented public catalogue routes and schemas', () => {
  const spec = readFileSync('cloudflare/public-api/openapi.yaml', 'utf8');
  for (const path of [
    '/modules:',
    '/modules/{id}:',
    '/manufacturers:',
    '/manufacturers/{id}:',
    '/standards:',
    '/tags:',
  ]) {
    assert.ok(spec.includes(`  ${path}`), `${path} missing`);
  }
  for (const operationId of [
    'listModules',
    'getModule',
    'listManufacturers',
    'getManufacturer',
    'listStandards',
    'listTags',
    'headModules',
    'headModule',
    'headManufacturers',
    'headManufacturer',
    'headStandards',
    'headTags',
  ]) {
    assert.ok(spec.includes(`operationId: ${operationId}`), `${operationId} missing`);
  }
  for (const schema of [
    'ModuleListResponse',
    'ModuleDetailResponse',
    'ManufacturerListResponse',
    'ManufacturerDetailResponse',
    'StandardListResponse',
    'TagListResponse',
    'unsupported_parameter',
    '304',
    '503',
    'HeadOk',
    'ServiceUnavailable',
    'configuration_error',
    'authentication_unavailable',
    'quota_unavailable',
    'origin_unavailable',
  ]) {
    assert.ok(spec.includes(schema), `${schema} missing`);
  }
  for (const header of [
    'X-Request-ID',
    'X-Cache',
    'ETag',
    'X-RateLimit-Limit-Month',
    'X-RateLimit-Remaining-Month',
    'X-RateLimit-Limit-Minute',
    'X-RateLimit-Remaining-Minute',
    'X-RateLimit-Reset',
    'Retry-After',
  ]) {
    assert.ok(spec.includes(header), `${header} header missing`);
  }
  assert.match(spec, /Reserved for future trigram search[\s\S]+unsupported_parameter/);
  assert.match(spec, /GET and HEAD[\s\S]+HEAD[\s\S]+returns no body/);
  assert.match(spec, /XRateLimitReset:[\s\S]+not the next reset time/);
  assert.doesNotMatch(spec, /OriginUnavailable:/);

  const responseRefsByStatus = (operationBlock) => {
    const refs = {};
    for (const match of operationBlock.matchAll(
      /\n        "(\d{3})":\n          \$ref: "#\/components\/responses\/([^"]+)"/g
    )) {
      refs[match[1]] = match[2];
    }
    return refs;
  };

  for (const [getOperationId, headOperationId, includesNotFound] of [
    ['listModules', 'headModules', false],
    ['getModule', 'headModule', true],
    ['listManufacturers', 'headManufacturers', false],
    ['getManufacturer', 'headManufacturer', true],
    ['listStandards', 'headStandards', false],
    ['listTags', 'headTags', false],
  ]) {
    const getStart = spec.indexOf(`operationId: ${getOperationId}\n`);
    const headStart = spec.indexOf(`operationId: ${headOperationId}\n`);
    const nextPath = spec.indexOf('\n  /', headStart);
    const components = spec.indexOf('\ncomponents:', headStart);
    const headEnd = nextPath === -1 ? components : nextPath;
    const getOperation = spec.slice(getStart, headStart);
    const headOperation = spec.slice(headStart, headEnd);

    assert.deepStrictEqual(responseRefsByStatus(getOperation), {
      '304': 'NotModified',
      '400': 'BadRequest',
      '401': 'Unauthorized',
      ...(includesNotFound ? { '404': 'NotFound' } : {}),
      '429': 'RateLimited',
      '503': 'ServiceUnavailable',
    });
    assert.deepStrictEqual(responseRefsByStatus(headOperation), {
      '200': 'HeadOk',
      '304': 'NotModified',
      '400': 'HeadBadRequest',
      '401': 'HeadUnauthorized',
      ...(includesNotFound ? { '404': 'HeadNotFound' } : {}),
      '429': 'HeadRateLimited',
      '503': 'HeadServiceUnavailable',
    });
  }
});

test('Durable Object persists exact counts across class instances sharing storage', async () => {
  const backing = createStorageBacking();
  const keyId = '11111111-1111-4111-8111-111111111111';
  const clock = fixedClock('2026-07-24T11:02:00.000Z');
  const firstInstance = createCounter({ backing, clock });
  const secondInstance = createCounter({ backing, clock });

  assert.equal((await consumeCounter(firstInstance, keyId, { monthly: 3, perMinute: 10 })).status, 200);
  const second = await consumeCounter(secondInstance, keyId, { monthly: 3, perMinute: 10 });

  assert.equal(second.status, 200);
  const body = await second.json();
  assert.equal(body.windows.month.used, 2);
  assert.equal(body.remaining.month, 1);
  assert.equal(backing.values.get('counter').usedMonth, 2);
});

test('Durable Object enforces minute and monthly 429 boundaries without overshoot', async () => {
  const backing = createStorageBacking();
  const keyId = '22222222-2222-4222-8222-222222222222';
  let now = new Date('2026-07-24T11:02:48.000Z');
  const counter = createCounter({ backing, clock: () => now });

  assert.equal((await consumeCounter(counter, keyId, { monthly: 2, perMinute: 1 })).status, 200);
  const blockedMinute = await consumeCounter(counter, keyId, { monthly: 2, perMinute: 1 });
  assert.equal(blockedMinute.status, 429);
  assert.equal(blockedMinute.headers.get('retry-after'), '12');
  assert.equal((await blockedMinute.json()).window, 'minute');
  assert.equal(backing.values.get('counter').usedMonth, 1);
  assert.equal(backing.values.get('counter').usedMinute, 1);

  now = new Date('2026-07-24T11:03:00.000Z');
  assert.equal((await consumeCounter(counter, keyId, { monthly: 2, perMinute: 1 })).status, 200);
  now = new Date('2026-07-24T11:04:00.000Z');
  const blockedMonth = await consumeCounter(counter, keyId, { monthly: 2, perMinute: 10 });
  assert.equal(blockedMonth.status, 429);
  assert.equal((await blockedMonth.json()).window, 'month');
  assert.equal(backing.values.get('counter').usedMonth, 2);
});

test('Durable Object refreshes latest effective limits from each consume payload', async () => {
  const backing = createStorageBacking();
  const keyId = '33333333-3333-4333-8333-333333333333';
  const counter = createCounter({
    backing,
    clock: fixedClock('2026-07-24T11:02:00.000Z'),
  });

  assert.equal((await consumeCounter(counter, keyId, { monthly: 10, perMinute: 1 })).status, 200);
  const refreshed = await consumeCounter(counter, keyId, { monthly: 10, perMinute: 2 });
  assert.equal(refreshed.status, 200);
  assert.equal((await refreshed.json()).remaining.minute, 0);
  assert.equal(backing.values.get('limits').perMinuteQuota, 2);

  const lowered = await consumeCounter(counter, keyId, { monthly: 1, perMinute: 10 });
  assert.equal(lowered.status, 429);
  assert.equal((await lowered.json()).window, 'month');
  assert.equal(backing.values.get('limits').monthlyQuota, 1);
  assert.equal(backing.values.get('counter').usedMonth, 2);
});

test('Durable Object alarm flushes pending usage successfully', async () => {
  const backing = createStorageBacking();
  const reporter = new FakeReporter();
  const keyId = '44444444-4444-4444-8444-444444444444';
  const now = new Date('2026-07-24T11:02:00.000Z');
  const counter = createCounter({ backing, reporter, clock: () => now });

  assert.equal((await consumeCounter(counter, keyId, { monthly: 10, perMinute: 10 })).status, 200);
  assert.equal(reporter.calls.length, 0);
  assert.ok(backing.alarm <= now.getTime() + 5 * 60 * 1000);

  await counter.alarm();
  assert.deepEqual(reporter.calls, [{
    keyId,
    monthStart: '2026-07-01T00:00:00.000Z',
    usedMonth: 1,
  }]);
  assert.deepEqual(backing.values.get('usageReports').entries['2026-07-01T00:00:00.000Z'], {
    keyId,
    monthStart: '2026-07-01T00:00:00.000Z',
    pendingCount: 1,
    flushedCount: 1,
  });
  assert.equal((await consumeCounter(counter, keyId, { monthly: 10, perMinute: 10 })).status, 200);
  assert.equal(reporter.calls.length, 1);
});

test('Durable Object alarm retries failures with 30s, 5m, then 30m cap', async () => {
  const backing = createStorageBacking();
  const reporter = new FakeReporter({ failTimes: 4 });
  const logs = [];
  const keyId = '55555555-5555-4555-8555-555555555555';
  let now = new Date('2026-07-24T11:02:00.000Z');
  const counter = createCounter({
    backing,
    reporter,
    clock: () => now,
    logger: { error: line => logs.push(JSON.parse(line)) },
  });
  await consumeCounter(counter, keyId, { monthly: 10, perMinute: 10 });

  await counter.alarm();
  assert.equal(backing.alarm, now.getTime() + 30 * 1000);
  now = new Date(backing.alarm);
  await counter.alarm();
  assert.equal(backing.alarm, now.getTime() + 5 * 60 * 1000);
  now = new Date(backing.alarm);
  await counter.alarm();
  assert.equal(backing.alarm, now.getTime() + 30 * 60 * 1000);
  const escalatedAlarm = backing.alarm;
  assert.equal((await consumeCounter(counter, keyId, { monthly: 10, perMinute: 10 })).status, 200);
  assert.equal(backing.alarm, escalatedAlarm);
  assert.equal(reporter.calls.length, 3);
  now = new Date(backing.alarm);
  await counter.alarm();
  assert.equal(backing.alarm, now.getTime() + 30 * 60 * 1000);
  assert.deepEqual(logs.map(log => log.flush_retries_total), [1, 2, 3, 4]);
  assert.equal(logs[0].key_id, keyId);
});

test('Durable Object reporting failure does not fail threshold consume', async () => {
  const backing = createStorageBacking();
  const reporter = new FakeReporter({ failTimes: 1 });
  const logs = [];
  const keyId = '66666666-6666-4666-8666-666666666666';
  const counter = createCounter({
    backing,
    reporter,
    clock: fixedClock('2026-07-24T11:02:00.000Z'),
    logger: { error: line => logs.push(JSON.parse(line)) },
  });

  let response;
  for (let index = 0; index < 500; index += 1) {
    response = await consumeCounter(counter, keyId, { monthly: 1000, perMinute: 1000 });
  }

  assert.equal(response.status, 200);
  assert.equal(reporter.calls.length, 1);
  assert.equal(logs.length, 1);
  assert.equal(logs[0].flush_retries_total, 1);
  assert.equal(backing.alarm, Date.parse('2026-07-24T11:02:30.000Z'));

  const retryAlarm = backing.alarm;
  response = await consumeCounter(counter, keyId, { monthly: 1000, perMinute: 1000 });
  assert.equal(response.status, 200);
  assert.equal(reporter.calls.length, 1);
  assert.equal(logs.length, 1);
  assert.equal(backing.alarm, retryAlarm);
});

test('Durable Object rollover retains prior month and flushes both months monotonically', async () => {
  const backing = createStorageBacking();
  const reporter = new FakeReporter();
  const keyId = '77777777-7777-4777-8777-777777777777';
  let now = new Date('2026-07-31T23:59:00.000Z');
  const counter = createCounter({ backing, reporter, clock: () => now });

  assert.equal((await consumeCounter(counter, keyId, { monthly: 10, perMinute: 10 })).status, 200);
  now = new Date('2026-08-01T00:00:00.000Z');
  assert.equal((await consumeCounter(counter, keyId, { monthly: 10, perMinute: 10 })).status, 200);
  now = new Date('2026-08-01T00:01:00.000Z');
  assert.equal((await consumeCounter(counter, keyId, { monthly: 10, perMinute: 10 })).status, 200);

  await counter.alarm();
  assert.deepEqual(reporter.calls, [
    { keyId, monthStart: '2026-07-01T00:00:00.000Z', usedMonth: 1 },
    { keyId, monthStart: '2026-08-01T00:00:00.000Z', usedMonth: 2 },
  ]);
  assert.deepEqual(Object.keys(backing.values.get('usageReports').entries), [
    '2026-08-01T00:00:00.000Z',
  ]);
  assert.equal(
    backing.values.get('usageReports').entries['2026-08-01T00:00:00.000Z'].flushedCount,
    2
  );
});

test('Durable Object rejects malformed method, path, JSON, and consume payloads', async () => {
  const counter = createCounter({});
  const keyId = '88888888-8888-4888-8888-888888888888';

  const method = await counter.fetch(new Request('https://quota.local/consume', { method: 'GET' }));
  assert.equal(method.status, 405);

  const path = await counter.fetch(new Request('https://quota.local/wrong', { method: 'POST' }));
  assert.equal(path.status, 404);

  const invalidJson = await counter.fetch(new Request('https://quota.local/consume', {
    method: 'POST',
    body: '{',
  }));
  assert.equal(invalidJson.status, 400);
  assert.equal((await invalidJson.json()).error.code, 'invalid_json');

  const invalidUuid = await consumeCounter(counter, 'not-a-uuid', { monthly: 1, perMinute: 1 });
  assert.equal(invalidUuid.status, 400);

  const invalidLimits = await counter.fetch(new Request('https://quota.local/consume', {
    method: 'POST',
    body: JSON.stringify({ keyId, limits: { monthly: 0, perMinute: 1 } }),
  }));
  assert.equal(invalidLimits.status, 400);
  assert.equal((await invalidLimits.json()).error.code, 'malformed_payload');
});

function fixedClock(isoTimestamp) {
  return () => new Date(isoTimestamp);
}

function authenticatedRequest(
  method = 'GET',
  url = 'https://api.patcher.xyz/v1/modules',
  key = rawKey,
  headers = {}
) {
  return new Request(url, {
    method,
    headers: { Authorization: `Bearer ${key}`, ...headers },
  });
}

function createWorkerRuntime({
  metadataProvider = new FakeMetadataProvider([keyMetadata]),
  quotaNamespace = new FakeQuotaNamespace(),
  metadataCache = new ApiKeyMetadataCache(1000, 60_000),
  clock = () => 0,
  catalogueProvider,
  cacheStore,
  scheduler,
  logger = { error: () => undefined },
} = {}) {
  return {
    metadataProvider,
    quotaNamespace,
    metadataCache,
    clock,
    catalogueProvider,
    cacheStore,
    scheduler,
    logger,
  };
}

class FakeCatalogueProvider {
  constructor({ fail = false } = {}) {
    this.fail = fail;
    this.modules = [moduleOne, moduleTwo];
    this.manufacturers = [manufacturerOne];
    this.standards = [standardOne];
    this.tags = [tagOne];
    this.calls = [];
  }

  async listModules(options) {
    this.record('listModules', options);
    const filtered = this.modules
      .filter(module => options.filters.manufacturerId === null
        || module.manufacturer_id === options.filters.manufacturerId)
      .filter(module => options.filters.hp === null || module.hp === options.filters.hp)
      .filter(module => options.filters.standard === null
        || module.standard === options.filters.standard)
      .filter(() => options.filters.tag === null || options.filters.tag === tagOne.id);
    return pageWithIncludes(filtered, options);
  }

  async getModule(id, options) {
    this.record('getModule', options);
    const module = this.modules.find(item => item.id === id);
    return module ? moduleWithIncludes(applyFields(module, options.fields), options.include) : null;
  }

  async listManufacturers(options) {
    this.record('listManufacturers', options);
    return pageItems(this.manufacturers, options);
  }

  async getManufacturer(id, options) {
    this.record('getManufacturer', options);
    const manufacturer = this.manufacturers.find(item => item.id === id);
    if (!manufacturer) {
      return null;
    }
    const result = applyFields(manufacturer, options.fields);
    if (options.includeModules) {
      result.modules = this.modules.filter(module => module.manufacturer_id === id);
    }
    return result;
  }

  async listStandards(options) {
    this.record('listStandards', options);
    return pageItems(this.standards, options);
  }

  async listTags(options) {
    this.record('listTags', options);
    return pageItems(this.tags, options);
  }

  record(method, options) {
    if (this.fail) {
      throw new Error('simulated catalogue outage');
    }
    this.calls.push({ method, options: structuredClone(options) });
  }
}

class MemoryCacheStore {
  constructor() {
    this.entries = new Map();
  }

  async match(request) {
    const response = this.entries.get(request.url);
    return response ? response.clone() : undefined;
  }

  async put(request, response) {
    this.entries.set(request.url, response.clone());
  }
}

class ThrowingCacheStore {
  async match() {
    throw new Error('simulated cache match failure');
  }

  async put() {
    throw new Error('simulated cache put failure');
  }
}

function pageWithIncludes(modules, options) {
  const page = pageItems(modules, options);
  return {
    ...page,
    data: page.data.map(module => moduleWithIncludes(module, options.include)),
  };
}

function moduleWithIncludes(module, include) {
  const result = { ...module };
  if (include.includes('ins')) {
    result.ins = [{ id: 100, name: 'Pitch', is_audio: false, is_dcc: false, is_voct: true, min: -5, max: 5 }];
  }
  if (include.includes('outs')) {
    result.outs = [{ id: 200, name: 'Audio', is_audio: true, is_dcc: false, is_voct: false, min: -10, max: 10 }];
  }
  if (include.includes('panels')) {
    result.panels = [{ id: 300, color: 'silver', description: 'Aluminum' }];
  }
  if (include.includes('tags')) {
    result.tags = [tagOne];
  }
  return result;
}

function pageItems(items, options) {
  const sorted = [...items].sort((left, right) => {
    if (options.sort === 'id') {
      return left.id - right.id;
    }
    return left.name.localeCompare(right.name) || left.id - right.id;
  });
  const afterCursor = options.cursor
    ? sorted.filter(item => afterItemCursor(item, options.cursor, options.sort))
    : sorted;
  const data = afterCursor.slice(0, options.limit).map(item => applyFields(item, options.fields));
  return {
    data,
    page: {
      next_cursor: afterCursor.length > options.limit && data.length > 0
        ? encodeCursor(data[data.length - 1], options.sort)
        : null,
    },
  };
}

function afterItemCursor(item, cursor, sort) {
  if (sort === 'id') {
    return item.id > cursor.id;
  }
  return item.name > cursor.s || (item.name === cursor.s && item.id > cursor.id);
}

function applyFields(item, fields) {
  if (!fields) {
    return { ...item };
  }
  const keep = new Set(['id', ...fields]);
  return Object.fromEntries(Object.entries(item).filter(([key]) => keep.has(key)));
}

function encodeCursor(item, sort) {
  return Buffer.from(JSON.stringify({
    v: 1,
    s: sort === 'id' ? item.id : item.name,
    id: item.id,
  })).toString('base64url');
}

function createCatalogueSql() {
  const calls = [];
  const sql = (strings, ...values) => {
    const text = strings.join('?');
    calls.push({ text, values });
    if (text.includes('from public.api_v1_modules m')) {
      return Promise.resolve([moduleOne, moduleTwo]);
    }
    if (text.includes('from public.api_v1_module_ins')) {
      return Promise.resolve([{
        id: 100,
        moduleid: 1,
        name: 'Pitch',
        is_audio: false,
        is_dcc: false,
        is_voct: true,
        min: -5,
        max: 5,
      }]);
    }
    if (text.includes('from public.api_v1_module_tags')) {
      return Promise.resolve([{ moduleid: 1, ...tagOne }]);
    }
    return Promise.resolve([]);
  };
  sql.array = (values, type) => ({ values, type });
  sql.calls = calls;
  return sql;
}

class FakeMetadataProvider {
  constructor(results, { fail = false } = {}) {
    this.results = results;
    this.fail = fail;
    this.calls = [];
  }

  async verifyApiKeyHash(digestHex) {
    this.calls.push(digestHex);
    if (this.fail) {
      throw new Error('simulated verifier outage');
    }
    if (this.results.length === 0) {
      return keyMetadata;
    }
    return this.results[Math.min(this.calls.length - 1, this.results.length - 1)];
  }
}

class FakeQuotaNamespace {
  constructor({ responseFactory = () => quotaResponse(), throwOnFetch = false } = {}) {
    this.names = [];
    this.stub = new FakeQuotaStub(responseFactory, throwOnFetch);
  }

  idFromName(name) {
    this.names.push(name);
    return { name };
  }

  get() {
    return this.stub;
  }
}

class FakeQuotaStub {
  constructor(responseFactory, throwOnFetch) {
    this.responseFactory = responseFactory;
    this.throwOnFetch = throwOnFetch;
    this.requests = [];
  }

  async fetch(input, init) {
    if (this.throwOnFetch) {
      throw new Error('simulated Durable Object outage');
    }
    const request = input instanceof Request ? input : new Request(input, init);
    const body = await request.json();
    this.requests.push({
      url: request.url,
      method: request.method,
      body,
    });
    return this.responseFactory(body);
  }
}

function quotaResponse(status = 200, body = { allowed: true }, { retryAfter } = {}) {
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'X-RateLimit-Limit-Month': String(keyMetadata.monthlyQuota),
    'X-RateLimit-Limit-Minute': String(keyMetadata.perMinuteQuota),
    'X-RateLimit-Remaining-Month': '999',
    'X-RateLimit-Remaining-Minute': '59',
    'X-RateLimit-Reset': '2026-07-24T11:02:00.000Z',
  };
  if (retryAfter !== undefined) {
    headers['Retry-After'] = retryAfter;
  }
  return new Response(JSON.stringify(body), { status, headers });
}

function createCounter({
  backing = createStorageBacking(),
  reporter = new FakeReporter(),
  clock = fixedClock('2026-07-24T11:02:00.000Z'),
  logger = { error: () => undefined },
}) {
  return new ApiKeyCounter(
    { storage: new FakeDurableObjectStorage(backing) },
    {},
    { reporter, clock, logger }
  );
}

function consumeCounter(counter, keyId, limits) {
  return counter.fetch(new Request('https://quota.local/consume', {
    method: 'POST',
    body: JSON.stringify({ keyId, limits }),
  }));
}

function createStorageBacking() {
  return { values: new Map(), alarm: null };
}

class FakeDurableObjectStorage {
  constructor(backing) {
    this.backing = backing;
  }

  async get(key) {
    return cloneValue(this.backing.values.get(key));
  }

  async put(key, value) {
    this.backing.values.set(key, cloneValue(value));
  }

  async delete(key) {
    return this.backing.values.delete(key);
  }

  async transaction(closure) {
    return closure(this);
  }

  async getAlarm() {
    return this.backing.alarm;
  }

  async setAlarm(scheduledTime) {
    this.backing.alarm = scheduledTime instanceof Date
      ? scheduledTime.getTime()
      : scheduledTime;
  }
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

function cloneValue(value) {
  return value === undefined ? undefined : structuredClone(value);
}
