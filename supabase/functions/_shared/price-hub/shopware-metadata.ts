import { normalizeProductMetadataPage } from './product-metadata-page.ts';
import type { NormalizedStoreListingSnapshot } from './woocommerce-store-api.ts';

export function normalizeShopwareProductPage(html: string, productUrl: string): NormalizedStoreListingSnapshot {
  return normalizeProductMetadataPage(html, productUrl, 'shopware_metadata');
}
