import {
  NextRequest,
  NextResponse
} from 'next/server';


const SITE_URL = 'https://patcher.xyz';
const SITE_NAME = 'Patcher.xyz';
const DEFAULT_DESCRIPTION = 'Manager and database for musicians using modular gear, with a focus on saving and visualizing patch-notes.';
const DEFAULT_IMAGE = `${ SITE_URL }/assets/png/patcher_seo_hero.png`;
const SUPABASE_URL = (process.env.SUPABASE_URL || 'https://sozmatmywjpstwidzlss.supabase.co').replace(/\/+$/, '');
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY
  || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlhdCI6MTYxODA4NDU1OCwiZXhwIjoxOTMzNjYwNTU4fQ.3pSLsqyaCAGgISvOrHMt2CIX9hQowty2r8etzMwlpy8';

const BOT_UA_REGEX = /(facebookexternalhit|facebot|twitterbot|slackbot|whatsapp|telegrambot|linkedinbot|discordbot|googlebot|bingbot|applebot|chatgpt-user|gptbot|perplexitybot|duckassistbot|bytespider|yandexbot|embedly)/i;
const STATIC_ASSET_REGEX = /\.(?:css|js|map|json|txt|xml|png|jpg|jpeg|gif|webp|svg|ico|woff2?|ttf|otf|eot)$/i;

type EntityType = 'site' | 'module' | 'patch' | 'rack';

interface ShareMetadata {
  type: EntityType;
  title: string;
  description: string;
  image: string;
  url: string;
  published?: string;
  modified?: string;
  jsonLd: Record<string, unknown>;
}

interface ModuleRow {
  id: number;
  name?: string;
  description?: string;
  hp?: number;
  created?: string;
  updated?: string;
  manufacturer?: {
    name?: string;
  };
  panels?: {
    filename?: string;
    color?: number;
  }[];
}

interface PatchRow {
  id: number;
  name?: string;
  description?: string;
  created?: string;
  updated?: string;
}

interface RackRow {
  id: number;
  name?: string;
  description?: string;
  hp?: number;
  rows?: number;
  image?: string;
  created?: string;
  updated?: string;
}

export default async function middleware(request: NextRequest) {
  const pathname = normalizePathname(request.nextUrl.pathname);

  if (request.nextUrl.searchParams.has('__spa')) {
    return NextResponse.next();
  }

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return NextResponse.next();
  }

  if (isBypassPath(pathname)) {
    return NextResponse.next();
  }

  const userAgent = request.headers.get('user-agent') || '';
  if (!BOT_UA_REGEX.test(userAgent)) {
    return NextResponse.next();
  }

  const canonicalUrl = `${ SITE_URL }${ pathname }`;
  const metadata = await buildMetadata(pathname, canonicalUrl);
  const html = renderHtml(metadata);

  return new NextResponse(html, {
    status: 200,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'public, s-maxage=300, stale-while-revalidate=86400'
    }
  });
}

export const config = {
  matcher: '/:path*'
};

function isBypassPath(pathname: string): boolean {
  return pathname.startsWith('/assets/')
    || pathname.startsWith('/api/')
    || pathname.startsWith('/_vercel/')
    || pathname.startsWith('/.well-known/')
    || pathname === '/favicon.ico'
    || STATIC_ASSET_REGEX.test(pathname);
}

function normalizePathname(pathname: string): string {
  if (!pathname || pathname === '/') {
    return '/';
  }
  return pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
}

async function buildMetadata(pathname: string, canonicalUrl: string): Promise<ShareMetadata> {
  const moduleMatch = pathname.match(/^\/modules\/details\/(\d+)$/);
  if (moduleMatch) {
    const moduleId = parseInt(moduleMatch[1], 10);
    const moduleMetadata = await getModuleMetadata(moduleId, canonicalUrl);
    if (moduleMetadata) {
      return moduleMetadata;
    }
  }

  const patchMatch = pathname.match(/^\/patches\/details\/(\d+)$/);
  if (patchMatch) {
    const patchId = parseInt(patchMatch[1], 10);
    const patchMetadata = await getPatchMetadata(patchId, canonicalUrl);
    if (patchMetadata) {
      return patchMetadata;
    }
  }

  const rackMatch = pathname.match(/^\/racks\/details\/(\d+)$/);
  if (rackMatch) {
    const rackId = parseInt(rackMatch[1], 10);
    const rackMetadata = await getRackMetadata(rackId, canonicalUrl);
    if (rackMetadata) {
      return rackMetadata;
    }
  }

  return defaultMetadata(canonicalUrl);
}

async function getModuleMetadata(moduleId: number, canonicalUrl: string): Promise<ShareMetadata | undefined> {
  const params = new URLSearchParams();
  params.set('select', 'id,name,description,hp,created,updated,manufacturer:manufacturerId(name),panels:module_panels(filename,color)');
  params.set('id', `eq.${ moduleId }`);
  params.set('public', 'eq.true');
  params.set('limit', '1');
  params.set('panels.limit', '1');
  params.set('panels.order', 'color.asc');

  const moduleRow = await fetchSupabaseRow<ModuleRow>('modules', params);
  if (!moduleRow || !moduleRow.id) {
    return undefined;
  }

  const manufacturerName = (moduleRow.manufacturer?.name || '').trim();
  const moduleName = (moduleRow.name || `Module #${ moduleRow.id }`).trim();
  const title = manufacturerName
    ? `${ moduleName } by ${ manufacturerName } | ${ SITE_NAME }`
    : `${ moduleName } | ${ SITE_NAME }`;
  const description = clampDescription(
    moduleRow.description
      || `${ moduleName } module details${ manufacturerName ? ` by ${ manufacturerName }` : '' }. ${ moduleRow.hp ? `${ moduleRow.hp } HP.` : '' }`,
    DEFAULT_DESCRIPTION
  );

  const panelFilename = moduleRow.panels?.[0]?.filename;
  const image = panelFilename
    ? `${ SUPABASE_URL }/storage/v1/object/public/module-panels/${ encodeURIComponent(panelFilename) }`
    : DEFAULT_IMAGE;

  return {
    type: 'module',
    title,
    description,
    image,
    url: canonicalUrl,
    published: moduleRow.created,
    modified: moduleRow.updated,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: moduleName,
      description,
      image,
      url: canonicalUrl,
      ...(manufacturerName ? {
        brand: {
          '@type': 'Brand',
          name: manufacturerName
        }
      } : {})
    }
  };
}

async function getPatchMetadata(patchId: number, canonicalUrl: string): Promise<ShareMetadata | undefined> {
  const params = new URLSearchParams();
  params.set('select', 'id,name,description,created,updated');
  params.set('id', `eq.${ patchId }`);
  params.set('public', 'eq.true');
  params.set('limit', '1');

  const patchRow = await fetchSupabaseRow<PatchRow>('patches', params);
  if (!patchRow || !patchRow.id) {
    return undefined;
  }

  const patchName = (patchRow.name || `Patch #${ patchRow.id }`).trim();
  const title = `${ patchName } | ${ SITE_NAME }`;
  const description = clampDescription(
    patchRow.description || `${ patchName } patch details and connection overview on ${ SITE_NAME }.`,
    DEFAULT_DESCRIPTION
  );

  return {
    type: 'patch',
    title,
    description,
    image: DEFAULT_IMAGE,
    url: canonicalUrl,
    published: patchRow.created,
    modified: patchRow.updated,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'CreativeWork',
      name: patchName,
      description,
      image: DEFAULT_IMAGE,
      url: canonicalUrl
    }
  };
}

async function getRackMetadata(rackId: number, canonicalUrl: string): Promise<ShareMetadata | undefined> {
  const params = new URLSearchParams();
  params.set('select', 'id,name,description,hp,rows,image,created,updated');
  params.set('id', `eq.${ rackId }`);
  params.set('public', 'eq.true');
  params.set('limit', '1');

  const rackRow = await fetchSupabaseRow<RackRow>('racks', params);
  if (!rackRow || !rackRow.id) {
    return undefined;
  }

  const rackName = (rackRow.name || `Rack #${ rackRow.id }`).trim();
  const title = `${ rackName } | ${ SITE_NAME }`;
  const description = clampDescription(
    rackRow.description || `${ rackName } rack details on ${ SITE_NAME }. ${ rackRow.hp ? `${ rackRow.hp } HP` : '' }${ rackRow.rows ? ` across ${ rackRow.rows } rows` : '' }.`,
    DEFAULT_DESCRIPTION
  );

  const image = resolveRackImage(rackRow.image);

  return {
    type: 'rack',
    title,
    description,
    image,
    url: canonicalUrl,
    published: rackRow.created,
    modified: rackRow.updated,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'CreativeWork',
      name: rackName,
      description,
      image,
      url: canonicalUrl
    }
  };
}

function defaultMetadata(canonicalUrl: string): ShareMetadata {
  return {
    type: 'site',
    title: SITE_NAME,
    description: DEFAULT_DESCRIPTION,
    image: DEFAULT_IMAGE,
    url: canonicalUrl,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: SITE_NAME,
      url: SITE_URL,
      description: DEFAULT_DESCRIPTION
    }
  };
}

function resolveRackImage(image?: string): string {
  if (!image) {
    return DEFAULT_IMAGE;
  }
  if (image.startsWith('http://') || image.startsWith('https://')) {
    return image;
  }
  return `${ SUPABASE_URL }/storage/v1/object/public/racks/${ encodeURIComponent(image) }`;
}

async function fetchSupabaseRow<T>(tableName: string, params: URLSearchParams): Promise<T | undefined> {
  const response = await fetch(`${ SUPABASE_URL }/rest/v1/${ tableName }?${ params.toString() }`, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      authorization: `Bearer ${ SUPABASE_ANON_KEY }`
    }
  }).catch(() => undefined);

  if (!response || !response.ok) {
    return undefined;
  }

  const payload = await response.json().catch(() => undefined);
  if (!payload) {
    return undefined;
  }

  if (Array.isArray(payload)) {
    return payload[0] as T | undefined;
  }

  return payload as T;
}

function renderHtml(metadata: ShareMetadata): string {
  const canonical = escapeHtml(metadata.url);
  const title = escapeHtml(metadata.title);
  const description = escapeHtml(metadata.description);
  const image = escapeHtml(metadata.image);
  const redirectTarget = addSpaBypass(metadata.url);
  const redirectUrl = escapeHtml(redirectTarget);
  const redirectScriptTarget = JSON.stringify(redirectTarget);
  const jsonLd = JSON.stringify(metadata.jsonLd).replace(/</g, '\\u003c');

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>${ title }</title>
  <meta name="description" content="${ description }">
  <meta name="robots" content="index,follow,max-image-preview:large">
  <link rel="canonical" href="${ canonical }">

  <meta property="og:site_name" content="${ SITE_NAME }">
  <meta property="og:type" content="website">
  <meta property="og:title" content="${ title }">
  <meta property="og:description" content="${ description }">
  <meta property="og:url" content="${ canonical }">
  <meta property="og:image" content="${ image }">
  <meta property="og:image:secure_url" content="${ image }">
  <meta property="og:image:alt" content="${ title }">

  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${ title }">
  <meta name="twitter:description" content="${ description }">
  <meta name="twitter:url" content="${ canonical }">
  <meta name="twitter:image" content="${ image }">
  <meta name="twitter:image:alt" content="${ title }">

  <script type="application/ld+json">${ jsonLd }</script>
  <script>if(!(${ BOT_UA_REGEX }).test(navigator.userAgent)){window.location.replace(${ redirectScriptTarget });}</script>
</head>
<body>
  <p>Continue to <a href="${ redirectUrl }">${ canonical }</a></p>
</body>
</html>`;
}

function clampDescription(value?: string, fallback?: string): string {
  const cleaned = (value || fallback || DEFAULT_DESCRIPTION).replace(/\s+/g, ' ').trim();
  return cleaned.length <= 220 ? cleaned : `${ cleaned.slice(0, 217) }...`;
}

function addSpaBypass(url: string): string {
  const separator = url.includes('?') ? '&' : '?';
  return `${ url }${ separator }__spa=1`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
