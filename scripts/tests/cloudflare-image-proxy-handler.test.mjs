import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import worker, { buildOriginImageUrl } from '../../cloudflare/image-proxy/src/index.ts';

const ORIGIN = 'https://supabase.test/storage/v1/object/public';
const env = {
  SUPABASE_STORAGE_ORIGIN: ORIGIN,
  ALLOWED_BUCKETS: 'module-panels,racks',
  BROWSER_CACHE_TTL_SECONDS: '60',
  EDGE_CACHE_TTL_SECONDS: '120',
};
const realFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = realFetch; });

function stubFetch(response) {
  const calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), init });
    return typeof response === 'function' ? response(url, init) : response;
  };
  return calls;
}

const imageResponse = (status = 200, headers = {}) => new Response('bytes', {
  status,
  headers: { 'content-type': 'image/png', 'content-length': '5', ...headers },
});

test('path traversal and smuggling attempts never reach the origin outside the bucket path', () => {
  const attacks = [
    '/module-panels/../racks/a.png',
    '/module-panels/%2e%2e/racks/a.png',
    '/module-panels/%2E%2E/a.png',
    '/module-panels/./a.png',
    '/module-panels/%2e/a.png',
    '/%2e%2e/module-panels/a.png',
    '/module-panels/..%2fracks%2fa.png',
    '/module-panels/a%00.png',
    '/module-panels/%',
    '/module-panels/%E0%A4%A',
    '/module-panels/%c0%ae%c0%ae/a.png',
    '/module-panels',
    '/module-panels/',
    '/',
    '',
    '/not-allowed/a.png',
    '/MODULE-PANELS/a.png',
    '/module-panels%2fa.png',
    '/%6d%6f%64%75%6c%65-panels/a.png',
  ];
  for (const path of attacks) {
    const built = buildOriginImageUrl(`https://images.patcher.xyz${path}`, env);
    if (built === null) continue;
    const parsed = new URL(built);
    assert.equal(parsed.origin, 'https://supabase.test', path);
    assert.ok(parsed.pathname.startsWith('/storage/v1/object/public/'), `${path} -> ${built}`);
    assert.ok(!/\/\.\.?(\/|$)/.test(parsed.pathname), `${path} -> ${built}`);
    assert.equal(parsed.search, '', path);
    assert.equal(parsed.hash, '', path);
  }
});

test('dot segments (literal or percent-encoded) are collapsed by URL parsing before the bucket check', () => {
  for (const path of ['/racks/%2e%2e/a.png', '/racks/%2E%2E/a.png', '/racks/%2e/a.png', '/racks/a/%2e%2e/b.png']) {
    const built = buildOriginImageUrl(`https://images.patcher.xyz${path}`, env);
    assert.ok(built === null || built.startsWith(`${ORIGIN}/racks/`) || built.startsWith(`${ORIGIN}/module-panels/`), `${path} -> ${built}`);
  }
  assert.equal(buildOriginImageUrl('https://images.patcher.xyz/racks/%2e%2e/%2e%2e/etc/passwd', env), null);
  assert.equal(buildOriginImageUrl('https://images.patcher.xyz/racks/%2e%2e/evil/a.png', env), null);
  // Literal "../" never survives to the origin: it is collapsed first and the result is still bucket-checked.
  assert.equal(
    buildOriginImageUrl('https://images.patcher.xyz/racks/../module-panels/a.png', env),
    `${ORIGIN}/module-panels/a.png`
  );
  assert.equal(buildOriginImageUrl('https://images.patcher.xyz/racks/../evil/a.png', env), null);
  assert.equal(buildOriginImageUrl('https://images.patcher.xyz/racks/../../../etc/passwd', env), null);
});

test('an encoded slash in a segment stays one encoded segment', () => {
  const built = buildOriginImageUrl('https://images.patcher.xyz/racks/a%2Fb.png', env);
  assert.equal(built, `${ORIGIN}/racks/a%2Fb.png`);
});

test('encoded query and fragment delimiters stay in the path and cannot reach the origin as a query', () => {
  const built = buildOriginImageUrl('https://images.patcher.xyz/racks/a%3Fb%23c.png?x=1#y', env);
  assert.equal(built, `${ORIGIN}/racks/a%3Fb%23c.png`);
  assert.equal(new URL(built).search, '');
});

test('double-encoded dots are not decoded twice', () => {
  const built = buildOriginImageUrl('https://images.patcher.xyz/racks/%252e%252e/a.png', env);
  assert.equal(built, `${ORIGIN}/racks/%252e%252e/a.png`);
});

test('bucket names are matched exactly (case, prefix, suffix, whitespace)', () => {
  for (const bucket of ['Racks', 'rack', 'racks2', 'racks.', 'racks%20', '%20racks', 'racks%00']) {
    assert.equal(buildOriginImageUrl(`https://images.patcher.xyz/${bucket}/a.png`, env), null, bucket);
  }
});

test('ALLOWED_BUCKETS parsing trims, ignores blanks and falls back to defaults when empty', () => {
  const spaced = { ...env, ALLOWED_BUCKETS: ' racks , ,module-panels ,' };
  assert.ok(buildOriginImageUrl('https://images.patcher.xyz/racks/a.png', spaced));
  assert.ok(buildOriginImageUrl('https://images.patcher.xyz/module-panels/a.png', spaced));
  const empty = { ...env, ALLOWED_BUCKETS: ' , ' };
  assert.ok(buildOriginImageUrl('https://images.patcher.xyz/patches/a.png', empty));
  assert.equal(buildOriginImageUrl('https://images.patcher.xyz/evil/a.png', empty), null);
});

test('a trailing slash on the configured origin does not produce double slashes', () => {
  const built = buildOriginImageUrl('https://images.patcher.xyz/racks/a.png', { ...env, SUPABASE_STORAGE_ORIGIN: `${ORIGIN}///` });
  assert.equal(built, `${ORIGIN}/racks/a.png`);
});

test('handler rejects non-GET/HEAD methods with 405 and an Allow header, without fetching', async () => {
  const calls = stubFetch(imageResponse());
  for (const method of ['POST', 'PUT', 'DELETE', 'PATCH']) {
    const res = await worker.fetch(new Request('https://images.patcher.xyz/racks/a.png', { method }), env);
    assert.equal(res.status, 405, method);
    assert.equal(res.headers.get('Allow'), 'GET, HEAD, OPTIONS');
    assert.equal(res.headers.get('Cache-Control'), 'no-store');
  }
  assert.equal(calls.length, 0);
});

test('OPTIONS answers CORS preflight without touching the origin', async () => {
  const calls = stubFetch(imageResponse());
  const res = await worker.fetch(new Request('https://images.patcher.xyz/racks/a.png', { method: 'OPTIONS' }), env);
  assert.equal(res.status, 204);
  assert.equal(res.headers.get('Access-Control-Allow-Methods'), 'GET, HEAD, OPTIONS');
  assert.equal(calls.length, 0);
});

test('disallowed buckets and traversal return a cacheable 404 and never fetch', async () => {
  const calls = stubFetch(imageResponse());
  for (const path of ['/evil/a.png', '/racks/%2e%2e/a.png', '/racks', '/']) {
    const res = await worker.fetch(new Request(`https://images.patcher.xyz${path}`), env);
    assert.equal(res.status, 404, path);
    assert.equal(res.headers.get('Cache-Control'), 'public, max-age=300');
  }
  assert.equal(calls.length, 0);
});

test('proxies a good image with only allow-listed headers and the configured TTLs', async () => {
  const calls = stubFetch(imageResponse(200, {
    etag: '"abc"',
    'last-modified': 'Mon, 01 Jan 2024 00:00:00 GMT',
    'set-cookie': 'session=secret',
    'x-supabase-internal': 'yes',
    'cache-control': 'private, max-age=0',
    server: 'cloudflare',
  }));
  const res = await worker.fetch(new Request('https://images.patcher.xyz/racks/a.png?token=secret'), env);

  assert.equal(res.status, 200);
  assert.equal(calls[0].url, `${ORIGIN}/racks/a.png`);
  assert.equal(calls[0].init.method, 'GET');
  assert.equal(res.headers.get('Set-Cookie'), null);
  assert.equal(res.headers.get('x-supabase-internal'), null);
  assert.equal(res.headers.get('server'), null);
  assert.equal(res.headers.get('etag'), '"abc"');
  assert.equal(res.headers.get('Cache-Control'), 'public, max-age=60, s-maxage=120');
  assert.equal(res.headers.get('X-Content-Type-Options'), 'nosniff');
  assert.equal(res.headers.get('Access-Control-Allow-Origin'), '*');
  assert.equal(await res.text(), 'bytes');
});

test('HEAD is forwarded as HEAD', async () => {
  const calls = stubFetch(imageResponse());
  await worker.fetch(new Request('https://images.patcher.xyz/racks/a.png', { method: 'HEAD' }), env);
  assert.equal(calls[0].init.method, 'HEAD');
});

test('non-image 200 responses from the origin are replaced with an uncached 502', async () => {
  for (const contentType of ['text/html', 'application/json', 'image-ish/png', '', 'application/octet-stream', 'text/html; x=image/png']) {
    stubFetch(new Response('<script>alert(1)</script>', { status: 200, headers: contentType ? { 'content-type': contentType } : {} }));
    const res = await worker.fetch(new Request('https://images.patcher.xyz/racks/a.png'), env);
    assert.equal(res.status, 502, contentType || '(none)');
    assert.equal(res.headers.get('Cache-Control'), 'no-store');
    assert.equal(await res.text(), 'Unsupported origin response');
  }
});

test('image content types are accepted case-insensitively', async () => {
  stubFetch(imageResponse(200, { 'content-type': 'IMAGE/WEBP' }));
  const res = await worker.fetch(new Request('https://images.patcher.xyz/racks/a.png'), env);
  assert.equal(res.status, 200);
});

test('origin errors keep their status but are cached conservatively', async () => {
  for (const [status, cache] of [[404, 'public, max-age=300'], [410, 'public, max-age=300'], [403, 'no-store'], [500, 'no-store'], [503, 'no-store']]) {
    stubFetch(new Response('nope', { status, headers: { 'content-type': 'text/plain' } }));
    const res = await worker.fetch(new Request('https://images.patcher.xyz/racks/a.png'), env);
    assert.equal(res.status, status);
    assert.equal(res.headers.get('Cache-Control'), cache, String(status));
  }
});

test('invalid TTL env values fall back to defaults', async () => {
  stubFetch(imageResponse());
  const res = await worker.fetch(
    new Request('https://images.patcher.xyz/racks/a.png'),
    { ...env, BROWSER_CACHE_TTL_SECONDS: '-5', EDGE_CACHE_TTL_SECONDS: 'abc' }
  );
  assert.equal(res.headers.get('Cache-Control'), 'public, max-age=604800, s-maxage=2592000');
});
