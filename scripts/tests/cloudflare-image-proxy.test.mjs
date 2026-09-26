import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  buildOriginImageUrl,
  DEFAULT_ALLOWED_BUCKETS,
  DEFAULT_BROWSER_CACHE_TTL_SECONDS,
  DEFAULT_EDGE_CACHE_TTL_SECONDS,
  DEFAULT_SUPABASE_STORAGE_ORIGIN,
  imageProxyCacheHeaders,
  readBrowserCacheTtlSeconds,
  readEdgeCacheTtlSeconds,
} from '../../cloudflare/image-proxy/src/index.ts';

const env = {
  SUPABASE_STORAGE_ORIGIN: 'https://supabase.test/storage/v1/object/public',
  ALLOWED_BUCKETS: 'module-panels,racks,patches',
  BROWSER_CACHE_TTL_SECONDS: '60',
  EDGE_CACHE_TTL_SECONDS: '120',
};

test('maps allowlisted image paths to the Supabase public storage origin', () => {
  assert.equal(
    buildOriginImageUrl('https://images.patcher.xyz/module-panels/maths.jpg?ignored=true', env),
    'https://supabase.test/storage/v1/object/public/module-panels/maths.jpg'
  );
});

test('preserves nested storage paths while stripping query strings', () => {
  assert.equal(
    buildOriginImageUrl('https://images.patcher.xyz/racks/user/rack-preview.jpeg?v=123', env),
    'https://supabase.test/storage/v1/object/public/racks/user/rack-preview.jpeg'
  );
});

test('rejects unknown buckets and path traversal segments', () => {
  assert.equal(buildOriginImageUrl('https://images.patcher.xyz/private/file.jpg', env), null);
  assert.equal(buildOriginImageUrl('https://images.patcher.xyz/module-panels/../secret.jpg', env), null);
  assert.equal(buildOriginImageUrl('https://images.patcher.xyz/module-panels', env), null);
});

test('maps marketplace-listings image paths to the Supabase public storage origin', () => {
  assert.equal(
    buildOriginImageUrl('https://images.patcher.xyz/marketplace-listings/seller/listing-photo.webp', {
      ALLOWED_BUCKETS: DEFAULT_ALLOWED_BUCKETS.join(','),
    }),
    `${DEFAULT_SUPABASE_STORAGE_ORIGIN}/marketplace-listings/seller/listing-photo.webp`
  );
});

test('falls back to safe browser and edge cache ttl defaults when env is absent or malformed', () => {
  assert.equal(readBrowserCacheTtlSeconds({ BROWSER_CACHE_TTL_SECONDS: '60' }), 60);
  assert.equal(readBrowserCacheTtlSeconds({ BROWSER_CACHE_TTL_SECONDS: '0' }), 604800);
  assert.equal(readBrowserCacheTtlSeconds({ BROWSER_CACHE_TTL_SECONDS: 'not-a-number' }), 604800);
  assert.equal(readEdgeCacheTtlSeconds({ EDGE_CACHE_TTL_SECONDS: '120' }), 120);
  assert.equal(readEdgeCacheTtlSeconds({ EDGE_CACHE_TTL_SECONDS: '0' }), 2592000);
  assert.equal(readEdgeCacheTtlSeconds({ EDGE_CACHE_TTL_SECONDS: 'not-a-number' }), 2592000);
});

test('sets long-lived cache headers only for successful image responses', () => {
  assert.equal(imageProxyCacheHeaders(200, env).get('cache-control'), 'public, max-age=60, s-maxage=120');
  assert.equal(imageProxyCacheHeaders(404, env).get('cache-control'), 'public, max-age=300');
  assert.equal(imageProxyCacheHeaders(500, env).get('cache-control'), 'no-store');
});

test('keeps wrangler.jsonc vars in sync with worker defaults', () => {
  const wranglerPath = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'cloudflare', 'image-proxy', 'wrangler.jsonc');
  const wrangler = JSON.parse(readFileSync(wranglerPath, 'utf8'));
  const configuredBuckets = String(wrangler.vars?.ALLOWED_BUCKETS ?? '')
    .split(',')
    .map(bucket => bucket.trim())
    .filter(Boolean);

  assert.deepEqual(new Set(configuredBuckets), new Set(DEFAULT_ALLOWED_BUCKETS));
  assert.equal(wrangler.vars?.SUPABASE_STORAGE_ORIGIN, DEFAULT_SUPABASE_STORAGE_ORIGIN);
  assert.equal(Number(wrangler.vars?.BROWSER_CACHE_TTL_SECONDS), DEFAULT_BROWSER_CACHE_TTL_SECONDS);
  assert.equal(Number(wrangler.vars?.EDGE_CACHE_TTL_SECONDS), DEFAULT_EDGE_CACHE_TTL_SECONDS);
});
