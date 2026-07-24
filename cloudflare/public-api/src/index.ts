import { parseApiKeyAuthorization } from './auth.ts';
import { normalizeApiRequest } from './request.ts';

export interface PublicApiEnv {
  API_KEY_PEPPER?: string;
}

export async function handlePublicApiRequest(
  request: Request,
  _env: PublicApiEnv
): Promise<Response> {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders(),
    });
  }

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return errorResponse(405, 'method_not_allowed', 'Only GET and HEAD are supported', {
      Allow: 'GET, HEAD, OPTIONS',
    });
  }

  const normalized = normalizeApiRequest(request.url);
  if (!normalized.ok) {
    return errorResponse(400, normalized.code, `Invalid query parameter: ${normalized.parameter}`);
  }

  if (!isKnownRoute(normalized.url.pathname)) {
    return errorResponse(404, 'not_found', 'Route not found');
  }

  const apiKey = parseApiKeyAuthorization(request.headers.get('authorization'));
  if (!apiKey.ok) {
    return errorResponse(401, apiKey.code, 'A valid API key is required');
  }

  return errorResponse(
    503,
    'origin_not_configured',
    'The public API origin is not configured in this environment'
  );
}

function isKnownRoute(pathname: string): boolean {
  return /^\/v1\/(modules|manufacturers)(\/\d+)?$/.test(pathname)
    || /^\/v1\/(standards|tags)$/.test(pathname);
}

function errorResponse(
  status: number,
  code: string,
  message: string,
  extraHeaders: HeadersInit = {},
  requestId = crypto.randomUUID()
): Response {
  return new Response(JSON.stringify({ error: { code, message, request_id: requestId } }), {
    status,
    headers: {
      ...corsHeaders(),
      ...extraHeaders,
      'Cache-Control': 'no-store',
      'Content-Type': 'application/json; charset=utf-8',
      'X-Request-ID': requestId,
      'X-Content-Type-Options': 'nosniff',
    },
  });
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
