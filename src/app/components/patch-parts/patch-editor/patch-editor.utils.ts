import { ISelectable } from 'src/app/shared-interproject/components/@smart/mat-form-entity/form-element-models';
import {
  compareModulesByManufacturerAsc,
  compareModulesByManufacturerDesc,
  compareModulesByNameAsc,
  getModuleNormalizedManufacturer
} from 'src/app/shared-interproject/utils/module-sort-utils';
import { matchesSearchQuery } from 'src/app/shared-interproject/components/@smart/mat-form-entity/string-utils';
import {
  PatchConnection,
  PatchModuleInstance
} from 'src/app/models/connection';
import { RackedModule } from 'src/app/models/module';
import { Rack } from 'src/app/models/rack';
import {
  DbModuleWithCollectionUpdated,
  DivergenceModuleInfo,
  EditorCardComparator,
  EditorModuleCard,
  GroupingKeyGenerator,
  LinkedRackDivergence,
  LinkedRackPreviewCard,
  LinkedRackPreviewRow,
  LinkedRackPreviewState,
  PATCH_EDITOR_OPERATION_MODES,
  PatchEditorGroupModeId,
  PatchEditorOperationMode,
  PatchEditorOperationModeOption,
  PatchEditorSortModeId,
  PatchEditorSortStrategy,
  RackInlinePanelSide
} from './patch-editor.types';

export const unknownManufacturerGroupKey = '\uffff';

export const defaultSortModeId: PatchEditorSortModeId = 'nameAsc';
export const defaultGroupModeId: PatchEditorGroupModeId = 'none';
export const defaultOperationMode: PatchEditorOperationMode = PATCH_EDITOR_OPERATION_MODES.collection;

export const PATCH_EDITOR_OPERATION_MODE_OPTIONS: ReadonlyArray<PatchEditorOperationModeOption> = [
  {mode: PATCH_EDITOR_OPERATION_MODES.linkedRack, label: 'Rack'},
  {mode: PATCH_EDITOR_OPERATION_MODES.collection, label: 'Collection'}
];

export const defaultLinkedRackPreviewState: LinkedRackPreviewState = {
  kind: 'unlinked',
  description: 'Link a rack to enable rack-visual patching mode.',
  rows: [],
  moduleCount: 0
};

export const loadingLinkedRackPreviewState: LinkedRackPreviewState = {
  kind: 'loading',
  description: 'Loading linked rack context…',
  rows: [],
  moduleCount: 0
};

export const PATCH_EDITOR_SORT_MODE_OPTIONS: ISelectable[] = [
  {id: 'nameAsc', name: 'Name (A→Z)'},
  {id: 'nameDesc', name: 'Name (Z→A)'},
  {id: 'addedLatest', name: 'Added latest'},
  {id: 'addedEarliest', name: 'Added earliest'},
  {id: 'manufacturerAsc', name: 'Manufacturer (A→Z)'},
  {id: 'manufacturerDesc', name: 'Manufacturer (Z→A)'},
  {id: 'connectionsMost', name: 'Connections (most first)'}
];

export const PATCH_EDITOR_GROUP_MODE_OPTIONS: ISelectable[] = [
  {id: 'none', name: 'Grouping off'},
  {id: 'manufacturer', name: 'Group by manufacturer'},
  {id: 'connectionState', name: 'Group by connection'},
  {id: 'patchPresence', name: 'Group by patch presence'}
];

const rackInlinePanelMaxWidthRem = 22;
const rackInlinePanelGapPx = 8;
const rackInlinePanelViewportMarginPx = 12;

export function resolveRackInlinePanelSide(
  moduleRect: Pick<DOMRect, 'left' | 'right'>,
  viewportWidth: number,
  viewportOffsetLeft = 0,
  panelWidthPx = rackInlinePanelMaxWidthRem * 16
): RackInlinePanelSide {
  const viewportRight = viewportOffsetLeft + viewportWidth;
  const availableLeft = Math.max(0, moduleRect.left - viewportOffsetLeft - rackInlinePanelGapPx - rackInlinePanelViewportMarginPx);
  const availableRight = Math.max(0, viewportRight - moduleRect.right - rackInlinePanelGapPx - rackInlinePanelViewportMarginPx);

  if (availableRight >= panelWidthPx) {
    return 'right';
  }

  if (availableLeft >= panelWidthPx) {
    return 'left';
  }

  return availableLeft > availableRight ? 'left' : 'right';
}

function getCollectionUpdatedValue(card: EditorModuleCard): string {
  return `${ (card.module as DbModuleWithCollectionUpdated)?.collectionUpdated ?? '' }`;
}

function getCollectionUpdatedTimestamp(card: EditorModuleCard): number {
  const value = getCollectionUpdatedValue(card);
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function compareByTrackingId(a: EditorModuleCard, b: EditorModuleCard): number {
  return a.trackingId - b.trackingId;
}

function compareByNameAscending(a: EditorModuleCard, b: EditorModuleCard): number {
  const moduleComparison = compareModulesByNameAsc(a.module, b.module);
  return moduleComparison !== 0 ? moduleComparison : compareByTrackingId(a, b);
}

function compareByNameDescending(a: EditorModuleCard, b: EditorModuleCard): number {
  return compareByNameAscending(b, a);
}

function compareByAddedLatest(a: EditorModuleCard, b: EditorModuleCard): number {
  const timestampComparison = getCollectionUpdatedTimestamp(b) - getCollectionUpdatedTimestamp(a);
  if (timestampComparison !== 0) {
    return timestampComparison;
  }

  const nameComparison = compareByNameAscending(a, b);
  if (nameComparison !== 0) {
    return nameComparison;
  }

  return compareByTrackingId(a, b);
}

function compareByAddedEarliest(a: EditorModuleCard, b: EditorModuleCard): number {
  return compareByAddedLatest(b, a);
}

function compareByManufacturerAscending(a: EditorModuleCard, b: EditorModuleCard): number {
  const moduleComparison = compareModulesByManufacturerAsc(a.module, b.module);
  return moduleComparison !== 0 ? moduleComparison : compareByTrackingId(a, b);
}

function compareByManufacturerDescending(a: EditorModuleCard, b: EditorModuleCard): number {
  const moduleComparison = compareModulesByManufacturerDesc(a.module, b.module);
  return moduleComparison !== 0 ? moduleComparison : compareByTrackingId(a, b);
}

function compareByConnectionsMost(a: EditorModuleCard, b: EditorModuleCard): number {
  const connectionComparison = b.connectionCount - a.connectionCount;
  if (connectionComparison !== 0) {
    return connectionComparison;
  }

  const instanceComparison = b.instanceCount - a.instanceCount;
  if (instanceComparison !== 0) {
    return instanceComparison;
  }

  return compareByNameAscending(a, b);
}

function manufacturerGroupingKeyGenerator(card: EditorModuleCard): string {
  return getModuleNormalizedManufacturer(card.module) || unknownManufacturerGroupKey;
}

export const PATCH_EDITOR_SORT_STRATEGIES: Record<PatchEditorSortModeId, PatchEditorSortStrategy> = {
  nameAsc: {
    id: 'nameAsc',
    label: 'Name (A→Z)',
    backendOrder: {key: 'moduleName', direction: 'asc'},
    localComparator: compareByNameAscending,
    groupingKeyGenerator: manufacturerGroupingKeyGenerator
  },
  nameDesc: {
    id: 'nameDesc',
    label: 'Name (Z→A)',
    backendOrder: {key: 'moduleName', direction: 'desc'},
    localComparator: compareByNameDescending,
    groupingKeyGenerator: manufacturerGroupingKeyGenerator
  },
  addedLatest: {
    id: 'addedLatest',
    label: 'Added latest',
    backendOrder: {key: 'collectionUpdated', direction: 'desc'},
    localComparator: compareByAddedLatest,
    groupingKeyGenerator: manufacturerGroupingKeyGenerator
  },
  addedEarliest: {
    id: 'addedEarliest',
    label: 'Added earliest',
    backendOrder: {key: 'collectionUpdated', direction: 'asc'},
    localComparator: compareByAddedEarliest,
    groupingKeyGenerator: manufacturerGroupingKeyGenerator
  },
  manufacturerAsc: {
    id: 'manufacturerAsc',
    label: 'Manufacturer (A→Z)',
    backendOrder: {key: 'moduleName', direction: 'asc'},
    localComparator: compareByManufacturerAscending,
    groupingKeyGenerator: manufacturerGroupingKeyGenerator
  },
  manufacturerDesc: {
    id: 'manufacturerDesc',
    label: 'Manufacturer (Z→A)',
    backendOrder: {key: 'moduleName', direction: 'asc'},
    localComparator: compareByManufacturerDescending,
    groupingKeyGenerator: manufacturerGroupingKeyGenerator
  },
  connectionsMost: {
    id: 'connectionsMost',
    label: 'Connections (most first)',
    backendOrder: {key: 'moduleName', direction: 'asc'},
    localComparator: compareByConnectionsMost,
    groupingKeyGenerator: manufacturerGroupingKeyGenerator
  }
};

export function asSortModeId(value: unknown): PatchEditorSortModeId {
  const modeId = (value as ISelectable)?.id;
  return (modeId === 'nameAsc'
    || modeId === 'nameDesc'
    || modeId === 'addedLatest'
    || modeId === 'addedEarliest'
    || modeId === 'manufacturerAsc'
    || modeId === 'manufacturerDesc'
    || modeId === 'connectionsMost')
    ? modeId
    : defaultSortModeId;
}

export function asGroupModeId(value: unknown): PatchEditorGroupModeId {
  const modeId = (value as ISelectable)?.id;
  return (modeId === 'none'
    || modeId === 'manufacturer'
    || modeId === 'connectionState'
    || modeId === 'patchPresence')
    ? modeId
    : defaultGroupModeId;
}

export function filterEditorCardsByQuery(cards: EditorModuleCard[], searchQuery: string): EditorModuleCard[] {
  if (!searchQuery?.trim()) {
    return cards;
  }

  return cards.filter(card => matchesSearchQuery(
    searchQuery,
    card.module?.name,
    card.module?.manufacturer?.name
  ));
}

export function resolvePatchEditorSortStrategy(sortModeId: PatchEditorSortModeId): PatchEditorSortStrategy {
  return PATCH_EDITOR_SORT_STRATEGIES[sortModeId] ?? PATCH_EDITOR_SORT_STRATEGIES[defaultSortModeId];
}

function getGroupKeyForMode(
  card: EditorModuleCard,
  strategy: PatchEditorSortStrategy,
  groupModeId: PatchEditorGroupModeId
): string {
  if (groupModeId === 'manufacturer') {
    return strategy.groupingKeyGenerator
      ? strategy.groupingKeyGenerator(card)
      : manufacturerGroupingKeyGenerator(card);
  }

  if (groupModeId === 'connectionState') {
    return card.connectionCount > 0 ? '0_connected' : '1_not_connected';
  }

  if (groupModeId === 'patchPresence') {
    return card.instanceCount > 0 ? '0_in_patch' : '1_not_in_patch';
  }

  return '0_default';
}

export function sortAndGroupEditorCards(
  cards: EditorModuleCard[],
  strategy: PatchEditorSortStrategy,
  groupModeId: PatchEditorGroupModeId
): EditorModuleCard[] {
  const sortedCards = [...cards].sort(strategy.localComparator);

  if (groupModeId === 'none') {
    return sortedCards;
  }

  const groupedCards = new Map<string, EditorModuleCard[]>();
  for (const card of sortedCards) {
    const groupKey = getGroupKeyForMode(card, strategy, groupModeId);
    const existingGroup = groupedCards.get(groupKey) || [];
    existingGroup.push(card);
    groupedCards.set(groupKey, existingGroup);
  }

  const orderedGroupKeys = [...groupedCards.keys()].sort((a, b) => a.localeCompare(b));
  return orderedGroupKeys.flatMap(groupKey => groupedCards.get(groupKey) || []);
}

export function buildLinkedRackPreviewRows(rackedModules: RackedModule[]): LinkedRackPreviewRow[] {
  const rows = new Map<number, LinkedRackPreviewCard[]>();

  for (const rackedModule of rackedModules) {
    const row = rackedModule.rackingData.row ?? 0;
    const rowCards = rows.get(row) ?? [];
    rowCards.push({
      trackingId: rackedModule.rackingData.id ?? ((row + 1) * 100000) + ((rackedModule.rackingData.column ?? 0) * 100) + rackedModule.module.id,
      module: rackedModule.module,
      row,
      column: rackedModule.rackingData.column ?? 0,
      selectedPanelId: rackedModule.rackingData.selectedPanelId ?? null
    });
    rows.set(row, rowCards);
  }

  return [...rows.entries()]
    .sort(([rowA], [rowB]) => rowA - rowB)
    .map(([row, modules]) => ({
      row,
      modules: [...modules].sort((a, b) => a.column - b.column)
    }));
}

/**
 * Builds a trackingId → instance_id map by pairing rack positions with
 * existing patch instances. For each module, rack positions are sorted by
 * (row, column) and instances by creation order (id), then paired 1:1.
 * Unmapped positions will trigger lazy instance creation on first CV click.
 */
export function buildLinkedRackInstanceMap(
  previewState: LinkedRackPreviewState,
  instances: PatchModuleInstance[]
): Map<number, number> {
  const instanceMap = new Map<number, number>();
  if (previewState.kind !== 'ready') { return instanceMap; }

  const rackPositionsByModule = new Map<number, LinkedRackPreviewCard[]>();
  for (const row of previewState.rows) {
    for (const card of row.modules) {
      const group = rackPositionsByModule.get(card.module.id) ?? [];
      group.push(card);
      rackPositionsByModule.set(card.module.id, group);
    }
  }

  for (const [moduleId, positions] of rackPositionsByModule) {
    const sortedPositions = [...positions].sort((a, b) => a.row - b.row || a.column - b.column);
    const sortedInstances = instances
      .filter(i => i.module_id === moduleId)
      .sort((a, b) => a.id - b.id);

    for (let i = 0; i < sortedPositions.length; i++) {
      if (i < sortedInstances.length) {
        instanceMap.set(sortedPositions[i].trackingId, sortedInstances[i].id);
      }
    }
  }

  return instanceMap;
}

export function buildLinkedRackPreviewState(
  rack: Rack | undefined,
  rackedModules: RackedModule[] = []
): LinkedRackPreviewState {
  if (!rack) {
    return {
      kind: 'unavailable',
      description: 'The linked rack could not be loaded. Collection-first editing still works.',
      rows: [],
      moduleCount: 0
    };
  }

  const rows = buildLinkedRackPreviewRows(rackedModules);
  return {
    kind: 'ready',
    description: 'Click ins and outs to wire connections from linked rack modules. Module sourcing and editing above still come from your collection.',
    rack,
    rows,
    moduleCount: rackedModules.length
  };
}

/**
 * Compares the current linked rack modules against patch instances to detect
 * divergence — e.g. modules removed from rack, copies reduced, etc.
 * Pure function, no side effects.
 */
export function detectLinkedRackDivergence(
  previewState: LinkedRackPreviewState,
  instances: PatchModuleInstance[],
  connections: PatchConnection[]
): LinkedRackDivergence {
  const orphanedModules: DivergenceModuleInfo[] = [];
  const excessInstances: DivergenceModuleInfo[] = [];
  let totalOrphanedInstances = 0;

  if (previewState.kind !== 'ready' || instances.length === 0) {
    return { orphanedModules, excessInstances, totalOrphanedInstances, clean: true };
  }

  const rackPositionsPerModule = new Map<number, number>();
  for (const row of previewState.rows) {
    for (const card of row.modules) {
      rackPositionsPerModule.set(card.module.id, (rackPositionsPerModule.get(card.module.id) ?? 0) + 1);
    }
  }

  const instancesPerModule = new Map<number, { count: number; name: string }>();
  for (const inst of instances) {
    const existing = instancesPerModule.get(inst.module_id);
    instancesPerModule.set(inst.module_id, {
      count: (existing?.count ?? 0) + 1,
      name: existing?.name ?? inst.module?.name ?? `Module ${inst.module_id}`
    });
  }

  for (const row of previewState.rows) {
    for (const card of row.modules) {
      const entry = instancesPerModule.get(card.module.id);
      if (entry) {
        entry.name = card.module.name;
      }
    }
  }

  for (const [moduleId, info] of instancesPerModule) {
    const rackCount = rackPositionsPerModule.get(moduleId) ?? 0;
    const patchCount = info.count;

    if (rackCount === 0) {
      orphanedModules.push({
        moduleId,
        moduleName: info.name,
        rackPositions: 0,
        patchInstances: patchCount
      });
      totalOrphanedInstances += patchCount;
    } else if (patchCount > rackCount) {
      excessInstances.push({
        moduleId,
        moduleName: info.name,
        rackPositions: rackCount,
        patchInstances: patchCount
      });
      totalOrphanedInstances += (patchCount - rackCount);
    }
  }

  return {
    orphanedModules,
    excessInstances,
    totalOrphanedInstances,
    clean: orphanedModules.length === 0 && excessInstances.length === 0
  };
}

/**
 * Counts how many connections reference instances that are orphaned (not mapped to any rack position).
 */
export function countOrphanedConnections(
  instanceMap: Map<number, number>,
  instances: PatchModuleInstance[],
  connections: PatchConnection[]
): number {
  if (connections.length === 0) return 0;

  const mappedInstanceIds = new Set(instanceMap.values());
  const allInstanceIds = new Set(instances.map(i => i.id));
  const orphanedInstanceIds = new Set(
    [...allInstanceIds].filter(id => !mappedInstanceIds.has(id))
  );

  if (orphanedInstanceIds.size === 0) return 0;

  let count = 0;
  for (const conn of connections) {
    if ((conn.instance_id_a != null && orphanedInstanceIds.has(conn.instance_id_a)) ||
        (conn.instance_id_b != null && orphanedInstanceIds.has(conn.instance_id_b))) {
      count++;
    }
  }
  return count;
}

/** Pure helper: builds a multi-line tooltip describing rack↔patch divergence */
export function buildDivergenceTooltip(
  divergence: LinkedRackDivergence,
  orphanedConnectionCount: number
): string {
  const lines: string[] = [];
  for (const m of divergence.orphanedModules) {
    lines.push(`${m.moduleName}: ${m.patchInstances} instance${m.patchInstances === 1 ? '' : 's'} in patch, not in rack`);
  }
  for (const m of divergence.excessInstances) {
    const excess = m.patchInstances - m.rackPositions;
    lines.push(`${m.moduleName}: ${excess} extra instance${excess === 1 ? '' : 's'} beyond rack (${m.rackPositions} position${m.rackPositions === 1 ? '' : 's'})`);
  }
  if (orphanedConnectionCount > 0) {
    lines.push(`${orphanedConnectionCount} connection${orphanedConnectionCount === 1 ? '' : 's'} reference${orphanedConnectionCount === 1 ? 's' : ''} unmatched instances`);
  }
  lines.push('These instances still work in collection mode.');
  return lines.join('\n');
}
