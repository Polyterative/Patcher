/** Maximum number of instances (copies) allowed per module in a single patch. */
export const MAX_INSTANCES_PER_MODULE = 20;

/** Summary entry for modules that have 2+ instances in a patch. */
export interface MultiInstanceModuleSummary {
  moduleId: number;
  moduleName: string;
  manufacturerName: string;
  instanceCount: number;
  labels: string[];
}

export interface LinkedRackUiState {
  kind: 'unlinked' | 'linked' | 'unavailable';
  statusTone: 'neutral' | 'positive' | 'warning';
  statusLabel: string;
  description: string;
  rackName?: string;
  rackId?: number | null;
  rackImage?: string;
}
