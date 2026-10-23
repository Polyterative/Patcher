import {
  FEATURE_FLAGS_CACHE_KEY,
  loadRemoteFeatureFlags
} from './remote-feature-flags';

function makeEnv() {
  return {
    production: true,
    supabase: { url: 'https://x.test', key: 'anon' },
    features: {
      collectionsEnabled: false,
      coolReactionsEnabled: false,
      developerApiEnabled: true,
      modularGridImportEnabled: false,
      marketplaceEnabled: false,
      manufacturerInsightsEnabled: false,
      viewTrackingEnabled: true,
      readOnlyModeEnabled: true,
      maintenanceModeEnabled: false
    }
  };
}

function memStorage(initial?: string) {
  const m = new Map<string, string>();
  if (initial) { m.set(FEATURE_FLAGS_CACHE_KEY, initial); }
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v); } };
}

function okFetch(rows: unknown): typeof fetch {
  return (() => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(rows) })) as unknown as typeof fetch;
}

describe('loadRemoteFeatureFlags', () => {
  beforeEach(() => spyOn(console, 'warn'));

  it('merges known boolean keys and ignores unknown/non-boolean ones', async () => {
    const env = makeEnv();
    const calls: unknown[][] = [];
    const fetchFn = ((...a: unknown[]) => { calls.push(a); return okFetch([
      { key: 'marketplaceEnabled', enabled: true },
      { key: 'bogusEnabled', enabled: true },
      { key: 'collectionsEnabled', enabled: 'yes' }
    ])(a[0] as string); }) as unknown as typeof fetch;
    const ok = await loadRemoteFeatureFlags(env, { fetchFn, useCache: false });
    expect(ok).toBeTrue();
    expect(env.features.marketplaceEnabled).toBeTrue();
    expect(env.features.collectionsEnabled).toBeFalse();
    expect((env.features as Record<string, unknown>)['bogusEnabled']).toBeUndefined();
    expect(String(calls[0][0])).toContain('environment=eq.production');
  });

  it('falls back to last-good cache on failure, caches on success', async () => {
    const storage = memStorage();
    const env = makeEnv();
    await loadRemoteFeatureFlags(env, { fetchFn: okFetch([{ key: 'marketplaceEnabled', enabled: true }]), storage, useCache: true });
    const env2 = makeEnv();
    const failing = (() => Promise.reject(new Error('down'))) as unknown as typeof fetch;
    const ok = await loadRemoteFeatureFlags(env2, { fetchFn: failing, storage, useCache: true });
    expect(ok).toBeFalse();
    expect(env2.features.marketplaceEnabled).toBeTrue();
  });

  it('keeps bundled defaults when fetch fails and no cache', async () => {
    const env = makeEnv();
    const failing = (() => Promise.resolve({ ok: false, status: 500, json: () => Promise.resolve([]) })) as unknown as typeof fetch;
    const ok = await loadRemoteFeatureFlags(env, { fetchFn: failing, storage: memStorage(), useCache: true });
    expect(ok).toBeFalse();
    expect(env.features).toEqual(makeEnv().features);
  });

  it('survives corrupt cache', async () => {
    const env = makeEnv();
    const failing = (() => Promise.reject(new Error('x'))) as unknown as typeof fetch;
    await loadRemoteFeatureFlags(env, { fetchFn: failing, storage: memStorage('{not json'), useCache: true });
    expect(env.features).toEqual(makeEnv().features);
  });

  it('keeps a cached maintenanceModeEnabled=true when the fetch fails', async () => {
    const env = makeEnv();
    const storage = memStorage(JSON.stringify([{ key: 'maintenanceModeEnabled', enabled: true }]));
    const fetchFn = (() => Promise.reject(new Error('down'))) as unknown as typeof fetch;
    await loadRemoteFeatureFlags(env, { fetchFn, storage, useCache: true });
    expect(env.features.maintenanceModeEnabled).toBeTrue();
  });

  it('clears maintenance mode after a successful fetch returning false', async () => {
    const env = makeEnv();
    env.features.maintenanceModeEnabled = true;
    const storage = memStorage(JSON.stringify([{ key: 'maintenanceModeEnabled', enabled: true }]));
    await loadRemoteFeatureFlags(env, {
      fetchFn: okFetch([{ key: 'maintenanceModeEnabled', enabled: false }]),
      storage, useCache: true
    });
    expect(env.features.maintenanceModeEnabled).toBeFalse();
    expect(storage.getItem(FEATURE_FLAGS_CACHE_KEY)).toContain('false');
  });
});
