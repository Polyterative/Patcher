export type HiddenUsageBucket = 'none' | 'some' | '5_plus' | '10_plus' | '25_plus';

export interface ModuleUsageSummary {
  public_rack_count: number;
  hidden_rack_bucket: HiddenUsageBucket;
  public_patch_count: number;
  hidden_patch_bucket: HiddenUsageBucket;
}
