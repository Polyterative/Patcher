/**
 * Price guidance for the marketplace listing editor.
 *
 * Pure, local-only selector over the Price Hub recent-market-price aggregate.
 * It never fetches: the caller supplies cached `recentModuleMarketPrices` rows
 * and this helper picks the row for the edited module, whitelisting only the
 * fields the editor hint renders. Returns `null` when there is nothing honest
 * to show (no row, blank price, malformed input) so the editor stays clean.
 */
export interface MarketplacePriceGuidanceSource {
  moduleId: number;
  displayPrice: string;
  storeCount: number;
  tooltip: string | null;
}

export interface MarketplacePriceGuidance {
  moduleId: number;
  displayPrice: string;
  storeCount: number;
  tooltip: string | null;
}

export function buildMarketplacePriceGuidance(
  prices: unknown,
  moduleId: number
): MarketplacePriceGuidance | null {
  if (!Number.isFinite(moduleId) || moduleId <= 0 || !Array.isArray(prices)) {
    return null;
  }

  const row = prices.find(candidate => isGuidanceSource(candidate) && candidate.moduleId === moduleId);
  if (!row) {
    return null;
  }

  const displayPrice = row.displayPrice.trim();
  if (!displayPrice) {
    return null;
  }

  return {
    displayPrice,
    moduleId: row.moduleId,
    storeCount: Math.max(0, Math.trunc(row.storeCount)),
    tooltip: row.tooltip?.trim() || null
  };
}

function isGuidanceSource(candidate: unknown): candidate is MarketplacePriceGuidanceSource {
  if (typeof candidate !== 'object' || candidate === null) {
    return false;
  }
  const row = candidate as Record<string, unknown>;
  return typeof row['moduleId'] === 'number'
    && typeof row['displayPrice'] === 'string'
    && typeof row['storeCount'] === 'number'
    && (row['tooltip'] === null || row['tooltip'] === undefined || typeof row['tooltip'] === 'string');
}
