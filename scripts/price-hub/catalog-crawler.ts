import { execFile } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { promisify } from 'node:util';
import { createGunzip } from 'node:zlib';
import { normalizeBigCommerceProductPage } from '../../supabase/functions/_shared/price-hub/bigcommerce-metadata.ts';
import { normalizeProductMetadataPage } from '../../supabase/functions/_shared/price-hub/product-metadata-page.ts';
import {
  normalizeShopifyProductJsonProduct,
  type ShopifyProductJsonProduct,
} from '../../supabase/functions/_shared/price-hub/shopify-product-json.ts';
import { normalizeShopwareProductPage } from '../../supabase/functions/_shared/price-hub/shopware-metadata.ts';
import {
  normalizeWooCommerceStoreApiProduct,
  type NormalizedStoreListingSnapshot,
  type WooCommerceStoreApiProduct,
} from '../../supabase/functions/_shared/price-hub/woocommerce-store-api.ts';
import type { ApprovedPriceHubStoreConfig } from './store-configs.ts';

export const DEFAULT_CATALOG_MAX_PAGES = 100;
export const DEFAULT_CATALOG_PER_PAGE = 100;
export const DEFAULT_SHOPIFY_CATALOG_PER_PAGE = 250;
export const DEFAULT_SITEMAP_MAX_PRODUCTS = 100;
const SHOPIFY_CATALOG_RETRY_STATUSES = new Set([429, 500, 502, 503, 504]);
const SHOPIFY_CATALOG_MAX_ATTEMPTS = 10;
const PRICE_HUB_CRAWLER_HEADERS = {
  accept: 'application/json, text/html, application/xml, text/xml;q=0.9, */*;q=0.8',
  'user-agent': 'Patcher Price Hub local catalog crawler',
} as const;
const execFileAsync = promisify(execFile);

export interface PriceHubFetchResponse {
  ok: boolean;
  status: number;
  statusText: string;
  body?: ReadableStream<Uint8Array> | AsyncIterable<Uint8Array>;
  arrayBuffer?(): Promise<ArrayBuffer>;
  json?(): Promise<unknown>;
  text?(): Promise<string>;
}

export type PriceHubFetch = (url: string, init?: RequestInit) => Promise<PriceHubFetchResponse>;

export interface CrawlWooCommerceStoreCatalogOptions {
  fetchFn?: PriceHubFetch;
  maxPages?: number;
  maxProducts?: number;
  metadataConcurrency?: number;
  perPage?: number;
}

export interface CrawledWooCommerceStoreCatalog {
  store: ApprovedPriceHubStoreConfig;
  products: NormalizedStoreListingSnapshot[];
  pagesFetched: number;
  skippedProducts?: number;
  skippedProductUrls?: string[];
  totalProductUrls?: number;
}

export async function crawlWooCommerceStoreCatalog(
  store: ApprovedPriceHubStoreConfig,
  options: CrawlWooCommerceStoreCatalogOptions = {},
): Promise<CrawledWooCommerceStoreCatalog> {
  if (store.adapter !== 'woocommerce_store_api') {
    throw new Error(`Unsupported Price Hub adapter "${store.adapter}" for local catalog crawl.`);
  }

  const fetchFn = options.fetchFn ?? fetch;
  const maxPages = readPositiveInteger(options.maxPages, DEFAULT_CATALOG_MAX_PAGES, 'maxPages');
  const perPage = readPositiveInteger(options.perPage, DEFAULT_CATALOG_PER_PAGE, 'perPage');
  const products: NormalizedStoreListingSnapshot[] = [];
  let pagesFetched = 0;

  for (let page = 1; page <= maxPages; page += 1) {
    const pageProducts = await fetchWooCommerceCatalogPage(store, page, perPage, fetchFn);
    pagesFetched = page;

    if (pageProducts.length === 0) {
      break;
    }

    products.push(...pageProducts.map((product) => addStoreConfiguredMetadata(
      normalizeWooCommerceStoreApiProduct(product),
      store,
    )));

    if (pageProducts.length < perPage) {
      break;
    }
  }

  return { store, products, pagesFetched };
}

export async function crawlPriceHubStoreCatalog(
  store: ApprovedPriceHubStoreConfig,
  options: CrawlWooCommerceStoreCatalogOptions = {},
): Promise<CrawledWooCommerceStoreCatalog> {
  if (store.adapter === 'woocommerce_store_api') {
    return crawlWooCommerceStoreCatalog(store, options);
  }

  if (store.adapter === 'shopify_product_json') {
    return crawlShopifyProductJsonCatalog(store, options);
  }

  if (store.adapter === 'bigcommerce_metadata') {
    return crawlSitemapMetadataCatalog(store, options);
  }

  if (store.adapter === 'shopware_metadata' || store.adapter === 'custom') {
    return crawlSitemapMetadataCatalog(store, options);
  }

  throw new Error(`Unsupported Price Hub adapter "${store.adapter}" for local catalog crawl.`);
}

export async function crawlShopifyProductJsonCatalog(
  store: ApprovedPriceHubStoreConfig,
  options: CrawlWooCommerceStoreCatalogOptions = {},
): Promise<CrawledWooCommerceStoreCatalog> {
  if (store.adapter !== 'shopify_product_json') {
    throw new Error(`Unsupported Price Hub adapter "${store.adapter}" for Shopify product JSON crawl.`);
  }

  const fetchFn = options.fetchFn ?? fetchShopifyJsonWithCurl;
  const maxPages = readPositiveInteger(options.maxPages, DEFAULT_CATALOG_MAX_PAGES, 'maxPages');
  const perPage = readPositiveInteger(options.perPage, DEFAULT_SHOPIFY_CATALOG_PER_PAGE, 'perPage');
  const products: NormalizedStoreListingSnapshot[] = [];
  let pagesFetched = 0;

  for (let page = 1; page <= maxPages; page += 1) {
    const pageProducts = await fetchShopifyCatalogPage(store, page, perPage, fetchFn);
    pagesFetched = page;

    if (pageProducts.length === 0) {
      break;
    }

    products.push(...pageProducts.map((product) => addStoreConfiguredMetadata(
      normalizeShopifyProductJsonProduct(product, {
        baseUrl: store.baseUrl,
        currencyHint: readShopifyCurrencyHint(store),
        ignoredMatchNoiseTags: readShopifyIgnoredMatchNoiseTags(store),
      }),
      store,
    )));

    if (pageProducts.length < perPage) {
      break;
    }
  }

  return { store, products, pagesFetched };
}

export async function crawlBigCommerceMetadataCatalog(
  store: ApprovedPriceHubStoreConfig,
  options: CrawlWooCommerceStoreCatalogOptions = {},
): Promise<CrawledWooCommerceStoreCatalog> {
  if (store.adapter !== 'bigcommerce_metadata') {
    throw new Error(`Unsupported Price Hub adapter "${store.adapter}" for BigCommerce metadata crawl.`);
  }

  return crawlSitemapMetadataCatalog(store, options);
}

export async function crawlSitemapMetadataCatalog(
  store: ApprovedPriceHubStoreConfig,
  options: CrawlWooCommerceStoreCatalogOptions = {},
): Promise<CrawledWooCommerceStoreCatalog> {
  if (store.adapter !== 'bigcommerce_metadata' && store.adapter !== 'shopware_metadata' && store.adapter !== 'custom') {
    throw new Error(`Unsupported Price Hub adapter "${store.adapter}" for sitemap metadata crawl.`);
  }

  const fetchFn = options.fetchFn ?? fetch;
  const maxProducts = readPositiveInteger(options.maxProducts, DEFAULT_SITEMAP_MAX_PRODUCTS, 'maxProducts');
  const concurrency = readPositiveInteger(options.metadataConcurrency, DEFAULT_METADATA_CONCURRENCY, 'metadataConcurrency');
  const products: NormalizedStoreListingSnapshot[] = [];
  let skippedProducts = 0;
  const skippedProductUrls: string[] = [];
  let totalProductUrls = 0;
  let exhaustedProductUrls = false;

  const productUrlIterator = iterateSitemapMetadataProductUrls(store, fetchFn)[Symbol.asyncIterator]();
  while (products.length < maxProducts) {
    const batch: string[] = [];
    const batchSize = Math.min(concurrency, maxProducts - products.length);

    while (batch.length < batchSize) {
      const nextProductUrl = await productUrlIterator.next();
      if (nextProductUrl.done) {
        exhaustedProductUrls = true;
        break;
      }

      totalProductUrls += 1;
      batch.push(nextProductUrl.value);
    }

    if (batch.length === 0) {
      break;
    }

    const batchResults = await Promise.all(batch.map((productUrl) => crawlSitemapMetadataProductUrl(store, productUrl, fetchFn)));
    for (const result of batchResults) {
      if (!result.product) {
        skippedProducts += 1;
        if (skippedProductUrls.length < 10) {
          skippedProductUrls.push(result.productUrl);
        }
        continue;
      }

      if (products.length < maxProducts) {
        products.push(result.product);
      }
    }
  }

  await productUrlIterator.return?.();

  if (totalProductUrls === 0 && exhaustedProductUrls) {
    throw new Error(`Sitemap metadata for ${store.slug} did not include any approved product URLs.`);
  }

  const productsWithStoreAvailability = isSignalSoundsStore(store)
    ? await applySignalSoundsInventoryOverrides(store, products, fetchFn)
    : products;

  return { store, products: productsWithStoreAvailability, pagesFetched: 1, skippedProducts, skippedProductUrls, totalProductUrls };
}

export async function writeCrawledProducts(
  outputRoot: string,
  storeSlug: string,
  products: NormalizedStoreListingSnapshot[],
): Promise<string> {
  const outputDirectory = join(outputRoot, storeSlug);
  await mkdir(outputDirectory, { recursive: true });
  const outputPath = join(outputDirectory, 'products.json');
  await writeFile(outputPath, `${JSON.stringify(products, null, 2)}\n`, 'utf8');
  return outputPath;
}

function buildWooCommerceCatalogPageUrl(store: ApprovedPriceHubStoreConfig, page: number, perPage: number): string {
  const url = new URL('/wp-json/wc/store/v1/products', store.baseUrl);
  url.searchParams.set('per_page', String(perPage));
  url.searchParams.set('page', String(page));
  return url.toString();
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

function addStoreConfiguredMetadata(
  product: NormalizedStoreListingSnapshot,
  store: ApprovedPriceHubStoreConfig,
): NormalizedStoreListingSnapshot {
  if (!store.productBrandHint) {
    return product;
  }

  return {
    ...product,
    rawMeta: {
      ...product.rawMeta,
      brand: store.productBrandHint,
    },
  };
}

async function fetchWooCommerceCatalogPage(
  store: ApprovedPriceHubStoreConfig,
  page: number,
  perPage: number,
  fetchFn: PriceHubFetch,
): Promise<WooCommerceStoreApiProduct[]> {
  const url = buildWooCommerceCatalogPageUrl(store, page, perPage);
  const response = await fetchFn(url);
  if (!response.ok) {
    throw new Error(`WooCommerce catalog fetch failed for ${store.slug} page ${page}: ${response.status} ${response.statusText}`);
  }

  if (!response.json) {
    throw new Error(`WooCommerce catalog response for ${store.slug} page ${page} did not expose JSON.`);
  }

  const body = await response.json();
  if (!Array.isArray(body)) {
    throw new Error(`WooCommerce catalog response for ${store.slug} page ${page} must be an array.`);
  }

  return body.map(readWooCommerceProduct);
}

async function fetchShopifyCatalogPage(
  store: ApprovedPriceHubStoreConfig,
  page: number,
  perPage: number,
  fetchFn: PriceHubFetch,
): Promise<ShopifyProductJsonProduct[]> {
  const url = buildShopifyCatalogPageUrl(store, page, perPage);
  const response = await fetchShopifyCatalogPageWithRetry(url, store, page, fetchFn);
  if (!response.ok) {
    throw new Error(`Shopify catalog fetch failed for ${store.slug} page ${page}: ${response.status} ${response.statusText}`);
  }

  const body = await readJsonResponse(response, `Shopify catalog response for ${store.slug} page ${page}`);
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
): Promise<PriceHubFetchResponse> {
  let response: PriceHubFetchResponse | null = null;
  for (let attempt = 1; attempt <= SHOPIFY_CATALOG_MAX_ATTEMPTS; attempt += 1) {
    response = await fetchFn(url, { headers: PRICE_HUB_CRAWLER_HEADERS });
    if (response.ok || !SHOPIFY_CATALOG_RETRY_STATUSES.has(response.status) || attempt === SHOPIFY_CATALOG_MAX_ATTEMPTS) {
      return response;
    }

    await sleep(readShopifyRetryDelayMs(response.status, attempt));
    console.warn(`Retrying Shopify catalog fetch for ${store.slug} page ${page} after ${response.status} ${response.statusText}.`);
  }

  return response!;
}

function readShopifyRetryDelayMs(status: number, attempt: number): number {
  if (status === 429) {
    return 2000 * attempt;
  }

  return 500 * attempt;
}

function sleep(delayMs: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, delayMs));
}

async function fetchShopifyJsonWithCurl(url: string): Promise<PriceHubFetchResponse> {
  const { stdout } = await execFileAsync('curl', [
    '-sS',
    '-L',
    '--compressed',
    '-A',
    'Patcher Price Hub local catalog crawler',
    '-H',
    'Accept: application/json',
    '-w',
    '\n%{http_code}',
    url,
  ], { maxBuffer: 20 * 1024 * 1024 });
  const separatorIndex = stdout.lastIndexOf('\n');
  const body = separatorIndex >= 0 ? stdout.slice(0, separatorIndex) : stdout;
  const status = separatorIndex >= 0 ? Number.parseInt(stdout.slice(separatorIndex + 1), 10) : 0;

  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status >= 200 && status < 300 ? 'OK' : 'HTTP error',
    async json() {
      return JSON.parse(body) as unknown;
    },
    async text() {
      return body;
    },
  };
}

function buildBigCommerceProductSitemapUrl(store: ApprovedPriceHubStoreConfig): string {
  const url = new URL('/xmlsitemap.php', store.baseUrl);
  url.searchParams.set('type', 'products');
  url.searchParams.set('page', '1');
  return url.toString();
}

function buildShopwareSitemapIndexUrl(store: ApprovedPriceHubStoreConfig): string {
  return new URL('sitemap.xml', store.baseUrl).toString();
}

async function* iterateSitemapMetadataProductUrls(store: ApprovedPriceHubStoreConfig, fetchFn: PriceHubFetch): AsyncGenerator<string> {
  if (store.adapter === 'bigcommerce_metadata') {
    yield* await fetchBigCommerceProductSitemap(store, fetchFn);
    return;
  }

  if (store.adapter === 'shopware_metadata') {
    yield* iterateShopwareProductSitemap(store, fetchFn);
    return;
  }

  if (store.adapter === 'custom') {
    yield* await fetchCustomProductSitemap(store, fetchFn);
    return;
  }

  throw new Error(`Unsupported sitemap metadata adapter "${store.adapter}".`);
}

async function fetchBigCommerceProductSitemap(store: ApprovedPriceHubStoreConfig, fetchFn: PriceHubFetch): Promise<string[]> {
  const url = buildBigCommerceProductSitemapUrl(store);
  const response = await fetchFn(url, { headers: PRICE_HUB_CRAWLER_HEADERS });
  if (!response.ok) {
    throw new Error(`BigCommerce product sitemap fetch failed for ${store.slug}: ${response.status} ${response.statusText}`);
  }

  const body = await readTextResponse(response, `BigCommerce product sitemap response for ${store.slug}`);
  const productUrls = parseSitemapLocations(body)
    .filter((location) => isApprovedStoreProductUrl(store, location));
  if (productUrls.length === 0) {
    throw new Error(`BigCommerce product sitemap for ${store.slug} did not include any approved product URLs.`);
  }

  return productUrls;
}

async function* iterateShopwareProductSitemap(store: ApprovedPriceHubStoreConfig, fetchFn: PriceHubFetch): AsyncGenerator<string> {
  const indexUrl = buildShopwareSitemapIndexUrl(store);
  const indexResponse = await fetchFn(indexUrl, { headers: PRICE_HUB_CRAWLER_HEADERS });
  if (!indexResponse.ok) {
    throw new Error(`Shopware sitemap index fetch failed for ${store.slug}: ${indexResponse.status} ${indexResponse.statusText}`);
  }

  const indexBody = await readTextResponse(indexResponse, `Shopware sitemap index response for ${store.slug}`);
  const sitemapUrls = parseSitemapLocations(indexBody).filter((location) => isApprovedStoreProductUrl(store, location));
  const productUrls = new Set<string>();
  for (const sitemapUrl of sitemapUrls) {
    const sitemapResponse = await fetchFn(sitemapUrl, { headers: PRICE_HUB_CRAWLER_HEADERS });
    if (!sitemapResponse.ok) {
      throw new Error(`Shopware sitemap fetch failed for ${store.slug} (${sitemapUrl}): ${sitemapResponse.status} ${sitemapResponse.statusText}`);
    }

    for await (const location of readSitemapLocations(sitemapResponse, `Shopware sitemap response for ${store.slug}`, sitemapUrl)) {
      if (!isApprovedStoreProductUrl(store, location) || !isLikelyShopwareProductUrl(store, location) || productUrls.has(location)) {
        continue;
      }

      productUrls.add(location);
      yield location;
    }
  }

  if (productUrls.size === 0) {
    throw new Error(`Shopware sitemap for ${store.slug} did not include any approved URLs.`);
  }
}

async function fetchCustomProductSitemap(store: ApprovedPriceHubStoreConfig, fetchFn: PriceHubFetch): Promise<string[]> {
  const startUrl = new URL(store.catalogPath ?? '/sitemap.xml', store.baseUrl).toString();
  const visitedSitemaps = new Set<string>();
  const pendingSitemaps = [startUrl];
  const productUrls: string[] = [];

  while (pendingSitemaps.length > 0 && visitedSitemaps.size < CUSTOM_SITEMAP_MAX_FILES) {
    const sitemapUrl = pendingSitemaps.shift()!;
    if (visitedSitemaps.has(sitemapUrl)) {
      continue;
    }
    visitedSitemaps.add(sitemapUrl);

    const sitemapResponse = await fetchFn(sitemapUrl, { headers: PRICE_HUB_CRAWLER_HEADERS });
    if (!sitemapResponse.ok) {
      throw new Error(`Custom sitemap fetch failed for ${store.slug} (${sitemapUrl}): ${sitemapResponse.status} ${sitemapResponse.statusText}`);
    }

    const sitemapBody = await readSitemapResponse(sitemapResponse, `Custom sitemap response for ${store.slug}`, sitemapUrl);
    for (const location of parseSitemapLocations(sitemapBody).filter((candidate) => isApprovedStoreProductUrl(store, candidate))) {
      if (isLikelySitemapUrl(location)) {
        pendingSitemaps.push(location);
      } else if (isAllowedCustomProductUrl(store, location)) {
        productUrls.push(location);
      }
    }
  }

  const uniqueProductUrls = uniqueStrings(productUrls);
  if (uniqueProductUrls.length === 0) {
    throw new Error(`Custom sitemap for ${store.slug} did not include any approved product URLs.`);
  }

  return uniqueProductUrls;
}

async function fetchMetadataProductPage(
  store: ApprovedPriceHubStoreConfig,
  productUrl: string,
  fetchFn: PriceHubFetch,
): Promise<string> {
  const response = await fetchFn(productUrl, { headers: PRICE_HUB_CRAWLER_HEADERS });
  if (!response.ok) {
    throw new Error(`BigCommerce product fetch failed for ${store.slug} (${productUrl}): ${response.status} ${response.statusText}`);
  }

  return readTextResponse(response, `BigCommerce product response for ${store.slug}`);
}

async function fetchMetadataProductPageOrNull(
  store: ApprovedPriceHubStoreConfig,
  productUrl: string,
  fetchFn: PriceHubFetch,
): Promise<string | null> {
  try {
    return await fetchMetadataProductPage(store, productUrl, fetchFn);
  } catch {
    return null;
  }
}

function isUsableMetadataProduct(product: NormalizedStoreListingSnapshot): boolean {
  return product.priceAmountMinor !== null && product.currency !== null && product.productName !== null && product.productUrl !== null;
}

interface SitemapMetadataProductResult {
  productUrl: string;
  product: NormalizedStoreListingSnapshot | null;
}

async function crawlSitemapMetadataProductUrl(
  store: ApprovedPriceHubStoreConfig,
  productUrl: string,
  fetchFn: PriceHubFetch,
): Promise<SitemapMetadataProductResult> {
  const html = await fetchMetadataProductPageOrNull(store, productUrl, fetchFn);
  if (!html) {
    return { productUrl, product: null };
  }

  const product = store.adapter === 'bigcommerce_metadata'
    ? normalizeBigCommerceProductPage(html, productUrl)
    : store.adapter === 'shopware_metadata'
      ? normalizeShopwareProductPage(html, productUrl)
      : normalizeProductMetadataPage(html, productUrl, 'custom');

  return { productUrl, product: isUsableMetadataProduct(product) ? product : null };
}

export async function applySignalSoundsInventoryOverrides(
  store: ApprovedPriceHubStoreConfig,
  products: readonly NormalizedStoreListingSnapshot[],
  fetchFn: PriceHubFetch,
): Promise<NormalizedStoreListingSnapshot[]> {
  const skus = uniqueStrings(products.map(readSignalSoundsProductSku));
  const inventoryBySku = new Map<string, SignalSoundsInventory>();

  for (let index = 0; index < skus.length; index += SIGNAL_SOUNDS_RANDEM_BATCH_SIZE) {
    const batchSkus = skus.slice(index, index + SIGNAL_SOUNDS_RANDEM_BATCH_SIZE);
    const batchInventory = await fetchSignalSoundsInventoryBatch(store, batchSkus, fetchFn);
    for (const inventory of batchInventory) {
      inventoryBySku.set(inventory.sku, inventory);
    }
  }

  return products.map((product) => {
    const sku = readSignalSoundsProductSku(product);
    if (!sku) {
      return {
        ...product,
        availability: readSignalSoundsFallbackAvailability(product),
        rawMeta: {
          ...product.rawMeta,
          signalSoundsAvailabilitySource: 'missing_sku',
        },
      };
    }

    const inventory = inventoryBySku.get(sku);
    if (!inventory) {
      return {
        ...product,
        availability: readSignalSoundsFallbackAvailability(product),
        rawMeta: {
          ...product.rawMeta,
          signalSoundsAvailabilitySource: 'randem_location_api_missing',
          signalSoundsStoreExternalId: readSignalSoundsTargetStoreExternalId(store),
        },
      };
    }

    return {
      ...product,
      availability: inventory.availability,
      rawMeta: {
        ...product.rawMeta,
        signalSoundsAvailabilitySource: 'randem_location_api',
        signalSoundsStoreExternalId: inventory.storeExternalId,
        signalSoundsInventoryQuantity: inventory.quantity,
        signalSoundsInventoryLocations: inventory.locations,
      },
    };
  });
}

function readSignalSoundsFallbackAvailability(
  product: NormalizedStoreListingSnapshot,
): NormalizedStoreListingSnapshot['availability'] {
  return isSignalSoundsTerminalPageAvailability(product.availability)
    ? product.availability
    : 'unknown';
}

function isSignalSoundsTerminalPageAvailability(
  availability: NormalizedStoreListingSnapshot['availability'],
): boolean {
  return availability === 'out_of_stock' || availability === 'discontinued';
}

function readSignalSoundsProductSku(product: NormalizedStoreListingSnapshot): string | null {
  const sku = product.rawMeta.sku;
  return typeof sku === 'string' && sku.trim().length > 0 ? sku.trim() : null;
}

async function fetchSignalSoundsInventoryBatch(
  store: ApprovedPriceHubStoreConfig,
  skus: readonly string[],
  fetchFn: PriceHubFetch,
): Promise<SignalSoundsInventory[]> {
  if (skus.length === 0) {
    return [];
  }

  try {
    const response = await fetchFn('https://api.randemretail.online/public/api/location', {
      method: 'POST',
      headers: {
        'content-type': 'application/json; charset=UTF-8',
        'referer': store.baseUrl,
        'x-randem-application-id': SIGNAL_SOUNDS_RANDEM_APPLICATION_ID,
      },
      body: JSON.stringify({ SKUs: skus.map((sku) => ({ SKU: sku, quantity: '1' })), selectedStoreId: null }),
    });
    if (!response.ok) {
      throw new Error(`Signal Sounds inventory batch fetch failed for ${store.slug}: ${response.status} ${response.statusText}`);
    }

    const body = await readJsonResponse(response, `Signal Sounds inventory batch response for ${store.slug}`);
    const rows = readSignalSoundsInventoryRows(body);
    return skus
      .map((sku) => readSignalSoundsInventoryFromRows(store, sku, rows))
      .filter((inventory): inventory is SignalSoundsInventory => inventory !== null);
  } catch (error) {
    console.warn(error instanceof Error ? error.message : String(error));
    return [];
  }
}

function uniqueStrings(values: readonly (string | null)[]): string[] {
  return Array.from(new Set(values.filter((value): value is string => value !== null))).sort();
}

function readSignalSoundsInventoryFromRows(
  store: ApprovedPriceHubStoreConfig,
  sku: string,
  rows: readonly SignalSoundsInventoryRow[],
): SignalSoundsInventory | null {
  const targetStoreExternalId = readSignalSoundsTargetStoreExternalId(store);
  const skuRows = rows.filter((row) => row.sku === sku);
  if (skuRows.length === 0) {
    return null;
  }

  const targetRows = skuRows.filter((row) => row.storeExternalId === targetStoreExternalId);
  const shippableRows = skuRows.filter(isSignalSoundsShippableInventoryRow);
  const availabilityRows = shippableRows.length > 0 ? shippableRows : targetRows;
  if (availabilityRows.length === 0) {
    return null;
  }

  const quantities = availabilityRows
    .map((row) => row.quantity)
    .filter((quantity): quantity is number => quantity !== null);
  const quantity = quantities.length > 0 ? quantities.reduce((total, current) => total + current, 0) : null;
  const tracksInventory = availabilityRows.some((row) => row.inventoryTrackingType !== null && row.inventoryTrackingType !== 0);
  const availability = quantity !== null && quantity > 0
    ? 'in_stock'
    : tracksInventory
      ? 'out_of_stock'
      : 'unknown';
  const storeExternalId = readSignalSoundsInventoryStoreExternalId(
    availability === 'in_stock' ? availabilityRows.filter((row) => (row.quantity ?? 0) > 0) : targetRows,
    targetStoreExternalId,
  );

  return {
    sku,
    availability,
    storeExternalId,
    quantity,
    locations: skuRows.map((row) => ({
      storeExternalId: row.storeExternalId,
      storeName: row.storeName,
      quantity: row.quantity,
      shippingAllowed: isSignalSoundsShippableInventoryRow(row),
    })),
  };
}

function isSignalSoundsShippableInventoryRow(row: SignalSoundsInventoryRow): boolean {
  return row.locationAllowShipping !== false && row.productAllowShipping !== false;
}

function readSignalSoundsInventoryStoreExternalId(rows: readonly SignalSoundsInventoryRow[], fallback: string): string {
  const externalIds = uniqueStrings(rows.map((row) => row.storeExternalId));
  return externalIds.length > 0 ? externalIds.join(',') : fallback;
}

interface SignalSoundsInventory {
  sku: string;
  availability: NormalizedStoreListingSnapshot['availability'];
  storeExternalId: string;
  quantity: number | null;
  locations: SignalSoundsInventoryLocation[];
}

interface SignalSoundsInventoryLocation {
  storeExternalId: string | null;
  storeName: string | null;
  quantity: number | null;
  shippingAllowed: boolean;
}

interface SignalSoundsInventoryRow {
  sku: string | null;
  storeExternalId: string | null;
  storeName: string | null;
  quantity: number | null;
  inventoryTrackingType: number | null;
  locationAllowShipping: boolean | null;
  productAllowShipping: boolean | null;
}

function readSignalSoundsInventoryRows(body: unknown): SignalSoundsInventoryRow[] {
  if (!isRecord(body) || !Array.isArray(body.perSKU)) {
    return [];
  }

  return body.perSKU
    .filter(isRecord)
    .map((row) => ({
      sku: readStringOrNull(row.sku),
      storeExternalId: readStringOrNull(row.storeExternalId) ?? readStringOrNull(row.storeName),
      storeName: readStringOrNull(row.storeName),
      quantity: readNumberOrNull(row.quantity),
      inventoryTrackingType: readNumberOrNull(row.inventoryTrackingType),
      locationAllowShipping: readBooleanOrNull(row.locationAllowShipping),
      productAllowShipping: readBooleanOrNull(row.productAllowShipping),
    }))
    .filter((row) => row.sku !== null && row.storeExternalId !== null);
}

async function readJsonResponse(response: PriceHubFetchResponse, context: string): Promise<unknown> {
  if (response.json) {
    return response.json();
  }

  const body = await readTextResponse(response, context);
  return JSON.parse(body) as unknown;
}

function isSignalSoundsStore(store: ApprovedPriceHubStoreConfig): boolean {
  return store.slug === 'signal-sounds-uk' || store.slug === 'signal-sounds-eu';
}

function readSignalSoundsTargetStoreExternalId(store: ApprovedPriceHubStoreConfig): string {
  return store.slug === 'signal-sounds-eu' ? 'SS Europe' : 'HQ';
}

function readShopifyCurrencyHint(store: ApprovedPriceHubStoreConfig): string | null {
  return store.currencyHint ?? null;
}

function readShopifyIgnoredMatchNoiseTags(store: ApprovedPriceHubStoreConfig): readonly string[] {
  return store.ignoredMatchNoiseTags ?? [];
}

async function readTextResponse(response: PriceHubFetchResponse, context: string): Promise<string> {
  if (!response.text) {
    throw new Error(`${context} did not expose text.`);
  }

  return response.text();
}

async function* readSitemapLocations(
  response: PriceHubFetchResponse,
  context: string,
  url: string,
): AsyncGenerator<string> {
  yield* parseSitemapLocationsFromChunks(readSitemapTextChunks(response, context, url));
}

async function readSitemapResponse(response: PriceHubFetchResponse, context: string, url: string): Promise<string> {
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

function readFetchBody(body: ReadableStream<Uint8Array> | AsyncIterable<Uint8Array>): Readable {
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

function parseSitemapLocations(xml: string): string[] {
  const urls: string[] = [];
  const locationPattern = /<loc>(.*?)<\/loc>/gis;
  let locationMatch: RegExpExecArray | null;

  while ((locationMatch = locationPattern.exec(xml))) {
    urls.push(decodeXmlEntities(locationMatch[1].trim()));
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

function isApprovedStoreProductUrl(store: ApprovedPriceHubStoreConfig, productUrl: string): boolean {
  try {
    const baseUrl = new URL(store.baseUrl);
    const url = new URL(productUrl);
    return url.protocol === 'https:' && url.hostname === baseUrl.hostname;
  } catch {
    return false;
  }
}

function isLikelyShopwareProductUrl(store: ApprovedPriceHubStoreConfig, productUrl: string): boolean {
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

function isLikelySitemapUrl(url: string): boolean {
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

function isAllowedCustomProductUrl(store: ApprovedPriceHubStoreConfig, productUrl: string): boolean {
  try {
    const url = new URL(productUrl);
    const path = url.pathname;
    const includes = store.productUrlPathIncludes ?? [];
    const excludes = store.productUrlPathExcludes ?? [];
    return (includes.length === 0 || includes.some((pathPart) => path.includes(pathPart)))
      && !excludes.some((pathPart) => path.includes(pathPart));
  } catch {
    return false;
  }
}

function readWooCommerceProduct(value: unknown): WooCommerceStoreApiProduct {
  if (!isRecord(value)) {
    return {};
  }

  return {
    id: readStringNumberOrNull(value.id),
    name: readStringOrNull(value.name),
    slug: readStringOrNull(value.slug),
    permalink: readStringOrNull(value.permalink),
    price_html: readStringOrNull(value.price_html),
    prices: isRecord(value.prices) ? {
      price: readStringNumberOrNull(value.prices.price),
      regular_price: readStringNumberOrNull(value.prices.regular_price),
      sale_price: readStringNumberOrNull(value.prices.sale_price),
      currency_code: readStringOrNull(value.prices.currency_code),
    } : null,
    is_in_stock: typeof value.is_in_stock === 'boolean' ? value.is_in_stock : null,
    stock_status: readStringOrNull(value.stock_status),
    stock_availability: isRecord(value.stock_availability) ? {
      text: readStringOrNull(value.stock_availability.text),
      class: readStringOrNull(value.stock_availability.class),
    } : null,
    images: Array.isArray(value.images)
      ? value.images.filter(isRecord).map((image) => ({ src: readStringOrNull(image.src) }))
      : null,
    brands: readWooCommerceTerms(value.brands),
    categories: readWooCommerceTerms(value.categories),
    tags: readWooCommerceTerms(value.tags),
  };
}

function readWooCommerceTerms(value: unknown): { name: string | null; slug: string | null; link: string | null }[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  return value
    .filter(isRecord)
    .map((term) => ({
      name: readStringOrNull(term.name),
      slug: readStringOrNull(term.slug),
      link: readStringOrNull(term.link),
    }));
}

function readPositiveInteger(value: number | undefined, fallback: number, fieldName: string): number {
  if (value === undefined) {
    return fallback;
  }

  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`${fieldName} must be a positive integer.`);
  }

  return value;
}

function readShopifyProduct(value: unknown): ShopifyProductJsonProduct {
  if (!isRecord(value)) {
    throw new Error('Every Shopify product must be an object.');
  }

  return value;
}

function readStringOrNull(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function readStringNumberOrNull(value: unknown): string | number | null {
  return typeof value === 'string' || typeof value === 'number' ? value : null;
}

function readNumberOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function readBooleanOrNull(value: unknown): boolean | null {
  return typeof value === 'boolean' ? value : null;
}

function decodeXmlEntities(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

const SIGNAL_SOUNDS_RANDEM_APPLICATION_ID = '5a9c3766-6d6c-4237-8965-9968f2572106';
const SIGNAL_SOUNDS_RANDEM_BATCH_SIZE = 50;
const DEFAULT_METADATA_CONCURRENCY = 6;
