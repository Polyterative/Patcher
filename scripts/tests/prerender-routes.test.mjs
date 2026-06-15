import assert from 'node:assert/strict';
import test from 'node:test';
import { buildPrerenderRoutes, STATIC_ROUTES } from '../build/generate-prerender-routes.mjs';

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
  racks = [],
  profiles = [],
  manufacturers = [],
  moduleCollections = [],
} = {}) {
  const calls = [];
  const fetchImpl = async (url) => {
    const rawUrl = String(url);
    calls.push(rawUrl);
    if (rawUrl.includes('/rest/v1/modules?')) return ok(modules);
    if (rawUrl.includes('/rest/v1/patches?')) return ok(patches);
    if (rawUrl.includes('/rest/v1/racks?')) return ok(racks);
    if (rawUrl.includes('/rest/v1/profiles?')) return ok(profiles);
    if (rawUrl.includes('/rest/v1/manufacturers?')) return ok(manufacturers);
    if (rawUrl.includes('/rest/v1/module_collections?')) return ok(moduleCollections);
    return ok([]);
  };

  return { calls, fetchImpl };
}

test('returns static routes only when Supabase credentials are unavailable', async () => {
  const { calls, fetchImpl } = stubSupabaseResponses({
    modules: [{ id: 72 }]
  });

  const routes = await buildPrerenderRoutes({
    fetchImpl,
    supabaseAnonKey: '',
  });

  assert.deepEqual(routes, [...STATIC_ROUTES].sort((a, b) => {
    if (a === '/') return -1;
    if (b === '/') return 1;
    return a.localeCompare(b);
  }));
  assert.equal(calls.length, 0);
});

test('adds capped public entity routes using canonical paths where available', async () => {
  const { calls, fetchImpl } = stubSupabaseResponses({
    modules: [{ id: 72 }, { id: 73 }],
    patches: [{ id: 16, public_id: 'patch-token' }, { id: 17 }],
    racks: [{ id: 91, public_id: 'rack-token' }, { id: 92 }],
    profiles: [{ username: 'alice' }],
    manufacturers: [{ id: 15 }],
    moduleCollections: [{ public_id: 'ambient-starters' }]
  });

  const routes = await buildPrerenderRoutes({
    fetchImpl,
    supabaseUrl: 'https://test.supabase.co',
    supabaseAnonKey: 'test-key',
    publicRouteLimit: 2,
  });

  assert.ok(routes.includes('/modules/details/72'));
  assert.ok(routes.includes('/modules/details/73'));
  assert.ok(routes.includes('/patches/patch-token'));
  assert.ok(routes.includes('/patches/details/17'));
  assert.ok(routes.includes('/racks/rack-token'));
  assert.ok(routes.includes('/racks/details/92'));
  assert.ok(routes.includes('/u/alice'));
  assert.ok(routes.includes('/manufacturers/details/15'));
  assert.ok(routes.includes('/collections/ambient-starters'));
  assert.equal(calls.length, 6);
  assert.ok(calls.every(url => url.includes('limit=2')));
  assert.ok(calls.filter(url => url.includes('public=eq.true')).length >= 5);
  assert.ok(calls.some(url => (
    url.includes('/rest/v1/racks?')
    && url.includes('author_profile_gate%3Aauthorid%21inner%28public%29')
    && url.includes('author_profile_gate.public=eq.true')
  )));
});

test('fails open per table and deduplicates generated routes', async () => {
  const calls = [];
  const fetchImpl = async (url) => {
    const rawUrl = String(url);
    calls.push(rawUrl);
    if (rawUrl.includes('/rest/v1/modules?')) {
      return ok([{ id: 72 }, { id: 72 }, { id: 0 }]);
    }
    if (rawUrl.includes('/rest/v1/patches?')) {
      return { ok: false };
    }
    throw new Error('network failure');
  };

  const routes = await buildPrerenderRoutes({
    fetchImpl,
    supabaseUrl: 'https://test.supabase.co',
    supabaseAnonKey: 'test-key',
  });

  assert.equal(routes.filter(route => route === '/modules/details/72').length, 1);
  assert.ok(routes.includes('/modules/details/72'));
  assert.ok(routes.includes('/modules/browser'));
  assert.equal(calls.length, 6);
});
