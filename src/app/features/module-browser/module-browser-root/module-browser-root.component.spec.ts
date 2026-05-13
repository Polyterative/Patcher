import { CommonModule } from '@angular/common';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import {
  ComponentFixture,
  fakeAsync,
  tick,
  TestBed
} from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import {
  of,
  Subject
} from 'rxjs';
import { MinimalModule } from 'src/app/models/module';
import { SupabaseService } from '../../backend/supabase.service';
import { SeoAndUtilsService } from '../../backbone/seo-and-utils.service';
import { ModuleBrowserDataService } from '../module-browser-data.service';
import { ModuleBrowserRootComponent } from './module-browser-root.component';


describe('ModuleBrowserRootComponent', () => {
  let fixture: ComponentFixture<ModuleBrowserRootComponent>;
  let component: ModuleBrowserRootComponent;

  function buildOwnedModules(count: number): MinimalModule[] {
    return Array.from({length: count}, (_, index) => ({
      id: index + 1,
      name: `Module ${ index + 1 }`,
      description: 'Owned module',
      hp: index + 2,
      public: true,
      created: '2026-01-01T00:00:00.000Z',
      updated: '2026-01-01T00:00:00.000Z',
      manufacturerId: 1,
      manufacturer: {id: 1, name: 'Maker'} as any,
      standard: {id: 0, name: '3U Doepfer'} as any,
      tags: [],
      panels: []
    }));
  }
  
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ModuleBrowserRootComponent],
      imports: [
        CommonModule,
        ReactiveFormsModule
      ],
      providers: [
        ModuleBrowserDataService,
        {
          provide: SupabaseService,
          useValue: {
            GET: {
              manufacturers: jasmine.createSpy('manufacturers').and.returnValue(of({data: []})),
              modules: jasmine.createSpy('modules').and.returnValue(of({data: [], count: 0}))
            },
            get: {
              allTags: jasmine.createSpy('allTags').and.returnValue(of([]))
            },
            cacheResetter$: {next: jasmine.createSpy('cacheResetter$.next')}
          }
        },
        {
          provide: SeoAndUtilsService,
          useValue: {updateSeo: jasmine.createSpy('updateSeo')}
        },
        {
          provide: ActivatedRoute,
          useValue: {queryParams: of({})}
        }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();
    
    fixture = TestBed.createComponent(ModuleBrowserRootComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });
  
  it('renders recent activity component in filter sidebar', () => {
    const host = fixture.nativeElement as HTMLElement;
    const sidebar = host.querySelector('.filter-sidebar');
    const recentActivity = sidebar?.querySelector('app-recent-activity');
    expect(recentActivity).not.toBeNull();
  });

  it('shows the wide-shell nav by default on standalone module browser pages', () => {
    expect(component.showWideShellNav).toBeTrue();
  });

  it('exposes an optional subtitle for embedded browser headings', () => {
    component.titleSub = 'Rack name';

    expect(component.titleSub).toBe('Rack name');
  });

  it('defaults to full catalog when owned collection is below the adaptive threshold', () => {
    component.enableCollectionBrowseModes = true;
    component.ownedModulesInput = buildOwnedModules(5);
    fixture.detectChanges();

    expect(component.collectionBrowseMode).toBe('all');
  });

  it('defaults to collection mode and hp ordering when collection meets the adaptive threshold with an empty rack', () => {
    component.enableCollectionBrowseModes = true;
    component.ownedModulesInput = buildOwnedModules(20);
    fixture.detectChanges();

    expect(component.collectionBrowseMode).toBe('owned');
    expect(component.dataService.fields.order.control.value).toEqual({id: 'hp', name: 'HP ↑'});
  });

  it('defaults to available mode once the rack already contains modules', () => {
    component.enableCollectionBrowseModes = true;
    component.ownedModulesInput = buildOwnedModules(20);
    component.currentRackModulesInput = [[{
      module: buildOwnedModules(1)[0]
    } as any]];
    fixture.detectChanges();

    expect(component.collectionBrowseMode).toBe('available');
  });

  it('renders the rack-aware mode labels in rack editing context', () => {
    component.enableCollectionBrowseModes = true;
    component.ownedModulesInput = buildOwnedModules(2);
    component.currentRackModulesInput = [[{
      module: buildOwnedModules(1)[0]
    } as any]];
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    expect(host.textContent).toContain('Available');
    expect(host.textContent).toContain('Collection');
    expect(host.textContent).toContain('All modules');
  });

  it('renders the radio-style selected icon only for the active browse mode', () => {
    component.enableCollectionBrowseModes = true;
    component.ownedModulesInput = buildOwnedModules(20);
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    const activeButton = host.querySelector('.module-browser-mode__button--active');
    const activeIcon = activeButton?.querySelector('mat-icon');
    const inactiveIcons = host.querySelectorAll('.module-browser-mode__button:not(.module-browser-mode__button--active) mat-icon');

    expect(activeIcon?.textContent).toContain('radio_button_checked');
    expect(inactiveIcons.length).toBe(0);
  });

  it('falls back to collection mode when available mode is no longer possible', () => {
    component.enableCollectionBrowseModes = true;
    component.ownedModulesInput = buildOwnedModules(20);
    component.currentRackModulesInput = [[{
      module: buildOwnedModules(1)[0]
    } as any]];
    fixture.detectChanges();

    expect(component.collectionBrowseMode).toBe('available');

    component.currentRackModulesInput = [];
    fixture.detectChanges();

    expect(component.collectionBrowseMode).toBe('owned');
  });

  it('resets all-modules mode to the normal module-browser default order', () => {
    component.enableCollectionBrowseModes = true;
    component.ownedModulesInput = buildOwnedModules(20);
    fixture.detectChanges();

    component.setCollectionBrowseMode('all');

    expect(component.dataService.fields.order.control.value).toEqual(component.dataService.orderStartingValue);
    expect(component.dataService.serversideTableRequestData.sort$.value).toEqual(['updated', 'desc']);
  });

  it('shows tag-filter loading feedback and keeps current results visible until the next backend result arrives', fakeAsync(() => {
    const backend = TestBed.inject(SupabaseService) as any;
    const modulesResponse$ = new Subject<{data: MinimalModule[]; count: number}>();
    const currentResults = buildOwnedModules(2);

    backend.GET.modules.and.returnValue(modulesResponse$.asObservable());
    component.dataService.modulesList$.next(currentResults);
    component.visibleModules$.next(currentResults);
    fixture.detectChanges();

    component.dataService.fields.tags.control.setValue([{id: '7', name: 'Filter'}] as any);
    fixture.detectChanges();

    expect(component.dataService.remoteTagFilterLoading$.value).toBeTrue();
    expect(component.visibleModules$.value).toEqual(currentResults);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Updating results');

    tick(750);
    modulesResponse$.next({data: [currentResults[0]], count: 1});
    modulesResponse$.complete();
    fixture.detectChanges();

    expect(component.dataService.remoteTagFilterLoading$.value).toBeFalse();
  }));

  it('does not show remote tag-filter loading feedback in owned collection mode', () => {
    component.enableCollectionBrowseModes = true;
    component.ownedModulesInput = buildOwnedModules(20);
    fixture.detectChanges();

    component.dataService.fields.tags.control.setValue([{id: '7', name: 'Filter'}] as any);
    fixture.detectChanges();

    expect(component.collectionBrowseMode).toBe('owned');
    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain('Updating results');
  });

  it('uses all-modules search empty copy when catalog filters return nothing', () => {
    component.enableCollectionBrowseModes = true;
    component.ownedModulesInput = buildOwnedModules(1);
    component.setCollectionBrowseMode('all');
    component.dataService.fields.name.control.setValue('missing module');
    component.dataService.modulesList$.next([]);
    fixture.detectChanges();

    expect(component.rackContextEmptyStateCopy).toBe(
      'No modules match the current filters. Reset the filters or switch browsing mode.'
    );
  });

  it('uses available-mode search empty copy when rack collection filters return nothing', () => {
    const ownedModules = buildOwnedModules(2);
    component.enableCollectionBrowseModes = true;
    component.ownedModulesInput = ownedModules;
    component.currentRackModulesInput = [[{module: ownedModules[0]} as any]];
    component.setCollectionBrowseMode('available');
    component.dataService.fields.name.control.setValue('missing module');
    fixture.detectChanges();

    expect(component.visibleModules$.value).toEqual([]);
    expect(component.rackContextEmptyStateCopy).toBe(
      'No available collection modules match the current filters. Reset the filters or switch browsing mode.'
    );
  });

  it('uses collection-mode search empty copy when owned module filters return nothing', () => {
    component.enableCollectionBrowseModes = true;
    component.ownedModulesInput = buildOwnedModules(20);
    component.setCollectionBrowseMode('owned');
    component.dataService.fields.name.control.setValue('missing module');
    fixture.detectChanges();

    expect(component.visibleModules$.value).toEqual([]);
    expect(component.rackContextEmptyStateCopy).toBe(
      'No collection modules match the current filters. Reset the filters or switch browsing mode.'
    );
  });
});
