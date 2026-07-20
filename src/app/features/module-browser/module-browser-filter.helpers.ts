import { MinimalModule } from '../../models/module';
import { TAG_TYPE_DISPLAY_ORDER, TAG_TYPE_LABELS, Tag, TagSuggestionGroup } from '../../models/tag';
import {
  getCleanedValueId,
  ISelectable,
  isOption
} from '../../shared-interproject/components/@smart/mat-form-entity/form-element-models';
import { matchesSearchQuery } from '../../shared-interproject/components/@smart/mat-form-entity/string-utils';
import {
  compareModulesByHpAsc,
  compareModulesByHpDesc,
  compareModulesByManufacturerAsc,
  compareModulesByManufacturerDesc,
  compareModulesByNameAsc,
  compareModulesByNameDesc,
  compareModulesByUpdatedAsc,
  compareModulesByUpdatedDesc
} from '../../shared-interproject/utils/module-sort-utils';
import { DEFAULT_HP_CONDITION } from './module-browser-data.constants';
import { ModuleBrowserFields } from './module-browser-data.models';
import {
  applyHpCondition,
  compareModulesByCreated,
  getModuleStandardId,
  matchesSelectedTags,
  toSortDirection
} from './module-browser-data.utils';

export function groupFilterTags(tags: Tag[], query: string): TagSuggestionGroup[] {
  const normalizedQuery = query.trim().toLowerCase();
  const visibleTags = normalizedQuery
    ? tags.filter((tag) => tag.name.toLowerCase().includes(normalizedQuery))
    : tags;
  const grouped = new Map<string, Tag[]>();

  for (const tag of visibleTags) {
    const label = TAG_TYPE_LABELS[tag.type] ?? 'Other';
    grouped.set(label, [...(grouped.get(label) ?? []), tag]);
  }

  const orderedLabels = TAG_TYPE_DISPLAY_ORDER
    .map(type => TAG_TYPE_LABELS[type])
    .filter(label => grouped.has(label));

  return orderedLabels.map(label => ({
    label,
    tags: grouped.get(label)!
  }));
}

export function hasResettableModuleFilters(
  fields: ModuleBrowserFields,
  orderStartingValueId: string,
  tagMatchMode: 'OR' | 'AND'
): boolean {
  const hp = fields.hp.control.value;
  const hpCondition = fields.hpCondition.control.value;
  const standard = fields.standard.control.value;
  const order = fields.order.control.value;
  const tags = fields.tags.control.value;
  return (
    fields.name.control.value !== '' ||
    fields.description.control.value !== '' ||
    isOption(fields.manufacturers.control.value) ||
    (hp !== '' && hp !== null) ||
    (hpCondition && hpCondition.id !== DEFAULT_HP_CONDITION.id) ||
    (standard && standard.id !== undefined) ||
    (order && order.id !== orderStartingValueId) ||
    (tags && tags.length > 0) ||
    tagMatchMode !== 'OR'
  );
}

export function hasActiveModuleFiltersForFields(fields: ModuleBrowserFields): boolean {
  const hp = fields.hp.control.value;
  const hpCondition = fields.hpCondition.control.value;
  const standard = fields.standard.control.value;
  const tags = fields.tags.control.value;

  return (
    fields.name.control.value.trim() !== ''
    || fields.description.control.value.trim() !== ''
    || isOption(fields.manufacturers.control.value)
    || (hp !== '' && hp !== null)
    || (hpCondition && hpCondition.id !== DEFAULT_HP_CONDITION.id)
    || (standard && standard.id !== undefined)
    || (tags && tags.length > 0)
  );
}

export function getActiveFilterNames(fields: ModuleBrowserFields): string[] {
  const activeFilters: string[] = [];
  if (fields.name.control.value ?? '') activeFilters.push('name');
  if (fields.description.control.value) activeFilters.push('description');
  if (fields.manufacturers.control.value) activeFilters.push('manufacturer');
  if (fields.hp.control.value) activeFilters.push('hp');
  if (fields.standard.control.value?.id !== undefined) activeFilters.push('standard');
  if ((fields.tags.control.value ?? []).length > 0) activeFilters.push('tags');
  return activeFilters;
}

export function toggleTagSelection(selectedTags: ISelectable[], tag: Tag): ISelectable[] {
  const isSelected = selectedTags.some((selectedTag) => Number.parseInt(selectedTag.id, 10) === tag.id);
  return isSelected
    ? selectedTags.filter((selectedTag) => Number.parseInt(selectedTag.id, 10) !== tag.id)
    : [...selectedTags, {id: tag.id.toString(), name: tag.name}];
}

export function filterOwnedModulesForFields(
  modules: MinimalModule[] | undefined,
  fields: ModuleBrowserFields,
  tagMatchMode: 'OR' | 'AND',
  excludedModuleIds: number[] = []
): MinimalModule[] | undefined {
  if (modules === undefined) {
    return undefined;
  }

  const excludedIds = new Set(excludedModuleIds);
  const filteredModules = modules.filter((module) =>
    isOwnedPossessionForModule(module)
    && !excludedIds.has(module.id)
    && matchesOwnedModuleFilters(module, fields, tagMatchMode)
  );
  return sortOwnedModulesForFields(filteredModules, fields);
}

export function filterWantedModulesForFields(
  modules: MinimalModule[] | undefined,
  fields: ModuleBrowserFields,
  tagMatchMode: 'OR' | 'AND'
): MinimalModule[] | undefined {
  if (modules === undefined) {
    return undefined;
  }

  const filteredModules = modules.filter((module) =>
    isWantedPossessionForModule(module) && matchesOwnedModuleFilters(module, fields, tagMatchMode)
  );
  return sortOwnedModulesForFields(filteredModules, fields);
}

export function isOwnedPossessionForModule(module: MinimalModule): boolean {
  return module.possessionKind === undefined || module.possessionKind === 'HAS';
}

export function isWantedPossessionForModule(module: MinimalModule): boolean {
  return module.possessionKind === 'WANTS';
}

export function sortModulesByBestMatchForTags(modules: MinimalModule[], selectedTagIds: number[]): MinimalModule[] {
  return [...modules].sort((a, b) => {
    const scoreDiff = getModuleTagMatchScore(b, selectedTagIds) - getModuleTagMatchScore(a, selectedTagIds);
    if (scoreDiff !== 0) {
      return scoreDiff;
    }

    return compareModulesByNameAsc(a, b);
  });
}

export function getSelectedTagIdsFromFields(fields: ModuleBrowserFields): number[] {
  return (fields.tags.control.value ?? [])
    .map((tag) => Number.parseInt(tag.id, 10))
    .filter((id) => Number.isFinite(id));
}

function matchesOwnedModuleFilters(
  module: MinimalModule,
  fields: ModuleBrowserFields,
  tagMatchMode: 'OR' | 'AND'
): boolean {
  const selectedManufacturerId = Number.parseInt(getCleanedValueId(fields.manufacturers.control), 10);
  const hpValue = Number.parseInt(fields.hp.control.value, 10);
  const selectedStandardId = fields.standard.control.value?.id;
  const selectedTagIds = getSelectedTagIdsFromFields(fields);

  if (!matchesSearchQuery(fields.name.control.value, module.name)) {
    return false;
  }

  if (!matchesSearchQuery(fields.description.control.value, module.description)) {
    return false;
  }

  if (Number.isFinite(selectedManufacturerId) && module.manufacturerId !== selectedManufacturerId) {
    return false;
  }

  if (selectedStandardId !== undefined && getModuleStandardId(module) !== selectedStandardId) {
    return false;
  }

  if (Number.isFinite(hpValue) && !applyHpCondition(module.hp, hpValue, fields.hpCondition.control.value?.id)) {
    return false;
  }

  if (selectedTagIds.length > 0 && !matchesSelectedTags(module, selectedTagIds, tagMatchMode)) {
    return false;
  }

  return true;
}

function sortOwnedModulesForFields(modules: MinimalModule[], fields: ModuleBrowserFields): MinimalModule[] {
  const order = fields.order.control.value;
  const direction = toSortDirection(order?.name);
  const sortedModules = [...modules];

  switch (order?.id) {
    case 'best-match':
      return sortModulesByBestMatchForTags(sortedModules, getSelectedTagIdsFromFields(fields));
    case 'name':
      return sortedModules.sort(direction === 'asc' ? compareModulesByNameAsc : compareModulesByNameDesc);
    case 'hp':
      return sortedModules.sort(direction === 'asc' ? compareModulesByHpAsc : compareModulesByHpDesc);
    case 'manufacturerId':
      return sortedModules.sort(direction === 'asc' ? compareModulesByManufacturerAsc : compareModulesByManufacturerDesc);
    case 'created':
      return sortedModules.sort((a, b) => compareModulesByCreated(a, b, direction));
    case 'updated':
      return sortedModules.sort(direction === 'asc' ? compareModulesByUpdatedAsc : compareModulesByUpdatedDesc);
    default:
      return sortedModules;
  }
}

function getModuleTagMatchScore(module: MinimalModule, selectedTagIds: number[]): number {
  return selectedTagIds.filter((selectedTagId) =>
    module.tags?.some((tagVote) => tagVote.tag?.id === selectedTagId)
  ).length;
}
