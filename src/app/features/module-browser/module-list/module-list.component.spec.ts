import {
  fakeAsync,
  TestBed,
  tick
} from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { MinimalModule } from 'src/app/models/module';
import { Standard } from 'src/app/models/standard';
import { Tag, TagType } from 'src/app/models/tag';
import { LocalDataFilterService } from 'src/app/components/shared-atoms/local-data-filter/local-data-filter.service';
import { COOL_REACTIONS_ENABLED } from 'src/app/components/shared-atoms/cool-button/cool-button-feature.token';
import { PatchDetailDataService } from 'src/app/components/patch-parts/patch-detail-data.service';
import { SupabaseService } from 'src/app/features/backend/supabase.service';
import { ModuleRecentMarketPrice } from 'src/app/features/backend/supabase-queries';
import { AppStateService } from 'src/app/shared-interproject/app-state.service';
import { ISelectable } from 'src/app/shared-interproject/components/@smart/mat-form-entity/form-element-models';
import { ModuleListComponent } from './module-list.component';


const THREE_U_STANDARD: Standard = {id: 0, name: '3U Doepfer'};
const INTELLIJEL_STANDARD: Standard = {id: 1, name: '1U Intellijel'};

function buildTag(id: number, name: string, type: TagType = TagType.Effect): Tag {
  return {id, name, type};
}

function buildModuleTag(id: number, name: string, type?: TagType): MinimalModule['tags'][number] {
  return {id, tag: buildTag(id, name, type), voteCount: []};
}

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
    manufacturer: overrides.manufacturer ?? {id: 1, name: 'Maker'},
    standard: overrides.standard ?? THREE_U_STANDARD,
    tags: overrides.tags ?? [],
    panels: overrides.panels ?? [],
  };
}

function currentVal<T>(obs: Observable<T>): T | undefined {
  let val: T | undefined;
  obs.subscribe(v => val = v).unsubscribe();
  return val;
}

function makeReactionBackendSpy() {
  return {
    get: {
      currentUserReactions: jasmine.createSpy('currentUserReactions').and.returnValue(of([])),
      reactionCount: jasmine.createSpy('reactionCount').and.returnValue(of(0)),
    },
    add: {
      reaction: jasmine.createSpy('addReaction').and.returnValue(of(null)),
    },
    delete: {
      reaction: jasmine.createSpy('deleteReaction').and.returnValue(of(null)),
    }
  };
}

function createPatchDetailDataServiceDouble(): jasmine.SpyObj<PatchDetailDataService> {
  return jasmine.createSpyObj<PatchDetailDataService>('PatchDetailDataService', ['ngOnDestroy']);
}

function createAppStateServiceDouble(): jasmine.SpyObj<AppStateService> {
  return jasmine.createSpyObj<AppStateService>('AppStateService', ['ngOnDestroy'], {
    preferredPanelColor$: of(null)
  });
}

function createPriceBackendDouble(summaries: ModuleRecentMarketPrice[] = []) {
  const recentModuleMarketPrices =
    jasmine.createSpy<(moduleIds: number[]) => Observable<ModuleRecentMarketPrice[]>>('recentModuleMarketPrices')
      .and.returnValue(of(summaries));
  const getNamespace = Object.assign(Object.create(null) as SupabaseService['GET'], {recentModuleMarketPrices});
  const backend = Object.assign(Object.create(null) as SupabaseService, {
    GET: getNamespace
  });
  return {backend, recentModuleMarketPrices};
}

function createComponent(
  filterService: LocalDataFilterService,
  backend?: SupabaseService
): ModuleListComponent {
  return new ModuleListComponent(
    createPatchDetailDataServiceDouble(),
    filterService,
    createAppStateServiceDouble(),
    backend
  );
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
        manufacturer: {id: 2, name: 'Make Noise'},
        tags: [buildModuleTag(8, 'Delay')]
      }),
      buildModule({
        id: 3,
        name: 'Belgrad',
        description: 'Dual peak filter',
        manufacturer: {id: 3, name: 'Xaoc Devices'},
        tags: [buildModuleTag(9, 'Filtèr')]
      }),
    ]);

    const component = createComponent(filterService);
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
    const component = createComponent(filterService);
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
    const component = createComponent(filterService);
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
    const component = createComponent(filterService);
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
    const component = createComponent(filterService);
    component.data$ = data$;
    component.defaultGroupId = 'none';
    component.ngOnInit();
    expect(component.groupControl.value?.id).toBe('none');
    component.ngOnDestroy();
  }));

  it('defaultGroupId standard preselects standard group option', fakeAsync(() => {
    const filterService = new LocalDataFilterService();
    const data$ = new BehaviorSubject<MinimalModule[] | null>([]);
    const component = createComponent(filterService);
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

  it('resolves optional module action labels and disabled icons', () => {
    const {component} = build();
    const module = buildModule({id: 10});
    component.moduleAction = {
      icon: 'playlist_add',
      label: 'Add to playlist',
      disabledIcon: 'check',
      disabledLabel: 'Already in playlist'
    };
    component.moduleActionDisabledIds = new Set([10]);

    expect(component.isModuleActionDisabled(module)).toBeTrue();
    expect(component.getModuleActionIcon(module)).toBe('check');
    expect(component.getModuleActionLabel(module)).toBe('Already in playlist');
    component.ngOnDestroy();
  });

  it('does not render or query Cool reactions in repeated module lists', async () => {
    const reactionBackend = makeReactionBackendSpy();

    await TestBed.configureTestingModule({
      declarations: [ModuleListComponent],
      imports: [CommonModule, FormsModule, NoopAnimationsModule],
      providers: [
        {provide: PatchDetailDataService, useValue: createPatchDetailDataServiceDouble()},
        {provide: LocalDataFilterService, useClass: LocalDataFilterService},
        {provide: AppStateService, useValue: createAppStateServiceDouble()},
        {provide: COOL_REACTIONS_ENABLED, useValue: true},
        {provide: SupabaseService, useValue: reactionBackend},
        {provide: MatSnackBar, useValue: jasmine.createSpyObj<MatSnackBar>('MatSnackBar', ['open'])},
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    const fixture = TestBed.createComponent(ModuleListComponent);
    fixture.componentInstance.data$ = of([buildModule({id: 42, public: true})]);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.coolButton')).toBeNull();
    expect(reactionBackend.get.currentUserReactions).not.toHaveBeenCalled();
    expect(reactionBackend.get.reactionCount).not.toHaveBeenCalled();
    expect(reactionBackend.add.reaction).not.toHaveBeenCalled();
    expect(reactionBackend.delete.reaction).not.toHaveBeenCalled();
  });

  it('fetches price summaries from source data without refetching for local filters', fakeAsync(() => {
    const filterService = new LocalDataFilterService();
    const data$ = new BehaviorSubject<MinimalModule[] | null>([
      buildModule({id: 3, name: 'Belgrad'}),
      buildModule({id: 1, name: 'Maths'}),
      buildModule({id: 3, name: 'Belgrad duplicate'}),
    ]);
    const summary = {
      moduleId: 1,
      estimatedPriceEurMinor: 39900,
      displayPrice: '~€399',
      storeCount: 4,
      latestObservedAt: '2026-07-01T00:00:00.000Z',
      tooltip: 'Recent market price: ~€399 from 4 stores, latest check Jul 1, 2026.'
    };
    const {backend, recentModuleMarketPrices} = createPriceBackendDouble([summary]);
    const component = createComponent(filterService, backend);
    component.data$ = data$;
    component.showSearch = true;
    component.showPriceSummary = true;

    component.ngOnInit();
    tick();

    expect(recentModuleMarketPrices).toHaveBeenCalledOnceWith([1, 3]);
    expect(currentVal(component.priceSummaryByModuleId$)?.get(1)).toEqual(summary);

    filterService.search.control.setValue('maths');
    tick(350);

    expect(recentModuleMarketPrices).toHaveBeenCalledTimes(1);
    component.ngOnDestroy();
  }));

  it('uses the optional price summary source instead of the visible module slice', fakeAsync(() => {
    const filterService = new LocalDataFilterService();
    const visibleData$ = new BehaviorSubject<MinimalModule[] | null>([
      buildModule({id: 1, name: 'Maths'}),
    ]);
    const priceSourceData$ = new BehaviorSubject<MinimalModule[] | null>([
      buildModule({id: 1, name: 'Maths'}),
      buildModule({id: 2, name: 'Mimeophon'}),
    ]);
    const {backend, recentModuleMarketPrices} = createPriceBackendDouble();
    const component = createComponent(filterService, backend);
    component.data$ = visibleData$;
    component.priceSummarySourceData$ = priceSourceData$;
    component.showPriceSummary = true;

    component.ngOnInit();
    tick();

    expect(recentModuleMarketPrices).toHaveBeenCalledOnceWith([1, 2]);

    visibleData$.next([buildModule({id: 1, name: 'Maths'})]);
    tick();

    expect(recentModuleMarketPrices).toHaveBeenCalledTimes(1);
    component.ngOnDestroy();
  }));

  it('fetches price summaries when the input is enabled after init', fakeAsync(() => {
    const filterService = new LocalDataFilterService();
    const data$ = new BehaviorSubject<MinimalModule[] | null>([
      buildModule({id: 1, name: 'Maths'}),
      buildModule({id: 2, name: 'Mimeophon'}),
    ]);
    const {backend, recentModuleMarketPrices} = createPriceBackendDouble();
    const component = createComponent(filterService, backend);
    component.data$ = data$;

    component.ngOnInit();
    tick();

    expect(recentModuleMarketPrices).not.toHaveBeenCalled();

    component.showPriceSummary = true;
    tick();

    expect(recentModuleMarketPrices).toHaveBeenCalledOnceWith([1, 2]);
    component.ngOnDestroy();
  }));

  describe('showFilters=true', () => {
    function buildWithFilters() {
      const filterService = new LocalDataFilterService();
      const data$ = new BehaviorSubject<MinimalModule[] | null>([
        buildModule({id: 1, name: 'Maths', hp: 20, standard: THREE_U_STANDARD}),
        buildModule({id: 2, name: '1U Thing', hp: 4, standard: INTELLIJEL_STANDARD,
          tags: [buildModuleTag(5, 'LFO', TagType.Modulation)]}),
        buildModule({id: 3, name: 'Big 3U', hp: 28, standard: THREE_U_STANDARD}),
      ]);
      const component = createComponent(filterService);
      component.data$ = data$;
      component.showFilters = true;
      component.ngOnInit();
      return {component, data$};
    }

    it('filters by standard when standardControl changes', fakeAsync(() => {
      const {component} = buildWithFilters();
      tick();
      component.standardControl.setValue({id: '1', name: '1U Intellijel'});
      tick();
      expect(currentVal(component.filteredData$)?.map(m => m.name)).toEqual(['1U Thing']);
      component.ngOnDestroy();
    }));

    it('maps rendered standard option ids to numeric module standards', fakeAsync(() => {
      const {component} = buildWithFilters();
      let options: ISelectable[] = [];
      component.standardOptions$.subscribe(value => options = value).unsubscribe();

      expect(options.map(option => option.id)).toEqual(['', '0', '1', '2']);

      component.standardControl.setValue(options.find(option => option.id === '1'));
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
      component.standardControl.setValue({id: '1', name: '1U Intellijel'});
      component.hpControl.setValue('8');
      component.tagsControl.setValue([5]);
      tick();
      component.resetFilters();
      tick();
      expect(component.standardControl.value?.id).toBe('');
      expect(component.hpControl.value).toBe('');
      expect(component.tagsControl.value).toEqual([]);
      component.ngOnDestroy();
    }));
  });
});
