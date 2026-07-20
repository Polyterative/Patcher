export const DEFAULT_DISAPPEARANCE_DEACTIVATION_MIN_PRODUCTS = 25;
export const DEFAULT_DISAPPEARANCE_DEACTIVATION_MIN_IMPORT_ROWS = 5;

export interface DisappearanceDeactivationEvidence {
  productCount: number;
  importRowCount: number;
  hitMaxProducts: boolean;
  hitMaxPages?: boolean;
  hitMaxSitemapFiles?: boolean;
  skippedProducts?: number;
  skippedProductUrls?: readonly string[];
  skippedGoneProductUrls?: readonly string[];
  hasExplicitBounds: boolean;
  minProducts?: number;
  minImportRows?: number;
}

export interface DisappearedPriceHubListingReference {
  id: number;
  module_id: number;
  product_url: string;
}

export interface PlannedDisappearanceDeactivation {
  eligible: boolean;
  skipReason: string | null;
  reason: string | null;
  listings: DisappearedPriceHubListingReference[];
}

export function planDisappearanceDeactivation(
  existingListings: readonly DisappearedPriceHubListingReference[],
  observedProductUrls: readonly string[],
  evidence: DisappearanceDeactivationEvidence,
  observedAt = new Date().toISOString(),
): PlannedDisappearanceDeactivation {
  const skipReason = readDisappearanceDeactivationSkipReason(evidence, observedProductUrls);
  if (skipReason) {
    return { eligible: false, skipReason, reason: null, listings: [] };
  }

  const observedUrls = new Set([
    ...observedProductUrls,
    ...(evidence.skippedProductUrls ?? []),
  ].map(normalizeComparableUrl));
  const listings = existingListings.filter((listing) => !observedUrls.has(normalizeComparableUrl(listing.product_url)));
  return {
    eligible: true,
    skipReason: null,
    reason: `not_seen_since_full_catalog:${observedAt.slice(0, 10)}`,
    listings,
  };
}

function readDisappearanceDeactivationSkipReason(
  evidence: DisappearanceDeactivationEvidence,
  observedProductUrls: readonly string[],
): string | null {
  const minProducts = evidence.minProducts ?? DEFAULT_DISAPPEARANCE_DEACTIVATION_MIN_PRODUCTS;
  const minImportRows = evidence.minImportRows ?? DEFAULT_DISAPPEARANCE_DEACTIVATION_MIN_IMPORT_ROWS;
  if (evidence.hitMaxProducts) {
    return 'crawl hit --max-products before exhausting the catalog';
  }
  if (evidence.hitMaxPages) {
    return 'crawl hit max pages before proving the catalog was exhausted';
  }
  if (evidence.hitMaxSitemapFiles) {
    return 'custom sitemap crawl hit max sitemap files before proving the catalog was exhausted';
  }
  if ((evidence.skippedProducts ?? 0) > (evidence.skippedProductUrls?.length ?? 0) + (evidence.skippedGoneProductUrls?.length ?? 0)) {
    return `crawl skipped ${evidence.skippedProducts} product pages without preserving all skipped URLs`;
  }
  if (evidence.hasExplicitBounds) {
    return 'crawl/import used explicit bounds';
  }
  if (evidence.productCount < minProducts) {
    return `catalog product count ${evidence.productCount} is below deactivation minimum ${minProducts}`;
  }
  if (evidence.importRowCount < minImportRows) {
    return `accepted import row count ${evidence.importRowCount} is below deactivation minimum ${minImportRows}`;
  }
  if (observedProductUrls.length < minProducts) {
    return `observed product URL count ${observedProductUrls.length} is below deactivation minimum ${minProducts}`;
  }
  return null;
}

function normalizeComparableUrl(value: string): string {
  try {
    const url = new URL(value);
    url.hash = '';
    url.search = '';
    return url.toString().replace(/\/$/, '');
  } catch {
    return value.trim().replace(/\/$/, '');
  }
}
