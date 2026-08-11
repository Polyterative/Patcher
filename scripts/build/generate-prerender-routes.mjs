import { writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const DEFAULT_SUPABASE_URL = 'https://sozmatmywjpstwidzlss.supabase.co';
const SUPABASE_URL = (process.env.SUPABASE_URL || DEFAULT_SUPABASE_URL).replace(/\/+$/, '');
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';
const SUPABASE_TIMEOUT_MS = 2500;
const DEFAULT_PUBLIC_ROUTE_LIMIT = 100;

export const STATIC_ROUTES = [
  '/',
  '/home',
  '/modules/browser',
  '/patches/browser',
  '/racks/browser',
  '/manufacturers/browser',
  '/collections/browser',
  '/info/changelog',
];

const PUBLIC_ROUTE_SOURCES = [
  {
    tableName: 'modules',
    select: 'id,updated,created',
    makePath: row => positiveInteger(row.id) ? `/modules/details/${ row.id }` : undefined,
    publicOnly: true
  },
  {
    tableName: 'patches',
    select: 'id,public_id,updated,created',
    makePath: row => {
      if (nonEmptyString(row.public_id)) return `/patches/${ encodeURIComponent(row.public_id.trim()) }`;
      return positiveInteger(row.id) ? `/patches/details/${ row.id }` : undefined;
    },
    publicOnly: true
  },
  {
    tableName: 'racks',
    select: 'id,public_id,updated,created,author_profile_gate:authorid!inner(public)',
    makePath: row => {
      if (nonEmptyString(row.public_id)) return `/racks/${ encodeURIComponent(row.public_id.trim()) }`;
      return positiveInteger(row.id) ? `/racks/details/${ row.id }` : undefined;
    },
    publicOnly: true,
    filters: [['author_profile_gate.public', 'eq.true']]
  },
  {
    tableName: 'profiles',
    select: 'username,updated,created',
    makePath: row => nonEmptyString(row.username) ? `/u/${ encodeURIComponent(row.username.trim()) }` : undefined,
    publicOnly: true
  },
  {
    tableName: 'manufacturers',
    select: 'id',
    makePath: row => positiveInteger(row.id) ? `/manufacturers/details/${ row.id }` : undefined,
    publicOnly: false,
    orderByUpdated: false
  },
  {
    tableName: 'module_collections',
    select: 'public_id,updated,created',
    makePath: row => nonEmptyString(row.public_id) ? `/collections/${ encodeURIComponent(row.public_id.trim()) }` : undefined,
    publicOnly: true
  }
];

export async function buildPrerenderRoutes({
  fetchImpl = globalThis.fetch,
  supabaseUrl = SUPABASE_URL,
  supabaseAnonKey = SUPABASE_ANON_KEY,
  publicRouteLimit = resolvePublicRouteLimit(process.env.PRERENDER_PUBLIC_ROUTE_LIMIT),
} = {}) {
  const dynamicRoutes = await fetchDynamicPublicRoutes({
    fetchImpl,
    supabaseUrl,
    supabaseAnonKey,
    publicRouteLimit,
  });

  return Array.from(new Set([...STATIC_ROUTES, ...dynamicRoutes])).sort(compareRoutes);
}

export function writePrerenderRoutes(routes, outputPath = 'prerender-routes.txt') {
  writeFileSync(outputPath, routes.join('\n') + '\n', 'utf8');
}

async function fetchDynamicPublicRoutes({
  fetchImpl,
  supabaseUrl,
  supabaseAnonKey,
  publicRouteLimit,
}) {
  if (!supabaseUrl || !supabaseAnonKey || typeof fetchImpl !== 'function' || publicRouteLimit <= 0) {
    return [];
  }

  const routeGroups = await Promise.all(PUBLIC_ROUTE_SOURCES.map(async source => {
    const rows = await fetchPublicRows({
      fetchImpl,
      supabaseUrl,
      supabaseAnonKey,
      publicRouteLimit,
      source
    });
    return rows.map(source.makePath).filter(Boolean);
  }));

  return routeGroups.flat();
}

async function fetchPublicRows({
  fetchImpl,
  supabaseUrl,
  supabaseAnonKey,
  publicRouteLimit,
  source,
}) {
  const params = new URLSearchParams();
  params.set('select', source.select);
  if (source.publicOnly) {
    params.set('public', 'eq.true');
  }
  for (const [name, value] of source.filters ?? []) {
    params.set(name, value);
  }
  params.set('order', source.orderByUpdated === false ? 'id.asc' : 'updated.desc.nullslast,id.asc');
  params.set('limit', String(publicRouteLimit));

  const abortController = new AbortController();
  const timeoutHandle = setTimeout(() => abortController.abort(), SUPABASE_TIMEOUT_MS);

  const response = await fetchImpl(`${ supabaseUrl }/rest/v1/${ source.tableName }?${ params.toString() }`, {
    headers: {
      apikey: supabaseAnonKey,
      authorization: `Bearer ${ supabaseAnonKey }`
    },
    signal: abortController.signal
  }).catch(() => undefined);
  clearTimeout(timeoutHandle);

  if (!response?.ok) {
    return [];
  }

  const payload = await response.json().catch(() => []);
  return Array.isArray(payload) ? payload : [];
}

function resolvePublicRouteLimit(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : DEFAULT_PUBLIC_ROUTE_LIMIT;
}

function positiveInteger(value) {
  return Number.isInteger(value) && value > 0;
}

function nonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function compareRoutes(a, b) {
  if (a === '/') return -1;
  if (b === '/') return 1;
  return a.localeCompare(b);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const routes = await buildPrerenderRoutes();
  writePrerenderRoutes(routes);

  console.log(`✔  prerender-routes.txt written — ${ routes.length } routes (${ STATIC_ROUTES.length } static)`);
}
