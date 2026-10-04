const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');


const config = require(path.resolve(__dirname, '../../vercel.json'));

// Vercel serves the first-match legacy `routes` table and ignores top-level
// `headers` beside it, so production shipped no CSP/security headers. Header rules
// live in `continue: true` routes ahead of the routing table instead.
function headersFor(pathname) {
  const headers = {};
  for (const route of config.routes) {
    if (!route.continue) break;
    if (new RegExp(route.src).test(pathname)) Object.assign(headers, route.headers);
  }
  return headers;
}

test('does not combine top-level headers, rewrites or redirects with legacy routes', () => {
  for (const key of ['headers', 'rewrites', 'redirects', 'cleanUrls', 'trailingSlash']) {
    assert.equal(key in config, false, `${key} is ignored next to routes`);
  }
});

test('header routes come before every routing entry', () => {
  const firstRouting = config.routes.findIndex(route => !route.continue);
  assert.ok(firstRouting > 0);
  assert.ok(config.routes.slice(firstRouting).every(route => !route.continue));
});

test('every page gets the security headers', () => {
  for (const pathname of ['/', '/modules/browser', '/assets/png/x.png']) {
    const headers = headersFor(pathname);
    for (const key of ['Content-Security-Policy', 'X-Frame-Options', 'Strict-Transport-Security', 'Permissions-Policy']) {
      assert.ok(headers[key], `${pathname} missing ${key}`);
    }
  }
});

test('csp allows the analytics and self-host api hosts the app calls', () => {
  const csp = headersFor('/')['Content-Security-Policy'];
  const directive = name => csp.split(';').map(part => part.trim()).find(part => part.startsWith(`${name} `));
  assert.match(directive('connect-src'), /https:\/\/eu\.i\.posthog\.com/);
  assert.match(directive('connect-src'), /https:\/\/supabase\.patcher\.xyz/);
  assert.match(directive('script-src'), /https:\/\/eu-assets\.i\.posthog\.com/);
  assert.match(directive('connect-src'), /https:\/\/\*\.ingest\.us\.sentry\.io/);
  assert.match(directive('connect-src'), /wss:\/\/supabase\.patcher\.xyz/);
  assert.match(directive('img-src'), /https:\/\/images\.patcher\.xyz/);
  assert.match(directive('img-src'), /https:\/\/c5\.patreon\.com/);
});

test('cache rules keep the shell uncached and fonts immutable', () => {
  assert.equal(headersFor('/')['Cache-Control'], 'no-store, max-age=0');
  assert.equal(headersFor('/index.csr.html')['Cache-Control'], 'no-store, max-age=0');
  assert.match(headersFor('/assets/font/a.woff2')['Cache-Control'], /immutable/);
  assert.equal(headersFor('/modules/browser')['Cache-Control'], undefined);
});
