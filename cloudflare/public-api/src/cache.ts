export type CacheStatus = 'HIT' | 'MISS' | 'STALE';

export interface CacheStore {
  match(request: Request): Promise<Response | undefined>;
  put(request: Request, response: Response): Promise<void>;
}

export interface ExecutionContextLike {
  waitUntil(promise: Promise<unknown>): void;
}

export interface CachePolicy {
  freshSeconds: number;
  swrSeconds: number;
}

export interface CachedEntry {
  response: Response;
  freshUntilMs: number;
  staleUntilMs: number;
}

export const PRIVATE_CACHE_CONTROL = 'private, no-store';

const CACHEABLE_HEADERS = [
  'access-control-allow-origin',
  'content-type',
  'etag',
  'x-content-type-options',
];
const INTERNAL_FRESH_UNTIL = 'x-patcher-cache-fresh-until';
const INTERNAL_STALE_UNTIL = 'x-patcher-cache-stale-until';
const INTERNAL_HEADERS = [INTERNAL_FRESH_UNTIL, INTERNAL_STALE_UNTIL];
const PER_REQUEST_HEADERS = [
  'retry-after',
  'x-ratelimit-limit-minute',
  'x-ratelimit-remaining-minute',
  'x-ratelimit-limit-month',
  'x-ratelimit-remaining-month',
  'x-ratelimit-reset',
];

export function defaultCacheStore(): CacheStore | null {
  const maybeGlobal = globalThis as { caches?: { default?: CacheStore } };
  return maybeGlobal.caches?.default ?? null;
}

export function cacheRequestForKey(cacheKey: string): Request {
  const pathAndQuery = cacheKey.startsWith('GET ') ? cacheKey.slice(4) : cacheKey;
  return new Request(`https://public-api-cache.local${pathAndQuery}`, { method: 'GET' });
}

export function toCacheEntry(
  response: Response,
  policy: CachePolicy,
  nowMs: number
): Response {
  const cacheSource = response.clone();
  const headers = new Headers();
  for (const name of CACHEABLE_HEADERS) {
    const value = cacheSource.headers.get(name);
    if (value !== null) {
      headers.set(name, value);
    }
  }

  const freshUntilMs = nowMs + policy.freshSeconds * 1000;
  const staleUntilMs = freshUntilMs + policy.swrSeconds * 1000;
  headers.set(INTERNAL_FRESH_UNTIL, String(freshUntilMs));
  headers.set(INTERNAL_STALE_UNTIL, String(staleUntilMs));
  headers.set('Cache-Control', `public, max-age=${policy.freshSeconds + policy.swrSeconds}`);

  return new Response(cacheSource.body, {
    status: cacheSource.status,
    statusText: cacheSource.statusText,
    headers,
  });
}

export function readCachedEntry(response: Response, nowMs: number): CachedEntry | null {
  const freshUntilMs = Number(response.headers.get(INTERNAL_FRESH_UNTIL));
  const staleUntilMs = Number(response.headers.get(INTERNAL_STALE_UNTIL));
  if (!Number.isFinite(freshUntilMs) || !Number.isFinite(staleUntilMs)) {
    return null;
  }
  if (nowMs > staleUntilMs) {
    return null;
  }
  return { response, freshUntilMs, staleUntilMs };
}

export function toOutgoingResponse(
  sourceResponse: Response,
  perRequestHeaders: HeadersInit,
  cacheStatus: CacheStatus,
  request: Request,
  requestId: string,
  notModified = false
): Response {
  const headers = publicHeaders(sourceResponse.headers, perRequestHeaders, cacheStatus, requestId);
  const status = notModified ? 304 : sourceResponse.status;
  return new Response(request.method === 'HEAD' || notModified ? null : sourceResponse.body, {
    status,
    statusText: notModified ? 'Not Modified' : sourceResponse.statusText,
    headers,
  });
}

export function publicHeaders(
  sourceHeaders: Headers,
  perRequestHeaders: HeadersInit,
  cacheStatus: CacheStatus,
  requestId: string
): Headers {
  const headers = new Headers(sourceHeaders);
  for (const name of [...PER_REQUEST_HEADERS, ...INTERNAL_HEADERS]) {
    headers.delete(name);
  }
  headers.delete('vary');
  headers.set('Cache-Control', PRIVATE_CACHE_CONTROL);
  headers.set('X-Cache', cacheStatus);
  headers.set('X-Request-ID', requestId);
  const requestHeaders = new Headers(perRequestHeaders);
  for (const name of PER_REQUEST_HEADERS) {
    const value = requestHeaders.get(name);
    if (value !== null) {
      headers.set(name, value);
    }
  }
  return headers;
}

export function ifNoneMatchMatches(request: Request, response: Response): boolean {
  const requestValue = request.headers.get('if-none-match');
  const etag = response.headers.get('etag');
  return requestValue !== null && etag !== null && requestValue === etag;
}
