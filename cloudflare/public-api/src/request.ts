import {
  MANUFACTURER_FIELD_ALLOWLIST,
  MODULE_FIELD_ALLOWLIST,
  STANDARD_FIELD_ALLOWLIST,
  TAG_FIELD_ALLOWLIST,
} from './catalogue-mapping.ts';
import type { CursorToken, ModuleInclude, SortMode } from './catalogue-types.ts';

export type RouteKind =
  | 'modules:list'
  | 'modules:detail'
  | 'manufacturers:list'
  | 'manufacturers:detail'
  | 'standards:list'
  | 'tags:list';

export interface NormalizedRoute {
  kind: RouteKind;
  id: number | null;
}

export type RequestNormalizationResult =
  | { ok: true; url: URL; cacheKey: string; route: NormalizedRoute | null }
  | {
      ok: false;
      code: 'unknown_parameter' | 'invalid_parameter' | 'unsupported_parameter';
      parameter: string;
    };
type NormalizedValueResult =
  | { ok: true; value: string }
  | Extract<RequestNormalizationResult, { ok: false }>;

const MODULE_LIST_PARAMETERS = new Set([
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
const MODULE_DETAIL_PARAMETERS = new Set(['fields', 'include']);
const MANUFACTURER_LIST_PARAMETERS = new Set(['cursor', 'fields', 'limit', 'q', 'sort']);
const MANUFACTURER_DETAIL_PARAMETERS = new Set(['fields', 'include']);
const REFERENCE_PARAMETERS = new Set(['cursor', 'fields', 'limit', 'q', 'sort']);
const MODULE_INCLUDE_VALUES = new Set(['ins', 'outs', 'panels', 'tags']);
const MANUFACTURER_INCLUDE_VALUES = new Set(['modules']);
const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 50;
const DEFAULT_SORT: SortMode = 'name';

export function normalizeApiRequest(requestUrl: string): RequestNormalizationResult {
  const url = new URL(requestUrl);
  const route = routeForPath(url.pathname);
  const allowedParameters = route ? allowedParametersForRoute(route) : new Set<string>();

  for (const parameter of url.searchParams.keys()) {
    if (!allowedParameters.has(parameter)) {
      return { ok: false, code: 'unknown_parameter', parameter };
    }
  }

  const normalizedPath = url.pathname.replace(/\/+$/, '');
  const normalized = new URL(url.origin + normalizedPath);
  const entries: [string, string][] = [];

  for (const [key, rawValue] of url.searchParams.entries()) {
    const value = rawValue.trim();
    if (value === '') {
      continue;
    }
    const normalizedValue = normalizeValue(key, value, route);
    if (!normalizedValue.ok) {
      return normalizedValue;
    }
    entries.push([key, normalizedValue.value]);
  }

  if (route && isListRoute(route) && !entries.some(([key]) => key === 'limit')) {
    entries.push(['limit', String(DEFAULT_LIMIT)]);
  }
  if (route && isListRoute(route) && !entries.some(([key]) => key === 'sort')) {
    entries.push(['sort', DEFAULT_SORT]);
  }

  const sort = entries.find(([key]) => key === 'sort')?.[1] ?? DEFAULT_SORT;
  const cursor = entries.find(([key]) => key === 'cursor')?.[1] ?? null;
  if (cursor && !cursorMatchesSort(cursor, sort)) {
    return { ok: false, code: 'invalid_parameter', parameter: 'cursor' };
  }

  for (const [key, value] of entries.sort(([left], [right]) => left.localeCompare(right))) {
    normalized.searchParams.set(key, value);
  }

  normalized.searchParams.sort();
  return {
    ok: true,
    url: normalized,
    route,
    cacheKey: `GET ${normalized.pathname}${normalized.search}`,
  };
}

export function decodeCursor(value: string | null): CursorToken | null {
  if (!value) {
    return null;
  }
  try {
    const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
    const binary = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '='));
    const decoded = new TextDecoder().decode(
      Uint8Array.from(binary, character => character.charCodeAt(0))
    );
    const cursor = JSON.parse(decoded) as unknown;
    return isCursor(cursor) ? cursor : null;
  } catch {
    return null;
  }
}

export function parseCsv(value: string | null): string[] {
  if (!value) {
    return [];
  }
  return value.split(',').map(item => item.trim()).filter(Boolean);
}

export function parseOptionalPositiveInteger(value: string | null): number | null {
  if (value === null) {
    return null;
  }
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export function parseLimit(value: string | null): number {
  const parsed = Number(value ?? DEFAULT_LIMIT);
  return Number.isInteger(parsed) && parsed > 0 ? Math.min(parsed, MAX_LIMIT) : DEFAULT_LIMIT;
}

export function parseSort(value: string | null): SortMode {
  return value === 'id' ? 'id' : 'name';
}

export function parseModuleIncludes(value: string | null): ModuleInclude[] {
  return parseCsv(value) as ModuleInclude[];
}

function normalizeValue(
  key: string,
  value: string,
  route: NormalizedRoute | null
): NormalizedValueResult {
  if (key === 'q') {
    return { ok: false, code: 'unsupported_parameter', parameter: key };
  }
  if (key === 'sort') {
    const normalized = value.toLowerCase();
    return normalized === 'name' || normalized === 'id'
      ? { ok: true, value: normalized }
      : { ok: false, code: 'unsupported_parameter', parameter: key };
  }
  if (key === 'limit') {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0
      ? { ok: true, value: String(Math.min(parsed, MAX_LIMIT)) }
      : { ok: false, code: 'invalid_parameter', parameter: key };
  }
  if (key === 'hp' || key === 'manufacturer_id' || key === 'standard' || key === 'tag') {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0
      ? { ok: true, value: String(parsed) }
      : { ok: false, code: 'invalid_parameter', parameter: key };
  }
  if (key === 'include') {
    return normalizeInclude(value, route);
  }
  if (key === 'cursor') {
    const normalized = normalizeCursor(value);
    return normalized
      ? { ok: true, value: normalized }
      : { ok: false, code: 'invalid_parameter', parameter: key };
  }
  if (key === 'fields') {
    return normalizeFields(value, route);
  }
  return { ok: true, value };
}

function normalizeInclude(
  value: string,
  route: NormalizedRoute | null
): NormalizedValueResult {
  const allowed = route?.kind === 'manufacturers:detail'
    ? MANUFACTURER_INCLUDE_VALUES
    : MODULE_INCLUDE_VALUES;
  const values = Array.from(new Set(value.split(',').map(item => item.trim().toLowerCase())))
    .sort();
  return values.length > 0 && values.every(item => allowed.has(item))
    ? { ok: true, value: values.join(',') }
    : { ok: false, code: 'invalid_parameter', parameter: 'include' };
}

function normalizeFields(
  value: string,
  route: NormalizedRoute | null
): NormalizedValueResult {
  const allowed = fieldAllowlistForRoute(route);
  const fields = Array.from(new Set(value.split(',').map(item => item.trim()).filter(Boolean)))
    .sort();
  if (fields.length === 0 || !fields.every(field => allowed.has(field))) {
    return { ok: false, code: 'invalid_parameter', parameter: 'fields' };
  }
  return { ok: true, value: fields.join(',') };
}

function normalizeCursor(value: string): string | null {
  const cursor = decodeCursor(value);
  if (!cursor) {
    return null;
  }
  const canonical = JSON.stringify({ v: 1, s: cursor.s, id: cursor.id });
  const encoded = btoa(
    Array.from(new TextEncoder().encode(canonical), byte => String.fromCharCode(byte)).join('')
  );
  return encoded.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function cursorMatchesSort(value: string, sort: string): boolean {
  const cursor = decodeCursor(value);
  if (!cursor) {
    return false;
  }
  return sort === 'id' ? typeof cursor.s === 'number' : typeof cursor.s === 'string';
}

function routeForPath(pathname: string): NormalizedRoute | null {
  const path = pathname.replace(/\/+$/, '');
  if (path === '/v1/modules') {
    return { kind: 'modules:list', id: null };
  }
  if (path === '/v1/manufacturers') {
    return { kind: 'manufacturers:list', id: null };
  }
  if (path === '/v1/standards') {
    return { kind: 'standards:list', id: null };
  }
  if (path === '/v1/tags') {
    return { kind: 'tags:list', id: null };
  }

  const moduleDetail = /^\/v1\/modules\/(\d+)$/.exec(path);
  if (moduleDetail) {
    return { kind: 'modules:detail', id: Number(moduleDetail[1]) };
  }
  const manufacturerDetail = /^\/v1\/manufacturers\/(\d+)$/.exec(path);
  if (manufacturerDetail) {
    return { kind: 'manufacturers:detail', id: Number(manufacturerDetail[1]) };
  }
  return null;
}

function allowedParametersForRoute(route: NormalizedRoute): Set<string> {
  switch (route.kind) {
    case 'modules:list':
      return MODULE_LIST_PARAMETERS;
    case 'modules:detail':
      return MODULE_DETAIL_PARAMETERS;
    case 'manufacturers:list':
      return MANUFACTURER_LIST_PARAMETERS;
    case 'manufacturers:detail':
      return MANUFACTURER_DETAIL_PARAMETERS;
    case 'standards:list':
    case 'tags:list':
      return REFERENCE_PARAMETERS;
  }
}

function fieldAllowlistForRoute(route: NormalizedRoute | null): Set<string> {
  switch (route?.kind) {
    case 'modules:list':
    case 'modules:detail':
      return MODULE_FIELD_ALLOWLIST;
    case 'manufacturers:list':
    case 'manufacturers:detail':
      return MANUFACTURER_FIELD_ALLOWLIST;
    case 'standards:list':
      return STANDARD_FIELD_ALLOWLIST;
    case 'tags:list':
      return TAG_FIELD_ALLOWLIST;
    default:
      return new Set();
  }
}

function isListRoute(route: NormalizedRoute): boolean {
  return route.kind.endsWith(':list');
}

function isCursor(value: unknown): value is CursorToken {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const cursor = value as Record<string, unknown>;
  return cursor.v === 1
    && (typeof cursor.s === 'string' || typeof cursor.s === 'number')
    && Number.isInteger(cursor.id)
    && Number(cursor.id) > 0;
}
