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
