import { ISelectable } from 'src/app/shared-interproject/components/@smart/mat-form-entity/form-element-models';
import {
  compareModulesByManufacturerAsc,
  compareModulesByManufacturerDesc,
  compareModulesByNameAsc,
  getModuleNormalizedManufacturer
} from 'src/app/shared-interproject/utils/module-sort-utils';
import { matchesSearchQuery } from 'src/app/shared-interproject/components/@smart/mat-form-entity/string-utils';
import {
  DbModuleWithCollectionUpdated,
  EditorCardComparator,
  EditorModuleCard,
  GroupingKeyGenerator,
  LinkedRackPreviewState,
  PATCH_EDITOR_OPERATION_MODES,
  PatchEditorGroupModeId,
  PatchEditorOperationMode,
  PatchEditorOperationModeOption,
  PatchEditorSortModeId,
  PatchEditorSortStrategy,
  RackInlinePanelSide
} from './patch-editor.types';
import { normalizeSupabaseUtcTimestamp } from 'src/app/shared-interproject/pipes/supabase-utc-timestamp.pipe';

export {
  buildDivergenceTooltip,
  buildLinkedRackInstanceMap,
  buildLinkedRackPreviewRows,
  buildLinkedRackPreviewState,
  countOrphanedConnections,
  detectLinkedRackDivergence
} from './patch-editor-linked-rack.utils';

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
  const timestamp = Date.parse(normalizeSupabaseUtcTimestamp(value));
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
