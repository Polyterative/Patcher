const CACHEABLE_HEADERS = [
  'access-control-allow-origin',
  'content-type',
  'etag',
  'x-content-type-options',
];
const PER_REQUEST_HEADERS = [
  'retry-after',
  'x-ratelimit-limit-minute',
  'x-ratelimit-remaining-minute',
  'x-ratelimit-limit-month',
  'x-ratelimit-remaining-month',
  'x-ratelimit-reset',
];

export function toCacheEntry(response: Response): Response {
  const cacheSource = response.clone();
  const headers = new Headers();
  for (const name of CACHEABLE_HEADERS) {
    const value = cacheSource.headers.get(name);
    if (value !== null) {
      headers.set(name, value);
    }
  }

  return new Response(cacheSource.body, {
    status: cacheSource.status,
    statusText: cacheSource.statusText,
    headers,
  });
}

export function toOutgoingResponse(
  cachedResponse: Response,
  perRequestHeaders: HeadersInit,
  cacheStatus: 'HIT' | 'MISS'
): Response {
  const headers = new Headers(cachedResponse.headers);
  for (const name of PER_REQUEST_HEADERS) {
    headers.delete(name);
  }
  const requestHeaders = new Headers(perRequestHeaders);
  for (const name of PER_REQUEST_HEADERS) {
    const value = requestHeaders.get(name);
    if (value !== null) {
      headers.set(name, value);
    }
  }
  headers.set('X-Cache', cacheStatus);

  return new Response(cachedResponse.body, {
    status: cachedResponse.status,
    statusText: cachedResponse.statusText,
    headers,
  });
}
