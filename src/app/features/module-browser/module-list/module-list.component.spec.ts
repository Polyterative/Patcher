import {
  fakeAsync,
  tick
} from '@angular/core/testing';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { MinimalModule } from 'src/app/models/module';
import { LocalDataFilterService } from 'src/app/components/shared-atoms/local-data-filter/local-data-filter.service';
import { ModuleListComponent } from './module-list.component';


function buildModule(overrides: Partial<MinimalModule> = {}): MinimalModule {
  return {
    id: overrides.id ?? 1,
    name: overrides.name ?? 'Module',
    description: overrides.description ?? 'Description',
    hp: overrides.hp ?? 8,
    public: overrides.public ?? true,
    created: overrides.created ?? '2026-01-01T00:00:00.000Z',
    updated: overrides.updated ?? '2026-01-01T00:00:00.000Z',
    manufacturerId: overrides.manufacturerId ?? 1,
    manufacturer: overrides.manufacturer ?? ({id: 1, name: 'Maker'} as any),
    standard: overrides.standard ?? ({id: 0, name: '3U Doepfer'} as any),
    tags: overrides.tags ?? [],
    panels: overrides.panels ?? [],
  };
}

function currentVal<T>(obs: Observable<T>): T | undefined {
  let val: T | undefined;
  obs.subscribe(v => val = v).unsubscribe();
  return val;
}

describe('ModuleListComponent', () => {
  function build() {
    const filterService = new LocalDataFilterService();
    const data$ = new BehaviorSubject<MinimalModule[] | null>([
      buildModule({id: 1, name: 'Maths', description: 'Function generator'}),
      buildModule({
        id: 2,
        name: 'Mimeophon',
        description: 'Stereo color delay',
        manufacturer: {id: 2, name: 'Make Noise'} as any,
        tags: [{id: 8, tag: {id: 8, name: 'Delay'} as any, voteCount: []}]
      }),
      buildModule({
        id: 3,
        name: 'Belgrad',
        description: 'Dual peak filter',
        manufacturer: {id: 3, name: 'Xaoc Devices'} as any,
        tags: [{id: 9, tag: {id: 9, name: 'Filtèr'} as any, voteCount: []}]
      }),
    ]);

    const component = new ModuleListComponent(
      {} as any,
      filterService,
      {preferredPanelColor$: of(null)} as any
    );
    component.data$ = data$;
    component.showSearch = true;
    component.ngOnInit();

    return {component, filterService};
  }

  it('filters the visible modules when the local search field changes', fakeAsync(() => {
    const {component, filterService} = build();

    expect(currentVal(component.filteredData$)?.map((module) => module.name)).toEqual(['Maths', 'Mimeophon', 'Belgrad']);

    filterService.search.control.setValue('delay');
    tick(350);

    expect(currentVal(component.filteredData$)?.map((module) => module.name)).toEqual(['Mimeophon']);
    component.ngOnDestroy();
  }));

  it('applies external module search against manufacturer names', fakeAsync(() => {
    const {component} = build();

    component.externalSearchQuery = 'xaoc';
    tick();

    expect(currentVal(component.filteredData$)?.map((module) => module.name)).toEqual(['Belgrad']);
    component.ngOnDestroy();
  }));

  it('combines local and external search across descriptions and tags accent-insensitively', fakeAsync(() => {
    const {component, filterService} = build();

    filterService.search.control.setValue('filter');
    component.externalSearchQuery = 'filter';
    tick(350);

    expect(currentVal(component.filteredData$)?.map((module) => module.name)).toEqual(['Belgrad']);
    component.ngOnDestroy();
  }));

  it('keeps loading/null data out of filtered results until modules arrive', fakeAsync(() => {
    const filterService = new LocalDataFilterService();
    const data$ = new BehaviorSubject<MinimalModule[] | null>(null);
    const component = new ModuleListComponent(
      {} as any,
      filterService,
      {preferredPanelColor$: of(null)} as any
    );
    component.data$ = data$;
    component.ngOnInit();

    expect(currentVal(component.filteredData$)).toEqual([]);

    data$.next([buildModule({id: 5, name: 'Arrived'})]);
    tick();

    expect(currentVal(component.filteredData$)?.map((module) => module.name)).toEqual(['Arrived']);
    component.ngOnDestroy();
  }));

  it('sortControl and groupControl default to first sort/group option', () => {
    const {component} = build();
    expect(component.sortControl.value).toBeDefined();
    expect(component.groupControl.value).toBeDefined();
    component.ngOnDestroy();
  });

  it('returns empty array when data$ emits empty list', fakeAsync(() => {
    const filterService = new LocalDataFilterService();
    const data$ = new BehaviorSubject<MinimalModule[] | null>([]);
    const component = new ModuleListComponent({} as any, filterService, {preferredPanelColor$: of(null)} as any);
    component.data$ = data$;
    component.ngOnInit();
    tick(0);
    expect(currentVal(component.filteredData$)).toEqual([]);
    component.ngOnDestroy();
  }));

  it('starts enter animation delay from the newly appended batch', fakeAsync(() => {
    const filterService = new LocalDataFilterService();
    const firstPage = [
      buildModule({id: 1, name: 'Module 1'}),
      buildModule({id: 2, name: 'Module 2'}),
      buildModule({id: 3, name: 'Module 3'}),
    ];
    const data$ = new BehaviorSubject<MinimalModule[] | null>(firstPage);
    const component = new ModuleListComponent({} as any, filterService, {preferredPanelColor$: of(null)} as any);
    component.data$ = data$;
    component.ngOnInit();
    tick();

    data$.next([
      ...firstPage,
      buildModule({id: 4, name: 'Module 4'}),
      buildModule({id: 5, name: 'Module 5'}),
    ]);
    tick();

    expect(component.getEnterDelay(4)).toBe(50);
    expect(component.getEnterDelay(5)).toBe(75);
    component.ngOnDestroy();
  }));

  it('defaultGroupId none keeps groupControl at first option', fakeAsync(() => {
    const filterService = new LocalDataFilterService();
    const data$ = new BehaviorSubject<MinimalModule[] | null>([]);
    const component = new ModuleListComponent({} as any, filterService, {preferredPanelColor$: of(null)} as any);
    component.data$ = data$;
    component.defaultGroupId = 'none';
    component.ngOnInit();
    expect(component.groupControl.value?.id).toBe('none');
    component.ngOnDestroy();
  }));

  it('defaultGroupId standard preselects standard group option', fakeAsync(() => {
    const filterService = new LocalDataFilterService();
    const data$ = new BehaviorSubject<MinimalModule[] | null>([]);
    const component = new ModuleListComponent({} as any, filterService, {preferredPanelColor$: of(null)} as any);
    component.data$ = data$;
    component.defaultGroupId = 'standard';
    component.ngOnInit();
    expect(component.groupControl.value?.id).toBe('standard');
    component.ngOnDestroy();
  }));

  it('orderData is an identity function', () => {
    const {component} = build();
    const modules = [buildModule({id: 10})];
    expect(component.orderData(modules)).toBe(modules);
    component.ngOnDestroy();
  });

  describe('showFilters=true', () => {
    function buildWithFilters() {
      const filterService = new LocalDataFilterService();
      const data$ = new BehaviorSubject<MinimalModule[] | null>([
        buildModule({id: 1, name: 'Maths', hp: 20, standard: {id: 0, name: '3U Doepfer'} as any}),
        buildModule({id: 2, name: '1U Thing', hp: 4, standard: {id: 1, name: '1U Intellijel'} as any,
          tags: [{id: 5, tag: {id: 5, name: 'LFO'} as any, voteCount: []}]}),
        buildModule({id: 3, name: 'Big 3U', hp: 28, standard: {id: 0, name: '3U Doepfer'} as any}),
      ]);
      const component = new ModuleListComponent({} as any, filterService, {preferredPanelColor$: of(null)} as any);
      component.data$ = data$;
      component.showFilters = true;
      component.ngOnInit();
      return {component, data$};
    }

    it('filters by standard when standardControl changes', fakeAsync(() => {
      const {component} = buildWithFilters();
      tick();
      component.standardControl.setValue({id: 1, name: '1U Intellijel'});
      tick();
      expect(currentVal(component.filteredData$)?.map(m => m.name)).toEqual(['1U Thing']);
      component.ngOnDestroy();
    }));

    it('filters by HP with = condition', fakeAsync(() => {
      const {component} = buildWithFilters();
      tick();
      component.hpControl.setValue('20');
      tick();
      expect(currentVal(component.filteredData$)?.map(m => m.name)).toEqual(['Maths']);
      component.ngOnDestroy();
    }));

    it('filters by HP with >= condition', fakeAsync(() => {
      const {component} = buildWithFilters();
      tick();
      component.hpConditionControl.setValue({id: '>=', name: 'at least'});
      component.hpControl.setValue('20');
      tick();
      const names = currentVal(component.filteredData$)?.map(m => m.name);
      expect(names).toContain('Maths');
      expect(names).toContain('Big 3U');
      expect(names).not.toContain('1U Thing');
      component.ngOnDestroy();
    }));

    it('filters by tag selection', fakeAsync(() => {
      const {component} = buildWithFilters();
      tick();
      component.tagsControl.setValue([5]);
      tick();
      expect(currentVal(component.filteredData$)?.map(m => m.name)).toEqual(['1U Thing']);
      component.ngOnDestroy();
    }));

    it('resetFilters clears all filter controls', fakeAsync(() => {
      const {component} = buildWithFilters();
      tick();
      component.standardControl.setValue({id: 1, name: '1U Intellijel'});
      component.hpControl.setValue('8');
      component.tagsControl.setValue([5]);
      tick();
      component.resetFilters();
      tick();
      expect(component.standardControl.value?.id).toBeUndefined();
      expect(component.hpControl.value).toBe('');
      expect(component.tagsControl.value).toEqual([]);
      component.ngOnDestroy();
    }));
  });
});
