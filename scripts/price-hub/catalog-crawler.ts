import type { ApprovedPriceHubStoreConfig } from './store-configs.ts';
import {
  DEFAULT_CATALOG_MAX_PAGES,
  DEFAULT_CATALOG_PER_PAGE,
  DEFAULT_SHOPIFY_CATALOG_PER_PAGE,
  DEFAULT_SITEMAP_MAX_PRODUCTS,
} from './crawlers/helpers.ts';
import { crawlBigCommerceMetadataCatalog, crawlSitemapMetadataCatalog } from './crawlers/metadata.ts';
import { crawlShopifyProductJsonCatalog } from './crawlers/shopify.ts';
import type { CrawlWooCommerceStoreCatalogOptions, CrawledWooCommerceStoreCatalog } from './crawlers/types.ts';
import { crawlWooCommerceStoreCatalog } from './crawlers/woocommerce.ts';

export {
  DEFAULT_CATALOG_MAX_PAGES,
  DEFAULT_CATALOG_PER_PAGE,
  DEFAULT_SHOPIFY_CATALOG_PER_PAGE,
  DEFAULT_SITEMAP_MAX_PRODUCTS,
};
export { writeCrawledProducts } from './crawlers/io.ts';
export { applySignalSoundsInventoryOverrides, crawlBigCommerceMetadataCatalog, crawlSitemapMetadataCatalog } from './crawlers/metadata.ts';
export { crawlShopifyProductJsonCatalog } from './crawlers/shopify.ts';
export type { CrawlWooCommerceStoreCatalogOptions, CrawledWooCommerceStoreCatalog, PriceHubFetch, PriceHubFetchResponse } from './crawlers/types.ts';
export { crawlWooCommerceStoreCatalog } from './crawlers/woocommerce.ts';

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
