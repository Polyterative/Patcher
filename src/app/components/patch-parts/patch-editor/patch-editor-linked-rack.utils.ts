import {
  PatchConnection,
  PatchModuleInstance
} from 'src/app/models/connection';
import { RackedModule } from 'src/app/models/module';
import {
  normalizeRackModuleOrientation,
  Rack
} from 'src/app/models/rack';
import {
  DivergenceModuleInfo,
  LinkedRackDivergence,
  LinkedRackPreviewCard,
  LinkedRackPreviewRow,
  LinkedRackPreviewState
} from './patch-editor.types';

export function buildLinkedRackPreviewRows(rackedModules: RackedModule[]): LinkedRackPreviewRow[] {
  const rows = new Map<number, LinkedRackPreviewCard[]>();

  for (const rackedModule of rackedModules) {
    if (rackedModule.rackingData.row == null) { continue; }
    const row = rackedModule.rackingData.row;
    const rowCards = rows.get(row) ?? [];
    rowCards.push({
      trackingId: rackedModule.rackingData.id ?? ((row + 1) * 100000) + ((rackedModule.rackingData.column ?? 0) * 100) + rackedModule.module.id,
      module: rackedModule.module,
      row,
      column: rackedModule.rackingData.column ?? 0,
      selectedPanelId: rackedModule.rackingData.selectedPanelId ?? null,
      orientation: normalizeRackModuleOrientation(rackedModule.rackingData.orientation)
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
  const placedCount = rows.reduce((sum, r) => sum + r.modules.length, 0);
  return {
    kind: 'ready',
    description: 'Click ins and outs to wire connections from linked rack modules. Module sourcing and editing above still come from your collection.',
    rack,
    rows,
    moduleCount: placedCount
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
