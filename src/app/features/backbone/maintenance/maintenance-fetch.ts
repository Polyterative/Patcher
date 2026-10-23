import { environment } from 'src/environments/environment';

/** Flag refresh must keep working during maintenance. */
const EXEMPT_TABLES = new Set(['app_feature_flags']);

const REST_MARKER = '/rest/v1/';
const STORAGE_MARKER = '/storage/v1/';
const AUTH_MARKER = '/auth/v1/';

interface Claims {
  sub?: unknown;
  app_metadata?: { role?: unknown };
}

function decodeClaims(token: string | null): Claims | null {
  if (!token) {
    return null;
  }
  try {
    const payload = token.split('.')[1];
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json) as Claims;
  } catch {
    return null;
  }
}

function decodeRole(token: string | null): string | null {
  const role = decodeClaims(token)?.app_metadata?.role;
  return typeof role === 'string' ? role : null;
}

function bearerOf(headers: Headers): string | null {
  const value = headers.get('authorization') ?? '';
  return value.toLowerCase().startsWith('bearer ') ? value.slice(7).trim() : null;
}

/**
 * `profiles` is needed only for login / complete-profile: the signed-in user's own row
 * (id filter or upsert body id equals the JWT subject) and the username availability
 * probe (`select=id` filtered by username, which exposes nothing beyond existence).
 */
function isOwnProfileRequest(
  query: URLSearchParams,
  method: string,
  headers: Headers,
  body: unknown,
  accessToken: string | null
): boolean {
  const claimed = decodeClaims(bearerOf(headers))?.sub ?? decodeClaims(accessToken)?.sub;
  const sub = typeof claimed === 'string' && claimed ? claimed : null;
  if (sub && query.get('id') === `eq.${ sub }`) {
    return true;
  }
  if (method === 'GET' && query.get('select') === 'id' && query.has('username') && !query.has('id')) {
    return true;
  }
  if (sub && method !== 'GET' && method !== 'HEAD' && typeof body === 'string') {
    try {
      const parsed = JSON.parse(body) as unknown;
      const rows = Array.isArray(parsed) ? parsed : [parsed];
      return rows.length > 0 && rows.every(r => !!r && (r as { id?: unknown }).id === sub);
    } catch {
      return false;
    }
  }
  return false;
}

function jsonResponse(status: number, body: string, extra: Record<string, string> = {}): Response {
  return new Response(body, {status, headers: {'Content-Type': 'application/json', ...extra}});
}

/**
 * Central maintenance interception point for PostgREST traffic. While
 * `maintenanceModeEnabled` is on, non-admin REST/RPC calls never reach the network:
 * reads resolve as empty results, writes fail with a 503, storage API calls are refused.
 * Only auth, `app_feature_flags` and the signed-in user's own `profiles` row pass through.
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
    const isStorage = url.includes(STORAGE_MARKER);
    const markerAt = url.indexOf(REST_MARKER);
    if (!isStorage && (markerAt < 0 || url.includes(AUTH_MARKER))) {
      return pass();
    }
    const target = isStorage ? '' : url.slice(markerAt + REST_MARKER.length).split(/[?#]/)[0];
    if (EXEMPT_TABLES.has(target) || decodeRole(getAccessToken()) === 'admin') {
      return pass();
    }
    const method = (init?.method ?? (typeof input === 'object' && 'method' in input ? input.method : 'GET')).toUpperCase();
    const headers = new Headers(init?.headers ?? (typeof input === 'object' && 'headers' in input ? input.headers : undefined));
    if (target === 'profiles') {
      const query = new URLSearchParams(url.split('?')[1]?.split('#')[0] ?? '');
      if (isOwnProfileRequest(query, method, headers, init?.body, getAccessToken())) {
        return pass();
      }
    }
    if (isStorage) {
      return Promise.resolve(method === 'GET' || method === 'HEAD'
        ? jsonResponse(404, JSON.stringify({statusCode: '404', error: 'not_found', message: 'Object not found'}))
        : jsonResponse(503, JSON.stringify({code: 'MAINTENANCE', message: 'Patcher is in maintenance mode'})));
    }
    const isRpc = target.startsWith('rpc/');
    if (method === 'GET' || method === 'HEAD' || isRpc) {
      const accept = headers.get('accept') ?? '';
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
