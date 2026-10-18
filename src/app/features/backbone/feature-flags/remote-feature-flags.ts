import { EnvironmentModel } from '../../../../environments/environment.model';

// NOTE: intentionally bypasses SupabaseService. This runs before Angular bootstraps
// (main.ts / main.server.ts) so module-scope route/toolbar consts see remote values.
// Plain read-only fetch with the public anon key.

export const FEATURE_FLAGS_CACHE_KEY = 'patcher.featureFlags.v1';
export const BROWSER_TIMEOUT_MS = 800;
export const SERVER_TIMEOUT_MS = 2000;

type Flags = EnvironmentModel['features'];
type FlagRow = { key: unknown; enabled: unknown };

export interface RemoteFeatureFlagOptions {
  timeoutMs?: number;
  /** Defaults to globalThis.fetch. */
  fetchFn?: typeof fetch;
  /** Defaults to globalThis.localStorage when available. */
  storage?: Pick<Storage, 'getItem' | 'setItem'> | null;
  /** Use storage cache (browser only). Defaults to typeof window !== 'undefined'. */
  useCache?: boolean;
}

function applyFlags(target: Flags, rows: unknown): number {
  if (!Array.isArray(rows)) {
    return 0;
  }
  const record = target as unknown as Record<string, unknown>;
  let applied = 0;
  for (const row of rows as FlagRow[]) {
    if (
      row && typeof row.key === 'string' && typeof row.enabled === 'boolean'
      && Object.prototype.hasOwnProperty.call(record, row.key)
      && typeof record[row.key] === 'boolean'
    ) {
      record[row.key] = row.enabled;
      applied++;
    }
  }
  return applied;
}

function getStorage(opts: RemoteFeatureFlagOptions): Pick<Storage, 'getItem' | 'setItem'> | null {
  if (opts.storage !== undefined) {
    return opts.storage;
  }
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

/**
 * Fetches flags from `app_feature_flags` and merges known boolean keys into
 * `env.features` in place. Never throws; on failure uses the last-good cache
 * (browser) and otherwise leaves the bundled defaults untouched.
 * Returns true when remote values were applied.
 */
export async function loadRemoteFeatureFlags(
  env: Pick<EnvironmentModel, 'production' | 'supabase' | 'features'>,
  opts: RemoteFeatureFlagOptions = {}
): Promise<boolean> {
  const isBrowser = opts.useCache ?? typeof window !== 'undefined';
  const timeoutMs = opts.timeoutMs ?? (isBrowser ? BROWSER_TIMEOUT_MS : SERVER_TIMEOUT_MS);
  const storage = isBrowser ? getStorage(opts) : null;

  try {
    const fetchFn = opts.fetchFn ?? globalThis.fetch;
    const environment = env.production ? 'production' : 'development';
    const url = `${ env.supabase.url }/rest/v1/app_feature_flags?environment=eq.${ environment }&select=key,enabled`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    let rows: unknown;
    try {
      const response = await fetchFn(url, {
        signal: controller.signal,
        headers: {
          apikey: env.supabase.key,
          Authorization: `Bearer ${ env.supabase.key }`,
          Accept: 'application/json'
        }
      });
      if (!response.ok) {
        throw new Error(`feature flags HTTP ${ response.status }`);
      }
      rows = await response.json();
    } finally {
      clearTimeout(timer);
    }
    if (!Array.isArray(rows)) {
      throw new Error('feature flags: unexpected payload');
    }
    applyFlags(env.features, rows);
    if (storage) {
      try {
        storage.setItem(FEATURE_FLAGS_CACHE_KEY, JSON.stringify(rows));
      } catch { /* ignore */ }
    }
    return true;
  } catch (err) {
    if (storage) {
      try {
        const cached = storage.getItem(FEATURE_FLAGS_CACHE_KEY);
        if (cached) {
          applyFlags(env.features, JSON.parse(cached));
        }
      } catch { /* ignore */ }
    }
    console.warn('Remote feature flags unavailable, using fallback:', err);
    return false;
  }
}
