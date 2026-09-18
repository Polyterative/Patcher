import { FormControl } from '@angular/forms';
import { of } from 'rxjs';
import { MinimalModule } from '../../models/module';
import { Standard } from '../../models/standard';
import {
  Tag,
  TagType
} from '../../models/tag';
import {
  FormTypes,
  ISelectable
} from '../../shared-interproject/components/@smart/mat-form-entity/form-element-models';
import {
  DEFAULT_HP_CONDITION,
  DEFAULT_STANDARD,
  MODULE_ORDER_OPTIONS
} from './module-browser-data.constants';
import { ModuleBrowserFields } from './module-browser-data.models';
import {
  commitPriceSliderBounds,
  filterOwnedModulesForFields,
  filterWantedModulesForFields,
  getActiveFilterNames,
  groupFilterTags,
  hasActiveModuleFiltersForFields,
  hasResettableModuleFilters,
  isPriceOrderOption,
  matchesPriceRange,
  parsePriceBoundary,
  resolvePriceSliderCeilEur,
  sortModulesByBestMatchForTags,
  sortModulesByPrice,
  toggleTagSelection
} from './module-browser-filter.helpers';

describe('module-browser-filter.helpers', () => {
  const utilityTag: Tag = {id: 1, name: 'Clock', type: TagType.Utility};
  const filterTag: Tag = {id: 2, name: 'Filter', type: TagType.Filter};
  const voiceTag: Tag = {id: 3, name: 'Voice', type: TagType.Voice};
  const standard: Standard = {id: 0, name: '3U Doepfer'};

  function buildFields(): ModuleBrowserFields {
    return {
      name: {
        label: 'Search module...',
        code: 'search',
        flex: '14rem',
        control: new FormControl<string>('', {nonNullable: true}),
        type: FormTypes.TEXT
      },
      description: {
        label: 'Description',
        code: 'description',
        flex: '14rem',
        control: new FormControl<string>('', {nonNullable: true}),
        type: FormTypes.TEXT
      },
      order: {
        label: 'Order by',
        code: 'order',
        flex: '10rem',
        control: new FormControl({id: 'updated', name: 'Updated ↓'}, {nonNullable: true}),
        type: FormTypes.SELECT,
        options$: of([])
      },
      manufacturers: {
        label: 'Made by...',
        code: 'manufacturers',
        flex: '12rem',
        control: new FormControl<string>('', {nonNullable: true}),
        type: FormTypes.AUTOCOMPLETE,
        options$: of([])
      },
      hp: {
        label: 'HP',
        code: 'hp',
        flex: '6rem',
        control: new FormControl<string>('', {nonNullable: true}),
        type: FormTypes.NUMBER
      },
      depth: {
        label: 'Max Depth',
        code: 'depth',
        flex: '6rem',
        control: new FormControl<string>('', {nonNullable: true}),
        type: FormTypes.NUMBER
      },
      priceMin: {
        label: 'Min price (€)',
        code: 'priceMin',
        flex: '7rem',
        control: new FormControl<string>('', {nonNullable: true}),
        type: FormTypes.NUMBER
      },
      priceMax: {
        label: 'Max price (€)',
        code: 'priceMax',
        flex: '7rem',
        control: new FormControl<string>('', {nonNullable: true}),
        type: FormTypes.NUMBER
      },
      hpCondition: {
        label: 'HP must be...',
        code: 'hpCondition',
        flex: '8rem',
        control: new FormControl(DEFAULT_HP_CONDITION, {nonNullable: true}),
        type: FormTypes.SELECT,
        options$: of([])
      },
      standard: {
        label: 'Standard',
        code: 'standard',
        flex: '8rem',
        control: new FormControl(DEFAULT_STANDARD, {nonNullable: true}),
        type: FormTypes.SELECT,
        options$: of([])
      },
      tags: {
        label: 'Filter by tags...',
        code: 'tags',
        flex: '14rem',
        control: new FormControl<ISelectable[]>([], {nonNullable: true}),
        type: FormTypes.MULTISELECT,
        options$: of([])
      },
      tagSearch: {
        label: 'Search tags…',
        code: 'tagSearch',
        flex: '14rem',
        control: new FormControl<string>('', {nonNullable: true}),
        type: FormTypes.TEXT
      }
    };
  }

  function moduleFactory(overrides: Partial<MinimalModule> = {}): MinimalModule {
    return {
      id: overrides.id ?? 1,
      name: overrides.name ?? 'Module',
      description: overrides.description ?? 'Description',
      hp: overrides.hp ?? 8,
      depth: overrides.depth,
      public: overrides.public ?? true,
      created: overrides.created ?? '2026-01-01T00:00:00.000Z',
      updated: overrides.updated ?? '2026-01-01T00:00:00.000Z',
      manufacturerId: overrides.manufacturerId ?? 1,
      manufacturer: overrides.manufacturer ?? {id: 1, name: 'Maker'},
      standard: overrides.standard ?? standard,
      tags: overrides.tags ?? [],
      panels: overrides.panels ?? [],
      ins: overrides.ins,
      outs: overrides.outs,
      possessionKind: overrides.possessionKind
    };
  }

  function moduleTag(tag: Tag): MinimalModule['tags'][number] {
    return {
      id: tag.id,
      tag,
      voteCount: []
    };
  }

  it('groups visible tags by type using module browser display order', () => {
    const groups = groupFilterTags([filterTag, voiceTag, utilityTag], '');

    expect(groups.map(group => group.label)).toEqual(['Utility', 'Filter', 'Voice']);
    expect(groups.map(group => group.tags.map(tag => tag.name))).toEqual([
      ['Clock'],
      ['Filter'],
      ['Voice']
    ]);
  });

  it('filters grouped tags case-insensitively before grouping', () => {
    const groups = groupFilterTags([filterTag, voiceTag, utilityTag], 'voi');

    expect(groups).toEqual([
      {label: 'Voice', tags: [voiceTag]}
    ]);
  });

  it('toggles tag selections without mutating the current selection', () => {
    const selectedTags = [{id: utilityTag.id.toString(), name: utilityTag.name}];

    const added = toggleTagSelection(selectedTags, filterTag);
    const removed = toggleTagSelection(added, utilityTag);

    expect(selectedTags).toEqual([{id: '1', name: 'Clock'}]);
    expect(added).toEqual([
      {id: '1', name: 'Clock'},
      {id: '2', name: 'Filter'}
    ]);
    expect(removed).toEqual([{id: '2', name: 'Filter'}]);
  });

  it('filters owned modules by possession, excluded ids, text, hp, standard, and selected tags', () => {
    const fields = buildFields();
    fields.name.control.setValue('osc');
    fields.description.control.setValue('analog');
    fields.hp.control.setValue('8');
    fields.standard.control.setValue({id: 0, name: '3U Doepfer'});
    fields.tags.control.setValue([
      {id: utilityTag.id.toString(), name: utilityTag.name},
      {id: filterTag.id.toString(), name: filterTag.name}
    ]);

    const matching = moduleFactory({
      id: 1,
      name: 'Analog Oscillator',
      description: 'analog source',
      tags: [moduleTag(utilityTag), moduleTag(filterTag)]
    });
    const excluded = moduleFactory({
      id: 2,
      name: 'Analog Oscillator Expander',
      description: 'analog source',
      tags: [moduleTag(utilityTag), moduleTag(filterTag)]
    });
    const missingTag = moduleFactory({
      id: 3,
      name: 'Analog Oscillator Voice',
      description: 'analog source',
      tags: [moduleTag(utilityTag)]
    });
    const wrongPossession = moduleFactory({
      id: 4,
      name: 'Analog Oscillator Want',
      description: 'analog source',
      tags: [moduleTag(utilityTag), moduleTag(filterTag)],
      possessionKind: 'WANTS'
    });
    const wrongHp = moduleFactory({
      id: 5,
      name: 'Analog Oscillator Small',
      description: 'analog source',
      hp: 4,
      tags: [moduleTag(utilityTag), moduleTag(filterTag)]
    });

    expect(filterOwnedModulesForFields(
      [wrongHp, excluded, missingTag, wrongPossession, matching],
      fields,
      'AND',
      [2]
    )).toEqual([matching]);
  });

  it('filters wanted modules independently of owned possessions', () => {
    const fields = buildFields();
    const wanted = moduleFactory({id: 1, name: 'Wanted', possessionKind: 'WANTS'});
    const owned = moduleFactory({id: 2, name: 'Owned', possessionKind: 'HAS'});

    expect(filterWantedModulesForFields([owned, wanted], fields, 'OR')).toEqual([wanted]);
  });

  it('filters local modules by inclusive max depth and ignores invalid or negative values', () => {
    const fields = buildFields();
    fields.depth.control.setValue('30');

    expect(filterOwnedModulesForFields([
      moduleFactory({id: 1, depth: 30}),
      moduleFactory({id: 2, depth: 31}),
      moduleFactory({id: 3, depth: null}),
    ], fields, 'OR')?.map(module => module.id)).toEqual([1]);

    fields.depth.control.setValue('-1');
    expect(filterOwnedModulesForFields([
      moduleFactory({id: 4, depth: 10}),
    ], fields, 'OR')?.map(module => module.id)).toEqual([4]);

    fields.depth.control.setValue('not-a-number');
    expect(filterOwnedModulesForFields([
      moduleFactory({id: 5, depth: 40}),
    ], fields, 'OR')?.map(module => module.id)).toEqual([5]);
  });

  it('includes ascending and descending depth order options', () => {
    expect(MODULE_ORDER_OPTIONS.filter(option => option.id === 'depth')).toEqual([
      {id: 'depth', name: 'Depth ↑'},
      {id: 'depth', name: 'Depth ↓'}
    ]);
  });

  it('sorts local modules by depth with null and missing values last in both directions', () => {
    const fields = buildFields();
    const modules = [
      moduleFactory({id: 1, name: 'Depth 20', depth: 20}),
      moduleFactory({id: 2, name: 'Depth 10', depth: 10}),
      moduleFactory({id: 3, name: 'Null', depth: null}),
      moduleFactory({id: 4, name: 'Missing'})
    ];

    fields.order.control.setValue({id: 'depth', name: 'Depth ↑'});
    expect(filterOwnedModulesForFields(modules, fields, 'OR')?.map(module => module.id))
      .toEqual([2, 1, 4, 3]);

    fields.order.control.setValue({id: 'depth', name: 'Depth ↓'});
    expect(filterOwnedModulesForFields(modules, fields, 'OR')?.map(module => module.id))
      .toEqual([1, 2, 4, 3]);
  });

  it('sorts best matches by matching tag count and then name', () => {
    const alpha = moduleFactory({
      id: 1,
      name: 'Alpha',
      tags: [moduleTag(utilityTag)]
    });
    const beta = moduleFactory({
      id: 2,
      name: 'Beta',
      tags: [moduleTag(utilityTag), moduleTag(filterTag)]
    });
    const gamma = moduleFactory({
      id: 3,
      name: 'Gamma',
      tags: [moduleTag(filterTag)]
    });
    const modules = [gamma, alpha, beta];

    expect(sortModulesByBestMatchForTags(modules, [utilityTag.id, filterTag.id])).toEqual([
      beta,
      alpha,
      gamma
    ]);
    expect(modules).toEqual([gamma, alpha, beta]);
  });

  it('parses whole-EUR price boundaries forgivingly', () => {
    expect(parsePriceBoundary('')).toBeNull();
    expect(parsePriceBoundary('   ')).toBeNull();
    expect(parsePriceBoundary(null)).toBeNull();
    expect(parsePriceBoundary(undefined)).toBeNull();
    expect(parsePriceBoundary('250')).toEqual(250);
    expect(parsePriceBoundary(' 0 ')).toEqual(0);
    expect(parsePriceBoundary('-5')).toBeNull();
    expect(parsePriceBoundary('not-a-number')).toBeNull();
    // type="number" inputs surface numbers at runtime despite the
    // FormControl<string> typing (same as the hp/depth controls).
    expect(parsePriceBoundary(250 as unknown as string)).toEqual(250);
    expect(parsePriceBoundary(0 as unknown as string)).toEqual(0);
  });

  it('matches everything without bounds and excludes unpriced modules once bounded', () => {
    expect(matchesPriceRange(19900, null, null)).toBeTrue();
    expect(matchesPriceRange(null, null, null)).toBeTrue();
    expect(matchesPriceRange(undefined, null, null)).toBeTrue();

    expect(matchesPriceRange(19900, 100, 300)).toBeTrue();
    expect(matchesPriceRange(10000, 100, 300)).toBeTrue();
    expect(matchesPriceRange(30000, 100, 300)).toBeTrue();
    expect(matchesPriceRange(9999, 100, 300)).toBeFalse();
    expect(matchesPriceRange(30001, 100, 300)).toBeFalse();

    expect(matchesPriceRange(19900, 200, null)).toBeFalse();
    expect(matchesPriceRange(19900, null, 150)).toBeFalse();

    expect(matchesPriceRange(null, 100, null)).toBeFalse();
    expect(matchesPriceRange(undefined, null, 300)).toBeFalse();
  });

  it('opts unpriced modules back in when includeUnpriced is set', () => {
    expect(matchesPriceRange(null, 100, 300, true)).toBeTrue();
    expect(matchesPriceRange(undefined, 100, null, true)).toBeTrue();
    expect(matchesPriceRange(9999, 100, 300, true)).toBeFalse();
    expect(matchesPriceRange(19900, 100, 300, true)).toBeTrue();
    expect(matchesPriceRange(null, null, null, true)).toBeTrue();
  });

  it('filters owned modules by estimated market price and drops unpriced ones', () => {
    const fields = buildFields();
    fields.priceMin.control.setValue('100');
    fields.priceMax.control.setValue('300');
    const prices = new Map([
      [1, 19900],
      [2, 9999],
      [3, 30001]
    ]);

    expect(filterOwnedModulesForFields([
      moduleFactory({id: 1}),
      moduleFactory({id: 2}),
      moduleFactory({id: 3}),
      moduleFactory({id: 4})
    ], fields, 'OR', [], prices)?.map(module => module.id)).toEqual([1]);
  });

  it('treats a typed min above max as a swapped range instead of matching nothing', () => {
    const fields = buildFields();
    fields.priceMin.control.setValue('300');
    fields.priceMax.control.setValue('100');
    const prices = new Map([[1, 19900]]);

    expect(filterOwnedModulesForFields(
      [moduleFactory({id: 1}), moduleFactory({id: 2})],
      fields,
      'OR',
      [],
      prices
    )?.map(module => module.id)).toEqual([1]);
  });

  it('treats a zero min as no bound so unpriced modules stay visible', () => {
    const fields = buildFields();
    fields.priceMin.control.setValue(0 as unknown as string);
    const prices = new Map([[1, 19900]]);

    expect(filterOwnedModulesForFields(
      [moduleFactory({id: 1}), moduleFactory({id: 2})],
      fields,
      'OR',
      [],
      prices
    )?.map(module => module.id)).toEqual([1, 2]);
  });

  it('keeps unpriced modules alongside a range when includeUnpriced is set', () => {
    const fields = buildFields();
    fields.priceMin.control.setValue('100');
    fields.priceMax.control.setValue('300');
    const prices = new Map([[1, 19900]]);

    expect(filterOwnedModulesForFields(
      [moduleFactory({id: 1}), moduleFactory({id: 2})],
      fields,
      'OR',
      [],
      prices,
      true
    )?.map(module => module.id)).toEqual([1, 2]);
  });

  it('reports price bounds as resettable, active, and named filters', () => {
    const fields = buildFields();
    expect(hasResettableModuleFilters(fields, 'updated', 'OR')).toBeFalse();
    expect(hasActiveModuleFiltersForFields(fields)).toBeFalse();
    expect(getActiveFilterNames(fields)).toEqual([]);

    fields.priceMin.control.setValue('100');
    expect(hasResettableModuleFilters(fields, 'updated', 'OR')).toBeTrue();
    expect(hasActiveModuleFiltersForFields(fields)).toBeTrue();
    expect(getActiveFilterNames(fields)).toEqual(['priceMin']);

    fields.priceMin.control.setValue('');
    fields.priceMax.control.setValue('300');
    expect(hasActiveModuleFiltersForFields(fields)).toBeTrue();
    expect(getActiveFilterNames(fields)).toEqual(['priceMax']);
  });

  it('resolves an honest slider ceiling from loaded-page prices only', () => {
    expect(resolvePriceSliderCeilEur([], null)).toEqual(500);
    expect(resolvePriceSliderCeilEur([46000], null)).toEqual(500);
    expect(resolvePriceSliderCeilEur([46001], null)).toEqual(500);
    expect(resolvePriceSliderCeilEur([123000], null)).toEqual(1300);
    expect(resolvePriceSliderCeilEur([], 2000)).toEqual(2000);
    expect(resolvePriceSliderCeilEur([19900], 1200)).toEqual(1200);
  });

  it('commits released slider thumbs back onto the text controls', () => {
    expect(commitPriceSliderBounds(0, 500, 500)).toEqual({priceMin: '', priceMax: ''});
    expect(commitPriceSliderBounds(100, 300, 500)).toEqual({priceMin: '100', priceMax: '300'});
    expect(commitPriceSliderBounds(0, 300, 500)).toEqual({priceMin: '', priceMax: '300'});
    expect(commitPriceSliderBounds(100, 1300, 1300)).toEqual({priceMin: '100', priceMax: ''});
  });

  it('detects the client-side price order option', () => {
    expect(isPriceOrderOption({id: 'price', name: 'Price ↑'})).toBeTrue();
    expect(isPriceOrderOption({id: 'price', name: 'Price ↓'})).toBeTrue();
    expect(isPriceOrderOption({id: 'hp', name: 'HP ↑'})).toBeFalse();
    expect(isPriceOrderOption(null)).toBeFalse();
    expect(isPriceOrderOption(undefined)).toBeFalse();
  });

  it('sorts modules by estimated price with unpriced last in both directions', () => {
    const modules = [
      moduleFactory({id: 1, name: 'Expensive'}),
      moduleFactory({id: 2, name: 'Cheap'}),
      moduleFactory({id: 3, name: 'Unpriced'}),
      moduleFactory({id: 4, name: 'Mid'})
    ];
    const prices = new Map([[1, 45900], [2, 9999], [4, 19900]]);

    expect(sortModulesByPrice(modules, prices, 'asc').map(module => module.id)).toEqual([2, 4, 1, 3]);
    expect(sortModulesByPrice(modules, prices, 'desc').map(module => module.id)).toEqual([1, 4, 2, 3]);
    expect(modules.map(module => module.id)).toEqual([1, 2, 3, 4]);
  });

  it('breaks price ties by name and keeps unpriced name-sorted', () => {
    const modules = [
      moduleFactory({id: 1, name: 'Beta'}),
      moduleFactory({id: 2, name: 'Alpha'}),
      moduleFactory({id: 3, name: 'Zulu'}),
      moduleFactory({id: 4, name: 'Mike'})
    ];
    const prices = new Map([[1, 19900], [2, 19900]]);

    expect(sortModulesByPrice(modules, prices, 'asc').map(module => module.id)).toEqual([2, 1, 4, 3]);
  });

  it('sorts owned collection results by price when the price order is active', () => {
    const fields = buildFields();
    fields.order.control.setValue({id: 'price', name: 'Price ↑'});
    const prices = new Map([[1, 45900], [2, 9999]]);

    expect(filterOwnedModulesForFields([
      moduleFactory({id: 1}),
      moduleFactory({id: 2}),
      moduleFactory({id: 3})
    ], fields, 'OR', [], prices)?.map(module => module.id)).toEqual([2, 1, 3]);

    fields.order.control.setValue({id: 'price', name: 'Price ↓'});
    expect(filterOwnedModulesForFields([
      moduleFactory({id: 1}),
      moduleFactory({id: 2}),
      moduleFactory({id: 3})
    ], fields, 'OR', [], prices)?.map(module => module.id)).toEqual([1, 2, 3]);
  });

  it('includes price sort options in the order dropdown', () => {
    expect(MODULE_ORDER_OPTIONS.filter(option => option.id === 'price')).toEqual([
      {id: 'price', name: 'Price ↑'},
      {id: 'price', name: 'Price ↓'}
    ]);
  });
});
