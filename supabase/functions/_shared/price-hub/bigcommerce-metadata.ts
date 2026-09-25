import { normalizeProductMetadataPage, type ProductMetadataContext } from './product-metadata-page.ts';
import type { NormalizedStoreListingSnapshot } from './woocommerce-store-api.ts';

export function normalizeBigCommerceProductPage(
  html: string,
  productUrl: string,
  context: ProductMetadataContext = {},
): NormalizedStoreListingSnapshot {
  return normalizeProductMetadataPage(html, productUrl, 'bigcommerce_metadata', context);
}
