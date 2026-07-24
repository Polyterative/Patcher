export type RequestNormalizationResult =
  | { ok: true; url: URL; cacheKey: string }
  | { ok: false; code: 'unknown_parameter' | 'invalid_parameter'; parameter: string };

const LIST_PARAMETERS = new Set([
  'cursor',
  'fields',
  'hp',
  'include',
  'limit',
  'manufacturer_id',
  'q',
  'sort',
  'standard',
  'tag',
]);
const DETAIL_PARAMETERS = new Set(['fields', 'include']);
const REFERENCE_PARAMETERS = new Set(['cursor', 'fields', 'limit', 'q', 'sort']);
const INCLUDE_VALUES = new Set(['ins', 'outs', 'panels', 'tags']);
const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 50;

export function normalizeApiRequest(requestUrl: string): RequestNormalizationResult {
  const url = new URL(requestUrl);
  const allowedParameters = allowedParametersForPath(url.pathname);

  for (const parameter of url.searchParams.keys()) {
    if (!allowedParameters.has(parameter)) {
      return { ok: false, code: 'unknown_parameter', parameter };
    }
  }

  const normalized = new URL(url.origin + url.pathname.replace(/\/+$/, ''));
  const entries = Array.from(url.searchParams.entries())
    .filter(([, value]) => value.trim() !== '')
    .map(([key, value]) => [key, normalizeValue(key, value)] as const)
    .sort(([left], [right]) => left.localeCompare(right));

  for (const [key, value] of entries) {
    if (value === null) {
      return { ok: false, code: 'invalid_parameter', parameter: key };
    }
    normalized.searchParams.set(key, value);
  }

  if (isListPath(url.pathname) && !normalized.searchParams.has('limit')) {
    normalized.searchParams.set('limit', String(DEFAULT_LIMIT));
  }

  normalized.searchParams.sort();
  return {
    ok: true,
    url: normalized,
    cacheKey: `GET ${normalized.pathname}${normalized.search}`,
  };
}

function allowedParametersForPath(pathname: string): Set<string> {
  if (/^\/v1\/(modules|manufacturers)\/\d+\/?$/.test(pathname)) {
    return DETAIL_PARAMETERS;
  }
  if (/^\/v1\/(modules|manufacturers)\/?$/.test(pathname)) {
    return LIST_PARAMETERS;
  }
  if (/^\/v1\/(standards|tags)\/?$/.test(pathname)) {
    return REFERENCE_PARAMETERS;
  }
  return new Set();
}

function isListPath(pathname: string): boolean {
  return /^\/v1\/(modules|manufacturers|standards|tags)\/?$/.test(pathname);
}

function normalizeValue(key: string, value: string): string | null {
  const trimmed = value.trim();
  if (key === 'limit') {
    const parsed = Number(trimmed);
    return Number.isInteger(parsed) && parsed > 0
      ? String(Math.min(parsed, MAX_LIMIT))
      : null;
  }
  if (key === 'hp' || key === 'manufacturer_id' || key === 'standard' || key === 'tag') {
    const parsed = Number(trimmed);
    return Number.isInteger(parsed) && parsed >= 0 ? String(parsed) : null;
  }
  if (key === 'include') {
    const values = Array.from(new Set(trimmed.split(',').map(item => item.trim().toLowerCase())))
      .sort();
    return values.length > 0 && values.every(item => INCLUDE_VALUES.has(item))
      ? values.join(',')
      : null;
  }
  if (key === 'cursor') {
    return normalizeCursor(trimmed);
  }
  return trimmed;
}

function normalizeCursor(value: string): string | null {
  try {
    const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
    const binary = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '='));
    const decoded = new TextDecoder().decode(
      Uint8Array.from(binary, character => character.charCodeAt(0))
    );
    const cursor = JSON.parse(decoded) as unknown;
    if (!isCursor(cursor)) {
      return null;
    }

    const canonical = JSON.stringify({ v: 1, s: cursor.s, id: cursor.id });
    const encoded = btoa(
      Array.from(new TextEncoder().encode(canonical), byte => String.fromCharCode(byte)).join('')
    );
    return encoded.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  } catch {
    return null;
  }
}

function isCursor(
  value: unknown
): value is { v: 1; s: string | number; id: number } {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const cursor = value as Record<string, unknown>;
  return cursor.v === 1
    && (typeof cursor.s === 'string' || typeof cursor.s === 'number')
    && Number.isInteger(cursor.id)
    && Number(cursor.id) > 0;
}
