import assert from 'node:assert/strict';
import { test } from 'node:test';
import { handlePublicApiRequest } from '../../cloudflare/public-api/src/index.ts';
import { isMaintenanceActive } from '../../cloudflare/public-api/src/maintenance.ts';

const request = () => new Request('https://api.example.test/v1/modules', { headers: { Authorization: 'Bearer x' } });
const providerOf = (impl) => ({ calls: 0, async isMaintenanceEnabled() { this.calls += 1; return impl(this.calls); } });

test('maintenance on returns 503 with Retry-After and no-store before auth or cache', async () => {
  const provider = providerOf(() => true);
  const response = await handlePublicApiRequest(request(), {}, { maintenanceProvider: provider });
  assert.equal(response.status, 503);
  assert.equal(response.headers.get('retry-after'), '300');
  assert.match(response.headers.get('cache-control'), /no-store/);
  assert.equal((await response.json()).error.code, 'maintenance');
});

test('maintenance on also blocks HEAD, not OPTIONS preflight', async () => {
  const provider = providerOf(() => true);
  const head = await handlePublicApiRequest(new Request('https://api.example.test/v1/modules', { method: 'HEAD' }), {}, { maintenanceProvider: provider });
  assert.equal(head.status, 503);
  const options = await handlePublicApiRequest(new Request('https://api.example.test/v1/modules', { method: 'OPTIONS' }), {}, { maintenanceProvider: provider });
  assert.equal(options.status, 204);
});

test('maintenance off falls through to normal handling', async () => {
  const provider = providerOf(() => false);
  const response = await handlePublicApiRequest(request(), {}, { maintenanceProvider: provider });
  assert.notEqual((await response.json()).error.code, 'maintenance');
});

test('flag lookup errors fail closed and are not cached', async () => {
  const provider = providerOf(n => { if (n === 1) throw new Error('db down'); return false; });
  assert.equal(await isMaintenanceActive(provider, 1000), true);
  assert.equal(await isMaintenanceActive(provider, 1001), false);
  assert.equal(provider.calls, 2);
});

test('flag answer is cached for 30 seconds', async () => {
  const provider = providerOf(() => false);
  assert.equal(await isMaintenanceActive(provider, 0), false);
  assert.equal(await isMaintenanceActive(provider, 29_999), false);
  assert.equal(provider.calls, 1);
  assert.equal(await isMaintenanceActive(provider, 30_001), false);
  assert.equal(provider.calls, 2);
});

test('non-boolean answers count as on', async () => {
  const provider = providerOf(() => undefined);
  assert.equal(await isMaintenanceActive(provider, 0), true);
});
