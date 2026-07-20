import {
  normalizeWooCommerceStoreApiProduct,
  type NormalizedStoreListingSnapshot,
  type WooCommerceStoreApiProduct,
} from '../../../supabase/functions/_shared/price-hub/woocommerce-store-api.ts';
import type { ApprovedPriceHubStoreConfig } from '../store-configs.ts';
import {
  addStoreConfiguredMetadata,
  DEFAULT_CATALOG_MAX_PAGES,
  DEFAULT_CATALOG_PER_PAGE,
  DEFAULT_FETCH_TIMEOUT_MS,
  abortResponse,
  fetchWithTimeout,
  fetchResponseWithTimeout,
  isRecord,
  readJsonResponse,
  readOptionalPositiveInteger,
  readPositiveInteger,
  readStringNumberOrNull,
  readStringOrNull,
} from './helpers.ts';
import type { CrawledWooCommerceStoreCatalog, CrawlWooCommerceStoreCatalogOptions, PriceHubFetch } from './types.ts';

export async function crawlWooCommerceStoreCatalog(
  store: ApprovedPriceHubStoreConfig,
  options: CrawlWooCommerceStoreCatalogOptions = {},
): Promise<CrawledWooCommerceStoreCatalog> {
  if (store.adapter !== 'woocommerce_store_api') {
    throw new Error(`Unsupported Price Hub adapter "${store.adapter}" for local catalog crawl.`);
  }

  const fetchFn = options.fetchFn ?? fetch;
  const fetchTimeoutMs = readPositiveInteger(options.fetchTimeoutMs, DEFAULT_FETCH_TIMEOUT_MS, 'fetchTimeoutMs');
  const maxPages = readPositiveInteger(options.maxPages, DEFAULT_CATALOG_MAX_PAGES, 'maxPages');
  const maxProducts = readOptionalPositiveInteger(options.maxProducts, 'maxProducts');
  const perPage = readPositiveInteger(options.perPage, DEFAULT_CATALOG_PER_PAGE, 'perPage');
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

    const pageProducts = await fetchWooCommerceCatalogPage(store, page, pageSize, fetchFn, fetchTimeoutMs);
    pagesFetched = page;

    if (pageProducts.length === 0) {
      break;
    }

    products.push(...pageProducts.map((product) => addStoreConfiguredMetadata(
      normalizeWooCommerceStoreApiProduct(product),
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
  fetchTimeoutMs: number,
): Promise<WooCommerceStoreApiProduct[]> {
  const url = buildWooCommerceCatalogPageUrl(store, page, perPage);
  const response = await fetchResponseWithTimeout(fetchFn, url, undefined, fetchTimeoutMs, `WooCommerce catalog fetch for ${store.slug} page ${page}`);
  if (!response.ok) {
    throw new Error(`WooCommerce catalog fetch failed for ${store.slug} page ${page}: ${response.status} ${response.statusText}`);
  }

  if (!response.json) {
    throw new Error(`WooCommerce catalog response for ${store.slug} page ${page} did not expose JSON.`);
  }

  const body = await fetchWithTimeout(
    readJsonResponse(response, `WooCommerce catalog response for ${store.slug} page ${page}`),
    fetchTimeoutMs,
    `WooCommerce catalog response for ${store.slug} page ${page}`,
    (error) => abortResponse(response, error),
  );
  if (!Array.isArray(body)) {
    throw new Error(`WooCommerce catalog response for ${store.slug} page ${page} must be an array.`);
  }

  return body.map(readWooCommerceProduct);
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
