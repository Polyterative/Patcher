/**
 * Shared sort / group utilities for MinimalModule lists.
 *
 * Used by:
 *  - ModuleListComponent  (manufacturer detail, module browser)
 *  - PatchEditorComponent (patch editor — wraps MinimalModule in EditorModuleCard
 *                          but delegates name/manufacturer comparisons here)
 */
import { ISelectable } from '../components/@smart/mat-form-entity/form-element-models';
import { normalizeForSearch } from '../components/@smart/mat-form-entity/string-utils';
import { MinimalModule } from '../../models/module';

// ─── Sort ────────────────────────────────────────────────────────────────────

/** Sort IDs that are valid for a plain MinimalModule list. */
export type ModuleSortId =
  | 'nameAsc'
  | 'nameDesc'
  | 'hpAsc'
  | 'hpDesc'
  | 'insMost'
  | 'outsMost';

/** Group IDs that are valid for a plain MinimalModule list. */
export type ModuleGroupId =
  'none'
  | 'standard'
  | 'hpRange';

export const MODULE_SORT_OPTIONS: ISelectable[] = [
  {id: 'nameAsc', name: 'Name (A→Z)'},
  {id: 'nameDesc', name: 'Name (Z→A)'},
  {id: 'hpAsc', name: 'HP (low→high)'},
  {id: 'hpDesc', name: 'HP (high→low)'},
  {id: 'insMost', name: 'Inputs (most first)'},
  {id: 'outsMost', name: 'Outputs (most first)'},
];

export const MODULE_GROUP_OPTIONS: ISelectable[] = [
  {id: 'none', name: 'Grouping off'},
  {id: 'standard', name: 'Group by standard (3U / 1U)'},
  {id: 'hpRange', name: 'Group by HP range'},
];

// ─── Primitive helpers ───────────────────────────────────────────────────────

export function getModuleNormalizedName(m: MinimalModule): string {
  return normalizeForSearch(m?.name || '');
}

export function getModuleNormalizedManufacturer(m: MinimalModule): string {
  return normalizeForSearch(m?.manufacturer?.name || '');
}

// ─── Comparators (operate directly on MinimalModule) ─────────────────────────

export function compareModulesByNameAsc(a: MinimalModule, b: MinimalModule): number {
  const n = getModuleNormalizedName(a).localeCompare(getModuleNormalizedName(b));
  if (n !== 0) return n;
  return getModuleNormalizedManufacturer(a).localeCompare(getModuleNormalizedManufacturer(b));
}

export function compareModulesByNameDesc(a: MinimalModule, b: MinimalModule): number {
  return compareModulesByNameAsc(b, a);
}

export function compareModulesByHpAsc(a: MinimalModule, b: MinimalModule): number {
  const h = (a.hp || 0) - (b.hp || 0);
  return h !== 0 ? h : compareModulesByNameAsc(a, b);
}

export function compareModulesByHpDesc(a: MinimalModule, b: MinimalModule): number {
  return compareModulesByHpAsc(b, a);
}

export function compareModulesByInsMost(a: MinimalModule, b: MinimalModule): number {
  const d = (b.ins?.length || 0) - (a.ins?.length || 0);
  return d !== 0 ? d : compareModulesByNameAsc(a, b);
}

export function compareModulesByOutsMost(a: MinimalModule, b: MinimalModule): number {
  const d = (b.outs?.length || 0) - (a.outs?.length || 0);
  return d !== 0 ? d : compareModulesByNameAsc(a, b);
}

export function compareModulesByManufacturerAsc(a: MinimalModule, b: MinimalModule): number {
  const m = getModuleNormalizedManufacturer(a).localeCompare(getModuleNormalizedManufacturer(b));
  return m !== 0 ? m : compareModulesByNameAsc(a, b);
}

export function compareModulesByManufacturerDesc(a: MinimalModule, b: MinimalModule): number {
  return compareModulesByManufacturerAsc(b, a);
}

/** Pick the right comparator for a `ModuleSortId`. */
export function getModuleComparator(sortId: ModuleSortId): (a: MinimalModule, b: MinimalModule) => number {
  switch (sortId) {
    case 'nameDesc':
      return compareModulesByNameDesc;
    case 'hpAsc':
      return compareModulesByHpAsc;
    case 'hpDesc':
      return compareModulesByHpDesc;
    case 'insMost':
      return compareModulesByInsMost;
    case 'outsMost':
      return compareModulesByOutsMost;
    case 'nameAsc':
    default:
      return compareModulesByNameAsc;
  }
}

// ─── Grouping ────────────────────────────────────────────────────────────────

export function getModuleGroupKey(m: MinimalModule, groupId: ModuleGroupId): string {
  if (groupId === 'standard') {
    const sid = m.standard?.id;
    return sid === 1 ? 'Intellijel 1U' : sid === 2 ? 'PulpLogic 1U' : '3U';
  }
  if (groupId === 'hpRange') {
    const hp = m.hp || 0;
    if (hp <= 4) return '1–4 HP';
    if (hp <= 8) return '5–8 HP';
    if (hp <= 14) return '9–14 HP';
    if (hp <= 20) return '15–20 HP';
    return '21+ HP';
  }
  return '';
}

// ─── Combined sort + group ────────────────────────────────────────────────────

export function sortAndGroupMinimalModules(
  data: MinimalModule[],
  sortId: ModuleSortId,
  groupId: ModuleGroupId
): MinimalModule[] {
  const sorted = [...data].sort(getModuleComparator(sortId));
  if (groupId === 'none') return sorted;
  
  const groups = new Map<string, MinimalModule[]>();
  for (const m of sorted) {
    const key = getModuleGroupKey(m, groupId);
    const arr = groups.get(key) ?? [];
    arr.push(m);
    groups.set(key, arr);
  }
  return [...groups.keys()].sort((a, b) => a.localeCompare(b)).flatMap(k => groups.get(k) ?? []);
}