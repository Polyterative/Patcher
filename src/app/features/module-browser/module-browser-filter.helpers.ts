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
  const priceMin = fields.priceMin.control.value;
  const priceMax = fields.priceMax.control.value;
  return (
    fields.name.control.value !== '' ||
    fields.description.control.value !== '' ||
    isOption(fields.manufacturers.control.value) ||
    (hp !== '' && hp !== null) ||
    (fields.depth.control.value !== '' && fields.depth.control.value !== null) ||
    (priceMin !== '' && priceMin !== null) ||
    (priceMax !== '' && priceMax !== null) ||
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
  const priceMin = fields.priceMin.control.value;
  const priceMax = fields.priceMax.control.value;

  return (
    fields.name.control.value.trim() !== ''
    || fields.description.control.value.trim() !== ''
    || isOption(fields.manufacturers.control.value)
    || (hp !== '' && hp !== null)
    || (fields.depth.control.value !== '' && fields.depth.control.value !== null)
    || (priceMin !== '' && priceMin !== null)
    || (priceMax !== '' && priceMax !== null)
    || (hpCondition && hpCondition.id !== DEFAULT_HP_CONDITION.id)
    || (standard && standard.id !== undefined)
    || (tags && tags.length > 0)
  );
}

export function hasActivePriceFilterForFields(fields: ModuleBrowserFields): boolean {
  return parsePriceBoundary(fields.priceMin.control.value) !== null
    || parsePriceBoundary(fields.priceMax.control.value) !== null;
}

export function getActiveFilterNames(fields: ModuleBrowserFields): string[] {
  const activeFilters: string[] = [];
  if (fields.name.control.value ?? '') activeFilters.push('name');
  if (fields.description.control.value) activeFilters.push('description');
  if (fields.manufacturers.control.value) activeFilters.push('manufacturer');
  if (fields.hp.control.value) activeFilters.push('hp');
  if (fields.depth.control.value) activeFilters.push('depth');
  if (fields.priceMin.control.value) activeFilters.push('priceMin');
  if (fields.priceMax.control.value) activeFilters.push('priceMax');
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
  excludedModuleIds: number[] = [],
  priceEurMinorByModuleId: ReadonlyMap<number, number> = EMPTY_PRICE_MAP,
  includeUnpriced = false
): MinimalModule[] | undefined {
  if (modules === undefined) {
    return undefined;
  }

  const excludedIds = new Set(excludedModuleIds);
  const criteria = createModuleFilterCriteria(fields, tagMatchMode);
  const filteredModules = modules.filter((module) =>
    isOwnedPossessionForModule(module)
    && !excludedIds.has(module.id)
    && matchesOwnedModuleFilters(module, criteria, priceEurMinorByModuleId, includeUnpriced)
  );
  return sortOwnedModulesForFields(filteredModules, fields, priceEurMinorByModuleId);
}

export function filterWantedModulesForFields(
  modules: MinimalModule[] | undefined,
  fields: ModuleBrowserFields,
  tagMatchMode: 'OR' | 'AND',
  priceEurMinorByModuleId: ReadonlyMap<number, number> = EMPTY_PRICE_MAP,
  includeUnpriced = false
): MinimalModule[] | undefined {
  if (modules === undefined) {
    return undefined;
  }

  const criteria = createModuleFilterCriteria(fields, tagMatchMode);
  const filteredModules = modules.filter((module) =>
    isWantedPossessionForModule(module) && matchesOwnedModuleFilters(module, criteria, priceEurMinorByModuleId, includeUnpriced)
  );
  return sortOwnedModulesForFields(filteredModules, fields, priceEurMinorByModuleId);
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

interface ModuleFilterCriteria {
  name: string;
  description: string;
  selectedManufacturerId: number;
  hpValue: number;
  hpConditionId: string;
  maxDepth: number;
  minPriceEur: number | null;
  maxPriceEur: number | null;
  selectedStandardId: number | undefined;
  selectedTagIds: number[];
  tagMatchMode: 'OR' | 'AND';
}

const EMPTY_PRICE_MAP: ReadonlyMap<number, number> = new Map();

export const MODULE_PRICE_SLIDER_FLOOR_EUR = 0;
export const MODULE_PRICE_SLIDER_MIN_CEIL_EUR = 500;
export const MODULE_PRICE_SLIDER_STEP_EUR = 10;

/**
 * Parses a whole-EUR price boundary from a text control value.
 * Mirrors `parsePriceBoundary` in marketplace-view-models: blank or
 * non-numeric/negative input means "no bound", never zero-as-signal.
 * Accepts numbers too: `type="number"` inputs surface `number | null` at
 * runtime even though the controls are typed `FormControl<string>`
 * (same latent typing as the hp/depth controls — hence no `.trim()` blind).
 */
export function parsePriceBoundary(value: string | number | null | undefined): number | null {
  const text = typeof value === 'string'
    ? value.trim()
    : typeof value === 'number'
      ? String(value)
      : '';
  if (!text) {
    return null;
  }
  const parsed = Number(text);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

/**
 * True when a Price Hub estimate (minor EUR units) falls inside the
 * whole-EUR [min, max] range. With no bounds set everything matches.
 * With any bound set, modules without price data are excluded unless
 * `includeUnpriced` opts them back in (the sidebar toggle).
 */
export function matchesPriceRange(
  estimatedPriceEurMinor: number | null | undefined,
  minPriceEur: number | null,
  maxPriceEur: number | null,
  includeUnpriced = false
): boolean {
  if (minPriceEur === null && maxPriceEur === null) {
    return true;
  }
  if (estimatedPriceEurMinor === null || estimatedPriceEurMinor === undefined) {
    return includeUnpriced;
  }
  if (minPriceEur !== null && estimatedPriceEurMinor < Math.round(minPriceEur * 100)) {
    return false;
  }
  if (maxPriceEur !== null && estimatedPriceEurMinor > Math.round(maxPriceEur * 100)) {
    return false;
  }
  return true;
}

function createModuleFilterCriteria(
  fields: ModuleBrowserFields,
  tagMatchMode: 'OR' | 'AND'
): ModuleFilterCriteria {
  return {
    name: fields.name.control.value,
    description: fields.description.control.value,
    selectedManufacturerId: Number.parseInt(getCleanedValueId(fields.manufacturers.control), 10),
    hpValue: Number.parseInt(fields.hp.control.value, 10),
    hpConditionId: fields.hpCondition.control.value?.id ?? DEFAULT_HP_CONDITION.id,
    maxDepth: Number.parseInt(fields.depth.control.value, 10),
    ...normalizePriceRange(
      parsePriceBoundary(fields.priceMin.control.value),
      parsePriceBoundary(fields.priceMax.control.value)
    ),
    selectedStandardId: fields.standard.control.value?.id,
    selectedTagIds: getSelectedTagIdsFromFields(fields),
    tagMatchMode
  };
}

/**
 * Forgiving range normalization: a typed min above max is treated as a
 * swapped range instead of matching nothing (the dual slider can never
 * produce this state; typed inputs can). A zero min is dropped: estimates
 * are never negative, so it constrains nothing — keeping it would only
 * serve to wrongly hide unpriced modules while the filter looks inactive.
 */
export function normalizePriceRange(
  minPriceEur: number | null,
  maxPriceEur: number | null
): {minPriceEur: number | null; maxPriceEur: number | null} {
  const effectiveMin = minPriceEur === 0 ? null : minPriceEur;
  if (effectiveMin !== null && maxPriceEur !== null && effectiveMin > maxPriceEur) {
    return {minPriceEur: maxPriceEur, maxPriceEur: effectiveMin};
  }
  return {minPriceEur: effectiveMin, maxPriceEur};
}

/**
 * Honest slider ceiling from loaded-page data only: the rounded-up max of
 * the known estimates and the typed max bound, never below the fallback.
 * There is no catalog-wide price aggregation, so a global ceiling would be
 * invented data — the hint copy next to the slider says as much.
 */
export function resolvePriceSliderCeilEur(
  estimatedPricesEurMinor: ReadonlyArray<number>,
  currentMaxEur: number | null
): number {
  const loadedMaxEur = estimatedPricesEurMinor.length > 0
    ? Math.max(...estimatedPricesEurMinor) / 100
    : 0;
  const target = Math.max(loadedMaxEur, currentMaxEur ?? 0, MODULE_PRICE_SLIDER_MIN_CEIL_EUR);
  return Math.ceil(target / 100) * 100;
}

/**
 * Maps released slider thumbs back onto the text controls. A full-range
 * thumb means "no bound" (empty string), keeping slider and inputs as two
 * views over the same filter instead of two sources of truth.
 */
export function commitPriceSliderBounds(
  startEur: number,
  endEur: number,
  ceilEur: number
): {priceMin: string; priceMax: string} {
  return {
    priceMin: startEur <= MODULE_PRICE_SLIDER_FLOOR_EUR ? '' : String(Math.round(startEur)),
    priceMax: endEur >= ceilEur ? '' : String(Math.round(endEur))
  };
}

function matchesOwnedModuleFilters(
  module: MinimalModule,
  criteria: ModuleFilterCriteria,
  priceEurMinorByModuleId: ReadonlyMap<number, number> = EMPTY_PRICE_MAP,
  includeUnpriced = false
): boolean {
  if (!matchesSearchQuery(criteria.name, module.name)) {
    return false;
  }

  if (!matchesSearchQuery(criteria.description, module.description)) {
    return false;
  }

  if (Number.isFinite(criteria.selectedManufacturerId) && module.manufacturerId !== criteria.selectedManufacturerId) {
    return false;
  }

  if (criteria.selectedStandardId !== undefined && getModuleStandardId(module) !== criteria.selectedStandardId) {
    return false;
  }

  if (Number.isFinite(criteria.hpValue)
    && !applyHpCondition(module.hp, criteria.hpValue, criteria.hpConditionId)) {
    return false;
  }

  if (Number.isFinite(criteria.maxDepth) && criteria.maxDepth >= 0
    && (module.depth === null || module.depth === undefined || module.depth > criteria.maxDepth)) {
    return false;
  }

  if ((criteria.minPriceEur !== null || criteria.maxPriceEur !== null)
    && !matchesPriceRange(
      priceEurMinorByModuleId.get(module.id) ?? null,
      criteria.minPriceEur,
      criteria.maxPriceEur,
      includeUnpriced
    )) {
    return false;
  }

  if (criteria.selectedTagIds.length > 0
    && !matchesSelectedTags(module, criteria.selectedTagIds, criteria.tagMatchMode)) {
    return false;
  }

  return true;
}

export function isPriceOrderOption(order: {id: string; name?: string} | null | undefined): boolean {
  return order?.id === 'price';
}

/**
 * Client-side price sort on Price Hub estimates (minor EUR units).
 * Unpriced modules sort last in both directions — there is no catalog-wide
 * price aggregation, so inventing a position among priced rows would be
 * fake precision. Name breaks ties for stability.
 */
export function sortModulesByPrice(
  modules: MinimalModule[],
  priceEurMinorByModuleId: ReadonlyMap<number, number> = EMPTY_PRICE_MAP,
  direction: 'asc' | 'desc' = 'asc'
): MinimalModule[] {
  return [...modules].sort((a, b) => {
    const aPrice = priceEurMinorByModuleId.get(a.id);
    const bPrice = priceEurMinorByModuleId.get(b.id);
    const aPriced = aPrice !== undefined && aPrice !== null;
    const bPriced = bPrice !== undefined && bPrice !== null;
    if (!aPriced && !bPriced) {
      return compareModulesByNameAsc(a, b);
    }
    if (!aPriced) {
      return 1;
    }
    if (!bPriced) {
      return -1;
    }
    const comparison = (aPrice as number) - (bPrice as number);
    if (comparison !== 0) {
      return direction === 'asc' ? comparison : -comparison;
    }
    return compareModulesByNameAsc(a, b);
  });
}

function sortOwnedModulesForFields(
  modules: MinimalModule[],
  fields: ModuleBrowserFields,
  priceEurMinorByModuleId: ReadonlyMap<number, number> = EMPTY_PRICE_MAP
): MinimalModule[] {
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
    case 'depth':
      return sortedModules.sort((a, b) => compareModulesByDepth(a, b, direction));
    case 'price':
      return sortModulesByPrice(sortedModules, priceEurMinorByModuleId, direction);
    default:
      return sortedModules;
  }
}

function compareModulesByDepth(
  a: MinimalModule,
  b: MinimalModule,
  direction: 'asc' | 'desc'
): number {
  const aDepth = a.depth;
  const bDepth = b.depth;

  if (aDepth === null || aDepth === undefined) {
    return bDepth === null || bDepth === undefined
      ? compareModulesByNameAsc(a, b)
      : 1;
  }

  if (bDepth === null || bDepth === undefined) {
    return -1;
  }

  const comparison = aDepth - bDepth;
  if (comparison !== 0) {
    return direction === 'asc' ? comparison : -comparison;
  }

  return compareModulesByNameAsc(a, b);
}

function getModuleTagMatchScore(module: MinimalModule, selectedTagIds: number[]): number {
  return selectedTagIds.filter((selectedTagId) =>
    module.tags?.some((tagVote) => tagVote.tag?.id === selectedTagId)
  ).length;
}
