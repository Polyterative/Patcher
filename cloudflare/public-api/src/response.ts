import { PRIVATE_CACHE_CONTROL } from './cache.ts';

export function errorResponse(
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
  headers.set('Cache-Control', PRIVATE_CACHE_CONTROL);
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

export function corsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Max-Age': '86400',
  };
}
