import { MinimalModule } from 'src/app/models/module';

export interface CurrentUserContributorStats {
  modulesSubmitted: number;
  approvedModules: number;
  pendingModules: number;
  commentsPosted: number;
  moduleFlagsSubmitted: number;
}

export interface PublicUserContributorStats {
  approvedPublicModules: number;
}

export interface PublicApplicationStatistics {
  publicModules: number;
  publicManufacturers: number;
  publicProfiles: number;
  publicModulesUpdatedLast30Days: number;
  publicRacks: number;
  publicRackAuthors: number;
  publicRacksUpdatedLast30Days: number;
  publicPatches: number;
  publicPatchConnections: number;
  publicPatchAuthors: number;
  publicPatchesUpdatedLast30Days: number;
}

export interface PublicApplicationActivityPoint {
  date: string;
  modules: number;
  racks: number;
  patches: number;
}

export interface PublicApplicationModuleInsightBucket {
  label: string;
  count: number;
  detail?: string;
}

export interface PublicApplicationModuleInsights {
  topManufacturers: PublicApplicationModuleInsightBucket[];
  activeManufacturers: PublicApplicationModuleInsightBucket[];
  widestManufacturers: PublicApplicationModuleInsightBucket[];
  oneUManufacturers: PublicApplicationModuleInsightBucket[];
  standardMix: PublicApplicationModuleInsightBucket[];
  standardActivity: PublicApplicationModuleInsightBucket[];
  standardWidthAverages: PublicApplicationModuleInsightBucket[];
  standardManufacturerCounts: PublicApplicationModuleInsightBucket[];
  hpBands: PublicApplicationModuleInsightBucket[];
  hpBandActivity: PublicApplicationModuleInsightBucket[];
  hpExact: PublicApplicationModuleInsightBucket[];
  freshnessWindows: PublicApplicationModuleInsightBucket[];
  createdWindows: PublicApplicationModuleInsightBucket[];
  topFiveManufacturerShare: number;
  soloManufacturerCount: number;
  medianModulesPerManufacturer: number;
  medianCatalogueAgeYears: number;
  staleModules: number;
  averageHp: number;
  medianHp: number;
}

export interface PublicApplicationInsightsSnapshot {
  statistics: PublicApplicationStatistics;
  activitySeries: PublicApplicationActivityPoint[];
  moduleInsights: PublicApplicationModuleInsights;
}

export interface PublicModuleDiscoveryEntry {
  id: number;
  name: string;
  manufacturer: {
    id: number;
    name: string;
  };
  count: number;
  module?: MinimalModule;
}

export interface PublicModuleDiscoverySnapshot {
  mostOwned: PublicModuleDiscoveryEntry[];
  mostWanted: PublicModuleDiscoveryEntry[];
  mostSold: PublicModuleDiscoveryEntry[];
}

export interface ModulePriceLatestSnapshot {
  id: number;
  observedAt: string;
  priceAmountMinor: number | null;
  currency: string | null;
  availability: string;
  source: string;
}

export interface ModulePriceListing {
  listingId: number;
  moduleId: number;
  storeId: number;
  storeSlug: string;
  storeName: string;
  countryCode: string | null;
  currencyHint: string | null;
  productUrl: string;
  verificationStatus: string;
  lastCheckedAt: string | null;
  latestSnapshot: ModulePriceLatestSnapshot | null;
}

export interface ModuleRecentMarketPrice {
  moduleId: number;
  estimatedPriceEurMinor: number;
  displayPrice: string;
  storeCount: number;
  latestObservedAt: string;
  tooltip: string;
}
