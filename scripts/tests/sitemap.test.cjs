const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');

const compiledSitemapPath = path.resolve(process.cwd(), 'tmp/sitemap-test/sitemap.js');
const originalFetch = global.fetch;
const originalAnonKey = process.env.SUPABASE_ANON_KEY;
const originalVercelEnv = process.env.VERCEL_ENV;
const originalVercelProjectProductionUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL;
const originalSeoCanonicalOrigin = process.env.SEO_CANONICAL_ORIGIN;

function setEnv(name, value) {
  if (value === undefined) {
    delete process.env[name];
    return;
  }
  process.env[name] = value;
}

function loadSitemapHandler({
  anonKey = 'test-key',
  vercelEnv = 'production',
  productionUrl = 'patcher.xyz',
  canonicalOrigin
} = {}) {
  setEnv('SUPABASE_ANON_KEY', anonKey);
  setEnv('VERCEL_ENV', vercelEnv);
  setEnv('VERCEL_PROJECT_PRODUCTION_URL', productionUrl);
  setEnv('SEO_CANONICAL_ORIGIN', canonicalOrigin);
  delete require.cache[compiledSitemapPath];
  return require(compiledSitemapPath).default;
}

function makeRequest(method = 'GET', host = 'patcher.xyz') {
  return {
    method,
    headers: {
      host
    }
  };
}

function makeResponseRecorder() {
  const state = {
    headers: {},
    statusCode: 0,
    body: ''
  };

  return {
    state,
    res: {
      setHeader(name, value) {
        state.headers[String(name).toLowerCase()] = value;
      },
      status(code) {
        state.statusCode = code;
        return this;
      },
      send(payload) {
        state.body = String(payload);
        return this;
      }
    }
  };
}

function ok(payload) {
  return {
    ok: true,
    async json() {
      return payload;
    }
  };
}

function stubSupabaseResponses({
  modules = [],
  patches = [],
  racks = []
} = {}) {
  const calls = [];
  global.fetch = async (url) => {
    const rawUrl = String(url);
    calls.push(rawUrl);
    if (rawUrl.includes('/rest/v1/modules?')) {
      return ok(modules);
    }
    if (rawUrl.includes('/rest/v1/patches?')) {
      return ok(patches);
    }
    if (rawUrl.includes('/rest/v1/racks?')) {
      return ok(racks);
    }
    return ok([]);
  };
  return calls;
}

test.after(() => {
  global.fetch = originalFetch;
  setEnv('SUPABASE_ANON_KEY', originalAnonKey);
  setEnv('VERCEL_ENV', originalVercelEnv);
  setEnv('VERCEL_PROJECT_PRODUCTION_URL', originalVercelProjectProductionUrl);
  setEnv('SEO_CANONICAL_ORIGIN', originalSeoCanonicalOrigin);
});

test('returns 405 for non-GET requests', async () => {
  const handler = loadSitemapHandler();
  const calls = stubSupabaseResponses();
  const { res, state } = makeResponseRecorder();

  await handler(makeRequest('POST'), res);

  assert.equal(state.statusCode, 405);
  assert.equal(state.headers.allow, 'GET');
  assert.equal(state.body, 'Method Not Allowed');
  assert.equal(calls.length, 0);
});

test('returns dynamic sitemap XML with static and entity routes in production', async () => {
  const handler = loadSitemapHandler();
  const calls = stubSupabaseResponses({
    modules: [{ id: 72, updated: '2026-02-20T10:00:00.000Z' }],
    patches: [{ id: 16, updated: '2026-02-21T10:00:00.000Z' }],
    racks: [{ id: 91, updated: '2026-02-22T10:00:00.000Z' }]
  });
  const { res, state } = makeResponseRecorder();

  await handler(makeRequest('GET', 'patcher.xyz'), res);

  assert.equal(state.statusCode, 200);
  assert.equal(state.headers['content-type'], 'application/xml; charset=utf-8');
  assert.equal(state.headers['x-robots-tag'], 'index, follow, max-image-preview:large');
  assert.equal(state.headers['cache-control'], 'public, s-maxage=900, stale-while-revalidate=86400');
  assert.match(state.body, /^<\?xml version="1\.0" encoding="UTF-8"\?>/);
  assert.match(state.body, /<loc>https:\/\/patcher\.xyz\/home<\/loc>/);
  assert.match(state.body, /<loc>https:\/\/patcher\.xyz\/modules\/details\/72<\/loc>/);
  assert.match(state.body, /<loc>https:\/\/patcher\.xyz\/patches\/details\/16<\/loc>/);
  assert.match(state.body, /<loc>https:\/\/patcher\.xyz\/racks\/details\/91<\/loc>/);
  assert.match(state.body, /<lastmod>2026-02-20T10:00:00\.000Z<\/lastmod>/);
  assert.equal(calls.length, 3);
  assert.ok(calls.every((url) => url.includes('public=eq.true')));
});

test('returns noindex + production-origin URLs for preview deployments', async () => {
  const handler = loadSitemapHandler({
    vercelEnv: 'preview',
    productionUrl: 'patcher.xyz'
  });
  stubSupabaseResponses();
  const { res, state } = makeResponseRecorder();

  await handler(makeRequest('GET', 'patcher-git-pr-123.vercel.app'), res);

  assert.equal(state.statusCode, 200);
  assert.equal(state.headers['x-robots-tag'], 'noindex, nofollow, noarchive');
  assert.equal(state.headers['cache-control'], 'private, no-store, max-age=0');
  assert.match(state.body, /<loc>https:\/\/patcher\.xyz\/home<\/loc>/);
});

test('skips Supabase lookups when SUPABASE_ANON_KEY is missing', async () => {
  const handler = loadSitemapHandler({ anonKey: '' });
  const calls = stubSupabaseResponses({
    modules: [{ id: 72, updated: '2026-02-20T10:00:00.000Z' }]
  });
  const { res, state } = makeResponseRecorder();

  await handler(makeRequest('GET', 'patcher.xyz'), res);

  assert.equal(state.statusCode, 200);
  assert.equal(calls.length, 0);
  assert.match(state.body, /<loc>https:\/\/patcher\.xyz\/modules\/browser<\/loc>/);
  assert.doesNotMatch(state.body, /<loc>https:\/\/patcher\.xyz\/modules\/details\/72<\/loc>/);
});
