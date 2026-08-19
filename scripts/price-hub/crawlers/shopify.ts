import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import {
  normalizeShopifyProductJsonProduct,
  type ShopifyProductJsonProduct,
} from '../../../supabase/functions/_shared/price-hub/shopify-product-json.ts';
import type { NormalizedStoreListingSnapshot } from '../../../supabase/functions/_shared/price-hub/woocommerce-store-api.ts';
import type { ApprovedPriceHubStoreConfig } from '../store-configs.ts';
import {
  addStoreConfiguredMetadata,
  DEFAULT_CATALOG_MAX_PAGES,
  DEFAULT_FETCH_TIMEOUT_MS,
  DEFAULT_SHOPIFY_CATALOG_PER_PAGE,
  abortResponse,
  fetchWithTimeout,
  fetchResponseWithTimeout,
  isRecord,
  PRICE_HUB_CRAWLER_HEADERS,
  readJsonResponse,
  readOptionalPositiveInteger,
  readPositiveInteger,
} from './helpers.ts';
import type { CrawledWooCommerceStoreCatalog, CrawlWooCommerceStoreCatalogOptions, PriceHubFetch, PriceHubFetchInit, PriceHubFetchResponse } from './types.ts';

const SHOPIFY_CATALOG_RETRY_STATUSES = new Set([429, 500, 502, 503, 504]);
const SHOPIFY_CATALOG_MAX_ATTEMPTS = 10;
const SHOPIFY_CATALOG_MAX_RETRY_DELAY_MS = 30_000;
const CURL_TLS_CERTIFICATE_FAILURE_EXIT_CODE = 60;
const SHOPIFY_CURL_KILL_TIMEOUT_GRACE_MS = 1000;
const execFileAsync = promisify(execFile);

export async function crawlShopifyProductJsonCatalog(
  store: ApprovedPriceHubStoreConfig,
  options: CrawlWooCommerceStoreCatalogOptions = {},
): Promise<CrawledWooCommerceStoreCatalog> {
  if (store.adapter !== 'shopify_product_json') {
    throw new Error(`Unsupported Price Hub adapter "${store.adapter}" for Shopify product JSON crawl.`);
  }

  const fetchFn = options.fetchFn ?? fetchShopifyJsonWithCurl;
  const fetchTimeoutMs = readPositiveInteger(options.fetchTimeoutMs, DEFAULT_FETCH_TIMEOUT_MS, 'fetchTimeoutMs');
  const maxPages = readPositiveInteger(options.maxPages, DEFAULT_CATALOG_MAX_PAGES, 'maxPages');
  const maxProducts = readOptionalPositiveInteger(options.maxProducts, 'maxProducts');
  const perPage = readPositiveInteger(options.perPage, DEFAULT_SHOPIFY_CATALOG_PER_PAGE, 'perPage');
  const products: NormalizedStoreListingSnapshot[] = [];
  let pagesFetched = 0;
  let hitMaxProducts = false;
  let hitMaxPages = false;

  for (let page = 1; page <= maxPages; page += 1) {
    const pageSize = maxProducts === undefined
      ? perPage
      : Math.min(perPage, maxProducts - products.length);
    if (pageSize <= 0) {
      hitMaxProducts = true;
      break;
    }

    const pageProducts = await fetchShopifyCatalogPage(store, page, pageSize, fetchFn, fetchTimeoutMs);
    pagesFetched = page;

    if (pageProducts.length === 0) {
      break;
    }

    products.push(...pageProducts.map((product) => addStoreConfiguredMetadata(
      normalizeShopifyProductJsonProduct(product, {
        baseUrl: store.baseUrl,
        currencyHint: readShopifyCurrencyHint(store),
        ignoredMatchNoiseTags: readShopifyIgnoredMatchNoiseTags(store),
        variantTitlePreference: store.shopifyVariantTitlePreference,
      }),
      store,
    )));

    if (maxProducts !== undefined && products.length >= maxProducts) {
      hitMaxProducts = pageProducts.length >= pageSize;
      break;
    }

    if (pageProducts.length < pageSize) {
      break;
    }

    if (page === maxPages) {
      hitMaxPages = true;
    }
  }

  return { store, products, pagesFetched, hitMaxProducts, hitMaxPages };
}

function buildShopifyCatalogPageUrl(store: ApprovedPriceHubStoreConfig, page: number, perPage: number): string {
  const url = new URL(readShopifyCatalogPath(store), store.baseUrl);
  url.searchParams.set('limit', String(perPage));
  url.searchParams.set('page', String(page));
  return url.toString();
}

function readShopifyCatalogPath(store: ApprovedPriceHubStoreConfig): string {
  return store.catalogPath ?? '/products.json';
}

async function fetchShopifyCatalogPage(
  store: ApprovedPriceHubStoreConfig,
  page: number,
  perPage: number,
  fetchFn: PriceHubFetch,
  fetchTimeoutMs: number,
): Promise<ShopifyProductJsonProduct[]> {
  const url = buildShopifyCatalogPageUrl(store, page, perPage);
  const response = await fetchShopifyCatalogPageWithRetry(url, store, page, fetchFn, fetchTimeoutMs);
  if (!response.ok) {
    throw new Error(`Shopify catalog fetch failed for ${store.slug} page ${page}: ${response.status} ${response.statusText}`);
  }

  const body = await fetchWithTimeout(
    readJsonResponse(response, `Shopify catalog response for ${store.slug} page ${page}`),
    fetchTimeoutMs,
    `Shopify catalog response for ${store.slug} page ${page}`,
    (error) => abortResponse(response, error),
  );
  if (!isRecord(body) || !Array.isArray(body.products)) {
    throw new Error(`Shopify catalog response for ${store.slug} page ${page} must contain a products array.`);
  }

  return body.products.map(readShopifyProduct);
}

async function fetchShopifyCatalogPageWithRetry(
  url: string,
  store: ApprovedPriceHubStoreConfig,
  page: number,
  fetchFn: PriceHubFetch,
  fetchTimeoutMs: number,
): Promise<PriceHubFetchResponse> {
  let response: PriceHubFetchResponse | null = null;
  for (let attempt = 1; attempt <= SHOPIFY_CATALOG_MAX_ATTEMPTS; attempt += 1) {
    response = await fetchResponseWithTimeout(fetchFn, url, { headers: PRICE_HUB_CRAWLER_HEADERS }, fetchTimeoutMs, `Shopify catalog fetch for ${store.slug} page ${page}`);
    if (response.ok || !SHOPIFY_CATALOG_RETRY_STATUSES.has(response.status) || attempt === SHOPIFY_CATALOG_MAX_ATTEMPTS) {
      return response;
    }

    const retryDelayMs = readShopifyRetryDelayMs(response, attempt);
    await sleep(retryDelayMs);
    console.warn(`Retrying Shopify catalog fetch for ${store.slug} page ${page} after ${response.status} ${response.statusText}.`);
  }

  return response!;
}

export function readShopifyRetryDelayMs(response: Pick<PriceHubFetchResponse, 'status' | 'headers'>, attempt: number, nowMs = Date.now()): number {
  const retryAfterDelayMs = readRetryAfterDelayMs(response.headers?.get('retry-after') ?? null, nowMs);
  if (retryAfterDelayMs !== null) {
    return Math.min(retryAfterDelayMs, SHOPIFY_CATALOG_MAX_RETRY_DELAY_MS);
  }

  const fallbackDelayMs = response.status === 429
    ? 2000 * attempt
    : 500 * attempt;
  return Math.min(fallbackDelayMs, SHOPIFY_CATALOG_MAX_RETRY_DELAY_MS);
}

function readRetryAfterDelayMs(value: string | null, nowMs: number): number | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  if (/^\d+$/.test(trimmed)) {
    return Number.parseInt(trimmed, 10) * 1000;
  }

  const retryAtMs = Date.parse(trimmed);
  if (!Number.isFinite(retryAtMs)) {
    return null;
  }

  return Math.max(0, retryAtMs - nowMs);
}

function sleep(delayMs: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, delayMs));
}

async function fetchShopifyJsonWithCurl(url: string, init: PriceHubFetchInit = {}): Promise<PriceHubFetchResponse> {
  const timeoutMs = init.timeoutMs ?? DEFAULT_FETCH_TIMEOUT_MS;
  const stdout = await fetchShopifyJsonStdoutWithCurl(url, runShopifyJsonCurl, {
    signal: init.signal,
    timeoutMs: timeoutMs + SHOPIFY_CURL_KILL_TIMEOUT_GRACE_MS,
  });
  const { body, headers, status } = parseShopifyJsonCurlStdout(stdout);

  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status >= 200 && status < 300 ? 'OK' : 'HTTP error',
    headers,
    async json() {
      return JSON.parse(body) as unknown;
    },
    async text() {
      return body;
    },
  };
}

interface ShopifyJsonCurlOptions {
  signal?: AbortSignal | null;
  timeoutMs?: number;
}

type ShopifyJsonCurlRunner = (url: string, extraArgs: readonly string[], options?: ShopifyJsonCurlOptions) => Promise<string>;

export async function fetchShopifyJsonStdoutWithCurl(
  url: string,
  runCurl: ShopifyJsonCurlRunner = runShopifyJsonCurl,
  options: ShopifyJsonCurlOptions = {},
): Promise<string> {
  const resolvedOptions = {
    signal: options.signal,
    timeoutMs: readPositiveInteger(options.timeoutMs, DEFAULT_FETCH_TIMEOUT_MS, 'fetchTimeoutMs'),
  };
  try {
    return await runCurl(url, [], resolvedOptions);
  } catch (error: unknown) {
    if (!isCurlTlsCertificateFailure(error)) {
      throw error;
    }

    return runCurl(url, ['--ca-native'], resolvedOptions);
  }
}

async function runShopifyJsonCurl(url: string, extraArgs: readonly string[], options: ShopifyJsonCurlOptions = {}): Promise<string> {
  const timeoutMs = readPositiveInteger(options.timeoutMs, DEFAULT_FETCH_TIMEOUT_MS, 'fetchTimeoutMs');
  const { stdout } = await execFileAsync('curl', [
    '-sS',
    '-L',
    // No `--compressed`: requesting gzip/deflate here reliably trips Cloudflare's bot
    // challenge on several Shopify storefronts (curl's non-browser Accept-Encoding
    // value + TLS fingerprint reads as bot traffic), while an uncompressed request to
    // the same endpoint returns real product JSON. See the price-hub crawler fix that
    // added this comment for the reproduction.
    '-D',
    '-',
    ...extraArgs,
    '-A',
    PRICE_HUB_CRAWLER_HEADERS['user-agent'],
    '-H',
    'Accept: application/json',
    '-w',
    '\n%{http_code}',
    url,
  ], {
    maxBuffer: 20 * 1024 * 1024,
    timeout: timeoutMs,
    signal: options.signal ?? undefined,
    killSignal: 'SIGTERM',
  });

  return stdout;
}

interface ParsedShopifyJsonCurlStdout {
  body: string;
  headers: Pick<Headers, 'get'>;
  status: number;
}

export function parseShopifyJsonCurlStdout(stdout: string): ParsedShopifyJsonCurlStdout {
  const separatorIndex = stdout.lastIndexOf('\n');
  const payload = separatorIndex >= 0 ? stdout.slice(0, separatorIndex) : stdout;
  const status = separatorIndex >= 0 ? Number.parseInt(stdout.slice(separatorIndex + 1), 10) : 0;
  const { body, headers } = readCurlHeaderBlocks(payload);

  return {
    body,
    headers: mapToHeadersLike(headers),
    status,
  };
}

function readCurlHeaderBlocks(payload: string): { body: string; headers: Map<string, string> } {
  let rest = payload;
  let headers = new Map<string, string>();

  while (/^HTTP\/\d(?:\.\d)?\s+\d{3}/i.test(rest)) {
    const delimiterMatch = /\r?\n\r?\n/.exec(rest);
    if (!delimiterMatch) {
      break;
    }

    headers = parseCurlHeaderBlock(rest.slice(0, delimiterMatch.index));
    rest = rest.slice(delimiterMatch.index + delimiterMatch[0].length);
  }

  return { body: rest, headers };
}

function parseCurlHeaderBlock(block: string): Map<string, string> {
  const headers = new Map<string, string>();
  const lines = block.split(/\r?\n/).slice(1);
  for (const line of lines) {
    const separatorIndex = line.indexOf(':');
    if (separatorIndex <= 0) {
      continue;
    }

    const name = line.slice(0, separatorIndex).trim().toLowerCase();
    const value = line.slice(separatorIndex + 1).trim();
    if (!name || !value) {
      continue;
    }

    headers.set(name, headers.has(name) ? `${headers.get(name)}, ${value}` : value);
  }

  return headers;
}

function mapToHeadersLike(headers: Map<string, string>): Pick<Headers, 'get'> {
  return {
    get(name: string): string | null {
      return headers.get(name.toLowerCase()) ?? null;
    },
  };
}

function isCurlTlsCertificateFailure(error: unknown): boolean {
  if (!isRecord(error)) {
    return false;
  }

  return error.code === CURL_TLS_CERTIFICATE_FAILURE_EXIT_CODE
    || (typeof error.stderr === 'string' && error.stderr.includes('SSL certificate problem'));
}

function readShopifyCurrencyHint(store: ApprovedPriceHubStoreConfig): string | null {
  return store.currencyHint ?? null;
}

function readShopifyIgnoredMatchNoiseTags(store: ApprovedPriceHubStoreConfig): readonly string[] {
  return store.ignoredMatchNoiseTags ?? [];
}

function readShopifyProduct(value: unknown): ShopifyProductJsonProduct {
  if (!isRecord(value)) {
    throw new Error('Every Shopify product must be an object.');
  }

  return value;
}
