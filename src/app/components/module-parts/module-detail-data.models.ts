export type HiddenUsageBucket = 'none' | 'some' | '5_plus' | '10_plus' | '25_plus';

export interface ModulePossessionCounts {
  hasCount: number;
  wantsCount: number;
  sellsCount: number;
}

export interface ModuleUsageSummary {
  public_rack_count: number;
  hidden_rack_bucket: HiddenUsageBucket;
  public_patch_count: number;
  hidden_patch_bucket: HiddenUsageBucket;
}
