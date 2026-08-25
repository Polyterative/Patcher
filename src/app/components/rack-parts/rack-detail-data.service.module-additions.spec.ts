import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import {
  BehaviorSubject,
  Observable,
  of,
  Subject,
  throwError
} from 'rxjs';
import { AnalyticsService } from 'src/app/features/backbone/analytics-integration/analytics.service';
import { UserManagementService } from 'src/app/features/backbone/login/user-management.service';
import {
  SimpleUserModel,
  SupabaseService
} from 'src/app/features/backend/supabase.service';
import {
  DbModule,
  RackedModule
} from 'src/app/models/module';
import {
  Rack,
  RackMinimal
} from 'src/app/models/rack';
import { SharedConstants } from 'src/app/shared-interproject/SharedConstants';
import { RackDetailDataService } from './rack-detail-data.service';

// Harness copied from the sibling `rack-detail-data.service.reactive.spec.ts` (direct
// `new RackDetailDataService(...)` construction, not TestBed) so this file characterizes
// the same shared instance the rest of the reactive suite already exercises.
type BackendResponse<T> = {data: T};
type EmptyBackendResponse = Record<string, never>;
type BackendErrorResponse = {error: Error};
type TestRack = Rack & {
  image?: string | undefined;
};
type RackModulePersistenceRow = {
  id: number;
  moduleid: number;
  rackid: number;
  row: number | null;
  column: number | null;
  selected_panel_id: number | null;
};
type RackModuleMutationResponse = EmptyBackendResponse | BackendResponse<RackModulePersistenceRow[]> | BackendErrorResponse;
type ModuleFixtureOverrides = Partial<Omit<DbModule, 'standard' | 'tags'>> & {
  standard?: Partial<DbModule['standard']>;
  tags?: DbModule['tags'];
};
type TestDialog = {
  open: jasmine.Spy<() => {
    afterClosed: () => Observable<{answer: boolean; result?: string}>;
  }>;
};
type RackDetailBackendDouble = {
  update: {
    rack: jasmine.Spy<(rack: RackMinimal) => Observable<BackendResponse<Array<{id: number}>>>>;
    rackedModules: jasmine.Spy<(modules: RackedModule[]) => Observable<RackModuleMutationResponse>>;
    rackModulePanel: jasmine.Spy<(rackModuleId: number, panelId: number | null) => Observable<EmptyBackendResponse>>;
  };
  delete: {
    rackedModule: jasmine.Spy<(rackModuleId: number) => Observable<EmptyBackendResponse | BackendErrorResponse>>;
    rackedModules: jasmine.Spy<(rackModuleIds: number[]) => Observable<EmptyBackendResponse | BackendErrorResponse>>;
    modulesOfRack: jasmine.Spy<(rackId: number) => Observable<EmptyBackendResponse>>;
    commentsForRack: jasmine.Spy<(rackId: number) => Observable<EmptyBackendResponse>>;
    userRack: jasmine.Spy<(rackId: number) => Observable<EmptyBackendResponse>>;
  };
  add: {
    rackModule: jasmine.Spy<(
      moduleId: number,
      rackId: number,
      row?: number | null,
      column?: number | null
    ) => Observable<RackModuleMutationResponse>>;
    rack: jasmine.Spy<(rack: RackMinimal) => Observable<BackendResponse<Array<{id: number}>>>>;
    patch: jasmine.Spy<(patch: {name: string; public?: boolean; linked_rack_id?: number | null}) =>
      Observable<BackendResponse<Array<{id: number}>>>>;
  };
  get: {
    rackedModules: jasmine.Spy<(rackId: number) => Observable<RackedModule[]>>;
  };
  GET: {
    rackWithId: jasmine.Spy<(rackId: number) => Observable<BackendResponse<Rack | null>>>;
    publicRackWithId: jasmine.Spy<(rackId: number) => Observable<BackendResponse<Rack | null>>>;
    rackByPublicId: jasmine.Spy<(publicId: string) => Observable<BackendResponse<Rack | null>>>;
    moduleWithIdForRackDisplay: jasmine.Spy<(moduleId: number) => Observable<BackendResponse<DbModule | null>>>;
  };
  storage: {
    uploadRackImage: jasmine.Spy<(file: Blob | File, filenameAndExtension: string) => Observable<string>>;
    deleteRackImage: jasmine.Spy<(filenameAndExtension: string) => Observable<EmptyBackendResponse>>;
  };
  auth: {
    hasAdminRole$: jasmine.Spy<() => Observable<boolean>>;
  };
};

describe('RackDetailDataService module additions', () => {
  let createdServices: RackDetailDataService[];

  function simpleUser(id: string): SimpleUserModel {
    return {
      id,
      email: `${ id }@example.com`,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z'
    };
  }

  function moduleFixture(
    id: number,
    name: string,
    hp = 8,
    standardId = 0,
    overrides: ModuleFixtureOverrides = {}
  ): DbModule {
    const {standard, tags, ...moduleOverrides} = overrides;

    return {
      id,
      name,
      description: '',
      hp,
      public: true,
      manufacturer: {id: 1, name: 'Maker'},
      manufacturerId: 1,
      standard: {id: standardId, name: standardId === 0 ? 'Eurorack' : 'Intellijel 1U', ...standard},
      tags: tags ?? [],
      panels: [],
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
      weight: 0,
      created: '2026-01-01T00:00:00.000Z',
      updated: '2026-01-01T00:00:00.000Z',
      ...moduleOverrides
    };
  }

  function rack(partial: Partial<TestRack> = {}): TestRack {
    return {
      id: 1,
      name: 'Rack',
      rows: 2,
      hp: 84,
      public: true,
      locked: false,
      image: undefined,
      author: {id: 'u1', username: 'user'},
      created: '2026-01-01T00:00:00.000Z',
      updated: '2026-01-01T00:00:00.000Z',
      ...partial
    };
  }

  function persistedRow(overrides: Partial<RackModulePersistenceRow> = {}): RackModulePersistenceRow {
    return {
      id: 900,
      moduleid: 777,
      rackid: 1,
      row: null,
      column: null,
      selected_panel_id: null,
      ...overrides
    };
  }

  function placedModule(dbModule: DbModule, rackId: number, rackingId: number, row: number, column: number): RackedModule {
    return {
      module: dbModule,
      rackingData: {id: rackingId, rackid: rackId, moduleid: dbModule.id, row, column, selectedPanelId: null}
    };
  }

  function build() {
    const loggedUser$ = new BehaviorSubject<SimpleUserModel | undefined>(simpleUser('u1'));
    const backend: RackDetailBackendDouble = {
      update: {
        rack: jasmine.createSpy('update.rack').and.returnValue(of({data: [{id: 1}]})),
        rackedModules: jasmine.createSpy('update.rackedModules').and.returnValue(of({})),
        rackModulePanel: jasmine.createSpy('update.rackModulePanel').and.returnValue(of({}))
      },
      delete: {
        rackedModule: jasmine.createSpy('delete.rackedModule').and.returnValue(of({})),
        rackedModules: jasmine.createSpy('delete.rackedModules').and.returnValue(of({})),
        modulesOfRack: jasmine.createSpy('delete.modulesOfRack').and.returnValue(of({})),
        commentsForRack: jasmine.createSpy('delete.commentsForRack').and.returnValue(of({})),
        userRack: jasmine.createSpy('delete.userRack').and.returnValue(of({}))
      },
      add: {
        rackModule: jasmine.createSpy('add.rackModule').and.returnValue(of({
          data: [persistedRow()]
        })),
        rack: jasmine.createSpy('add.rack').and.returnValue(of({data: [{id: 99}]})),
        patch: jasmine.createSpy('add.patch').and.returnValue(of({data: [{id: 321}]}))
      },
      get: {
        rackedModules: jasmine.createSpy('get.rackedModules').and.returnValue(of([]))
      },
      GET: {
        rackWithId: jasmine.createSpy('GET.rackWithId').and.returnValue(of({data: rack()})),
        publicRackWithId: jasmine.createSpy('GET.publicRackWithId').and.returnValue(of({data: rack()})),
        rackByPublicId: jasmine.createSpy('GET.rackByPublicId').and.returnValue(of({data: rack()})),
        moduleWithIdForRackDisplay: jasmine.createSpy('GET.moduleWithIdForRackDisplay').and.callFake((id: number) => of({
          data: moduleFixture(id, `${ id } blank`, 8, 0)
        }))
      },
      storage: {
        uploadRackImage: jasmine.createSpy('storage.uploadRackImage').and.returnValue(of('new-image.jpg')),
        deleteRackImage: jasmine.createSpy('storage.deleteRackImage').and.returnValue(of({}))
      },
      auth: {
        hasAdminRole$: jasmine.createSpy('auth.hasAdminRole$').and.returnValue(of(false))
      }
    };
    const dialog: TestDialog = {
      open: jasmine.createSpy('dialog.open').and.returnValue({
        afterClosed: () => of({answer: true, result: 'Renamed Rack'})
      })
    };
    const snackBar = jasmine.createSpyObj<MatSnackBar>('MatSnackBar', ['open']);
    const router = jasmine.createSpyObj<Router>('Router', ['navigate']);
    const analytics = jasmine.createSpyObj<AnalyticsService>('AnalyticsService', ['capture', 'identify', 'reset']);

    const service = new RackDetailDataService(
      snackBar,
      {loggedUser$: loggedUser$.asObservable()} as unknown as UserManagementService,
      backend as unknown as SupabaseService,
      dialog as unknown as MatDialog,
      router,
      analytics
    );
    createdServices.push(service);

    return {service, backend, dialog, snackBar, router, analytics};
  }

  beforeEach(() => {
    createdServices = [];
  });

  afterEach(() => {
    createdServices.forEach((service) => service.ngOnDestroy());
  });

  describe('S1 — contextual add survives reload (AT-R1)', () => {
    it('persists the optimistic module and keeps its identity/coordinates through a simulated reload', () => {
      const {service, backend} = build();
      service.singleRackData$.next(rack({id: 1, rows: 1}));
      service.rowedRackedModules$.next([[]]);
      const addResult$ = new Subject<RackModuleMutationResponse>();
      backend.add.rackModule.and.returnValue(addResult$.asObservable());

      service.addModuleToRack$.next(moduleFixture(777, 'New Module', 8, 0));

      // Before the backend resolves, the optimistic module must already be visible and
      // explicitly unpersisted (no rackingData.id yet) — a regression that delays the
      // optimistic insertion until persistence completes must not pass this check.
      let rows = service.rowedRackedModules$.value ?? [];
      const optimistic = rows.flatMap(row => row).find(m => m.module.id === 777);
      expect(optimistic).withContext('module should appear immediately after the optimistic add, before the backend resolves').toBeTruthy();
      expect(optimistic?.rackingData.id).toBeUndefined();
      expect(optimistic?.rackingData.row).toBeNull();
      expect(optimistic?.rackingData.column).toBeNull();

      addResult$.next({data: [persistedRow({id: 205, moduleid: 777})]});
      addResult$.complete();

      rows = service.rowedRackedModules$.value ?? [];
      const added = rows.flatMap(row => row).find(m => m.module.id === 777);
      expect(added).withContext('module should carry its persisted id once the backend resolves').toBeTruthy();
      expect(added?.rackingData.id).toBe(205);
      expect(added?.rackingData.row).toBeNull();
      expect(added?.rackingData.column).toBeNull();

      // Simulate a full rack reload (e.g. a page refresh) re-fetching from the backend,
      // with a fixture that reflects the row just persisted above.
      backend.GET.rackWithId.and.returnValue(of({data: rack({id: 1, rows: 1})}));
      backend.get.rackedModules.and.returnValue(of([
        {
          module: moduleFixture(777, 'New Module', 8, 0),
          rackingData: {id: 205, rackid: 1, moduleid: 777, row: null, column: null, selectedPanelId: null}
        }
      ]));

      service.updateSingleRackData$.next(1);

      // Prove the reload path actually executed (not a no-op re-check of stale state).
      expect(backend.GET.rackWithId).toHaveBeenCalledWith(1);
      expect(backend.get.rackedModules).toHaveBeenCalledWith(1);

      rows = service.rowedRackedModules$.value ?? [];
      const reloaded = rows.flatMap(row => row).find(m => m.rackingData.id === 205);
      expect(reloaded).withContext('the persisted module should survive the reload').toBeTruthy();
      expect(reloaded?.module.id).toBe(777);
      expect(reloaded?.rackingData.row).toBeNull();
      expect(reloaded?.rackingData.column).toBeNull();
    });
  });

  describe('S2 — contextual add rollback on failure (AT-R2)', () => {
    it('removes the exact optimistic reference, shows one error snackbar, and still accepts a later action', () => {
      spyOn(SharedConstants, 'errorCustom').and.callFake(() => {});
      const {service, backend, snackBar} = build();
      service.singleRackData$.next(rack({id: 1, rows: 1}));
      const existingModule = placedModule(moduleFixture(50, 'Existing Module', 8, 0), 1, 10, 0, 0);
      service.rowedRackedModules$.next([[existingModule]]);
      const failingModule = moduleFixture(77, 'Failing Module', 10, 0);
      const followUpModule = moduleFixture(88, 'Follow-up Module', 8, 0);
      backend.add.rackModule.and.returnValues(
        throwError(() => new Error('add failed')),
        of({data: [persistedRow({id: 300, moduleid: 88})]})
      );

      service.addModuleToRack$.next(failingModule);

      expect(SharedConstants.errorCustom).toHaveBeenCalledTimes(1);
      expect(SharedConstants.errorCustom).toHaveBeenCalledWith(
        snackBar,
        'Failed to add module — changes reverted. Check your connection and try again.'
      );
      // Rolled back to the pre-add state exactly: the pre-existing, unrelated module
      // survives untouched and the failing module's optimistic row is fully gone (not
      // just "everything cleared" — a wrong wipe-all rollback would fail this too).
      expect(service.rowedRackedModules$.value).toEqual([[existingModule]]);

      // The shared exhaustMap chain must still accept a later, independent action.
      service.addModuleToRack$.next(followUpModule);

      expect(backend.add.rackModule).toHaveBeenCalledTimes(2);
      expect(backend.add.rackModule.calls.argsFor(1)).toEqual([88, 1]);
      const persisted = (service.rowedRackedModules$.value ?? []).flatMap(row => row).find(m => m.module.id === 88);
      expect(persisted?.rackingData.id).toBe(300);
    });
  });

  describe('S3 — rapid contextual-add across two module cards (AT-R3)', () => {
    it('drops a second concurrent add while the first is in flight and emits exactly one accepted outcome', () => {
      spyOn(SharedConstants, 'successCustom').and.callFake(() => {});
      const {service, backend} = build();
      service.singleRackData$.next(rack({id: 10, rows: 1}));
      service.rowedRackedModules$.next([[]]);
      const moduleA = moduleFixture(101, 'Module A', 8, 0);
      const moduleB = moduleFixture(102, 'Module B', 8, 0);
      const addResult$ = new Subject<RackModuleMutationResponse>();
      backend.add.rackModule.and.returnValue(addResult$.asObservable());

      service.addModuleToRack$.next(moduleA);
      service.addModuleToRack$.next(moduleB);

      // Module B's click never reaches the backend while A is in flight.
      expect(backend.add.rackModule).toHaveBeenCalledTimes(1);
      expect(backend.add.rackModule).toHaveBeenCalledWith(101, 10);
      // Module B must never even transiently appear — exhaustMap drops it before any
      // optimistic insert runs, not just before A's eventual success is observed.
      const modulesWhileAPending = (service.rowedRackedModules$.value ?? []).flatMap(row => row);
      expect(modulesWhileAPending.some(m => m.module.id === 102)).toBeFalse();

      addResult$.next({data: [persistedRow({id: 501, moduleid: 101, rackid: 10})]});
      addResult$.complete();

      expect(backend.add.rackModule).toHaveBeenCalledTimes(1);
      expect(SharedConstants.successCustom).toHaveBeenCalledTimes(1);
      expect(SharedConstants.successCustom).toHaveBeenCalledWith(jasmine.anything(), jasmine.stringContaining('Module A'));
      const modules = (service.rowedRackedModules$.value ?? []).flatMap(row => row);
      expect(modules.some(m => m.module.id === 101)).toBeTrue();
      expect(modules.some(m => m.module.id === 102)).toBeFalse();
    });
  });
});
