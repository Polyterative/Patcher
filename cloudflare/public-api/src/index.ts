import { ApiKeyMetadataCache, verifyApiKeyMetadata } from './api-key-metadata-cache.ts';
import { bytesToHex, hmacApiKey, parseApiKeyAuthorization } from './auth.ts';
import {
  createHyperdriveApiKeyMetadataProvider,
  type ApiKeyMetadata,
  type ApiKeyMetadataProvider,
  type HyperdriveBinding,
} from './database.ts';
import { QUOTA_HEADER_NAMES } from './quota-response.ts';
import { normalizeApiRequest } from './request.ts';

export { ApiKeyCounter } from './api-key-counter.ts';

export interface PublicApiEnv {
  API_KEY_PEPPER?: string;
  HYPERDRIVE?: HyperdriveBinding;
  API_KEY_COUNTER?: PublicApiDurableObjectNamespace;
}

export interface PublicApiDurableObjectNamespace {
  idFromName(name: string): PublicApiDurableObjectId;
  get(id: PublicApiDurableObjectId): PublicApiDurableObjectStub;
}

export interface PublicApiDurableObjectId {}

export interface PublicApiDurableObjectStub {
  fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
}

export interface PublicApiRuntimeOptions {
  metadataCache?: ApiKeyMetadataCache;
  metadataProvider?: ApiKeyMetadataProvider;
  quotaNamespace?: PublicApiDurableObjectNamespace;
  clock?: () => number;
}

export async function handlePublicApiRequest(
  request: Request,
  env: PublicApiEnv,
  runtimeOptions: PublicApiRuntimeOptions = {}
): Promise<Response> {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders(),
    });
  }

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return errorResponse(request, 405, 'method_not_allowed', 'Only GET and HEAD are supported', {
      Allow: 'GET, HEAD, OPTIONS',
    });
  }

  const normalized = normalizeApiRequest(request.url);
  if (!normalized.ok) {
    return errorResponse(
      request,
      400,
      normalized.code,
      `Invalid query parameter: ${normalized.parameter}`
    );
  }

  if (!isKnownRoute(normalized.url.pathname)) {
    return errorResponse(request, 404, 'not_found', 'Route not found');
  }

  const apiKey = parseApiKeyAuthorization(request.headers.get('authorization'));
  if (!apiKey.ok) {
    return errorResponse(request, 401, apiKey.code, 'A valid API key is required');
  }

  if (!env.API_KEY_PEPPER) {
    return errorResponse(
      request,
      503,
      'configuration_error',
      'API key authentication is not configured'
    );
  }

  let digestHex: string;
  try {
    digestHex = bytesToHex(await hmacApiKey(apiKey.rawKeyBytes, env.API_KEY_PEPPER));
  } catch (error: unknown) {
    return errorResponse(
      request,
      503,
      'configuration_error',
      'API key authentication is not configured'
    );
  }

  const metadataProvider = runtimeOptions.metadataProvider
    ?? (env.HYPERDRIVE ? createHyperdriveApiKeyMetadataProvider(env.HYPERDRIVE) : null);
  if (!metadataProvider) {
    return errorResponse(
      request,
      503,
      'authentication_unavailable',
      'API key authentication is temporarily unavailable'
    );
  }

  let verification: Awaited<ReturnType<typeof verifyApiKeyMetadata>>;
  try {
    verification = await verifyApiKeyMetadata(digestHex, metadataProvider, {
      cache: runtimeOptions.metadataCache,
      nowMs: runtimeOptions.clock?.() ?? Date.now(),
    });
  } catch (error: unknown) {
    return errorResponse(
      request,
      503,
      'authentication_unavailable',
      'API key authentication is temporarily unavailable'
    );
  }

  if (!verification.ok) {
    return errorResponse(request, 401, verification.code, 'API key is invalid');
  }

  const quotaNamespace = runtimeOptions.quotaNamespace ?? env.API_KEY_COUNTER;
  if (!quotaNamespace) {
    return errorResponse(
      request,
      503,
      'quota_unavailable',
      'API quota enforcement is temporarily unavailable'
    );
  }

  const quota = await consumeApiQuota(verification.metadata, quotaNamespace);
  if (!quota.ok) {
    return errorResponse(
      request,
      quota.status,
      quota.code,
      quota.message,
      quota.headers
    );
  }

  return errorResponse(
    request,
    503,
    'origin_not_configured',
    'The public API origin is not configured in this environment',
    quota.headers
  );
}

function isKnownRoute(pathname: string): boolean {
  return /^\/v1\/(modules|manufacturers)(\/\d+)?$/.test(pathname)
    || /^\/v1\/(standards|tags)$/.test(pathname);
}

function errorResponse(
  request: Request,
  status: number,
  code: string,
  message: string,
  extraHeaders: HeadersInit = {},
  requestId = crypto.randomUUID()
): Response {
  const headers = new Headers(corsHeaders());
  const extra = new Headers(extraHeaders);
  extra.forEach((value, key) => headers.set(key, value));
  headers.set('Cache-Control', 'no-store');
  headers.set('Content-Type', 'application/json; charset=utf-8');
  headers.set('X-Request-ID', requestId);
  headers.set('X-Content-Type-Options', 'nosniff');
  return new Response(
    request.method === 'HEAD'
      ? null
      : JSON.stringify({ error: { code, message, request_id: requestId } }),
    {
      status,
      headers,
    }
  );
}

function corsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Max-Age': '86400',
  };
}

export default {
  fetch: handlePublicApiRequest,
};

type QuotaConsumeResult =
  | { ok: true; headers: Headers }
  | { ok: false; status: 429 | 503; code: string; message: string; headers?: Headers };

async function consumeApiQuota(
  metadata: ApiKeyMetadata,
  namespace: PublicApiDurableObjectNamespace
): Promise<QuotaConsumeResult> {
  const stub = namespace.get(namespace.idFromName(metadata.id));
  const consumeRequest = new Request('https://api-key-counter.local/consume', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({
      keyId: metadata.id,
      limits: {
        monthly: metadata.monthlyQuota,
        perMinute: metadata.perMinuteQuota,
      },
    }),
  });

  let response: Response;
  try {
    response = await stub.fetch(consumeRequest);
  } catch (error: unknown) {
    return quotaUnavailable();
  }

  const quotaHeaders = extractQuotaHeaders(response.headers, response.status === 429);
  if (!quotaHeaders) {
    return quotaUnavailable();
  }

  if (response.status === 200) {
    const body = await readJson(response);
    return isAllowedQuotaBody(body)
      ? { ok: true, headers: quotaHeaders }
      : quotaUnavailable();
  }

  if (response.status === 429) {
    const body = await readJson(response);
    if (!isBlockedQuotaBody(body)) {
      return quotaUnavailable();
    }
    return {
      ok: false,
      status: 429,
      code: 'rate_limit_exceeded',
      message: 'API quota exceeded',
      headers: quotaHeaders,
    };
  }

  return quotaUnavailable();
}

function extractQuotaHeaders(headers: Headers, requireRetryAfter: boolean): Headers | null {
  const result = new Headers();
  for (const name of QUOTA_HEADER_NAMES) {
    const value = headers.get(name);
    if (value !== null) {
      result.set(name, value);
    }
  }
  const required = QUOTA_HEADER_NAMES.filter(name => name !== 'retry-after');
  if (requireRetryAfter) {
    required.push('retry-after');
  }
  return required.every(name => result.has(name)) ? result : null;
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch (error: unknown) {
    return null;
  }
}

function isAllowedQuotaBody(value: unknown): value is { allowed: true } {
  return Boolean(value)
    && typeof value === 'object'
    && (value as Record<string, unknown>)['allowed'] === true;
}

function isBlockedQuotaBody(value: unknown): value is { allowed: false } {
  return Boolean(value)
    && typeof value === 'object'
    && (value as Record<string, unknown>)['allowed'] === false;
}

function quotaUnavailable(): Extract<QuotaConsumeResult, { ok: false }> {
  return {
    ok: false,
    status: 503,
    code: 'quota_unavailable',
    message: 'API quota enforcement is temporarily unavailable',
  };
}
