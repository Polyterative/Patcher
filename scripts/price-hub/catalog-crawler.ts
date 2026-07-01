import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { gunzipSync } from 'node:zlib';
import { normalizeBigCommerceProductPage } from '../../supabase/functions/_shared/price-hub/bigcommerce-metadata.ts';
import { normalizeShopwareProductPage } from '../../supabase/functions/_shared/price-hub/shopware-metadata.ts';
import {
  normalizeWooCommerceStoreApiProduct,
  type NormalizedStoreListingSnapshot,
  type WooCommerceStoreApiProduct,
} from '../../supabase/functions/_shared/price-hub/woocommerce-store-api.ts';
import type { ApprovedPriceHubStoreConfig } from './store-configs.ts';

export const DEFAULT_CATALOG_MAX_PAGES = 100;
export const DEFAULT_CATALOG_PER_PAGE = 100;
export const DEFAULT_SITEMAP_MAX_PRODUCTS = 100;

export interface PriceHubFetchResponse {
  ok: boolean;
  status: number;
  statusText: string;
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

    products.push(...pageProducts.map((product) => normalizeWooCommerceStoreApiProduct(product)));

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

  if (store.adapter === 'bigcommerce_metadata') {
    return crawlSitemapMetadataCatalog(store, options);
  }

  if (store.adapter === 'shopware_metadata') {
    return crawlSitemapMetadataCatalog(store, options);
  }

  throw new Error(`Unsupported Price Hub adapter "${store.adapter}" for local catalog crawl.`);
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
  if (store.adapter !== 'bigcommerce_metadata' && store.adapter !== 'shopware_metadata') {
    throw new Error(`Unsupported Price Hub adapter "${store.adapter}" for sitemap metadata crawl.`);
  }

  const fetchFn = options.fetchFn ?? fetch;
  const maxProducts = readPositiveInteger(options.maxProducts, DEFAULT_SITEMAP_MAX_PRODUCTS, 'maxProducts');
  const concurrency = readPositiveInteger(options.metadataConcurrency, DEFAULT_METADATA_CONCURRENCY, 'metadataConcurrency');
  const productUrls = await fetchSitemapMetadataProductUrls(store, fetchFn);
  const products: NormalizedStoreListingSnapshot[] = [];
  let skippedProducts = 0;
  const skippedProductUrls: string[] = [];

  for (let index = 0; index < productUrls.length && products.length < maxProducts; index += concurrency) {
    if (products.length >= maxProducts) {
      break;
    }

    const batch = productUrls.slice(index, index + concurrency);
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

  const productsWithStoreAvailability = isSignalSoundsStore(store)
    ? await applySignalSoundsInventoryOverrides(store, products, fetchFn)
    : products;

  return { store, products: productsWithStoreAvailability, pagesFetched: 1, skippedProducts, skippedProductUrls, totalProductUrls: productUrls.length };
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

function buildBigCommerceProductSitemapUrl(store: ApprovedPriceHubStoreConfig): string {
  const url = new URL('/xmlsitemap.php', store.baseUrl);
  url.searchParams.set('type', 'products');
  url.searchParams.set('page', '1');
  return url.toString();
}

function buildShopwareSitemapIndexUrl(store: ApprovedPriceHubStoreConfig): string {
  return new URL('sitemap.xml', store.baseUrl).toString();
}

async function fetchSitemapMetadataProductUrls(store: ApprovedPriceHubStoreConfig, fetchFn: PriceHubFetch): Promise<string[]> {
  if (store.adapter === 'bigcommerce_metadata') {
    return fetchBigCommerceProductSitemap(store, fetchFn);
  }

  if (store.adapter === 'shopware_metadata') {
    return fetchShopwareProductSitemap(store, fetchFn);
  }

  throw new Error(`Unsupported sitemap metadata adapter "${store.adapter}".`);
}

async function fetchBigCommerceProductSitemap(store: ApprovedPriceHubStoreConfig, fetchFn: PriceHubFetch): Promise<string[]> {
  const url = buildBigCommerceProductSitemapUrl(store);
  const response = await fetchFn(url);
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

async function fetchShopwareProductSitemap(store: ApprovedPriceHubStoreConfig, fetchFn: PriceHubFetch): Promise<string[]> {
  const indexUrl = buildShopwareSitemapIndexUrl(store);
  const indexResponse = await fetchFn(indexUrl);
  if (!indexResponse.ok) {
    throw new Error(`Shopware sitemap index fetch failed for ${store.slug}: ${indexResponse.status} ${indexResponse.statusText}`);
  }

  const indexBody = await readTextResponse(indexResponse, `Shopware sitemap index response for ${store.slug}`);
  const sitemapUrls = parseSitemapLocations(indexBody).filter((location) => isApprovedStoreProductUrl(store, location));
  const productUrls: string[] = [];
  for (const sitemapUrl of sitemapUrls) {
    const sitemapResponse = await fetchFn(sitemapUrl);
    if (!sitemapResponse.ok) {
      throw new Error(`Shopware sitemap fetch failed for ${store.slug} (${sitemapUrl}): ${sitemapResponse.status} ${sitemapResponse.statusText}`);
    }

    const sitemapBody = await readSitemapResponse(sitemapResponse, `Shopware sitemap response for ${store.slug}`, sitemapUrl);
    productUrls.push(...parseSitemapLocations(sitemapBody)
      .filter((location) => isApprovedStoreProductUrl(store, location))
      .filter((location) => isLikelyShopwareProductUrl(store, location)));
  }

  if (productUrls.length === 0) {
    throw new Error(`Shopware sitemap for ${store.slug} did not include any approved URLs.`);
  }

  return productUrls;
}

async function fetchMetadataProductPage(
  store: ApprovedPriceHubStoreConfig,
  productUrl: string,
  fetchFn: PriceHubFetch,
): Promise<string> {
  const response = await fetchFn(productUrl);
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
    : normalizeShopwareProductPage(html, productUrl);

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
        availability: 'unknown',
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
        availability: 'unknown',
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

async function readTextResponse(response: PriceHubFetchResponse, context: string): Promise<string> {
  if (!response.text) {
    throw new Error(`${context} did not expose text.`);
  }

  return response.text();
}

async function readSitemapResponse(response: PriceHubFetchResponse, context: string, url: string): Promise<string> {
  if (!url.endsWith('.gz')) {
    return readTextResponse(response, context);
  }

  if (!response.arrayBuffer) {
    throw new Error(`${context} did not expose bytes for gzip sitemap.`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  return gunzipSync(buffer).toString('utf8');
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
    } : null,
    images: Array.isArray(value.images)
      ? value.images.filter(isRecord).map((image) => ({ src: readStringOrNull(image.src) }))
      : null,
  };
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
