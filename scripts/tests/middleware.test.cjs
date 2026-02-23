const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');


const compiledMiddlewarePath = path.resolve(process.cwd(), 'tmp/middleware-test/middleware.js');
const originalFetch = global.fetch;
const originalAnonKey = process.env.SUPABASE_ANON_KEY;

function loadMiddleware(anonKey = 'test-key') {
  if (anonKey === undefined) {
    delete process.env.SUPABASE_ANON_KEY;
  } else {
    process.env.SUPABASE_ANON_KEY = anonKey;
  }
  delete require.cache[compiledMiddlewarePath];
  return require(compiledMiddlewarePath).default;
}

function makeRequest(pathname, userAgent = 'Slackbot-LinkExpanding 1.0') {
  return new Request(`https://patcher.xyz${ pathname }`, {
    method: 'GET',
    headers: {
      'user-agent': userAgent
    }
  });
}

function modulePayload() {
  return [{
    id: 72,
    name: 'Test Module',
    description: 'Module description from Supabase',
    hp: 8,
    created: '2024-01-01T00:00:00.000Z',
    updated: '2024-01-02T00:00:00.000Z',
    manufacturer: {
      name: 'Acme'
    },
    panels: [{
      filename: 'panel.png',
      color: 1
    }]
  }];
}

function stubFetchWithPayload(payloadFactory) {
  let calls = 0;
  global.fetch = async () => {
    calls += 1;
    return {
      ok: true,
      async json() {
        return payloadFactory();
      }
    };
  };
  return () => calls;
}

test.after(() => {
  global.fetch = originalFetch;
  if (originalAnonKey === undefined) {
    delete process.env.SUPABASE_ANON_KEY;
  } else {
    process.env.SUPABASE_ANON_KEY = originalAnonKey;
  }
});

test('passes through non-bot requests without hitting Supabase', async () => {
  const middleware = loadMiddleware('test-key');
  const getCalls = stubFetchWithPayload(modulePayload);

  const response = await middleware(makeRequest('/modules/details/72', 'Mozilla/5.0'));

  assert.equal(response, undefined);
  assert.equal(getCalls(), 0);
});

test('returns entity-specific metadata for bot detail requests', async () => {
  const middleware = loadMiddleware('test-key');
  const getCalls = stubFetchWithPayload(modulePayload);

  const response = await middleware(makeRequest('/modules/details/72'));
  const html = await response.text();

  assert.equal(response.status, 200);
  assert.equal(response.headers.get('x-patcher-seo-cache'), 'miss');
  assert.equal(getCalls(), 1);
  assert.match(html, /Test Module by Acme/);
  assert.match(html, /og:title/);
  assert.match(html, /rel="canonical"/);
  assert.match(html, /module-panels\/panel\.png/);
});

test('reuses in-memory cache for repeated bot requests', async () => {
  const middleware = loadMiddleware('test-key');
  const getCalls = stubFetchWithPayload(modulePayload);

  const first = await middleware(makeRequest('/modules/details/72'));
  const second = await middleware(makeRequest('/modules/details/72'));

  assert.equal(first.headers.get('x-patcher-seo-cache'), 'miss');
  assert.equal(second.headers.get('x-patcher-seo-cache'), 'hit');
  assert.equal(getCalls(), 1);
});

test('serves default metadata for bot requests outside detail routes', async () => {
  const middleware = loadMiddleware('test-key');
  const getCalls = stubFetchWithPayload(modulePayload);

  const response = await middleware(makeRequest('/home'));
  const html = await response.text();

  assert.equal(response.status, 200);
  assert.equal(response.headers.get('x-patcher-seo-cache'), 'miss');
  assert.equal(getCalls(), 0);
  assert.match(html, /Patcher\.xyz/);
});

test('fails open to default metadata when SUPABASE_ANON_KEY is empty', async () => {
  const middleware = loadMiddleware('');
  const getCalls = stubFetchWithPayload(modulePayload);

  const response = await middleware(makeRequest('/modules/details/72'));
  const html = await response.text();

  assert.equal(response.status, 200);
  assert.equal(response.headers.get('x-patcher-seo-cache'), 'miss');
  assert.equal(getCalls(), 0);
  assert.match(html, /Patcher\.xyz/);
});
