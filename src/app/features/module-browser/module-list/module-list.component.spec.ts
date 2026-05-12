import {
  fakeAsync,
  tick
} from '@angular/core/testing';
import { BehaviorSubject, of } from 'rxjs';
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

    expect(component.filteredData$.value?.map((module) => module.name)).toEqual(['Maths', 'Mimeophon', 'Belgrad']);

    filterService.search.control.setValue('delay');
    tick(350);

    expect(component.filteredData$.value?.map((module) => module.name)).toEqual(['Mimeophon']);
    component.ngOnDestroy();
  }));

  it('applies external module search against manufacturer names', fakeAsync(() => {
    const {component} = build();

    component.externalSearchQuery = 'xaoc';
    tick();

    expect(component.filteredData$.value?.map((module) => module.name)).toEqual(['Belgrad']);
    component.ngOnDestroy();
  }));

  it('combines local and external search across descriptions and tags accent-insensitively', fakeAsync(() => {
    const {component, filterService} = build();

    filterService.search.control.setValue('filter');
    component.externalSearchQuery = 'filter';
    tick(350);

    expect(component.filteredData$.value?.map((module) => module.name)).toEqual(['Belgrad']);
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

    expect(component.filteredData$.value).toEqual([]);

    data$.next([buildModule({id: 5, name: 'Arrived'})]);
    tick();

    expect(component.filteredData$.value?.map((module) => module.name)).toEqual(['Arrived']);
    component.ngOnDestroy();
  }));
});
