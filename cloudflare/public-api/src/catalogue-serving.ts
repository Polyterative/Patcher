import {
  type CacheStore,
  type ExecutionContextLike,
  cacheRequestForKey,
  defaultCacheStore,
  ifNoneMatchMatches,
  readCachedEntry,
  toCacheEntry,
  toOutgoingResponse,
} from './cache.ts';
import type {
  CatalogueProvider,
} from './catalogue-types.ts';
import { withHyperdriveCatalogueProvider } from './catalogue-provider.ts';
import type { HyperdriveBinding } from './database.ts';
import { errorResponse, corsHeaders } from './response.ts';
import {
  type RequestNormalizationResult,
  decodeCursor,
  parseCsv,
  parseLimit,
  parseModuleIncludes,
  parseOptionalNonnegativeInteger,
  parseOptionalPositiveInteger,
  parseSort,
} from './request.ts';

export interface CatalogueServingEnv {
  HYPERDRIVE?: HyperdriveBinding;
}

export interface CatalogueServingOptions {
  catalogueProvider?: CatalogueProvider;
  cacheStore?: CacheStore | null;
  executionContext?: ExecutionContextLike;
  scheduler?: (promise: Promise<unknown>) => void;
  clock?: () => number;
  logger?: Pick<Console, 'error'>;
}

interface OriginSuccess {
  kind: 'success';
  response: Response;
  policy: { freshSeconds: number; swrSeconds: number };
}

type OriginResult = OriginSuccess | { kind: 'not_found' };

const IN_FLIGHT_REFRESHES = new Map<string, Promise<void>>();
const MAX_IN_FLIGHT_REFRESHES = 256;

export async function serveCatalogueRequest(
  request: Request,
  normalized: Extract<RequestNormalizationResult, { ok: true }>,
  env: CatalogueServingEnv,
  quotaHeaders: Headers,
  options: CatalogueServingOptions = {}
): Promise<Response> {
  const requestId = crypto.randomUUID();
  if (!normalized.route) {
    return errorResponse(request, 404, 'not_found', 'Route not found', quotaHeaders, requestId);
  }
  if (normalized.route.id !== null && normalized.route.id <= 0) {
    return errorResponse(
      request,
      404,
      'not_found',
      'Resource not found',
      quotaHeaders,
      requestId
    );
  }

  const cacheStore = options.cacheStore === undefined ? defaultCacheStore() : options.cacheStore;
  const cacheRequest = cacheRequestForKey(normalized.cacheKey);
  const nowMs = options.clock?.() ?? Date.now();
  const cached = await matchCache(cacheStore, cacheRequest, nowMs, options.logger);
  if (cached) {
    const isFresh = nowMs <= cached.freshUntilMs;
    if (!isFresh) {
      scheduleRefresh(normalized, cacheRequest, env, options);
    }
    return toOutgoingResponse(
      cached.response,
      quotaHeaders,
      isFresh ? 'HIT' : 'STALE',
      request,
      requestId,
      ifNoneMatchMatches(request, cached.response)
    );
  }

  let origin: OriginResult;
  try {
    origin = await fetchOrigin(normalized, env, options);
  } catch (error: unknown) {
    return errorResponse(
      request,
      503,
      'origin_unavailable',
      'The public API origin is temporarily unavailable',
      quotaHeaders,
      requestId
    );
  }
  if (origin.kind === 'not_found') {
    return errorResponse(
      request,
      404,
      'not_found',
      'Resource not found',
      quotaHeaders,
      requestId
    );
  }

  await putCache(cacheStore, cacheRequest, origin.response, origin.policy, nowMs, options.logger);
  return toOutgoingResponse(
    origin.response,
    quotaHeaders,
    'MISS',
    request,
    requestId,
    ifNoneMatchMatches(request, origin.response)
  );
}

async function matchCache(
  cacheStore: CacheStore | null,
  cacheRequest: Request,
  nowMs: number,
  logger: Pick<Console, 'error'> = console
) {
  if (!cacheStore) {
    return null;
  }
  try {
    const response = await cacheStore.match(cacheRequest);
    return response ? readCachedEntry(response, nowMs) : null;
  } catch (error: unknown) {
    logStructuredError(logger, 'public_api_cache_match_failed', error);
    return null;
  }
}

async function putCache(
  cacheStore: CacheStore | null,
  cacheRequest: Request,
  response: Response,
  policy: OriginSuccess['policy'],
  nowMs: number,
  logger: Pick<Console, 'error'> = console
): Promise<void> {
  if (!cacheStore) {
    return;
  }
  try {
    await cacheStore.put(cacheRequest, toCacheEntry(response, policy, nowMs));
  } catch (error: unknown) {
    logStructuredError(logger, 'public_api_cache_put_failed', error);
  }
}

async function fetchOrigin(
  normalized: Extract<RequestNormalizationResult, { ok: true }>,
  env: CatalogueServingEnv,
  options: CatalogueServingOptions
): Promise<OriginResult> {
  try {
    return await withCatalogueProvider(env, options, async provider => {
      const body = await resolveBody(normalized, provider);
      if (body === null) {
        return { kind: 'not_found' };
      }
      return {
        kind: 'success',
        response: await jsonResponse(body),
        policy: cachePolicyForRoute(normalized.route?.kind ?? 'modules:list'),
      };
    });
  } catch (error: unknown) {
    logStructuredError(options.logger ?? console, 'public_api_origin_failed', error);
    throw new OriginUnavailableError();
  }
}

async function resolveBody(
  normalized: Extract<RequestNormalizationResult, { ok: true }>,
  provider: CatalogueProvider
): Promise<unknown | null> {
  const params = normalized.url.searchParams;
  const route = normalized.route;
  if (!route) {
    return null;
  }

  switch (route.kind) {
    case 'modules:list':
      return provider.listModules({
        cursor: decodeCursor(params.get('cursor')),
        fields: parseFields(params.get('fields')),
        include: parseModuleIncludes(params.get('include')),
        limit: parseLimit(params.get('limit')),
        sort: parseSort(params.get('sort')),
        filters: {
          hp: parseOptionalPositiveInteger(params.get('hp')),
          manufacturerId: parseOptionalPositiveInteger(params.get('manufacturer_id')),
          standard: parseOptionalNonnegativeInteger(params.get('standard')),
          tag: parseOptionalPositiveInteger(params.get('tag')),
        },
      });
    case 'modules:detail': {
      const module = await provider.getModule(route.id ?? 0, {
        fields: parseFields(params.get('fields')),
        include: parseModuleIncludes(params.get('include')),
      });
      return module ? { data: module } : null;
    }
    case 'manufacturers:list':
      return provider.listManufacturers({
        cursor: decodeCursor(params.get('cursor')),
        fields: parseFields(params.get('fields')),
        limit: parseLimit(params.get('limit')),
        sort: parseSort(params.get('sort')),
      });
    case 'manufacturers:detail': {
      const include = parseCsv(params.get('include'));
      const manufacturer = await provider.getManufacturer(route.id ?? 0, {
        fields: parseFields(params.get('fields')),
        includeModules: include.includes('modules'),
      });
      return manufacturer ? { data: manufacturer } : null;
    }
    case 'standards:list':
      return provider.listStandards({
        cursor: decodeCursor(params.get('cursor')),
        fields: parseFields(params.get('fields')),
        limit: parseLimit(params.get('limit')),
        sort: parseSort(params.get('sort')),
      });
    case 'tags:list':
      return provider.listTags({
        cursor: decodeCursor(params.get('cursor')),
        fields: parseFields(params.get('fields')),
        limit: parseLimit(params.get('limit')),
        sort: parseSort(params.get('sort')),
      });
  }
}

async function jsonResponse(body: unknown): Promise<Response> {
  const json = JSON.stringify(body);
  return new Response(json, {
    status: 200,
    headers: {
      ...corsHeaders(),
      'Cache-Control': 'public, max-age=0',
      'Content-Type': 'application/json; charset=utf-8',
      ETag: await sha256Etag(json),
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

async function sha256Etag(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  const hex = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0'))
    .join('');
  return `"${hex}"`;
}

async function withCatalogueProvider<T>(
  env: CatalogueServingEnv,
  options: CatalogueServingOptions,
  operation: (provider: CatalogueProvider) => Promise<T>
): Promise<T> {
  if (options.catalogueProvider) {
    return operation(options.catalogueProvider);
  }
  if (!env.HYPERDRIVE) {
    throw new Error('catalogue origin binding is not configured');
  }
  return withHyperdriveCatalogueProvider(env.HYPERDRIVE, operation);
}

function cachePolicyForRoute(kind: string) {
  if (kind === 'standards:list' || kind === 'tags:list') {
    return { freshSeconds: 21_600, swrSeconds: 604_800 };
  }
  if (kind.endsWith(':detail')) {
    return { freshSeconds: 21_600, swrSeconds: 86_400 };
  }
  return { freshSeconds: 3600, swrSeconds: 86_400 };
}

function parseFields(value: string | null): string[] | null {
  const fields = parseCsv(value);
  return fields.length > 0 ? fields : null;
}

function scheduleRefresh(
  normalized: Extract<RequestNormalizationResult, { ok: true }>,
  cacheRequest: Request,
  env: CatalogueServingEnv,
  options: CatalogueServingOptions
): void {
  const existing = IN_FLIGHT_REFRESHES.get(normalized.cacheKey);
  if (existing) {
    return;
  }
  if (IN_FLIGHT_REFRESHES.size >= MAX_IN_FLIGHT_REFRESHES) {
    const oldest = IN_FLIGHT_REFRESHES.keys().next().value;
    if (oldest !== undefined) {
      IN_FLIGHT_REFRESHES.delete(oldest);
    }
  }

  const refresh = refreshCacheEntry(normalized, cacheRequest, env, options)
    .finally(() => IN_FLIGHT_REFRESHES.delete(normalized.cacheKey));
  IN_FLIGHT_REFRESHES.set(normalized.cacheKey, refresh);

  if (options.scheduler) {
    options.scheduler(refresh);
    return;
  }
  if (options.executionContext) {
    options.executionContext.waitUntil(refresh);
    return;
  }
  void refresh;
}

async function refreshCacheEntry(
  normalized: Extract<RequestNormalizationResult, { ok: true }>,
  cacheRequest: Request,
  env: CatalogueServingEnv,
  options: CatalogueServingOptions
): Promise<void> {
  try {
    const cacheStore = options.cacheStore === undefined ? defaultCacheStore() : options.cacheStore;
    const origin = await fetchOrigin(normalized, env, options);
    if (origin.kind === 'not_found') {
      return;
    }
    await putCache(
      cacheStore,
      cacheRequest,
      origin.response,
      origin.policy,
      options.clock?.() ?? Date.now(),
      options.logger
    );
  } catch (error: unknown) {
    logStructuredError(
      options.logger ?? console,
      'public_api_cache_refresh_failed',
      error
    );
  }
}

function logStructuredError(
  logger: Pick<Console, 'error'>,
  event: string,
  error: unknown
): void {
  logger.error(JSON.stringify({
    event,
    error: errorMessage(error),
  }));
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

class OriginUnavailableError extends Error {}
