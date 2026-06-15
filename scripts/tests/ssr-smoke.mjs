import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { createServer } from 'node:http';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const serverBundlePath = resolve('dist/Patcher/server/server.mjs');
const browserIndexPath = resolve('dist/Patcher/browser/index.csr.html');

assert.ok(existsSync(serverBundlePath), 'SSR server bundle is missing; run `pnpm build` first');
assert.ok(existsSync(browserIndexPath), 'SSR browser index.csr.html is missing; production build is not emitting SSR browser HTML');

process.env['NG_ALLOWED_HOSTS'] = [
  process.env['NG_ALLOWED_HOSTS'],
  '127.0.0.1',
  'localhost',
  'patcher.xyz',
].filter(Boolean).join(',');
process.env['SEO_CANONICAL_ORIGIN'] ||= 'https://patcher.xyz';
process.env['VERCEL'] ||= '1';

let failure;
process.on('unhandledRejection', recordFailure);
process.on('uncaughtException', recordFailure);

const serverBundleUrl = pathToFileURL(serverBundlePath).href;
const { app } = await import(serverBundleUrl);
assert.equal(typeof app, 'function', 'SSR server bundle must export app() for local smoke tests');

const vercelShim = await import(pathToFileURL(resolve('api/ssr.mjs')).href);
assert.equal(typeof vercelShim.default, 'function', 'Vercel SSR shim must export a request handler');

const expressApp = app();
const httpServer = createServer(expressApp);

const ssrRouteCases = [
  // Home
  { path: '/', expectedText: 'Browse modules' },
  { path: '/home', expectedText: 'Browse modules' },

  // Main public browser/detail surfaces
  { path: '/modules' },
  { path: '/modules/browser', expectedText: 'Modules' },
  { path: '/modules/details/1' },
  { path: '/modules/add' },
  { path: '/patches' },
  { path: '/patches/browser', expectedText: 'Patches' },
  { path: '/patches/details/1' },
  { path: '/patches/example-public-id' },
  { path: '/racks' },
  { path: '/racks/browser', expectedText: 'Racks' },
  { path: '/racks/details/1' },
  { path: '/racks/example-public-id' },
  { path: '/manufacturers' },
  { path: '/manufacturers/browser', expectedText: 'Manufacturers' },
  { path: '/manufacturers/details/1' },

  // Production-disabled collection routes must not become crawlable soft-200s.
  { path: '/collections', expectedText: 'Page not found!', expectedStatus: 404 },
  { path: '/collections/browser', expectedText: 'Page not found!', expectedStatus: 404 },
  { path: '/collections/example-public-id', expectedText: 'Page not found!', expectedStatus: 404 },
  { path: '/collections/manage/1', expectedText: 'Page not found!', expectedStatus: 404 },
  { path: '/collection/1', expectedText: 'Page not found!', expectedStatus: 404 },

  // Info pages
  { path: '/info', expectedStatus: 404 },
  { path: '/info/changelog', expectedText: 'Changelog' },
  { path: '/info/insights' },

  // Auth and user account surfaces
  { path: '/auth', expectedStatus: 404 },
  { path: '/auth/login', expectedText: 'Who are you again?' },
  { path: '/auth/signup', expectedText: "We haven't been introduced yet" },
  { path: '/auth/reset-password' },
  { path: '/auth/callback' },
  { path: '/auth/complete-profile' },
  { path: '/u/example-user' },
  { path: '/user', expectedStatus: 404 },
  { path: '/user/account' },
  { path: '/user/area' },

  // Admin, retired links, and explicit not-found
  { path: '/admin' },
  { path: '/links/retired' },
  { path: '/404', expectedText: 'Page not found!', expectedStatus: 404 },
];

await new Promise((resolveListen, rejectListen) => {
  httpServer.once('error', rejectListen);
  httpServer.listen(0, '127.0.0.1', resolveListen);
});

try {
  const address = httpServer.address();
  assert.ok(address && typeof address === 'object', 'SSR smoke server did not expose a listening port');
  const baseUrl = `http://127.0.0.1:${ address.port }`;

  for (const routeCase of ssrRouteCases) {
    await assertServerRenderedPage(
      `${ baseUrl }${ routeCase.path }`,
      routeCase.expectedText,
      routeCase.expectedStatus ?? 200,
    );
  }
} catch (error) {
  failure = error;
} finally {
  await new Promise((resolveClose, rejectClose) => {
    httpServer.close(error => error ? rejectClose(error) : resolveClose());
  });
}

if (failure) {
  console.error(failure);
  process.exit(1);
}

function recordFailure(error) {
  failure ??= error;
}

async function assertServerRenderedPage(url, expectedText, expectedStatus = 200) {
  const response = await fetch(url, {
    headers: {
      host: 'patcher.xyz',
      'x-forwarded-host': 'patcher.xyz',
      'x-forwarded-proto': 'https',
      'user-agent': 'Googlebot/2.1 (+http://www.google.com/bot.html)',
    },
  });
  const html = await response.text();

  assert.equal(response.status, expectedStatus, `${ url } should SSR with HTTP ${ expectedStatus }; body: ${ html.slice(0, 500) }`);
  assert.match(html, /<app-root[^>]*>/, `${ url } should include the Angular root`);
  if (expectedText) {
    assert.ok(html.includes(expectedText), `${ url } should contain server-rendered page text "${ expectedText }"`);
  }
  assert.doesNotMatch(html, /<app-root[^>]*><\/app-root>/, `${ url } should not return the empty SPA shell`);
  assert.doesNotMatch(html, /Internal Server Error/i, `${ url } should not return the SSR error response`);
}
