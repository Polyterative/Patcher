const DEFAULT_SITE_URL = 'https://patcher.xyz';
const SITE_URL = resolveSiteUrl();
const SITE_HOST = extractHost(SITE_URL);
const DEFAULT_SUPABASE_URL = 'https://sozmatmywjpstwidzlss.supabase.co';
const SUPABASE_URL = (process.env.SUPABASE_URL || DEFAULT_SUPABASE_URL).replace(/\/+$/, '');
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';
const SUPABASE_TIMEOUT_MS = 2500;
const VERCEL_ENV = (process.env.VERCEL_ENV || '').toLowerCase();
const STATIC_ROUTES = [
  '/',
  '/home',
  '/modules/browser',
  '/patches/browser',
  '/racks/browser'
];

interface PublicEntityRow {
  id?: number;
  created?: string;
  updated?: string;
}

interface SitemapEntry {
  loc: string;
  lastmod?: string;
}

export default async function handler(req: any, res: any): Promise<void> {
  if (req.method !== 'GET') {
    res.setHeader('allow', 'GET');
    res.status(405).send('Method Not Allowed');
    return;
  }

  const previewRequest = isPreviewRequest(req);
  const entries = await buildSitemapEntries();
  const xml = renderSitemapXml(entries);

  res.setHeader('content-type', 'application/xml; charset=utf-8');
  res.setHeader('cache-control', previewRequest
    ? 'private, no-store, max-age=0'
    : 'public, s-maxage=900, stale-while-revalidate=86400');
  res.setHeader('x-robots-tag', previewRequest
    ? 'noindex, nofollow, noarchive'
    : 'index, follow, max-image-preview:large');
  res.status(200).send(xml);
}

async function buildSitemapEntries(): Promise<SitemapEntry[]> {
  const staticEntries = STATIC_ROUTES.map(route => ({
    loc: `${ SITE_URL }${ route }`
  }));
  
  const [moduleRows, patchRows, rackRows] = await Promise.all([
    fetchPublicEntityRows('modules'),
    fetchPublicEntityRows('patches'),
    fetchPublicEntityRows('racks')
  ]);

  const moduleEntries = moduleRows.map(row => makeEntityEntry('/modules/details/', row));
  const patchEntries = patchRows.map(row => makeEntityEntry('/patches/details/', row));
  const rackEntries = rackRows.map(row => makeEntityEntry('/racks/details/', row));
  
  return [...staticEntries, ...moduleEntries, ...patchEntries, ...rackEntries]
    .filter((entry): entry is SitemapEntry => !!entry)
    .sort((a, b) => a.loc.localeCompare(b.loc));
}

function makeEntityEntry(routePrefix: string, row: PublicEntityRow): SitemapEntry | undefined {
  if (!row.id) {
    return undefined;
  }

  return {
    loc: `${ SITE_URL }${ routePrefix }${ row.id }`,
    lastmod: normalizeIsoDate(row.updated || row.created)
  };
}

function normalizeIsoDate(value?: string): string | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return undefined;
  }

  return parsed.toISOString();
}


async function fetchPublicEntityRows(tableName: string): Promise<PublicEntityRow[]> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return [];
  }

  const params = new URLSearchParams();
  params.set('select', 'id,created,updated');
  params.set('public', 'eq.true');
  params.set('order', 'updated.desc.nullslast,id.asc');
  params.set('limit', '5000');

  const abortController = new AbortController();
  const timeoutHandle = setTimeout(() => abortController.abort(), SUPABASE_TIMEOUT_MS);

  const response = await fetch(`${ SUPABASE_URL }/rest/v1/${ tableName }?${ params.toString() }`, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      authorization: `Bearer ${ SUPABASE_ANON_KEY }`
    },
    signal: abortController.signal
  }).catch(() => undefined);
  clearTimeout(timeoutHandle);

  if (!response || !response.ok) {
    return [];
  }

  const payload = await response.json().catch(() => []);
  return Array.isArray(payload) ? payload as PublicEntityRow[] : [];
}

function resolveSiteUrl(): string {
  const explicitOrigin = normalizeConfiguredOrigin(process.env.SEO_CANONICAL_ORIGIN || '');
  if (explicitOrigin) {
    return explicitOrigin;
  }

  const productionOrigin = normalizeConfiguredOrigin(process.env.VERCEL_PROJECT_PRODUCTION_URL || '');
  if (productionOrigin) {
    return productionOrigin;
  }

  return DEFAULT_SITE_URL;
}

function normalizeConfiguredOrigin(origin: string): string {
  const cleanedOrigin = origin.trim();
  if (!cleanedOrigin) {
    return '';
  }

  const prefixedOrigin = /^https?:\/\//i.test(cleanedOrigin) ? cleanedOrigin : `https://${ cleanedOrigin }`;
  try {
    return new URL(prefixedOrigin).origin.replace(/\/+$/, '');
  } catch {
    return '';
  }
}

function extractHost(origin: string): string {
  try {
    return new URL(origin).host.toLowerCase();
  } catch {
    return '';
  }
}

function isPreviewRequest(req: any): boolean {
  if (VERCEL_ENV) {
    return VERCEL_ENV !== 'production';
  }

  if (!SITE_HOST) {
    return false;
  }

  const requestHost = String(req.headers['x-forwarded-host'] || req.headers.host || '').toLowerCase();
  if (!requestHost) {
    return false;
  }

  const requestBareHost = requestHost.replace(/^www\./, '');
  const siteBareHost = SITE_HOST.replace(/^www\./, '');
  return requestBareHost !== siteBareHost;
}

function renderSitemapXml(entries: SitemapEntry[]): string {
  const body = entries.map((entry) => {
    const lastmodTag = entry.lastmod ? `<lastmod>${ escapeXml(entry.lastmod) }</lastmod>` : '';
    return `<url><loc>${ escapeXml(entry.loc) }</loc>${ lastmodTag }</url>`;
  }).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${ body }</urlset>`;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}