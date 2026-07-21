import {
  fakeAsync,
  tick
} from '@angular/core/testing';
import {
  BehaviorSubject,
  Observable,
  of,
  ReplaySubject,
  throwError
} from 'rxjs';
import { RackModuleAdderDialogComponent } from '../rack-parts/rack-module-adder/rack-module-adder-dialog.component';
import { ModuleDetailDataService } from './module-detail-data.service';
import { MergeModuleResult } from '../../features/backend/supabase-merge';
import {
  ReactionEntityTypes,
  type ReactionEntityType
} from '../../features/backend/supabase-reactions';
import { ModuleSparsePriceHistorySummary } from '../../features/backend/supabase-queries';
import { DETAIL_ANALYTICS_SURFACES } from '../detail-analytics-surface';
import {
  DbModule,
  ModulePanel,
  UserModulePossessionKind
} from '../../models/module';
import {
  RackMinimal
} from '../../models/rack';
import {
  PatchMinimal
} from '../../models/patch';
import { ModuleCollectionSummary } from '../../models/module-collection';
import {
  ModulePossessionCounts,
  ModuleUsageSummary
} from './module-detail-data.models';
import {
  UserModuleAcquisition,
  UserModuleAcquisitionDraft
} from '../../models/user-module-acquisition';
import { SimpleUserModel } from '../../features/backend/supabase.service';
import { CV } from '../../models/cv';
import { Tag, TagType } from '../../models/tag';
import { MinimalManufacturer } from '../../models/manufacturer';


describe('ModuleDetailDataService', () => {
  type ServiceConstructorArgs = ConstructorParameters<typeof ModuleDetailDataService>;
  type EmptyBackendResponse = Record<string, never>;
  type ModuleBackendResult = {data: DbModule};
  type RacksWithModuleResult = {data: Array<{rack: RackMinimal}>};
  type ModuleTagFixture = DbModule['tags'][number];
  type BuildOptions = {modulesBySameManufacturer?: DbModule[]};
  type BackendDouble = {
    auth: {
      hasAdminRole$: jasmine.Spy<() => Observable<boolean>>;
    };
    GET: {
      currentUserModules: jasmine.Spy<(includePrivate?: boolean) => Observable<DbModule[]>>;
      moduleWithId: jasmine.Spy<(id: number) => Observable<ModuleBackendResult>>;
      modulePriceListings: jasmine.Spy<ServiceConstructorArgs[3]['GET']['modulePriceListings']>;
      modulePriceHistorySnapshots: jasmine.Spy<ServiceConstructorArgs[3]['GET']['modulePriceHistorySnapshots']>;
      moduleCollectionsForModule: jasmine.Spy<(moduleId: number) => Observable<ModuleCollectionSummary[]>>;
    };
    get: {
      racksWithModule: jasmine.Spy<(moduleId: number) => Observable<RacksWithModuleResult>>;
      patchesWithModule: jasmine.Spy<(moduleId: number) => Observable<PatchMinimal[]>>;
      moduleUsageSummary: jasmine.Spy<(moduleId: number) => Observable<ModuleUsageSummary>>;
      modulePossessionCounts: jasmine.Spy<(moduleId: number) => Observable<ModulePossessionCounts>>;
      reactionCount: jasmine.Spy<(entityType: ReactionEntityType, entityId: number) => Observable<number>>;
      userModuleAcquisitionsForModule: jasmine.Spy<(moduleId: number) => Observable<UserModuleAcquisition[]>>;
      modulesBySameManufacturer: jasmine.Spy<(manufacturerId: number, from?: number, to?: number, columns?: string) => Observable<DbModule[]>>;
    };
    add: {
      userModule: jasmine.Spy<(moduleId: number) => Observable<EmptyBackendResponse>>;
      userModuleAcquisition: jasmine.Spy<(moduleId: number, data: UserModuleAcquisitionDraft) => Observable<EmptyBackendResponse>>;
    };
    delete: {
      userModule: jasmine.Spy<(moduleId: number) => Observable<EmptyBackendResponse>>;
      modulePanel: jasmine.Spy<(panel: ModulePanel) => Observable<EmptyBackendResponse>>;
      module: jasmine.Spy<(moduleId: number) => Observable<EmptyBackendResponse>>;
      manufacturer: jasmine.Spy<(manufacturerId: number) => Observable<EmptyBackendResponse>>;
    };
    update: {
      module: jasmine.Spy<(module: Partial<DbModule>) => Observable<Partial<DbModule>>>;
      moduleStoreUrl: jasmine.Spy<(moduleId: number, storeUrl: string | null) => Observable<null>>;
      userModulePossession: jasmine.Spy<(moduleId: number, kind: UserModulePossessionKind) => Observable<null>>;
    };
    merge: {
      moduleInto: jasmine.Spy<(sourceId: number, targetId: number) => Observable<MergeModuleResult>>;
    };
  };
  type SnackBarDouble = {
    open: jasmine.Spy<ServiceConstructorArgs[1]['open']>;
  };
  type AppStateDouble = {
    isDev: boolean;
  };
  type RouterDouble = {
    navigate: jasmine.Spy<ServiceConstructorArgs[5]['navigate']>;
  };
  type AnalyticsDouble = {
    capture: jasmine.Spy<ServiceConstructorArgs[6]['capture']>;
    identify: jasmine.Spy<ServiceConstructorArgs[6]['identify']>;
    reset: jasmine.Spy<ServiceConstructorArgs[6]['reset']>;
  };

  function userFixture(id: string): SimpleUserModel {
    return {
      id,
      email: `${ id }@example.com`,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z'
    };
  }

  function manufacturerFixture(id = 7, name = 'Maker'): MinimalManufacturer {
    return {id, name};
  }

  function cvFixture(id: number, name: string): CV {
    return {id, name};
  }

  function tagFixture(id: number, name: string, type = TagType.Utility): Tag {
    return {id, name, type};
  }

  function moduleTagFixture(tag: Tag): ModuleTagFixture {
    return {
      id: tag.id,
      tag,
      voteCount: []
    };
  }

  function modulePanelFixture(overrides: Partial<ModulePanel> = {}): ModulePanel {
    return {
      id: overrides.id ?? 1,
      moduleid: overrides.moduleid ?? 10,
      filename: overrides.filename ?? 'panel.jpg',
      description: overrides.description ?? 'Panel',
      color: overrides.color ?? 1
    };
  }

  function moduleFixture(overrides: Partial<DbModule> = {}): DbModule {
    const manufacturer = overrides.manufacturer ?? manufacturerFixture(overrides.manufacturerId ?? 7);

    return {
      id: overrides.id ?? 10,
      name: overrides.name ?? 'Main Module',
      description: overrides.description ?? 'Description',
      hp: overrides.hp ?? 8,
      public: overrides.public ?? true,
      created: overrides.created ?? '2026-01-01T00:00:00.000Z',
      updated: overrides.updated ?? '2026-01-01T00:00:00.000Z',
      manufacturerId: overrides.manufacturerId ?? manufacturer.id,
      manufacturer,
      standard: overrides.standard ?? {id: 0, name: 'Eurorack'},
      tags: overrides.tags ?? [moduleTagFixture(tagFixture(1, 'utility'))],
      panels: overrides.panels ?? [],
      ins: overrides.ins ?? [cvFixture(1, 'Pitch')],
      outs: overrides.outs ?? [cvFixture(2, 'Audio')],
      switches: overrides.switches ?? [],
      manualURL: overrides.manualURL ?? '',
      store_url: overrides.store_url ?? null,
      additional: overrides.additional ?? null,
      isComplete: overrides.isComplete ?? true,
      isApproved: overrides.isApproved ?? true,
      isDIY: overrides.isDIY ?? false,
      powerPos12: overrides.powerPos12 ?? null,
      powerNeg12: overrides.powerNeg12 ?? null,
      powerPos5: overrides.powerPos5 ?? null,
      depth: overrides.depth ?? 0,
      weight: overrides.weight ?? 0,
      possessionKind: overrides.possessionKind
    };
  }

  function rackFixture(overrides: Partial<RackMinimal> = {}): RackMinimal {
    return {
      id: overrides.id ?? 1,
      name: overrides.name ?? 'Rack',
      hp: overrides.hp ?? 84,
      rows: overrides.rows ?? 1,
      public: overrides.public ?? true,
      locked: overrides.locked ?? false,
      author: overrides.author ?? {id: 'rack-author', username: 'Rack Author'},
      created: overrides.created ?? '2026-01-01T00:00:00.000Z',
      updated: overrides.updated ?? '2026-01-01T00:00:00.000Z',
      description: overrides.description,
      image: overrides.image,
      public_id: overrides.public_id
    };
  }

  function patchFixture(overrides: Partial<PatchMinimal> = {}): PatchMinimal {
    return {
      id: overrides.id ?? 21,
      name: overrides.name ?? 'Patch',
      public: overrides.public ?? true,
      author: overrides.author ?? {id: 'patch-author', username: 'Patch Author'},
      created: overrides.created ?? '2026-01-01T00:00:00.000Z',
      updated: overrides.updated ?? '2026-01-01T00:00:00.000Z',
      description: overrides.description,
      image: overrides.image,
      linked_rack_id: overrides.linked_rack_id,
      tags: overrides.tags,
      public_id: overrides.public_id
    };
  }

  function collectionFixture(overrides: Partial<ModuleCollectionSummary> = {}): ModuleCollectionSummary {
    return {
      id: overrides.id ?? 81,
      authorid: overrides.authorid ?? 'curator-1',
      author: overrides.author ?? {id: 'curator-1', username: 'Curator'},
      name: overrides.name ?? 'Ambient starters',
      public: overrides.public ?? true,
      public_id: overrides.public_id ?? 'ambient',
      module_count: overrides.module_count ?? 3,
      created: overrides.created ?? '2026-01-01T00:00:00.000Z',
      updated: overrides.updated ?? '2026-01-01T00:00:00.000Z',
      description: overrides.description,
      image: overrides.image
    };
  }

  function dialogRefWithClose(result: unknown): ReturnType<typeof RackModuleAdderDialogComponent.open> {
    return {
      afterClosed: () => of(result)
    } as unknown as ReturnType<typeof RackModuleAdderDialogComponent.open>;
  }

  function build(options: BuildOptions = {}) {
    const loggedUser$ = new BehaviorSubject<SimpleUserModel | undefined>(userFixture('user-1'));
    const adminRole$ = new ReplaySubject<boolean>(1);
    adminRole$.next(false);
    const baseModule = moduleFixture({
      panels: [
        modulePanelFixture({id: 1, filename: 'light.jpg', description: 'Light', color: 1}),
        modulePanelFixture({id: 3, filename: 'dark.jpg', description: 'Dark', color: 2}),
        modulePanelFixture({id: 2, filename: 'silver.jpg', description: 'Silver', color: 1})
      ]
    });
    const ownedModule = moduleFixture({id: 50, name: 'Owned Module', possessionKind: 'HAS'});
    const rackUsage = rackFixture({id: 1});
    const patchUsage = patchFixture({id: 21});
    
    const backend = {
      auth: {
        hasAdminRole$: jasmine.createSpy<() => Observable<boolean>>('hasAdminRole$').and.returnValue(adminRole$.asObservable())
      },
      GET: {
        currentUserModules: jasmine.createSpy<(includePrivate?: boolean) => Observable<DbModule[]>>('currentUserModules').and.returnValue(of([ownedModule])),
        moduleWithId: jasmine.createSpy<(id: number) => Observable<ModuleBackendResult>>('moduleWithId').and.callFake((id: number) => of({
          data: {...baseModule, id}
        })),
        modulePriceListings: jasmine.createSpy<ServiceConstructorArgs[3]['GET']['modulePriceListings']>('modulePriceListings').and.returnValue(of([])),
        modulePriceHistorySnapshots: jasmine.createSpy<ServiceConstructorArgs[3]['GET']['modulePriceHistorySnapshots']>('modulePriceHistorySnapshots').and.returnValue(of([])),
        moduleCollectionsForModule: jasmine.createSpy<(moduleId: number) => Observable<ModuleCollectionSummary[]>>('moduleCollectionsForModule').and.returnValue(of([
          collectionFixture()
        ]))
      },
      get: {
        racksWithModule: jasmine.createSpy<(moduleId: number) => Observable<RacksWithModuleResult>>('racksWithModule').and.returnValue(of({data: [{rack: rackUsage}]})),
        patchesWithModule: jasmine.createSpy<(moduleId: number) => Observable<PatchMinimal[]>>('patchesWithModule').and.returnValue(of([patchUsage])),
        moduleUsageSummary: jasmine.createSpy<(moduleId: number) => Observable<ModuleUsageSummary>>('moduleUsageSummary').and.returnValue(of({
          public_rack_count: 1,
          hidden_rack_bucket: 'some',
          public_patch_count: 1,
          hidden_patch_bucket: '5_plus'
        })),
        modulePossessionCounts: jasmine.createSpy<(moduleId: number) => Observable<ModulePossessionCounts>>('modulePossessionCounts').and.returnValue(of({
          hasCount: 5,
          wantsCount: 2,
          sellsCount: 1
        })),
        reactionCount: jasmine.createSpy<(entityType: ReactionEntityType, entityId: number) => Observable<number>>('reactionCount').and.returnValue(of(7)),
        userModuleAcquisitionsForModule: jasmine.createSpy<(moduleId: number) => Observable<UserModuleAcquisition[]>>('userModuleAcquisitionsForModule').and.returnValue(of([])),
        modulesBySameManufacturer: jasmine.createSpy<(manufacturerId: number, from?: number, to?: number, columns?: string) => Observable<DbModule[]>>('modulesBySameManufacturer').and.returnValue(of(options.modulesBySameManufacturer ?? [
          moduleFixture({id: 10}),
          moduleFixture({id: 11, name: 'Second Module'})
        ]))
      },
      add: {
        userModule: jasmine.createSpy<(moduleId: number) => Observable<EmptyBackendResponse>>('userModule').and.returnValue(of({})),
        userModuleAcquisition: jasmine.createSpy<(moduleId: number, data: UserModuleAcquisitionDraft) => Observable<EmptyBackendResponse>>('userModuleAcquisition').and.returnValue(of({}))
      },
      delete: {
        userModule: jasmine.createSpy<(moduleId: number) => Observable<EmptyBackendResponse>>('userModule').and.returnValue(of({})),
        modulePanel: jasmine.createSpy<(panel: ModulePanel) => Observable<EmptyBackendResponse>>('modulePanel').and.returnValue(of({})),
        module: jasmine.createSpy<(moduleId: number) => Observable<EmptyBackendResponse>>('module').and.returnValue(of({})),
        manufacturer: jasmine.createSpy<(manufacturerId: number) => Observable<EmptyBackendResponse>>('manufacturer').and.returnValue(of({}))
      },
      update: {
        module: jasmine.createSpy<(module: Partial<DbModule>) => Observable<Partial<DbModule>>>('module').and.callFake((module: Partial<DbModule>) => of(module)),
        moduleStoreUrl: jasmine.createSpy<(moduleId: number, storeUrl: string | null) => Observable<null>>('moduleStoreUrl').and.returnValue(of(null)),
        userModulePossession: jasmine.createSpy<(moduleId: number, kind: UserModulePossessionKind) => Observable<null>>('userModulePossession').and.returnValue(of(null))
      },
      merge: {
        moduleInto: jasmine.createSpy<(sourceId: number, targetId: number) => Observable<MergeModuleResult>>('moduleInto').and.returnValue(of({
          sourceId: 10,
          targetId: 20,
          duplicateOwnershipRowsRemoved: 1,
          duplicateTagRowsRemoved: 2,
          ownershipRowsMoved: 3,
          tagRowsMoved: 4,
          rackModuleRowsMoved: 5
        }))
      }
    } satisfies BackendDouble;
    
    const snackBar = {
      open: jasmine.createSpy<ServiceConstructorArgs[1]['open']>('open')
    } satisfies SnackBarDouble;
    const dialog = {};
    const appState: AppStateDouble = {isDev: true};
    const router = {
      navigate: jasmine.createSpy<ServiceConstructorArgs[5]['navigate']>('navigate')
    } satisfies RouterDouble;
    const userService = {loggedUser$};
    
    const analytics = {
      capture: jasmine.createSpy<ServiceConstructorArgs[6]['capture']>('capture'),
      identify: jasmine.createSpy<ServiceConstructorArgs[6]['identify']>('identify'),
      reset: jasmine.createSpy<ServiceConstructorArgs[6]['reset']>('reset')
    } satisfies AnalyticsDouble;
    const service = new ModuleDetailDataService(
      dialog as unknown as ServiceConstructorArgs[0],
      snackBar as unknown as ServiceConstructorArgs[1],
      userService as unknown as ServiceConstructorArgs[2],
      backend as unknown as ServiceConstructorArgs[3],
      appState as unknown as ServiceConstructorArgs[4],
      router as unknown as ServiceConstructorArgs[5],
      analytics as unknown as ServiceConstructorArgs[6]
    );
    
    return {
      service,
      backend,
      snackBar,
      appState,
      router,
      loggedUser$,
      baseModule,
      ownedModule,
      rackUsage,
      patchUsage,
      adminRole$,
      analytics
    };
  }
  
  it('loads module details and related data streams on update', fakeAsync(() => {
    const {service, backend, rackUsage, patchUsage} = build();
    
    service.updateSingleModuleData$.next(10);
    tick(260);
    
    expect(backend.GET.moduleWithId).toHaveBeenCalledWith(10);
    expect(backend.get.racksWithModule).toHaveBeenCalledWith(10);
    expect(backend.get.patchesWithModule).toHaveBeenCalledWith(10);
    expect(backend.GET.moduleCollectionsForModule).toHaveBeenCalledWith(10);
    expect(backend.GET.modulePriceHistorySnapshots).toHaveBeenCalledWith(10);
    expect(backend.get.moduleUsageSummary).toHaveBeenCalledWith(10);
    expect(backend.get.reactionCount).toHaveBeenCalledWith(ReactionEntityTypes.MODULE, 10);
    expect(backend.get.userModuleAcquisitionsForModule).toHaveBeenCalledWith(10);
    expect(service.singleModuleData$.value?.id).toBe(10);
    expect(service.racksWithThisModule$.value).toEqual([rackUsage]);
    expect(service.patchesWithThisModule$.value).toEqual([patchUsage]);
    expect(service.collectionsWithThisModule$.value?.[0].name).toBe('Ambient starters');
    expect(service.moduleUsageSummary$.value).toEqual({
      public_rack_count: 1,
      hidden_rack_bucket: 'some',
      public_patch_count: 1,
      hidden_patch_bucket: '5_plus'
    });
  }));

  it('captures module.viewed once for a direct detail load', fakeAsync(() => {
    const {service, analytics} = build();

    service.updateSingleModuleData$.next(10);
    tick(260);

    const viewedCalls = analytics.capture.calls.allArgs()
      .filter(([eventName]) => eventName === 'module.viewed');
    expect(viewedCalls).toEqual([
      ['module.viewed', jasmine.objectContaining({module_id: 10})]
    ]);
  }));

  it('does not capture module.viewed for a home preview load', fakeAsync(() => {
    const {service, analytics} = build();

    service.setDetailAnalyticsSurface(DETAIL_ANALYTICS_SURFACES.homePreview);
    service.updateSingleModuleData$.next(10);
    tick(260);

    expect(service.singleModuleData$.value?.id).toBe(10);
    expect(analytics.capture.calls.allArgs().some(([eventName]) => eventName === 'module.viewed')).toBeFalse();
  }));

  it('builds module panel public URLs via the shared storage helper', () => {
    const {service} = build();

    expect(service.getPanelImageUrl('panel.jpg'))
      .toBe('https://images.patcher.xyz/module-panels/panel.jpg');
    expect(service.getPanelImageUrl('panel.webp'))
      .toBe('https://images.patcher.xyz/module-panels/panel.webp');
  });

  it('derives sparse price history summary from loaded module snapshots', fakeAsync(() => {
    const {service, backend} = build();
    const olderObservedAt = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const latestObservedAt = new Date().toISOString();
    backend.GET.modulePriceHistorySnapshots.and.returnValue(of([
      {
        id: 1,
        listingId: 1,
        storeId: 1,
        observedAt: olderObservedAt,
        priceAmountMinor: 40000,
        currency: 'EUR',
        availability: 'in_stock',
        source: 'crawler'
      },
      {
        id: 2,
        listingId: 1,
        storeId: 1,
        observedAt: latestObservedAt,
        priceAmountMinor: 38000,
        currency: 'EUR',
        availability: 'in_stock',
        source: 'crawler'
      }
    ]));
    let latestSummary: ModuleSparsePriceHistorySummary | null | undefined;
    service.sparsePriceHistorySummary$.subscribe(summary => latestSummary = summary);

    service.updateSingleModuleData$.next(10);
    tick(260);

    expect(service.modulePriceHistorySnapshots$.value?.length).toBe(2);
    expect(latestSummary).toEqual(jasmine.objectContaining({
      moduleId: 10,
      trendDirection: 'down'
    }));
  }));

  it('falls back to empty usage lists when side-panel usage queries fail', fakeAsync(() => {
    const {service, backend} = build();
    spyOn(console, 'error');
    backend.get.racksWithModule.and.returnValue(throwError(() => new Error('rack usage failed')));
    backend.get.patchesWithModule.and.returnValue(throwError(() => new Error('patch usage failed')));

    service.updateSingleModuleData$.next(10);
    tick(260);

    expect(service.racksWithThisModule$.value).toEqual([]);
    expect(service.patchesWithThisModule$.value).toEqual([]);

    backend.get.racksWithModule.and.returnValue(of({data: [{rack: rackFixture({id: 2})}]}));
    backend.get.patchesWithModule.and.returnValue(of([patchFixture({id: 22})]));

    service.updateSingleModuleData$.next(10);
    tick(260);

    expect(service.racksWithThisModule$.value?.[0]?.id).toBe(2);
    expect(service.patchesWithThisModule$.value?.[0]?.id).toBe(22);
  }));
  
  it('adds and removes module from collection then refreshes current module', () => {
    const {service, backend} = build();
    const nextSpy = spyOn(service.updateSingleModuleData$, 'next').and.callThrough();

    service.updateSingleModuleData$.next(10);
    service.addModuleToCollection$.next(10);
    service.removeModuleFromCollection$.next(10);

    expect(backend.add.userModule).toHaveBeenCalledWith(10);
    expect(backend.delete.userModule).toHaveBeenCalledWith(10);
    expect(nextSpy).toHaveBeenCalledWith(10);
  });

  it('sets and clears module possession then refreshes current module', () => {
    const {service, backend} = build();
    const nextSpy = spyOn(service.updateSingleModuleData$, 'next').and.callThrough();

    service.updateSingleModuleData$.next(10);
    service.setModulePossession$.next('WANTS');
    service.setModulePossession$.next(null);

    expect(backend.update.userModulePossession).toHaveBeenCalledWith(10, 'WANTS');
    expect(backend.delete.userModule).toHaveBeenCalledWith(10);
    expect(nextSpy).toHaveBeenCalledWith(10);
  });

  it('does not add acquisition when HAS payload has no meaningful acquisition data', () => {
    const {service, backend} = build();

    service.updateSingleModuleData$.next(10);
    service.setModulePossession$.next({kind: 'HAS'});

    expect(backend.update.userModulePossession).toHaveBeenCalledWith(10, 'HAS');
    expect(backend.add.userModuleAcquisition).not.toHaveBeenCalled();
  });

  it('adds acquisition after marking module as owned when payload includes price', () => {
    const {service, backend} = build();

    service.updateSingleModuleData$.next(10);
    service.setModulePossession$.next({
      kind: 'HAS',
      acquisition: {
        acquired_at: '2026-06-18',
        price_amount_minor: 19900,
        currency: 'EUR',
        source: 'used',
        note: null
      }
    });

    expect(backend.update.userModulePossession).toHaveBeenCalledWith(10, 'HAS');
    expect(backend.add.userModuleAcquisition).toHaveBeenCalledWith(10, jasmine.objectContaining({
      price_amount_minor: 19900,
      currency: 'EUR'
    }));
  });

  it('derives currentModulePossession$ from current user modules and viewed module', () => {
    const {service} = build();
    let latest: string | null | undefined;

    service.currentModulePossession$.subscribe(value => latest = value);
    service.singleModuleData$.next(moduleFixture({id: 50}));

    expect(latest).toBe('HAS');

    service.userModulesList$.next([moduleFixture({id: 50, possessionKind: 'SELLS'})]);
    expect(latest).toBe('SELLS');

    service.userModulesList$.next([moduleFixture({id: 1, possessionKind: 'HAS'})]);
    expect(latest).toBeNull();
  });
  
  it('opens module-to-rack dialog and refreshes module data', () => {
    const {service, baseModule} = build();
    const nextSpy = spyOn(service.updateSingleModuleData$, 'next').and.callThrough();
    spyOn(RackModuleAdderDialogComponent, 'open').and.returnValue(dialogRefWithClose(true));
    
    service.updateSingleModuleData$.next(10);
    service.requestAddModuleToRack$.next(baseModule);
    
    expect(RackModuleAdderDialogComponent.open).toHaveBeenCalled();
    expect(nextSpy).toHaveBeenCalledWith(10);
  });
  
  it('gates deletion and update actions by dev mode', () => {
    const {service, backend, appState, router, baseModule} = build();

    appState.isDev = false;
    service.deleteModule$.next(10);
    service.changeModule$.next({name: 'No change'});
    expect(backend.delete.module).not.toHaveBeenCalled();
    expect(backend.update.module).not.toHaveBeenCalled();

    appState.isDev = true;
    service.singleModuleData$.next(baseModule);
    service.deleteModule$.next(10);
    service.changeModule$.next({name: 'Renamed'});

    expect(backend.delete.module).toHaveBeenCalledWith(10);
    expect(router.navigate).toHaveBeenCalledWith(['/modules', 'browser']);
    expect(backend.update.module).toHaveBeenCalledWith(jasmine.objectContaining({
      id: 10,
      name: 'Renamed'
    }));
  });

  it('admin role allows delete and update when not in dev mode', () => {
    const {service, backend, appState, router, baseModule} = build();

    appState.isDev = false;
    backend.auth.hasAdminRole$.and.returnValue(of(true));

    service.singleModuleData$.next(baseModule);
    service.deleteModule$.next(10);
    service.changeModule$.next({name: 'Admin rename'});

    expect(backend.delete.module).toHaveBeenCalledWith(10);
    expect(router.navigate).toHaveBeenCalledWith(['/modules', 'browser']);
    expect(backend.update.module).toHaveBeenCalledWith(jasmine.objectContaining({
      id: 10,
      name: 'Admin rename'
    }));
  });

  it('deletes module and orphan manufacturer together for admin/dev flow', () => {
    const {service, backend, baseModule, router} = build({
      modulesBySameManufacturer: [
        moduleFixture({id: 10})
      ]
    });

    service.deleteModuleAndOrphanManufacturer$.next(baseModule);

    expect(backend.get.modulesBySameManufacturer).toHaveBeenCalledWith(7, 0, 20, 'id,manufacturerId');
    expect(backend.delete.module).toHaveBeenCalledWith(10);
    expect(backend.delete.manufacturer).toHaveBeenCalledWith(7);
    expect(router.navigate).toHaveBeenCalledWith(['/modules', 'browser']);
  });

  it('keeps manufacturer when other modules still use it', () => {
    const {service, backend, baseModule, router} = build({
      modulesBySameManufacturer: [
        moduleFixture({id: 10}),
        moduleFixture({id: 11, name: 'Second Module'})
      ]
    });

    service.deleteModuleAndOrphanManufacturer$.next(baseModule);

    expect(backend.delete.module).toHaveBeenCalledWith(10);
    expect(backend.delete.manufacturer).not.toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/modules', 'browser']);
  });

  it('non-admin non-dev user cannot delete or update', () => {
    const {service, backend, appState} = build();

    appState.isDev = false;
    backend.auth.hasAdminRole$.and.returnValue(of(false));

    service.deleteModule$.next(10);
    service.changeModule$.next({name: 'Blocked'});

    expect(backend.delete.module).not.toHaveBeenCalled();
    expect(backend.update.module).not.toHaveBeenCalled();
  });

  it('non-admin non-dev user cannot invoke destructive dev helpers', () => {
    const {service, backend, appState, baseModule} = build();

    appState.isDev = false;
    backend.auth.hasAdminRole$.and.returnValue(of(false));
    service.singleModuleData$.next(baseModule);

    service.deletePanel$.next(baseModule.panels[0]);
    service.deleteModuleAndOrphanManufacturer$.next(baseModule);

    expect(backend.delete.modulePanel).not.toHaveBeenCalled();
    expect(backend.get.modulesBySameManufacturer).not.toHaveBeenCalled();
    expect(backend.delete.module).not.toHaveBeenCalled();
    expect(backend.delete.manufacturer).not.toHaveBeenCalled();
    expect(backend.merge.moduleInto).not.toHaveBeenCalled();
  });

  it('merges source module into target and routes to the target detail page', () => {
    const {service, backend, router, snackBar} = build();
    const emitted: MergeModuleResult[] = [];
    service.moduleMergeResult$.subscribe(result => emitted.push(result));

    service.mergeIntoTargetModule$.next({sourceId: 10, targetId: 20});

    expect(backend.merge.moduleInto).toHaveBeenCalledWith(10, 20);
    expect(emitted[0]).toEqual(jasmine.objectContaining({
      sourceId: 10,
      targetId: 20,
      rackModuleRowsMoved: 5
    }));
    expect(snackBar.open).toHaveBeenCalledWith(
      jasmine.stringContaining('moved 3 ownership, 4 tag, 5 rack rows'),
      undefined,
      {duration: 5000, panelClass: 'snack-success'}
    );
    expect(router.navigate).toHaveBeenCalledWith(['/modules', 'details', 20]);
  });

  it('blocks merge source module into target for non-admin non-dev users', () => {
    const {service, backend, appState} = build();
    appState.isDev = false;
    backend.auth.hasAdminRole$.and.returnValue(of(false));

    service.mergeIntoTargetModule$.next({sourceId: 10, targetId: 20});

    expect(backend.merge.moduleInto).not.toHaveBeenCalled();
  });

  it('updates isAdmin$ when auth session role changes', () => {
    const {service, adminRole$} = build();
    const emitted: boolean[] = [];
    const subscription = service.isAdmin$.subscribe(value => emitted.push(value));

    adminRole$.next(true);
    adminRole$.next(false);

    expect(emitted.slice(-3)).toEqual([false, true, false]);
    subscription.unsubscribe();
  });
  
  it('toggles editor state and clears pending changes when closing', () => {
    const {service} = build();
    service.moduleEditingPanelOpenState$.next(true);
    service.moduleEditorHasPendingChanges$.next(true);
    
    service.requestModuleEditingToggle$.next();
    expect(service.moduleEditingPanelOpenState$.value).toBeFalse();
    expect(service.moduleEditorHasPendingChanges$.value).toBeFalse();
    
    service.requestModuleEditingToggle$.next();
    expect(service.moduleEditingPanelOpenState$.value).toBeTrue();
  });
  
  it('copies module + manufacturer text to clipboard', () => {
    const {service, baseModule} = build();
    const writeText = jasmine.createSpy('writeText').and.returnValue(Promise.resolve());
    Object.defineProperty(navigator, 'clipboard', {
      value: {writeText},
      configurable: true
    });
    service.singleModuleData$.next(baseModule);
    
    service.copyModuleNameAndManufacturer$.next();
    
    expect(writeText).toHaveBeenCalledWith('Main Module by Maker');
  });
  
  it('deletes the requested panel in dev mode', () => {
    const {service, backend, baseModule} = build();
    const nextSpy = spyOn(service.updateSingleModuleData$, 'next').and.callThrough();
    service.singleModuleData$.next(baseModule);
    
    service.deletePanel$.next(baseModule.panels[1]);
    
    expect(backend.delete.modulePanel).toHaveBeenCalledWith(baseModule.panels[1]);
    expect(nextSpy).toHaveBeenCalledWith(10);
  });

  describe('setStoreUrl$', () => {
    it('should call update.moduleStoreUrl with the given id and url', fakeAsync(() => {
      const {service, backend} = build();
      service.singleModuleData$.next(moduleFixture({id: 10}));

      service.setStoreUrl$.next({id: 10, url: 'https://store.example.com/module'});
      tick();

      expect(backend.update.moduleStoreUrl).toHaveBeenCalledWith(10, 'https://store.example.com/module');
    }));

    it('should call update.moduleStoreUrl with null when clearing', fakeAsync(() => {
      const {service, backend} = build();
      service.singleModuleData$.next(moduleFixture({id: 10}));

      service.setStoreUrl$.next({id: 10, url: null});
      tick();

      expect(backend.update.moduleStoreUrl).toHaveBeenCalledWith(10, null);
    }));

    it('should trigger a data refresh after store url is set', fakeAsync(() => {
      const {service} = build();
      service.singleModuleData$.next(moduleFixture({id: 10}));
      const nextSpy = spyOn(service.updateSingleModuleData$, 'next').and.callThrough();

      service.setStoreUrl$.next({id: 10, url: 'https://example.com'});
      tick();

      expect(nextSpy).toHaveBeenCalledWith(10);
    }));
  });

  it('setStoreUrl$ silently swallows backend errors without affecting other streams', fakeAsync(() => {
    const {service, backend} = build();
    backend.update.moduleStoreUrl.and.returnValue(throwError(() => new Error('network error')));
    service.singleModuleData$.next(moduleFixture({id: 10}));

    expect(() => {
      service.setStoreUrl$.next({id: 10, url: 'https://store.example.com'});
      tick();
    }).not.toThrow();
  }));

  it('closes editor panel when a new user session is emitted while module data is set', () => {
    const {service, loggedUser$, baseModule} = build();
    service.moduleEditingPanelOpenState$.next(true);
    service.singleModuleData$.next(baseModule);

    loggedUser$.next(userFixture('user-2'));

    expect(service.moduleEditingPanelOpenState$.value).toBeFalse();
  });

  it('starts with expected default state for all subjects', () => {
    const {service, ownedModule} = build();

    expect(service.singleModuleData$.value).toBeNull();
    expect(service.racksWithThisModule$.value).toBeUndefined();
    expect(service.patchesWithThisModule$.value).toBeUndefined();
    expect(service.moduleUsageSummary$.value).toBeUndefined();
    expect(service.coolCount$.value).toBeUndefined();
    expect(service.moduleEditingPanelOpenState$.value).toBeFalse();
    expect(service.moduleEditorHasPendingChanges$.value).toBeFalse();
    expect(service.isAdmin$.value).toBeFalse();
    // userModulesList$ fires immediately via loggedUser$ BehaviorSubject in constructor
    expect(service.userModulesList$.value).toEqual([ownedModule]);
  });

  it('clears singleModuleData$ and related streams to undefined when updateSingleModuleData$ fires', fakeAsync(() => {
    const {service, backend} = build();

    const rackEmissions: Array<RackMinimal[] | undefined> = [];
    const patchEmissions: Array<PatchMinimal[] | undefined> = [];
    const summaryEmissions: Array<ModuleUsageSummary | undefined> = [];
    const coolCountEmissions: Array<number | undefined> = [];
    service.racksWithThisModule$.subscribe(v => rackEmissions.push(v));
    service.patchesWithThisModule$.subscribe(v => patchEmissions.push(v));
    service.moduleUsageSummary$.subscribe(v => summaryEmissions.push(v));
    service.coolCount$.subscribe(v => coolCountEmissions.push(v));

    service.updateSingleModuleData$.next(10);
    // The tap() reset emits undefined before the backend response replaces it.
    expect(rackEmissions).toContain(undefined);
    expect(patchEmissions).toContain(undefined);
    expect(summaryEmissions).toContain(undefined);
    expect(coolCountEmissions).toContain(undefined);

    tick(260); // clear delays
    expect(service.singleModuleData$.value?.id).toBe(10);
    expect(service.coolCount$.value).toBe(7);
  }));

  it('applies successful Cool count updates without reloading module detail data', () => {
    const {service, backend} = build();

    service.coolCount$.next(0);
    service.coolCountUpdate$.next(1);

    expect(service.coolCount$.value).toBe(1);
    expect(backend.GET.moduleWithId).not.toHaveBeenCalled();
    expect(backend.get.reactionCount).not.toHaveBeenCalled();

    service.coolCountUpdate$.next(null);

    expect(service.coolCount$.value).toBe(1);
  });

  it('clears moduleEditorHasPendingChanges$ when updateSingleModuleData$ fires', fakeAsync(() => {
    const {service} = build();
    service.moduleEditorHasPendingChanges$.next(true);

    service.updateSingleModuleData$.next(10);
    tick(260);

    expect(service.moduleEditorHasPendingChanges$.value).toBeFalse();
  }));

  it('loads userModulesList$ when updateSingleModuleData$ fires and user is logged in', fakeAsync(() => {
    const {service, backend, ownedModule} = build();

    service.updateSingleModuleData$.next(10);
    tick(260);

    expect(backend.GET.currentUserModules).toHaveBeenCalledWith(false);
    expect(service.userModulesList$.value).toEqual([ownedModule]);
  }));

  it('sets userModulesList$ to empty array when user is not logged in', fakeAsync(() => {
    const {service, backend, loggedUser$} = build();
    loggedUser$.next(undefined);

    const callsBefore = backend.GET.currentUserModules.calls.count();
    service.updateSingleModuleData$.next(10);
    tick(260);

    // With no user, the subscription uses of([]) — no extra call to currentUserModules
    expect(backend.GET.currentUserModules.calls.count()).toBe(callsBefore);
    expect(service.userModulesList$.value).toEqual([]);
  }));
});
