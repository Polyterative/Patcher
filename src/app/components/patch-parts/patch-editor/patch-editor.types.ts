import { CurrentUserModulesOrderConfig } from 'src/app/features/backend/supabase.service';
import {
  DbModule,
  RackedModule
} from 'src/app/models/module';
import {
  PatchConnection,
  PatchModuleInstance
} from 'src/app/models/connection';
import { Rack } from 'src/app/models/rack';

/** One card in the editor module list */
export interface EditorModuleCard {
  module: DbModule;
  /** Set when an instance exists for this card; undefined for modules with 0 instances */
  instance: PatchModuleInstance | undefined;
  /** Display label — only set when there are 2+ instances of the same module */
  label: string | undefined;
  /** How many instances of this module exist in the patch (for showing/hiding delete button) */
  instanceCount: number;
  /** How many connections reference this instance (for indicator + delete confirmation) */
  connectionCount: number;
  /** Human-readable connection summaries for tooltip (max 10) */
  connectionNames: string[];
  /**
   * Stable identity key for @for tracking.
   * Uses instance.id when set; falls back to -(module.id) so the key never flips
   * when the first instance is created (avoids DOM re-creation → no re-animation).
   */
  trackingId: number;
}

export type DbModuleWithCollectionUpdated =
  DbModule
  & {
  collectionUpdated?: string | null;
};

export type EditorCardComparator = (a: EditorModuleCard, b: EditorModuleCard) => number;
export type GroupingKeyGenerator = (card: EditorModuleCard) => string;

export type PatchEditorSortModeId =
  'nameAsc'
  | 'nameDesc'
  | 'addedLatest'
  | 'addedEarliest'
  | 'manufacturerAsc'
  | 'manufacturerDesc'
  | 'connectionsMost';

export type PatchEditorGroupModeId =
  'none'
  | 'manufacturer'
  | 'connectionState'
  | 'patchPresence';

export interface PatchEditorSortStrategy {
  id: PatchEditorSortModeId;
  label: string;
  backendOrder: CurrentUserModulesOrderConfig;
  localComparator: EditorCardComparator;
  groupingKeyGenerator?: GroupingKeyGenerator;
}

export const PATCH_EDITOR_OPERATION_MODES = {
  collection: 'collection',
  linkedRack: 'linkedRack'
} as const;

export type PatchEditorOperationMode =
  typeof PATCH_EDITOR_OPERATION_MODES[keyof typeof PATCH_EDITOR_OPERATION_MODES];

export interface PatchEditorOperationModeOption {
  mode: PatchEditorOperationMode;
  label: string;
}

export interface LinkedRackPreviewCard {
  /** Stable identifier from `rackingData.id` — unique per rack position, used as instance map key */
  trackingId: number;
  module: DbModule;
  row: number;
  column: number;
  selectedPanelId: number | null;
}

export interface LinkedRackPreviewRow {
  row: number;
  modules: LinkedRackPreviewCard[];
}

export interface LinkedRackPreviewState {
  kind: 'unlinked' | 'loading' | 'ready' | 'unavailable';
  description: string;
  rack?: Rack;
  rows: LinkedRackPreviewRow[];
  moduleCount: number;
}

export type RackInlinePanelSide = 'left' | 'right';

/** Info about a module whose instances don't match the linked rack's positions */
export interface DivergenceModuleInfo {
  moduleId: number;
  moduleName: string;
  rackPositions: number;
  patchInstances: number;
}

/** Result of comparing linked rack modules against patch instances */
export interface LinkedRackDivergence {
  /** Modules present in patch instances but completely absent from the linked rack */
  orphanedModules: DivergenceModuleInfo[];
  /** Modules where patch has more instances than rack has positions */
  excessInstances: DivergenceModuleInfo[];
  /** Total orphaned instance count (sum of all excess + fully orphaned) */
  totalOrphanedInstances: number;
  /** True when no divergence detected */
  clean: boolean;
}
