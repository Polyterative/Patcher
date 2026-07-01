import { normalizeProductMetadataPage } from './product-metadata-page.ts';
import type { NormalizedStoreListingSnapshot } from './woocommerce-store-api.ts';

export function normalizeBigCommerceProductPage(html: string, productUrl: string): NormalizedStoreListingSnapshot {
  return normalizeProductMetadataPage(html, productUrl, 'bigcommerce_metadata');
}
