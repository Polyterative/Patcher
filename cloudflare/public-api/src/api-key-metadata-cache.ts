import type { ApiKeyMetadata, ApiKeyMetadataProvider } from './database.ts';

export type ApiKeyVerificationResult =
  | { ok: true; metadata: ApiKeyMetadata }
  | { ok: false; code: 'invalid_key' };

interface CacheEntry {
  metadata: ApiKeyMetadata;
  expiresAtMs: number;
}

const DEFAULT_CACHE_MAX_ENTRIES = 1000;
const DEFAULT_CACHE_TTL_MS = 60_000;

let defaultMetadataCache: ApiKeyMetadataCache | null = null;

export class ApiKeyMetadataCache {
  private readonly entries = new Map<string, CacheEntry>();
  private readonly maxEntries: number;
  private readonly ttlMs: number;

  constructor(
    maxEntries: number,
    ttlMs: number
  ) {
    if (!Number.isInteger(maxEntries) || maxEntries <= 0) {
      throw new Error('metadata cache maxEntries must be a positive integer');
    }
    if (!Number.isInteger(ttlMs) || ttlMs <= 0 || ttlMs > DEFAULT_CACHE_TTL_MS) {
      throw new Error('metadata cache ttlMs must be between 1 and 60000');
    }
    this.maxEntries = maxEntries;
    this.ttlMs = ttlMs;
  }

  get(digestHex: string, nowMs: number): ApiKeyMetadata | null {
    const entry = this.entries.get(digestHex);
    if (!entry) {
      return null;
    }
    if (nowMs >= entry.expiresAtMs) {
      this.entries.delete(digestHex);
      return null;
    }
    this.entries.delete(digestHex);
    this.entries.set(digestHex, entry);
    return entry.metadata;
  }

  set(digestHex: string, metadata: ApiKeyMetadata, nowMs: number): void {
    if (this.entries.has(digestHex)) {
      this.entries.delete(digestHex);
    }
    this.entries.set(digestHex, {
      metadata,
      expiresAtMs: nowMs + this.ttlMs,
    });
    while (this.entries.size > this.maxEntries) {
      const oldestKey = this.entries.keys().next().value;
      if (oldestKey === undefined) {
        return;
      }
      this.entries.delete(oldestKey);
    }
  }

  clear(): void {
    this.entries.clear();
  }
}

export async function verifyApiKeyMetadata(
  digestHex: string,
  provider: ApiKeyMetadataProvider,
  options: {
    cache?: ApiKeyMetadataCache;
    nowMs?: number;
  } = {}
): Promise<ApiKeyVerificationResult> {
  const cache = options.cache ?? getDefaultMetadataCache();
  const nowMs = options.nowMs ?? Date.now();
  const cached = cache.get(digestHex, nowMs);
  if (cached) {
    return { ok: true, metadata: cached };
  }

  const metadata = await provider.verifyApiKeyHash(digestHex);
  if (!metadata) {
    return { ok: false, code: 'invalid_key' };
  }
  cache.set(digestHex, metadata, nowMs);
  return { ok: true, metadata };
}

export function resetDefaultApiKeyMetadataCache(): void {
  defaultMetadataCache = new ApiKeyMetadataCache(
    DEFAULT_CACHE_MAX_ENTRIES,
    DEFAULT_CACHE_TTL_MS
  );
}

function getDefaultMetadataCache(): ApiKeyMetadataCache {
  defaultMetadataCache ??= new ApiKeyMetadataCache(
    DEFAULT_CACHE_MAX_ENTRIES,
    DEFAULT_CACHE_TTL_MS
  );
  return defaultMetadataCache;
}
