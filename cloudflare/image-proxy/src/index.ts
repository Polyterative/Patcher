export interface ImageProxyEnv {
  SUPABASE_STORAGE_ORIGIN?: string;
  ALLOWED_BUCKETS?: string;
  BROWSER_CACHE_TTL_SECONDS?: string;
  EDGE_CACHE_TTL_SECONDS?: string;
  /** Public anon key (secret binding) used only to read the maintenance flag. Unset: maintenance gating is skipped. */
  SUPABASE_ANON_KEY?: string;
}

export const MAINTENANCE_CACHE_TTL_MS = 30_000;
const MAINTENANCE_FLAG_PATH =
  '/rest/v1/app_feature_flags?select=enabled&key=eq.maintenanceModeEnabled&environment=eq.production';
let maintenanceState: { enabled: boolean; expiresAt: number } | null = null;

export function resetMaintenanceCache(): void {
  maintenanceState = null;
}

/**
 * True while the production maintenance flag is on. Cached in-isolate for 30 s. Any error, non-OK status or
 * unexpected body counts as "on" (fail closed, not cached). Returns false only when no anon key is configured.
 */
export async function isMaintenanceActive(env: ImageProxyEnv, nowMs: number = Date.now()): Promise<boolean> {
  if (!env.SUPABASE_ANON_KEY) return false;
  if (maintenanceState && maintenanceState.expiresAt > nowMs) return maintenanceState.enabled;
  try {
    const restBase = new URL(env.SUPABASE_STORAGE_ORIGIN || DEFAULT_SUPABASE_STORAGE_ORIGIN).origin;
    const response = await fetch(`${restBase}${MAINTENANCE_FLAG_PATH}`, {
      headers: { apikey: env.SUPABASE_ANON_KEY, Authorization: `Bearer ${env.SUPABASE_ANON_KEY}` },
      cf: { cacheTtl: 0, cacheEverything: false },
    } as RequestInit);
    if (!response.ok) throw new Error(`flag lookup status ${response.status}`);
    const rows: unknown = await response.json();
    if (!Array.isArray(rows) || rows.length > 1) throw new Error('unexpected flag body');
    const first = rows[0] as { enabled?: unknown } | undefined;
    if (rows.length === 1 && typeof first?.enabled !== 'boolean') throw new Error('unexpected flag row');
    const enabled = rows.length === 1 && first?.enabled === true;
    maintenanceState = { enabled, expiresAt: nowMs + MAINTENANCE_CACHE_TTL_MS };
    return enabled;
  } catch {
    maintenanceState = null;
    return true;
  }
}

function maintenanceResponse(): Response {
  return new Response('Service temporarily unavailable', {
    status: 503,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-store',
      'Retry-After': '300',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

export const DEFAULT_SUPABASE_STORAGE_ORIGIN = 'https://supabase.patcher.xyz/storage/v1/object/public';
export const DEFAULT_ALLOWED_BUCKETS = [
  'module-panels',
  'racks',
  'manufacturer-logos',
  'module-collections',
  'patches',
  'marketplace-listings',
];
export const DEFAULT_BROWSER_CACHE_TTL_SECONDS = 604800;
export const DEFAULT_EDGE_CACHE_TTL_SECONDS = 2592000;

export function allowedBuckets(env: ImageProxyEnv): Set<string> {
  const configuredBuckets = env.ALLOWED_BUCKETS
    ?.split(',')
    .map(bucket => bucket.trim())
    .filter(Boolean);

  return new Set(configuredBuckets?.length ? configuredBuckets : DEFAULT_ALLOWED_BUCKETS);
}

export function readBrowserCacheTtlSeconds(env: ImageProxyEnv): number {
  return readPositiveInteger(env.BROWSER_CACHE_TTL_SECONDS, DEFAULT_BROWSER_CACHE_TTL_SECONDS);
}

export function readEdgeCacheTtlSeconds(env: ImageProxyEnv): number {
  return readPositiveInteger(env.EDGE_CACHE_TTL_SECONDS, DEFAULT_EDGE_CACHE_TTL_SECONDS);
}

export function buildOriginImageUrl(requestUrl: string, env: ImageProxyEnv = {}): string | null {
  const url = new URL(requestUrl);
  const segments = url.pathname.split('/').filter(Boolean);
  if (segments.length < 2) return null;

  const [bucketSegment, ...pathSegments] = segments;
  const bucket = safeDecodePathSegment(bucketSegment);
  if (!bucket || !allowedBuckets(env).has(bucket)) return null;

  const decodedPathSegments = pathSegments.map(safeDecodePathSegment);
  if (decodedPathSegments.some(segment => !segment || segment === '.' || segment === '..')) return null;

  const origin = new URL(env.SUPABASE_STORAGE_ORIGIN || DEFAULT_SUPABASE_STORAGE_ORIGIN);
  const originPath = [
    origin.pathname.replace(/\/+$/, ''),
    encodeURIComponent(bucket),
    ...decodedPathSegments.map(segment => encodeURIComponent(segment)),
  ].join('/');

  origin.pathname = originPath;
  origin.search = '';
  return origin.toString();
}

export function imageProxyCacheHeaders(status: number, env: ImageProxyEnv = {}): Headers {
  const headers = new Headers({
    'Access-Control-Allow-Origin': '*',
    'X-Content-Type-Options': 'nosniff',
  });

  if (status >= 200 && status < 300) {
    headers.set(
      'Cache-Control',
      `public, max-age=${readBrowserCacheTtlSeconds(env)}, s-maxage=${readEdgeCacheTtlSeconds(env)}`
    );
  } else if (status === 404 || status === 410) {
    headers.set('Cache-Control', 'public, max-age=300');
  } else {
    headers.set('Cache-Control', 'no-store');
  }

  return headers;
}

function safeDecodePathSegment(segment: string): string | null {
  try {
    return decodeURIComponent(segment);
  } catch {
    return null;
  }
}

function readPositiveInteger(rawValue: string | undefined, defaultValue: number): number {
  const value = Number(rawValue);
  return Number.isInteger(value) && value > 0 ? value : defaultValue;
}

function methodNotAllowedResponse(): Response {
  return new Response('Method not allowed', {
    status: 405,
    headers: {
      Allow: 'GET, HEAD, OPTIONS',
      'Cache-Control': 'no-store',
    },
  });
}

function notFoundResponse(): Response {
  return new Response('Not found', {
    status: 404,
    headers: imageProxyCacheHeaders(404),
  });
}

async function handleImageProxyRequest(request: Request, env: ImageProxyEnv): Promise<Response> {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  if (request.method !== 'GET' && request.method !== 'HEAD') return methodNotAllowedResponse();

  const originUrl = buildOriginImageUrl(request.url, env);
  if (!originUrl) return notFoundResponse();

  if (await isMaintenanceActive(env)) return maintenanceResponse();

  const cacheTtl = readEdgeCacheTtlSeconds(env);
  const originResponse = await fetch(originUrl, {
    method: request.method,
    cf: {
      cacheEverything: true,
      cacheTtl,
      cacheTtlByStatus: {
        '200-299': cacheTtl,
        '404': 300,
        '410': 300,
        '500-599': 0,
      },
    },
  } as RequestInit);

  const headers = imageProxyCacheHeaders(originResponse.status, env);
  for (const [key, value] of originResponse.headers) {
    const lowerKey = key.toLowerCase();
    if (
      lowerKey === 'content-type' ||
      lowerKey === 'content-length' ||
      lowerKey === 'etag' ||
      lowerKey === 'last-modified'
    ) {
      headers.set(key, value);
    }
  }

  const contentType = headers.get('content-type') || '';
  if (originResponse.ok && !contentType.toLowerCase().startsWith('image/')) {
    return new Response('Unsupported origin response', {
      status: 502,
      headers: imageProxyCacheHeaders(502, env),
    });
  }

  return new Response(originResponse.body, {
    status: originResponse.status,
    statusText: originResponse.statusText,
    headers,
  });
}

export default {
  fetch: handleImageProxyRequest,
};
