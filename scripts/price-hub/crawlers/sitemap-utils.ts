import { Readable } from 'node:stream';
import { createGunzip } from 'node:zlib';
import type { ApprovedPriceHubStoreConfig } from '../store-configs.ts';
import { readTextResponse } from './helpers.ts';
import type { FetchBody, PriceHubFetchResponse } from './types.ts';

export async function* readSitemapLocations(
  response: PriceHubFetchResponse,
  context: string,
  url: string,
): AsyncGenerator<string> {
  yield* parseSitemapLocationsFromChunks(readSitemapTextChunks(response, context, url));
}

export async function readSitemapResponse(response: PriceHubFetchResponse, context: string, url: string): Promise<string> {
  const chunks: string[] = [];
  for await (const chunk of readSitemapTextChunks(response, context, url)) {
    chunks.push(chunk);
  }

  return chunks.join('');
}

async function* readSitemapTextChunks(
  response: PriceHubFetchResponse,
  context: string,
  url: string,
): AsyncGenerator<string> {
  if (!url.endsWith('.gz')) {
    yield await readTextResponse(response, context);
    return;
  }

  if (!response.body && !response.arrayBuffer) {
    throw new Error(`${context} did not expose bytes for gzip sitemap.`);
  }

  const compressedStream = response.body
    ? readFetchBody(response.body)
    : Readable.from([Buffer.from(await response.arrayBuffer!())]);
  const decompressedStream = compressedStream.pipe(createGunzip());
  const decoder = new TextDecoder();

  for await (const chunk of decompressedStream) {
    yield decoder.decode(chunk, { stream: true });
  }

  const remainingText = decoder.decode();
  if (remainingText) {
    yield remainingText;
  }
}

function readFetchBody(body: FetchBody): Readable {
  if (Symbol.asyncIterator in body) {
    return Readable.from(body as AsyncIterable<Uint8Array>);
  }

  return Readable.fromWeb(body);
}

async function* parseSitemapLocationsFromChunks(chunks: AsyncIterable<string>): AsyncGenerator<string> {
  let buffer = '';

  for await (const chunk of chunks) {
    buffer += chunk;
    yield* drainSitemapLocationBuffer(buffer);
    buffer = keepSitemapLocationTail(buffer);
  }

  yield* drainSitemapLocationBuffer(buffer);
}

export function parseSitemapLocations(xml: string): string[] {
  const urls: string[] = [];
  const locationPattern = /<loc>(.*?)<\/loc>/gis;
  let locationMatch: RegExpExecArray | null;

  while ((locationMatch = locationPattern.exec(xml))) {
    urls.push(decodeXmlEntities(locationMatch[1].trim()));
  }

  return urls;
}

export function parseHtmlLinks(html: string, baseUrl: string): string[] {
  const urls: string[] = [];
  const hrefPattern = /\bhref=["']([^"']+)["']/gi;
  let hrefMatch: RegExpExecArray | null;

  while ((hrefMatch = hrefPattern.exec(html))) {
    const href = decodeXmlEntities(hrefMatch[1].trim());
    if (!href || href.includes('{{') || href.includes('}}') || href.startsWith('javascript:') || href.startsWith('#')) {
      continue;
    }

    try {
      urls.push(new URL(href, baseUrl).toString());
    } catch {
      // Ignore malformed category links; other product links may still be usable.
    }
  }

  return urls;
}

function* drainSitemapLocationBuffer(buffer: string): Generator<string> {
  const locationPattern = /<loc>(.*?)<\/loc>/gis;
  let locationMatch: RegExpExecArray | null;

  while ((locationMatch = locationPattern.exec(buffer))) {
    yield decodeXmlEntities(locationMatch[1].trim());
  }
}

function keepSitemapLocationTail(buffer: string): string {
  const lastClosingIndex = buffer.toLowerCase().lastIndexOf('</loc>');
  if (lastClosingIndex >= 0) {
    return buffer.slice(lastClosingIndex + '</loc>'.length);
  }

  const lastOpeningIndex = buffer.toLowerCase().lastIndexOf('<loc>');
  if (lastOpeningIndex >= 0) {
    return buffer.slice(lastOpeningIndex);
  }

  return buffer.slice(-16);
}

export function isApprovedStoreProductUrl(store: ApprovedPriceHubStoreConfig, productUrl: string): boolean {
  try {
    const baseUrl = new URL(store.baseUrl);
    const url = new URL(productUrl);
    return url.protocol === 'https:' && url.hostname === baseUrl.hostname;
  } catch {
    return false;
  }
}

export function isLikelyShopwareProductUrl(store: ApprovedPriceHubStoreConfig, productUrl: string): boolean {
  try {
    const baseUrl = new URL(store.baseUrl);
    const url = new URL(productUrl);
    const baseSegments = baseUrl.pathname.split('/').filter(Boolean);
    const pathSegments = url.pathname.split('/').filter(Boolean);
    const relativeSegments = pathSegments.slice(baseSegments.length);
    const slug = relativeSegments[0] ?? '';

    return relativeSegments.length === 1 && !SHOPWARE_NON_PRODUCT_SLUGS.has(slug);
  } catch {
    return false;
  }
}

const SHOPWARE_NON_PRODUCT_SLUGS = new Set([
  'agb',
  'audio-midi-din-sync',
  'b-stock',
  'blog',
  'buchla-4u',
  'cables-adapters',
  'complete-systems',
  'contact',
  'desktop-synths',
  'diy-oem',
  'drums',
  'electroacoustic',
  'events',
  'eurorack-modular-3u',
  'fx-pedals',
  'information',
  'keyboards',
  'literature',
  'merchandise',
  'mixing-consoles',
  'moog-unit-5u',
  'navigation',
  'new-stuff',
  'on-sale',
  'our-picks',
  'sequencers',
  'serge-4u',
  'shop-service',
  'studio-recording',
]);

const CUSTOM_SITEMAP_MAX_FILES = 30;

export function isLikelySitemapUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.pathname.endsWith('.xml')
      || parsedUrl.pathname.endsWith('.xml.gz')
      || parsedUrl.searchParams.has('urlset')
      || parsedUrl.pathname.includes('sitemap');
  } catch {
    return false;
  }
}

export function isAllowedCustomProductUrl(store: ApprovedPriceHubStoreConfig, productUrl: string): boolean {
  try {
    const url = new URL(productUrl);
    const path = url.pathname;
    const includes = store.productUrlPathIncludes ?? [];
    const excludes = store.productUrlPathExcludes ?? [];
    return (includes.length === 0 || includes.some((pathPart) => path.includes(pathPart)))
      && !excludes.some((pathPart) => path.includes(pathPart))
      && isAllowedStoreSpecificCustomProductPath(store, path);
  } catch {
    return false;
  }
}

function isAllowedStoreSpecificCustomProductPath(store: ApprovedPriceHubStoreConfig, path: string): boolean {
  if (store.slug === 'martin-pas') {
    return isMartinPasProductPath(path);
  }

  if (store.slug === 'exploding-shed') {
    return !isExplodingShedNonProductPath(path);
  }

  return true;
}

function isMartinPasProductPath(path: string): boolean {
  const segments = path.split('/').filter(Boolean);
  return segments.length === 3 && segments[0] === 'products';
}

function isExplodingShedNonProductPath(path: string): boolean {
  return (path !== '/' && path.endsWith('/'))
    || path.startsWith('/landingPage/')
    || path === '/test'
    || path === '/test/';
}

export function isAllowedCustomCatalogPageUrl(store: ApprovedPriceHubStoreConfig, productUrl: string): boolean {
  if (!store.catalogPath || isLikelySitemapUrl(productUrl)) {
    return false;
  }

  try {
    const catalogUrl = new URL(store.catalogPath, store.baseUrl);
    const url = new URL(productUrl);
    const catalogPath = catalogUrl.pathname.endsWith('/') ? catalogUrl.pathname : `${catalogUrl.pathname}/`;
    return isApprovedStoreProductUrl(store, productUrl)
      && (url.pathname === catalogUrl.pathname || url.pathname.startsWith(catalogPath));
  } catch {
    return false;
  }
}

function decodeXmlEntities(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}
