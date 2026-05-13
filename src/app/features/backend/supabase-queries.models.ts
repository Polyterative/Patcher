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
