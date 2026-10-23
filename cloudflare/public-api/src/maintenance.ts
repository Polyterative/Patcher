import {
  withHyperdriveClient,
  type HyperdriveBinding,
} from './database.ts';

export interface MaintenanceProvider {
  isMaintenanceEnabled(): Promise<boolean>;
}

export const MAINTENANCE_CACHE_TTL_MS = 30_000;

/** Reads the production maintenance flag through a definer function (the API role has no table access). */
export function createHyperdriveMaintenanceProvider(hyperdrive: HyperdriveBinding): MaintenanceProvider {
  return {
    async isMaintenanceEnabled(): Promise<boolean> {
      return withHyperdriveClient(hyperdrive, async sql => {
        const rows = await sql<{ on: unknown }[]>`select private.maint_flag_on() as "on"`;
        return rows.length !== 1 || rows[0].on !== false;
      });
    },
  };
}

interface CachedState {
  enabled: boolean;
  expiresAt: number;
}

const cacheByProvider = new WeakMap<MaintenanceProvider, CachedState>();

/**
 * True while maintenance is on. Cached in-isolate for 30 s; any error or unexpected answer
 * counts as "on" (fail closed) and is not cached.
 */
export async function isMaintenanceActive(
  provider: MaintenanceProvider,
  nowMs: number = Date.now()
): Promise<boolean> {
  const cached = cacheByProvider.get(provider);
  if (cached && cached.expiresAt > nowMs) {
    return cached.enabled;
  }
  try {
    const enabled = (await provider.isMaintenanceEnabled()) !== false;
    cacheByProvider.set(provider, { enabled, expiresAt: nowMs + MAINTENANCE_CACHE_TTL_MS });
    return enabled;
  } catch (error: unknown) {
    cacheByProvider.delete(provider);
    return true;
  }
}
