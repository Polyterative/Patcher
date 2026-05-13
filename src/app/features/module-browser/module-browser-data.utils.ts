import { MinimalModule } from '../../models/module';
import { compareModulesByNameAsc } from '../../shared-interproject/utils/module-sort-utils';


export function toSortDirection(optionName: string | undefined): 'asc' | 'desc' {
  return optionName?.includes('↑') ? 'asc' : 'desc';
}

export function matchesSelectedTags(module: MinimalModule, selectedTagIds: number[]): boolean {
  return (module.tags ?? []).some((tagVote) => selectedTagIds.includes(tagVote.tag?.id));
}

export function getModuleStandardId(module: MinimalModule): number | undefined {
  const standard = module.standard as MinimalModule['standard'] | number | undefined;
  return typeof standard === 'number'
    ? standard
    : standard?.id;
}

export function compareModulesByCreated(a: MinimalModule, b: MinimalModule, direction: 'asc' | 'desc'): number {
  const aCreated = Date.parse(a.created || '');
  const bCreated = Date.parse(b.created || '');
  const comparison = (Number.isNaN(aCreated) ? 0 : aCreated) - (Number.isNaN(bCreated) ? 0 : bCreated);

  if (comparison !== 0) {
    return direction === 'asc' ? comparison : -comparison;
  }

  return compareModulesByNameAsc(a, b);
}
