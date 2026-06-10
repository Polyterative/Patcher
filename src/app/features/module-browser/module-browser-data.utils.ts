import { MinimalModule } from '../../models/module';
import { compareModulesByNameAsc } from '../../shared-interproject/utils/module-sort-utils';
import { normalizeSupabaseUtcTimestamp } from 'src/app/shared-interproject/pipes/supabase-utc-timestamp.pipe';


export function toSortDirection(optionName: string | undefined): 'asc' | 'desc' {
  return optionName?.includes('↑') ? 'asc' : 'desc';
}

export function matchesSelectedTags(
  module: MinimalModule,
  selectedTagIds: number[],
  mode: 'OR' | 'AND' = 'OR'
): boolean {
  const matcher = mode === 'AND' ? 'every' : 'some';
  return selectedTagIds[matcher]((selectedTagId) =>
    (module.tags ?? []).some((tagVote) => tagVote.tag?.id === selectedTagId)
  );
}

export function getModuleStandardId(module: MinimalModule): number | undefined {
  const standard = module.standard as MinimalModule['standard'] | number | undefined;
  return typeof standard === 'number'
    ? standard
    : standard?.id;
}

export function applyHpCondition(moduleHp: number, hpValue: number, conditionId: string): boolean {
  switch (conditionId) {
    case '!=': return moduleHp !== hpValue;
    case '>': return moduleHp > hpValue;
    case '<': return moduleHp < hpValue;
    case '>=': return moduleHp >= hpValue;
    case '<=': return moduleHp <= hpValue;
    default: return moduleHp === hpValue;
  }
}

export function compareModulesByCreated(a: MinimalModule, b: MinimalModule, direction: 'asc' | 'desc'): number {
  const aCreated = Date.parse(normalizeSupabaseUtcTimestamp(a.created || ''));
  const bCreated = Date.parse(normalizeSupabaseUtcTimestamp(b.created || ''));
  const comparison = (Number.isNaN(aCreated) ? 0 : aCreated) - (Number.isNaN(bCreated) ? 0 : bCreated);

  if (comparison !== 0) {
    return direction === 'asc' ? comparison : -comparison;
  }

  return compareModulesByNameAsc(a, b);
}
