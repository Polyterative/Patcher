import { normalizeBigCommerceProductPage } from '../../../supabase/functions/_shared/price-hub/bigcommerce-metadata.ts';
import { normalizeProductMetadataPage } from '../../../supabase/functions/_shared/price-hub/product-metadata-page.ts';
import { normalizeShopwareProductPage } from '../../../supabase/functions/_shared/price-hub/shopware-metadata.ts';
import type { NormalizedStoreListingSnapshot } from '../../../supabase/functions/_shared/price-hub/woocommerce-store-api.ts';
import type { ApprovedPriceHubStoreConfig } from '../store-configs.ts';
import {
  abortResponse,
  PRICE_HUB_CRAWLER_HEADERS,
  DEFAULT_FETCH_TIMEOUT_MS,
  fetchWithTimeout,
  fetchResponseWithTimeout,
  readOptionalPositiveInteger,
  readPositiveInteger,
  readTextResponse,
  uniqueStrings,
} from './helpers.ts';
import { applySignalSoundsInventoryOverrides, isSignalSoundsStore } from './signal-sounds.ts';
import {
  isAllowedCustomCatalogPageUrl,
  isAllowedCustomProductUrl,
  isApprovedStoreProductUrl,
  isLikelyShopwareProductUrl,
  isLikelySitemapUrl,
  parseHtmlLinks,
  parseSitemapLocations,
  readSitemapLocations,
  readSitemapResponse,
} from './sitemap-utils.ts';
import type { CrawledWooCommerceStoreCatalog, CrawlWooCommerceStoreCatalogOptions, PriceHubFetch, PriceHubFetchResponse } from './types.ts';

export { applySignalSoundsInventoryOverrides } from './signal-sounds.ts';

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
  const fetchTimeoutMs = readPositiveInteger(options.fetchTimeoutMs, DEFAULT_FETCH_TIMEOUT_MS, 'fetchTimeoutMs');
  const maxProducts = readOptionalPositiveInteger(options.maxProducts, 'maxProducts');
  const concurrency = readPositiveInteger(options.metadataConcurrency, DEFAULT_METADATA_CONCURRENCY, 'metadataConcurrency');
  const products: NormalizedStoreListingSnapshot[] = [];
  let skippedProducts = 0;
  const skippedProductUrls: string[] = [];
  const skippedGoneProductUrls: string[] = [];
  let totalProductUrls = 0;
  let exhaustedProductUrls = false;
  let hitMaxSitemapFiles = false;

  const productUrlIterator = store.adapter === 'custom'
    ? iterateCustomSitemapMetadataProductUrls(store, fetchFn, fetchTimeoutMs, (hitMaxFiles) => {
        hitMaxSitemapFiles = hitMaxFiles;
      })[Symbol.asyncIterator]()
    : iterateSitemapMetadataProductUrls(store, fetchFn, fetchTimeoutMs)[Symbol.asyncIterator]();
  while (maxProducts === undefined || products.length < maxProducts) {
    const batch: string[] = [];
    const batchSize = maxProducts === undefined
      ? concurrency
      : Math.min(concurrency, maxProducts - products.length);

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

    const batchResults = await Promise.all(batch.map((productUrl) => crawlSitemapMetadataProductUrl(store, productUrl, fetchFn, fetchTimeoutMs)));
    for (const result of batchResults) {
      if (!result.product) {
        skippedProducts += 1;
        if (result.skippedStatus === 404 || result.skippedStatus === 410) {
          skippedGoneProductUrls.push(result.productUrl);
        } else {
          skippedProductUrls.push(result.productUrl);
        }
        continue;
      }

      if (maxProducts === undefined || products.length < maxProducts) {
        products.push(result.product);
      }
    }
  }

  await productUrlIterator.return?.();

  if (totalProductUrls === 0 && exhaustedProductUrls) {
    throw new Error(`Sitemap metadata for ${store.slug} did not include any approved product URLs.`);
  }

  const productsWithStoreAvailability = isSignalSoundsStore(store)
    ? await applySignalSoundsInventoryOverrides(store, products, fetchFn, fetchTimeoutMs)
    : products;

  return {
    store,
    products: productsWithStoreAvailability,
    pagesFetched: 1,
    skippedProducts,
    skippedProductUrls,
    skippedGoneProductUrls,
    totalProductUrls,
    hitMaxProducts: maxProducts !== undefined && products.length >= maxProducts && !exhaustedProductUrls,
    hitMaxPages: false,
    hitMaxSitemapFiles,
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

async function* iterateSitemapMetadataProductUrls(store: ApprovedPriceHubStoreConfig, fetchFn: PriceHubFetch, fetchTimeoutMs: number): AsyncGenerator<string> {
  if (store.adapter === 'bigcommerce_metadata') {
    yield* await fetchBigCommerceProductSitemap(store, fetchFn, fetchTimeoutMs);
    return;
  }

  if (store.adapter === 'shopware_metadata') {
    yield* iterateShopwareProductSitemap(store, fetchFn, fetchTimeoutMs);
    return;
  }

  if (store.adapter === 'custom') {
    yield* (await fetchCustomProductSitemap(store, fetchFn, fetchTimeoutMs)).productUrls;
    return;
  }

  throw new Error(`Unsupported sitemap metadata adapter "${store.adapter}".`);
}

async function fetchBigCommerceProductSitemap(store: ApprovedPriceHubStoreConfig, fetchFn: PriceHubFetch, fetchTimeoutMs: number): Promise<string[]> {
  const url = buildBigCommerceProductSitemapUrl(store);
  const response = await fetchResponseWithTimeout(fetchFn, url, { headers: PRICE_HUB_CRAWLER_HEADERS }, fetchTimeoutMs, `BigCommerce product sitemap fetch for ${store.slug}`);
  if (!response.ok) {
    throw new Error(`BigCommerce product sitemap fetch failed for ${store.slug}: ${response.status} ${response.statusText}`);
  }

  const body = await fetchWithTimeout(
    readTextResponse(response, `BigCommerce product sitemap response for ${store.slug}`),
    fetchTimeoutMs,
    `BigCommerce product sitemap response for ${store.slug}`,
    (error) => abortResponse(response, error),
  );
  const productUrls = parseSitemapLocations(body)
    .filter((location) => isApprovedStoreProductUrl(store, location));
  if (productUrls.length === 0) {
    throw new Error(`BigCommerce product sitemap for ${store.slug} did not include any approved product URLs.`);
  }

  return productUrls;
}

async function* iterateShopwareProductSitemap(store: ApprovedPriceHubStoreConfig, fetchFn: PriceHubFetch, fetchTimeoutMs: number): AsyncGenerator<string> {
  const indexUrl = buildShopwareSitemapIndexUrl(store);
  const indexResponse = await fetchResponseWithTimeout(fetchFn, indexUrl, { headers: PRICE_HUB_CRAWLER_HEADERS }, fetchTimeoutMs, `Shopware sitemap index fetch for ${store.slug}`);
  if (!indexResponse.ok) {
    throw new Error(`Shopware sitemap index fetch failed for ${store.slug}: ${indexResponse.status} ${indexResponse.statusText}`);
  }

  const indexBody = await fetchWithTimeout(
    readTextResponse(indexResponse, `Shopware sitemap index response for ${store.slug}`),
    fetchTimeoutMs,
    `Shopware sitemap index response for ${store.slug}`,
    (error) => abortResponse(indexResponse, error),
  );
  const sitemapUrls = parseSitemapLocations(indexBody).filter((location) => isApprovedStoreProductUrl(store, location));
  const productUrls = new Set<string>();
  for (const sitemapUrl of sitemapUrls) {
    const sitemapResponse = await fetchResponseWithTimeout(fetchFn, sitemapUrl, { headers: PRICE_HUB_CRAWLER_HEADERS }, fetchTimeoutMs, `Shopware sitemap fetch for ${store.slug}`);
    if (!sitemapResponse.ok) {
      throw new Error(`Shopware sitemap fetch failed for ${store.slug} (${sitemapUrl}): ${sitemapResponse.status} ${sitemapResponse.statusText}`);
    }

    for (const location of await fetchSitemapLocationsWithTimeout(
      readSitemapLocations(sitemapResponse, `Shopware sitemap response for ${store.slug}`, sitemapUrl),
      fetchTimeoutMs,
      `Shopware sitemap response for ${store.slug}`,
      sitemapResponse,
    )) {
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

async function* iterateCustomSitemapMetadataProductUrls(
  store: ApprovedPriceHubStoreConfig,
  fetchFn: PriceHubFetch,
  fetchTimeoutMs: number,
  onComplete: (hitMaxSitemapFiles: boolean) => void,
): AsyncGenerator<string> {
  const result = await fetchCustomProductSitemap(store, fetchFn, fetchTimeoutMs);
  onComplete(result.hitMaxSitemapFiles);
  yield* result.productUrls;
}

async function fetchCustomProductSitemap(
  store: ApprovedPriceHubStoreConfig,
  fetchFn: PriceHubFetch,
  fetchTimeoutMs: number,
): Promise<{ productUrls: string[]; hitMaxSitemapFiles: boolean }> {
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

    const sitemapResponse = await fetchResponseWithTimeout(fetchFn, sitemapUrl, { headers: PRICE_HUB_CRAWLER_HEADERS }, fetchTimeoutMs, `Custom sitemap fetch for ${store.slug}`);
    if (!sitemapResponse.ok) {
      throw new Error(`Custom sitemap fetch failed for ${store.slug} (${sitemapUrl}): ${sitemapResponse.status} ${sitemapResponse.statusText}`);
    }

    const sitemapBody = await fetchWithTimeout(
      readSitemapResponse(sitemapResponse, `Custom sitemap response for ${store.slug}`, sitemapUrl),
      fetchTimeoutMs,
      `Custom sitemap response for ${store.slug}`,
      (error) => abortResponse(sitemapResponse, error),
    );
    const locations = parseSitemapLocations(sitemapBody);
    if (locations.length === 0 && isAllowedCustomCatalogPageUrl(store, sitemapUrl)) {
      for (const location of parseHtmlLinks(sitemapBody, sitemapUrl).filter((candidate) => isApprovedStoreProductUrl(store, candidate))) {
        if (isAllowedCustomCatalogPageUrl(store, location)) {
          pendingSitemaps.push(location);
        } else if (isAllowedCustomProductUrl(store, location)) {
          productUrls.push(location);
        }
      }
      continue;
    }

    for (const location of locations.filter((candidate) => isApprovedStoreProductUrl(store, candidate))) {
      if (isLikelySitemapUrl(location)) {
        pendingSitemaps.push(location);
      } else if (isAllowedCustomProductUrl(store, location)) {
        productUrls.push(location);
      }
    }
  }

  const hitMaxSitemapFiles = pendingSitemaps.length > 0;
  const uniqueProductUrls = uniqueStrings(productUrls);
  if (uniqueProductUrls.length === 0) {
    throw new Error(`Custom sitemap for ${store.slug} did not include any approved product URLs.`);
  }

  return { productUrls: uniqueProductUrls, hitMaxSitemapFiles };
}

async function fetchMetadataProductPage(
  store: ApprovedPriceHubStoreConfig,
  productUrl: string,
  fetchFn: PriceHubFetch,
  fetchTimeoutMs: number,
): Promise<string> {
  const response = await fetchResponseWithTimeout(fetchFn, productUrl, { headers: PRICE_HUB_CRAWLER_HEADERS }, fetchTimeoutMs, `Metadata product fetch for ${store.slug}`);
  if (!response.ok) {
    throw new Error(`BigCommerce product fetch failed for ${store.slug} (${productUrl}): ${response.status} ${response.statusText}`);
  }

  return fetchWithTimeout(
    readTextResponse(response, `BigCommerce product response for ${store.slug}`),
    fetchTimeoutMs,
    `Metadata product response for ${store.slug}`,
    (error) => abortResponse(response, error),
  );
}

async function fetchMetadataProductPageOrNull(
  store: ApprovedPriceHubStoreConfig,
  productUrl: string,
  fetchFn: PriceHubFetch,
  fetchTimeoutMs: number,
): Promise<{ html: string | null; status: number | null }> {
  try {
    return { html: await fetchMetadataProductPage(store, productUrl, fetchFn, fetchTimeoutMs), status: null };
  } catch (error: unknown) {
    return { html: null, status: readMetadataFetchStatus(error) };
  }
}

function isUsableMetadataProduct(product: NormalizedStoreListingSnapshot): boolean {
  return product.priceAmountMinor !== null && product.currency !== null && product.productName !== null && product.productUrl !== null;
}

interface SitemapMetadataProductResult {
  productUrl: string;
  product: NormalizedStoreListingSnapshot | null;
  skippedStatus?: number | null;
}

async function crawlSitemapMetadataProductUrl(
  store: ApprovedPriceHubStoreConfig,
  productUrl: string,
  fetchFn: PriceHubFetch,
  fetchTimeoutMs: number,
): Promise<SitemapMetadataProductResult> {
  const { html, status } = await fetchMetadataProductPageOrNull(store, productUrl, fetchFn, fetchTimeoutMs);
  if (!html) {
    return { productUrl, product: null, skippedStatus: status };
  }

  const product = store.adapter === 'bigcommerce_metadata'
    ? normalizeBigCommerceProductPage(html, productUrl)
    : store.adapter === 'shopware_metadata'
      ? normalizeShopwareProductPage(html, productUrl)
      : normalizeProductMetadataPage(html, productUrl, 'custom', { storeSlug: store.slug });

  return { productUrl, product: isUsableMetadataProduct(product) ? product : null };
}

function readMetadataFetchStatus(error: unknown): number | null {
  if (!(error instanceof Error)) {
    return null;
  }

  const match = error.message.match(/\): (\d{3}) /);
  return match ? Number.parseInt(match[1], 10) : null;
}

async function fetchSitemapLocationsWithTimeout(
  locations: AsyncIterable<string>,
  timeoutMs: number,
  context: string,
  response: PriceHubFetchResponse,
): Promise<string[]> {
  return fetchWithTimeout(readSitemapLocationsArray(locations), timeoutMs, context, (error) => abortResponse(response, error));
}

async function readSitemapLocationsArray(locations: AsyncIterable<string>): Promise<string[]> {
  const values: string[] = [];
  for await (const location of locations) {
    values.push(location);
  }
  return values;
}

const CUSTOM_SITEMAP_MAX_FILES = 30;
const DEFAULT_METADATA_CONCURRENCY = 6;
