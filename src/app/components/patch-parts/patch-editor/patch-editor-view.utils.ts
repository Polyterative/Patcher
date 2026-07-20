import { CVConnectionEntity } from 'src/app/models/cv';
import {
  EditorModuleCard,
  LinkedRackDivergence,
  LinkedRackPreviewCard,
  LinkedRackPreviewState,
  PATCH_EDITOR_OPERATION_MODES,
  PatchEditorOperationMode
} from './patch-editor.types';

export type RackConnectionSelection = {
  a: CVConnectionEntity | null;
  b: CVConnectionEntity | null;
};

export function getModuleCardConnectionTooltip(card: EditorModuleCard): string {
  if (!card.connectionCount) {
    return '';
  }
  const suffix = card.connectionCount === 1 ? '' : 's';
  return `${ card.connectionCount } connection${ suffix }:\n${ card.connectionNames.join('\n') }`;
}

export function isOperationModeDisabled(mode: PatchEditorOperationMode, hasLinkedRack: boolean): boolean {
  return mode === PATCH_EDITOR_OPERATION_MODES.linkedRack && !hasLinkedRack;
}

export function getOperationModeTooltip(mode: PatchEditorOperationMode, hasLinkedRack: boolean): string {
  if (mode === PATCH_EDITOR_OPERATION_MODES.linkedRack) {
    return hasLinkedRack
      ? 'Rack mode mirrors the linked rack layout so you can patch directly against the modules placed in that rack.'
      : 'Rack mode uses the linked rack as the patching workspace. Link a rack above to enable this mode.';
  }

  return 'Collection mode lets you browse your own modules, search or sort them, and add copies into the patch.';
}

export function getRackModuleCopyLabel(
  preview: LinkedRackPreviewState,
  trackingId: number,
  moduleId: number
): string | null {
  if (preview.kind !== 'ready') return null;

  const positions: LinkedRackPreviewCard[] = [];
  for (const row of preview.rows) {
    for (const card of row.modules) {
      if (card.module.id === moduleId) positions.push(card);
    }
  }
  if (positions.length <= 1) return null;

  const sorted = [...positions].sort((a, b) => a.row - b.row || a.column - b.column);
  const idx = sorted.findIndex(p => p.trackingId === trackingId);
  return idx >= 0 ? `(${ idx + 1 })` : null;
}

export function getWorkspaceDescription(
  mode: PatchEditorOperationMode,
  preview: LinkedRackPreviewState
): string {
  if (mode === PATCH_EDITOR_OPERATION_MODES.collection) {
    return 'Browse your collection, search or sort what is available, then add copies to the patch and use their ins and outs to build connections.';
  }

  return getRackWorkspaceMessage(preview);
}

export function getRackWorkspaceMessage(preview: LinkedRackPreviewState): string {
  return preview.description;
}

export function getRackToolbarSummary(
  preview: LinkedRackPreviewState,
  divergence: LinkedRackDivergence | null,
  orphanedConnectionCount: number
): string {
  if (preview.kind !== 'ready' || !preview.rack) {
    return '';
  }

  if (divergence && !divergence.clean) {
    const connectionSuffix = orphanedConnectionCount > 0
      ? ` · ${ orphanedConnectionCount } connection${ orphanedConnectionCount === 1 ? '' : 's' } affected`
      : '';
    const instanceVerb = divergence.totalOrphanedInstances === 1 ? 'sits' : 'sit';
    return `Linked rack warning — Rack and patch copies have diverged. ${ divergence.totalOrphanedInstances } instance${ divergence.totalOrphanedInstances === 1 ? '' : 's' } ${ instanceVerb } outside the current rack${ connectionSuffix }.`;
  }

  return `${ preview.rack.name } · ${ preview.rack.rows } row${ preview.rack.rows === 1 ? '' : 's' } · ${ preview.rack.hp } HP · ${ preview.moduleCount } placed module${ preview.moduleCount === 1 ? '' : 's' }`;
}

export function isRackModuleDimmed(
  expandedRackTrackingId: number | null,
  trackingId: number,
  moduleId: number,
  instanceMap: Map<number, number> | null,
  sel: RackConnectionSelection | null
): boolean {
  if (!expandedRackTrackingId) return false;
  if (expandedRackTrackingId === trackingId) return false;
  if (getRackModuleConnectionRole(trackingId, moduleId, instanceMap, sel) != null) return false;
  return true;
}

export function isRackModulePendingSource(
  expandedRackTrackingId: number | null,
  trackingId: number,
  moduleId: number,
  instanceMap: Map<number, number> | null,
  sel: RackConnectionSelection | null
): boolean {
  if (!sel?.a) return false;
  const role = getRackModuleConnectionRole(trackingId, moduleId, instanceMap, sel);
  if (!role) return false;
  return expandedRackTrackingId !== trackingId;
}

export function getRackModuleConnectionRole(
  trackingId: number,
  moduleId: number,
  instanceMap: Map<number, number> | null,
  sel: RackConnectionSelection | null
): 'in' | 'out' | null {
  if (!sel?.a && !sel?.b) return null;
  const myInstanceId = instanceMap?.get(trackingId);

  if (sel.a?.cv.module?.id === moduleId) {
    if (sel.a.cv.instance_id != null) {
      if (sel.a.cv.instance_id === myInstanceId) return sel.a.kind;
    } else {
      return sel.a.kind;
    }
  }

  if (sel.b?.cv.module?.id === moduleId) {
    if (sel.b.cv.instance_id != null) {
      if (sel.b.cv.instance_id === myInstanceId) return sel.b.kind;
    } else {
      return sel.b.kind;
    }
  }

  return null;
}
