import {
  ComponentFixture,
  fakeAsync,
  tick,
  TestBed
} from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import {
  BehaviorSubject,
  Observable,
  of,
  Subject,
  throwError
} from 'rxjs';
import { ModuleDetailDataService } from 'src/app/components/module-parts/module-detail-data.service';
import {
  ModulePossessionDialogComponent,
  ModulePossessionDialogResult
} from 'src/app/components/module-parts/module-possession-dialog/module-possession-dialog.component';
import { PatchDetailDataService } from 'src/app/components/patch-parts/patch-detail-data.service';
import { RackDetailDataService } from 'src/app/components/rack-parts/rack-detail-data.service';
import { UserManagementService } from 'src/app/features/backbone/login/user-management.service';
import { AppStateService } from 'src/app/shared-interproject/app-state.service';
import {
  DbModule,
  MinimalModule,
  RackedModule,
  UserModulePossessionKind
} from 'src/app/models/module';
import { Tag } from 'src/app/models/tag';
import { ISelectable } from 'src/app/shared-interproject/components/@smart/mat-form-entity/form-element-models';
import {
  SimpleUserModel,
  SupabaseService
} from '../../backend/supabase.service';
import { UserModuleAcquisitionDraft } from 'src/app/models/user-module-acquisition';
import { AnalyticsService } from '../../backbone/analytics-integration/analytics.service';
import { SeoAndUtilsService } from '../../backbone/seo-and-utils.service';
import { ModuleBrowserRootComponent } from './module-browser-root.component';
import { ModuleBrowserRootModule } from './module-browser-root.module';


describe('ModuleBrowserRootComponent', () => {
  interface ManufacturersResponse {
    data: Array<{id: number; name: string}>;
  }

  interface ModulesResponse {
    data: MinimalModule[];
    count: number;
  }

  type ManufacturersSpy = jasmine.Spy<(...args: unknown[]) => Observable<ManufacturersResponse>>;
  type ModulesSpy = jasmine.Spy<(...args: unknown[]) => Observable<ModulesResponse>>;

  interface ModuleBrowserRootBackendDouble {
    GET: {
      manufacturers: ManufacturersSpy;
      modules: ModulesSpy;
      currentUserModulesPossessionOnly: jasmine.Spy<() => Observable<Pick<DbModule, 'id' | 'possessionKind'>[]>>;
    };
    get: {
      allTags: jasmine.Spy<() => Observable<Tag[]>>;
      myVotes: jasmine.Spy<() => Observable<number[]>>;
    };
    add: {
      userModuleAcquisition: jasmine.Spy<(moduleId: number, data: UserModuleAcquisitionDraft) => Observable<Record<string, never>>>;
    };
    delete: {
      userModule: jasmine.Spy<(moduleId: number) => Observable<Record<string, never>>>;
    };
    update: {
      userModulePossession: jasmine.Spy<(moduleId: number, kind: UserModulePossessionKind) => Observable<null>>;
    };
    cacheResetter$: {
      next: jasmine.Spy<(keys: string[]) => void>;
    };
  }

  let fixture: ComponentFixture<ModuleBrowserRootComponent>;
  let component: ModuleBrowserRootComponent;
  let analytics: jasmine.SpyObj<AnalyticsService>;
  let backend: ModuleBrowserRootBackendDouble;
  let loggedUser$: BehaviorSubject<SimpleUserModel | undefined>;
  let dialog: jasmine.SpyObj<MatDialog>;
  let snackBar: jasmine.SpyObj<MatSnackBar>;

  function userFixture(id = 'user-1'): SimpleUserModel {
    return {
      id,
      email: `${ id }@example.com`,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z'
    };
  }

  function buildOwnedModules(count: number): DbModule[] {
    return Array.from({length: count}, (_, index) => ({
      id: index + 1,
      name: `Module ${ index + 1 }`,
      description: 'Owned module',
      hp: index + 2,
      public: true,
      created: '2026-01-01T00:00:00.000Z',
      updated: '2026-01-01T00:00:00.000Z',
      manufacturerId: 1,
      manufacturer: {id: 1, name: 'Maker'},
      standard: {id: 0, name: '3U Doepfer'},
      tags: [],
      panels: [],
      possessionKind: 'HAS',
      ins: [],
      outs: [],
      switches: [],
      manualURL: '',
      store_url: null,
      additional: null,
      isComplete: true,
      isApproved: true,
      isDIY: false,
      powerPos12: null,
      powerNeg12: null,
      powerPos5: null,
      depth: 0,
      weight: 0
    }));
  }

  function rackModule(module: DbModule): RackedModule {
    return {
      module,
      rackingData: {
        rackid: 1,
        moduleid: module.id,
        row: 0,
        column: 0
      }
    };
  }

  function filterTag(): ISelectable {
    return {id: '7', name: 'Filter'};
  }
  
  beforeEach(async () => {
    analytics = jasmine.createSpyObj<AnalyticsService>('AnalyticsService', ['capture', 'identify', 'reset']);
    backend = {
      GET: {
        manufacturers: jasmine.createSpy<(...args: unknown[]) => Observable<ManufacturersResponse>>('manufacturers')
          .and.returnValue(of({data: []})),
        modules: jasmine.createSpy<(...args: unknown[]) => Observable<ModulesResponse>>('modules')
          .and.returnValue(of({data: [], count: 0})),
        currentUserModulesPossessionOnly: jasmine.createSpy<() => Observable<Pick<DbModule, 'id' | 'possessionKind'>[]>>('currentUserModulesPossessionOnly')
          .and.returnValue(of([]))
      },
      get: {
        allTags: jasmine.createSpy<() => Observable<Tag[]>>('allTags').and.returnValue(of([])),
        myVotes: jasmine.createSpy<() => Observable<number[]>>('myVotes').and.returnValue(of([]))
      },
      add: {
        userModuleAcquisition: jasmine.createSpy<(moduleId: number, data: UserModuleAcquisitionDraft) => Observable<Record<string, never>>>('userModuleAcquisition')
          .and.returnValue(of({}))
      },
      delete: {
        userModule: jasmine.createSpy<(moduleId: number) => Observable<Record<string, never>>>('userModule')
          .and.returnValue(of({}))
      },
      update: {
        userModulePossession: jasmine.createSpy<(moduleId: number, kind: UserModulePossessionKind) => Observable<null>>('userModulePossession')
          .and.returnValue(of(null))
      },
      cacheResetter$: {
        next: jasmine.createSpy<(keys: string[]) => void>('cacheResetter$.next')
      }
    };
    loggedUser$ = new BehaviorSubject<SimpleUserModel | undefined>(undefined);
    dialog = jasmine.createSpyObj<MatDialog>('MatDialog', ['open']);
    snackBar = jasmine.createSpyObj<MatSnackBar>('MatSnackBar', ['open']);

    await TestBed.configureTestingModule({
      imports: [
        ModuleBrowserRootModule,
        NoopAnimationsModule
      ],
      providers: [
        {
          provide: SupabaseService,
          useValue: backend
        },
        {
          provide: SeoAndUtilsService,
          useValue: {updateSeo: jasmine.createSpy('updateSeo')}
        },
        {
          provide: AnalyticsService,
          useValue: analytics
        },
        {
          provide: ActivatedRoute,
          useValue: {
            queryParams: of({}),
            snapshot: {data: {}}
          }
        },
        {
          provide: UserManagementService,
          useValue: {
            loggedUser$,
            loggedUserFullProfile$: new BehaviorSubject(undefined),
            isAdmin$: new BehaviorSubject(false),
            hasAdminRole$: new BehaviorSubject(false)
          }
        },
        {
          provide: PatchDetailDataService,
          useValue: {}
        },
        {
          provide: ModuleDetailDataService,
          useValue: {
            userModulesList$: new BehaviorSubject([]),
            singleModuleData$: new BehaviorSubject(undefined),
            setModulePossession$: new BehaviorSubject(null),
            requestAddModuleToRack$: new BehaviorSubject(null),
            copyModuleNameAndManufacturer$: new BehaviorSubject(undefined)
          }
        },
        {
          provide: RackDetailDataService,
          useValue: {
            singleRackData$: new BehaviorSubject(undefined),
            isCurrentRackEditable$: new BehaviorSubject(false),
            addModuleToRack$: new BehaviorSubject(null)
          }
        },
        {
          provide: AppStateService,
          useValue: {
            isDev: false,
            preferredPanelColor$: new BehaviorSubject(null)
          }
        },
        {
          provide: MatDialog,
          useValue: dialog
        },
        {
          provide: MatSnackBar,
          useValue: snackBar
        }
      ]
    }).compileComponents();
    
    fixture = TestBed.createComponent(ModuleBrowserRootComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  function dialogRefWithResult(result: ModulePossessionDialogResult | null | undefined) {
    return {
      afterClosed: () => of(result)
    };
  }
  
  it('renders recent activity component in filter sidebar', () => {
    const host = fixture.nativeElement as HTMLElement;
    const sidebar = host.querySelector('.filter-sidebar');
    const recentActivity = sidebar?.querySelector('app-recent-activity');
    expect(recentActivity).not.toBeNull();
  });

  it('renders the real shared form-entity browser filters', () => {
    const host = fixture.nativeElement as HTMLElement;
    const formEntities = host.querySelectorAll('.filter-sidebar lib-mat-form-entity');

    expect(formEntities.length).toBeGreaterThan(0);
    expect(host.textContent).toContain('Search module...');
    expect(host.textContent).toContain('Max Depth (mm)');
    expect(host.textContent).toContain('Order by');
  });

  it('shows depth beside the format on browser cards', () => {
    expect(component.viewConfig.showDepth).toBeTrue();

    const module = buildOwnedModules(1)[0];
    module.depth = 42;
    component.dataService.modulesList$.next([module]);
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    const depth = host.querySelector('[data-testid="module-depth"]');
    const format = host.querySelector('app-module-part-hp');

    expect(depth?.textContent?.trim()).toBe('Depth 42 mm');
    expect(depth?.classList.contains('technical-item')).toBeTrue();
    expect(depth?.nextElementSibling).toBe(format);
  });

  it('does not track search.performed while embedded default browse mode settles', fakeAsync(() => {
    analytics.capture.calls.reset();

    component.enableCollectionBrowseModes = true;
    component.ownedModulesInput = buildOwnedModules(20);
    fixture.detectChanges();
    tick(750);

    const eventNames = analytics.capture.calls.allArgs().map(args => args[0]);
    expect(eventNames).not.toContain('search.performed');
  }));

  it('shows the wide-shell nav by default on standalone module browser pages', () => {
  });

  it('exposes an optional subtitle for embedded browser headings', () => {
    component.titleSub = 'Rack name';
    component.compactTitleSub = true;

    expect(component.titleSub).toBe('Rack name');
    expect(component.compactTitleSub).toBeTrue();
  });

  it('renders the optional rack balance hint when embedded in rack editing', () => {
    fixture.componentRef.setInput('rackWeakestAxis', {
      id: 'modulation',
      label: 'Modulation',
      icon: 'waves',
      share: 4,
      matchedModules: 1,
      guidance: 'Add modulation sources.'
    });
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    const hint = host.querySelector('[data-testid="rack-weakest-axis-hint"]');
    expect(hint?.textContent?.trim()).toContain('Modulation');
  });

  it('hides the rack balance hint outside rack editing context', () => {
    component.rackWeakestAxis = null;
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('[data-testid="rack-weakest-axis-hint"]')).toBeNull();
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
    component.currentRackModulesInput = [[rackModule(buildOwnedModules(1)[0])]];
    fixture.detectChanges();

    expect(component.collectionBrowseMode).toBe('available');
  });

  it('renders the rack-aware mode labels in rack editing context', () => {
    component.enableCollectionBrowseModes = true;
    component.ownedModulesInput = buildOwnedModules(2);
    component.currentRackModulesInput = [[rackModule(buildOwnedModules(1)[0])]];
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    expect(host.textContent).toContain('Available');
    expect(host.textContent).toContain('Collection');
    expect(host.textContent).not.toContain('Wanted');
    expect(host.textContent).toContain('All modules');
  });

  it('renders the wanted mode only when the user has wanted modules', () => {
    const modules = buildOwnedModules(2);
    modules[1].possessionKind = 'WANTS';
    component.enableCollectionBrowseModes = true;
    component.ownedModulesInput = modules;
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    expect(host.textContent).toContain('Wanted');
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
    component.currentRackModulesInput = [[rackModule(buildOwnedModules(1)[0])]];
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

  it('shows only owned modules in collection and available modes, wanted modules in wanted mode, and leaves all modules unfiltered', () => {
    const owned = buildOwnedModules(4);
    owned[1].possessionKind = 'WANTS';
    owned[2].possessionKind = 'SELLS';
    component.enableCollectionBrowseModes = true;
    component.ownedModulesInput = owned;
    component.currentRackModulesInput = [[rackModule(owned[0])]];
    component.dataService.modulesList$.next(owned);
    fixture.detectChanges();

    component.setCollectionBrowseMode('owned');
    expect(component.visibleModules$.value?.map((module) => module.id)).toEqual([1, 4]);
    expect(component.ownedModulesCount).toBe(2);

    component.setCollectionBrowseMode('available');
    expect(component.visibleModules$.value?.map((module) => module.id)).toEqual([4]);

    component.setCollectionBrowseMode('wanted');
    expect(component.visibleModules$.value?.map((module) => module.id)).toEqual([2]);
    expect(component.wantedModulesCount).toBe(1);

    component.setCollectionBrowseMode('all');
    component.dataService.modulesList$.next(owned);
    expect(component.visibleModules$.value?.map((module) => module.id)).toEqual([1, 2, 3, 4]);
  });

  it('reapplies local collection results when max depth changes', () => {
    const owned = buildOwnedModules(20);
    owned[0].depth = 40;
    component.enableCollectionBrowseModes = true;
    component.ownedModulesInput = owned;
    component.setCollectionBrowseMode('owned');

    component.dataService.fields.depth.control.setValue('30');

    expect(component.visibleModules$.value?.map((module) => module.id)).toEqual(
      Array.from({length: 19}, (_, index) => index + 2)
    );
  });

  it('uses the shared update loader and keeps current results visible until the next backend result arrives', fakeAsync(() => {
    const modulesResponse$ = new Subject<{data: MinimalModule[]; count: number}>();
    const currentResults = buildOwnedModules(2);

    backend.GET.modules.and.returnValue(modulesResponse$.asObservable());
    component.dataService.modulesList$.next(currentResults);
    component.dataService.serversideAdditionalData.itemsCount$.next(3);
    component.visibleModules$.next(currentResults);
    fixture.detectChanges();

    component.dataService.fields.tags.control.setValue([filterTag()]);
    fixture.detectChanges();

    expect(component.dataService.remoteTagFilterLoading$.value).toBeTrue();
    expect(component.visibleModules$.value).toEqual(currentResults);
    expect((fixture.nativeElement as HTMLElement).querySelector('.module-browser-loading-note')).toBeNull();
    expect((fixture.nativeElement as HTMLElement).querySelector('lib-auto-update-loading-indicator')).not.toBeNull();

    tick(750);
    modulesResponse$.next({data: [currentResults[0]], count: 1});
    modulesResponse$.complete();
    fixture.detectChanges();

    expect(component.dataService.remoteTagFilterLoading$.value).toBeFalse();
  }));

  it('does not show a custom remote tag-filter loading note in owned collection mode', () => {
    component.enableCollectionBrowseModes = true;
    component.ownedModulesInput = buildOwnedModules(20);
    fixture.detectChanges();

    component.dataService.fields.tags.control.setValue([filterTag()]);
    fixture.detectChanges();

    expect(component.collectionBrowseMode).toBe('owned');
    expect((fixture.nativeElement as HTMLElement).querySelector('.module-browser-loading-note')).toBeNull();
  });

  it('does not dim already-loaded owned collection results while the full library refreshes', () => {
    component.enableCollectionBrowseModes = true;
    component.ownedModulesInput = buildOwnedModules(20);
    fixture.detectChanges();

    component.dataService.fields.tags.control.setValue([filterTag()]);
    fixture.detectChanges();

    const resultsShell = (fixture.nativeElement as HTMLElement).querySelector('.module-results-shell');
    expect(component.collectionBrowseMode).toBe('owned');
    expect(component.visibleModules$.value).not.toBeNull();
    expect(resultsShell?.classList.contains('module-results-shell--updating')).toBeFalse();
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

  it('does not scroll to top when the module list resets', () => {
    const scrollSpy = spyOn(window, 'scrollTo');

    component.dataService.paginatorToFistPage$.next();

    expect(scrollSpy).not.toHaveBeenCalled();
  });

  it('does not re-emit the all-modules list when only current rack modules change', () => {
    const modules = buildOwnedModules(3);
    component.enableCollectionBrowseModes = true;
    component.ownedModulesInput = buildOwnedModules(1);
    component.setCollectionBrowseMode('all');
    component.dataService.modulesList$.next(modules);
    expect(component.visibleModules$.value).toBe(modules);

    const nextSpy = spyOn(component.visibleModules$, 'next').and.callThrough();

    component.currentRackModulesInput = [[rackModule(modules[0])]];

    expect(nextSpy).not.toHaveBeenCalled();
  });

  it('persists browser quick-add for the explicit card module without detail-route module state', () => {
    const module = {...buildOwnedModules(1)[0], possessionKind: undefined};
    backend.GET.currentUserModulesPossessionOnly.and.returnValues(
      of([]),
      of([{id: module.id, possessionKind: 'WANTS'}])
    );
    loggedUser$.next(userFixture());
    dialog.open.and.returnValue(dialogRefWithResult({kind: 'WANTS'}) as ReturnType<MatDialog['open']>);
    component.dataService.modulesList$.next([module]);
    fixture.detectChanges();
    const actionBeforeSave = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('.module-list-card-action');

    expect(actionBeforeSave?.disabled).toBeFalse();

    component.onModuleAction(module);
    fixture.detectChanges();

    expect(dialog.open).toHaveBeenCalledWith(ModulePossessionDialogComponent, jasmine.objectContaining({
      data: jasmine.objectContaining({module, initialKind: null})
    }));
    expect(backend.update.userModulePossession).toHaveBeenCalledWith(module.id, 'WANTS');
    expect(backend.GET.currentUserModulesPossessionOnly).toHaveBeenCalled();
    expect(component.dataService.modulesList$.value?.[0].possessionKind).toBe('WANTS');
    expect((fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('.module-list-card-action')?.disabled).toBeTrue();
  });

  it('keeps quick-added ownership state when the follow-up ownership refresh fails', () => {
    const module = {...buildOwnedModules(1)[0], possessionKind: undefined};
    const consoleErrorSpy = spyOn(console, 'error');
    backend.GET.currentUserModulesPossessionOnly.and.returnValues(
      of([]),
      throwError(() => new Error('refresh failed'))
    );
    loggedUser$.next(userFixture());
    dialog.open.and.returnValue(dialogRefWithResult({kind: 'HAS'}) as ReturnType<MatDialog['open']>);
    component.dataService.modulesList$.next([module]);
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('.module-list-card-action')?.disabled).toBeFalse();

    component.onModuleAction(module);
    fixture.detectChanges();

    expect(backend.update.userModulePossession).toHaveBeenCalledWith(module.id, 'HAS');
    expect(backend.GET.currentUserModulesPossessionOnly).toHaveBeenCalledTimes(2);
    expect(component.dataService.userModulesList$.value).toEqual([{id: module.id, possessionKind: 'HAS'}]);
    expect(component.dataService.modulesList$.value?.[0].possessionKind).toBe('HAS');
    expect((fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('.module-list-card-action')?.disabled).toBeTrue();
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Failed to load module collection status:',
      jasmine.any(Error)
    );
    expect(snackBar.open).toHaveBeenCalledWith(
      'Failed to load your collection status.',
      undefined,
      {duration: 5000, panelClass: 'snack-error'}
    );
    expect(snackBar.open).toHaveBeenCalledWith(
      `"${module.name}" marked as owned.`,
      undefined,
      {duration: 4000, panelClass: 'snack-success'}
    );
  });

  it('surfaces backend errors from browser quick-add and keeps the action retryable', () => {
    const module = {...buildOwnedModules(1)[0], possessionKind: undefined};
    const consoleErrorSpy = spyOn(console, 'error');
    loggedUser$.next(userFixture());
    backend.update.userModulePossession.and.returnValue(throwError(() => new Error('write failed')));
    dialog.open.and.returnValue(dialogRefWithResult({kind: 'HAS'}) as ReturnType<MatDialog['open']>);

    component.onModuleAction(module);
    component.onModuleAction(module);

    expect(backend.update.userModulePossession).toHaveBeenCalledTimes(2);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Failed to update module collection status:',
      jasmine.any(Error)
    );
    expect(snackBar.open).toHaveBeenCalledWith(
      jasmine.stringContaining('Failed to update collection status'),
      undefined,
      {duration: 5000, panelClass: 'snack-error'}
    );
  });

  it('hides and guards the browser quick-add action while logged out', () => {
    const module = buildOwnedModules(1)[0];
    component.dataService.modulesList$.next([module]);
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).querySelector('.module-list-card-action')).toBeNull();

    component.onModuleAction(module);

    expect(dialog.open).not.toHaveBeenCalled();
    expect(backend.update.userModulePossession).not.toHaveBeenCalled();
    expect(backend.delete.userModule).not.toHaveBeenCalled();
  });

  it('uses available-mode search empty copy when rack collection filters return nothing', () => {
    const ownedModules = buildOwnedModules(2);
    component.enableCollectionBrowseModes = true;
    component.ownedModulesInput = ownedModules;
    component.currentRackModulesInput = [[rackModule(ownedModules[0])]];
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
