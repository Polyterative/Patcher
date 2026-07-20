/**
 * Internal types used by SupabaseQueriesService
 */

export interface ManufacturerModuleStats {
  moduleCount: number;
  latestModuleUpdatedAt: string | null;
  latestModuleUpdatedAtMs: number | null;
  changedModulesLast30Days: number;
}

export type ModuleActivityRow = {
  manufacturerId: number;
  updated: string;
};

export type PublicModuleInsightRow = {
  manufacturerId: number;
  manufacturerName: string;
  hp: number;
  standardName: string;
  created: string;
  updated: string;
};

export type ManufacturerInsightStats = {
  totalModules: number;
  totalHp: number;
  oneUModules: number;
};

export type ModulePriceStoreRow = {
  id: number;
  slug: string;
  name: string;
  country_code: string | null;
  currency_hint: string | null;
};

export type ModuleStoreListingRow = {
  id: number;
  module_id: number;
  store_id: number;
  product_url: string;
  verification_status: string;
  last_checked_at: string | null;
  store: ModulePriceStoreRow | null;
  latestSnapshot: ModulePriceSnapshotRow[] | null;
};

export type ModuleRecentMarketPriceListingRow = {
  module_id: number;
  store_id: number;
  latestSnapshot: Pick<
    ModulePriceSnapshotRow,
    'observed_at' | 'price_amount_minor' | 'currency' | 'availability'
  >[] | null;
};

export type ModulePriceHistoryListingRow = {
  id: number;
  module_id: number;
  store_id: number;
};

export type ModulePriceHistorySnapshotRow = Pick<
  ModulePriceSnapshotRow,
  'id' | 'listing_id' | 'observed_at' | 'price_amount_minor' | 'currency' | 'availability' | 'source'
>;

export type ModulePriceSnapshotRow = {
  id: number;
  listing_id: number;
  observed_at: string;
  price_amount_minor: number | null;
  currency: string | null;
  availability: string;
  source: string;
};
