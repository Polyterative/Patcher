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

function rackPayload(image = 'rack-preview.jpeg') {
  return [{
    id: 91,
    name: 'Rack 91',
    description: 'Rack description',
    hp: 104,
    rows: 2,
    image,
    created: '2024-02-01T00:00:00.000Z',
    updated: '2024-02-02T00:00:00.000Z'
  }];
}

function stubFetchWithPayload(payloadFactory) {
  let calls = 0;
  global.fetch = async (url) => {
    calls += 1;
    return {
      ok: true,
      async json() {
        return payloadFactory(url);
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
  assert.match(response.headers.get('x-patcher-seo-source') || '', /^module-/);
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
  assert.equal(response.headers.get('x-patcher-seo-source'), 'non-detail');
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
  assert.equal(response.headers.get('x-patcher-seo-source'), 'module-no-key');
  assert.equal(getCalls(), 0);
  assert.match(html, /Patcher\.xyz/);
});

test('uses request host for canonical and og:url metadata', async () => {
  const middleware = loadMiddleware('test-key');
  stubFetchWithPayload(modulePayload);

  const response = await middleware(new Request('https://dev.patcher.xyz/modules/details/72', {
    method: 'GET',
    headers: {
      'user-agent': 'Slackbot-LinkExpanding 1.0'
    }
  }));
  const html = await response.text();

  assert.match(html, /rel="canonical" href="https:\/\/dev\.patcher\.xyz\/modules\/details\/72"/);
  assert.match(html, /property="og:url" content="https:\/\/dev\.patcher\.xyz\/modules\/details\/72"/);
});

test('resolves rack image filename from rack record', async () => {
  const middleware = loadMiddleware('test-key');
  stubFetchWithPayload((url) => {
    if (String(url).includes('/rest/v1/racks')) {
      return rackPayload('rack-preview.jpeg');
    }
    return [];
  });

  const response = await middleware(makeRequest('/racks/details/91'));
  const html = await response.text();

  assert.equal(response.status, 200);
  assert.equal(response.headers.get('x-patcher-seo-source'), 'rack-image');
  assert.match(html, /storage\/v1\/object\/public\/racks\/rack-preview\.jpeg/);
});

test('normalizes rack image path stored as storage object path', async () => {
  const middleware = loadMiddleware('test-key');
  stubFetchWithPayload((url) => {
    if (String(url).includes('/rest/v1/racks')) {
      return rackPayload('storage/v1/object/public/racks/rack-92.jpeg');
    }
    return [];
  });

  const response = await middleware(makeRequest('/racks/details/91'));
  const html = await response.text();

  assert.equal(response.status, 200);
  assert.equal(response.headers.get('x-patcher-seo-source'), 'rack-image');
  assert.match(html, /storage\/v1\/object\/public\/racks\/rack-92\.jpeg/);
  assert.doesNotMatch(html, /storage\/v1\/object\/public\/racks\/storage%2Fv1%2Fobject/);
});

test('detail fallback is noindex and not cached (private/nonexistent protection)', async () => {
  const middleware = loadMiddleware('test-key');
  const getCalls = stubFetchWithPayload(() => []);

  const first = await middleware(makeRequest('/racks/details/999999'));
  const second = await middleware(makeRequest('/racks/details/999999'));

  assert.equal(first.status, 200);
  assert.equal(first.headers.get('x-robots-tag'), 'noindex, nofollow, noarchive');
  assert.equal(first.headers.get('cache-control'), 'private, no-store, max-age=0');
  assert.equal(first.headers.get('x-patcher-seo-cache'), 'miss');
  assert.equal(second.headers.get('x-patcher-seo-cache'), 'miss');
  assert.equal(first.headers.get('x-patcher-seo-source'), 'rack-not-found');
  assert.equal(getCalls(), 2);
});
