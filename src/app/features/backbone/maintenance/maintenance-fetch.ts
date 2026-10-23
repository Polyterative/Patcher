import { environment } from 'src/environments/environment';

/** Tables that must keep working during maintenance (auth/profile bootstrap, flag refresh). */
const EXEMPT_TABLES = new Set(['profiles', 'app_feature_flags']);

const REST_MARKER = '/rest/v1/';

function decodeRole(token: string | null): string | null {
  if (!token) {
    return null;
  }
  try {
    const payload = token.split('.')[1];
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    const meta = (JSON.parse(json) as { app_metadata?: { role?: unknown } }).app_metadata;
    return typeof meta?.role === 'string' ? meta.role : null;
  } catch {
    return null;
  }
}

function jsonResponse(status: number, body: string, extra: Record<string, string> = {}): Response {
  return new Response(body, {status, headers: {'Content-Type': 'application/json', ...extra}});
}

/**
 * Central maintenance interception point for PostgREST traffic. While
 * `maintenanceModeEnabled` is on, non-admin REST/RPC calls never reach the network:
 * reads resolve as empty results, writes fail with a 503. Auth, storage and the
 * `profiles` / `app_feature_flags` tables are untouched.
 */
export function createMaintenanceFetch(
  getAccessToken: () => string | null,
  baseFetch?: typeof fetch,
  isEnabled: () => boolean = () => environment.features.maintenanceModeEnabled
): typeof fetch {
  return (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const pass = () => (baseFetch ?? globalThis.fetch)(input, init);
    if (!isEnabled()) {
      return pass();
    }
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const markerAt = url.indexOf(REST_MARKER);
    if (markerAt < 0) {
      return pass();
    }
    const target = url.slice(markerAt + REST_MARKER.length).split(/[?#]/)[0];
    if (EXEMPT_TABLES.has(target) || decodeRole(getAccessToken()) === 'admin') {
      return pass();
    }
    const method = (init?.method ?? (typeof input === 'object' && 'method' in input ? input.method : 'GET')).toUpperCase();
    const isRpc = target.startsWith('rpc/');
    if (method === 'GET' || method === 'HEAD' || isRpc) {
      const accept = new Headers(init?.headers ?? (typeof input === 'object' && 'headers' in input ? input.headers : undefined)).get('accept') ?? '';
      if (accept.includes('vnd.pgrst.object')) {
        return Promise.resolve(jsonResponse(406, JSON.stringify({
          code: 'PGRST116',
          details: 'The result contains 0 rows',
          hint: null,
          message: 'JSON object requested, multiple (or no) rows returned'
        })));
      }
      return Promise.resolve(method === 'HEAD'
        ? new Response(null, {status: 200, headers: {'Content-Range': '*/0'}})
        : jsonResponse(200, '[]', {'Content-Range': '*/0'}));
    }
    return Promise.resolve(jsonResponse(503, JSON.stringify({
      code: 'MAINTENANCE',
      details: null,
      hint: null,
      message: 'Patcher is in maintenance mode'
    })));
  };
}
