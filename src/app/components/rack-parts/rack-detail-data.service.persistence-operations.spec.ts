import {
  BehaviorSubject,
  of
} from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { AnalyticsService } from 'src/app/features/backbone/analytics-integration/analytics.service';
import { UserManagementService } from 'src/app/features/backbone/login/user-management.service';
import { SupabaseService } from 'src/app/features/backend/supabase.service';
import {
  DbModule,
  RackedModule
} from 'src/app/models/module';
import {
  Rack,
  RackingData
} from 'src/app/models/rack';
import { RackDetailDataService } from './rack-detail-data.service';
import { RackDetailDataContext } from './rack-detail-data.service.types';
import { RackDetailLayoutOperationsService } from './rack-detail-layout-operations.service';
import { RackDetailPersistenceOperationsService } from './rack-detail-persistence-operations.service';

// Persistence-operations slice of the thin-coverage backlog (TODO.md):
// RackDetailPersistenceOperationsService has no dedicated spec file and is
// consumed exclusively by RackDetailDataService, so this file extends the
// aggregate `rack-detail-data.service*.spec.ts` family (the only spec glob
// accepted for these sources by the regression-contract registry). It drives
// the operations service directly with minimal contexts built from the real
// aggregate service's subjects, characterizing sync/id-assignment, optimistic
// insert, and reference-removal contracts without touching production code.
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
  orientation?: string | null;
};
type RackModuleMutationResponse = EmptyBackendResponse | BackendResponse<RackModulePersistenceRow[]> | BackendErrorResponse;
type ModuleFixtureOverrides = Partial<Omit<DbModule, 'standard' | 'tags'>> & {
  standard?: Partial<DbModule['standard']>;
  tags?: DbModule['tags'];
};
type ServiceConstructorArgs = ConstructorParameters<typeof RackDetailDataService>;

describe('RackDetailDataService persistence operations', () => {
  let createdServices: RackDetailDataService[];
  let ops: RackDetailPersistenceOperationsService;
  let layoutOps: RackDetailLayoutOperationsService;

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

  function racked(
    dbModule: DbModule,
    racking: Partial<RackingData> & {rackid: number}
  ): RackedModule {
    return {
      module: dbModule,
      rackingData: {
        id: undefined,
        moduleid: dbModule.id,
        row: null,
        column: null,
        selectedPanelId: null,
        ...racking
      }
    };
  }

  function placed(dbModule: DbModule, rackId: number, rackingId: number, row: number, column: number): RackedModule {
    return racked(dbModule, {id: rackingId, rackid: rackId, row, column});
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

  function build() {
    const backend = {
      update: {
        rack: jasmine.createSpy('update.rack').and.returnValue(of({})),
        rackedModules: jasmine.createSpy('update.rackedModules').and.returnValue(of({})),
        rackModulePanel: jasmine.createSpy('update.rackModulePanel').and.returnValue(of({})),
        rackModuleOrientation: jasmine.createSpy('update.rackModuleOrientation').and.returnValue(of({}))
      },
      delete: {
        rackedModule: jasmine.createSpy('delete.rackedModule').and.returnValue(of({})),
        rackedModules: jasmine.createSpy('delete.rackedModules').and.returnValue(of({})),
        modulesOfRack: jasmine.createSpy('delete.modulesOfRack').and.returnValue(of({})),
        commentsForRack: jasmine.createSpy('delete.commentsForRack').and.returnValue(of({})),
        userRack: jasmine.createSpy('delete.userRack').and.returnValue(of({}))
      },
      add: {
        rackModule: jasmine.createSpy('add.rackModule').and.returnValue(of({})),
        rack: jasmine.createSpy('add.rack').and.returnValue(of({data: [{id: 99}]}))
      },
      get: {
        rackedModules: jasmine.createSpy('get.rackedModules').and.returnValue(of([]))
      },
      GET: {
        rackWithId: jasmine.createSpy('GET.rackWithId').and.returnValue(of({data: null})),
        moduleWithIdForRackDisplay: jasmine.createSpy('GET.moduleWithIdForRackDisplay').and.returnValue(of({data: null}))
      },
      storage: {
        uploadRackImage: jasmine.createSpy('storage.uploadRackImage').and.returnValue(of('img.jpg')),
        deleteRackImage: jasmine.createSpy('storage.deleteRackImage').and.returnValue(of({}))
      },
      auth: {
        hasAdminRole$: jasmine.createSpy('auth.hasAdminRole$').and.returnValue(of(false))
      }
    };

    const service = new RackDetailDataService(
      {open: jasmine.createSpy('snack.open')} as unknown as ServiceConstructorArgs[0],
      {loggedUser$: of(undefined)} as unknown as UserManagementService,
      backend as unknown as SupabaseService,
      {open: jasmine.createSpy('dialog.open')} as unknown as MatDialog,
      jasmine.createSpyObj<Router>('Router', ['navigate']),
      {capture: () => {}, identify: () => {}, reset: () => {}} as unknown as AnalyticsService
    );
    createdServices.push(service);

    return {service, backend};
  }

  function stubContext(
    service: RackDetailDataService,
    backend: ReturnType<typeof build>['backend']
  ): RackDetailDataContext {
    const ctx = {
      singleRackData$: service.singleRackData$,
      rowedRackedModules$: service.rowedRackedModules$,
      backend: backend as unknown as SupabaseService,
      snackBar: {open: jasmine.createSpy('snack.open')} as unknown as MatSnackBar,
      updateModulesColumnIds: (rows, row) => layoutOps.updateModulesColumnIds(rows, row),
      updateRackRowCoordinates: (rows, rowCount) => layoutOps.updateRackRowCoordinates(rows, rowCount)
    } as unknown as RackDetailDataContext;
    ctx.callBackendToUpdateModulesOfRack = (rows, rackData) =>
      ops.callBackendToUpdateModulesOfRack(ctx, rows, rackData);
    return ctx;
  }

  beforeEach(() => {
    createdServices = [];
    ops = new RackDetailPersistenceOperationsService();
    layoutOps = new RackDetailLayoutOperationsService();
  });

  afterEach(() => {
    createdServices.forEach((service) => service.ngOnDestroy());
  });

  describe('P1 — assertBackendSuccess', () => {
    it('passes successful responses through untouched', () => {
      const response = {data: [{id: 1}]};

      expect(ops.assertBackendSuccess(response)).toBe(response);
      expect(ops.assertBackendSuccess(undefined)).toBeUndefined();
      expect(ops.assertBackendSuccess({data: [], error: null})).toEqual({data: [], error: null});
    });

    it('throws the backend error payload so callers can roll back', () => {
      const failure = new Error('db down');

      expect(() => ops.assertBackendSuccess({error: failure})).toThrow(failure);
    });
  });

  describe('P2 — applyPersistedRackingIds', () => {
    it('assigns ids by position and maps panel + orientation for explicit targets', () => {
      const {service, backend} = build();
      const ctx = stubContext(service, backend);
      void ctx;
      const first = racked(moduleFixture(10, 'A'), {rackid: 1});
      const second = racked(moduleFixture(11, 'B'), {rackid: 1});
      const rows: RackedModule[][] = [[first, second]];

      ops.applyPersistedRackingIds(
        {data: [persistedRow({id: 201, selected_panel_id: 7, orientation: 'rot180'}), persistedRow({id: 202})]},
        rows,
        [first, second]
      );

      expect(first.rackingData.id).toBe(201);
      expect(first.rackingData.selectedPanelId).toBe(7);
      expect(first.rackingData.orientation).toBe('rot180');
      expect(second.rackingData.id).toBe(202);
    });

    it('is a no-op when the backend returns no rows', () => {
      const first = racked(moduleFixture(10, 'A'), {rackid: 1});
      const rows: RackedModule[][] = [[first]];

      ops.applyPersistedRackingIds({data: []}, rows, [first]);
      ops.applyPersistedRackingIds({}, rows, [first]);
      ops.applyPersistedRackingIds(undefined, rows, [first]);

      expect(first.rackingData.id).toBeUndefined();
    });

    it('falls back to coordinate matching for modules that were never explicit targets', () => {
      const {service, backend} = build();
      void stubContext(service, backend);
      const synced = placed(moduleFixture(10, 'A'), 1, 50, 0, 0);
      const late = racked(moduleFixture(11, 'B'), {rackid: 1, moduleid: 11, row: 0, column: 1});
      const rows: RackedModule[][] = [[synced, late]];

      ops.applyPersistedRackingIds(
        {data: [persistedRow({id: 50, moduleid: 1010, row: 0, column: 0}), persistedRow({id: 60, moduleid: 11, rackid: 1, row: 0, column: 1})]},
        rows,
        []
      );

      expect(synced.rackingData.id).toBe(50);
      expect(late.rackingData.id).toBe(60);
    });

    it('normalizes unknown orientation encodings back to normal', () => {
      const first = racked(moduleFixture(10, 'A'), {rackid: 1});
      const rows: RackedModule[][] = [[first]];

      ops.applyPersistedRackingIds(
        {data: [persistedRow({id: 301, orientation: 'sideways'})]},
        rows,
        [first]
      );

      expect(first.rackingData.id).toBe(301);
      expect(first.rackingData.orientation).toBe('normal');
    });

    it('never overwrites an already-persisted id', () => {
      const synced = placed(moduleFixture(10, 'A'), 1, 50, 0, 0);
      const rows: RackedModule[][] = [[synced]];

      ops.applyPersistedRackingIds({data: [persistedRow({id: 999})]}, rows, [synced]);

      expect(synced.rackingData.id).toBe(50);
    });
  });

  describe('P3 — insertOptimisticModule', () => {
    it('appends unplaced modules to a fresh unracked row with sync defaults', () => {
      const {service, backend} = build();
      const ctx = stubContext(service, backend);
      service.singleRackData$.next(rack({id: 1, rows: 1}));
      const rows: RackedModule[][] = [[placed(moduleFixture(1, 'M1'), 1, 10, 0, 0)]];
      const dbModule = moduleFixture(777, 'New Module');

      const optimistic = ops.insertOptimisticModule(ctx, rows, {module: dbModule, row: null, column: null, rackId: 1});

      expect(optimistic.rackingData.id).toBeUndefined();
      expect(optimistic.rackingData.rackid).toBe(1);
      expect(optimistic.rackingData.moduleid).toBe(777);
      expect(optimistic.rackingData.row).toBeNull();
      expect(optimistic.rackingData.column).toBeNull();
      expect(optimistic.rackingData.selectedPanelId).toBeNull();
      expect(optimistic.rackingData.orientation).toBe('normal');
      expect(rows.length).toBe(2);
      expect(rows[1][0]).toBe(optimistic);
    });

    it('reuses the trailing unracked row instead of stacking new ones', () => {
      const {service, backend} = build();
      const ctx = stubContext(service, backend);
      service.singleRackData$.next(rack({id: 1, rows: 1}));
      const rows: RackedModule[][] = [
        [placed(moduleFixture(1, 'M1'), 1, 10, 0, 0)],
        [racked(moduleFixture(2, 'M2'), {rackid: 1})]
      ];

      ops.insertOptimisticModule(ctx, rows, {module: moduleFixture(3, 'M3'), row: null, column: null, rackId: 1});

      expect(rows.length).toBe(2);
      expect(rows[1].length).toBe(2);
    });

    it('splices into an explicit row/column and creates missing rows', () => {
      const {service, backend} = build();
      const ctx = stubContext(service, backend);
      service.singleRackData$.next(rack({id: 1, rows: 3}));
      const first = placed(moduleFixture(1, 'M1'), 1, 10, 1, 0);
      const rows: RackedModule[][] = [[], [first]];

      const optimistic = ops.insertOptimisticModule(ctx, rows, {
        module: moduleFixture(9, 'M9'),
        row: 1,
        column: 0,
        rackId: 1
      });

      expect(rows[1][0]).toBe(optimistic);
      expect(rows[1][1]).toBe(first);

      const intoMissing = ops.insertOptimisticModule(ctx, rows, {
        module: moduleFixture(10, 'M10'),
        row: 5,
        column: 0,
        rackId: 1
      });

      expect(rows[5][0]).toBe(intoMissing);
    });
  });

  describe('P4 — removeRackedModuleByReference', () => {
    it('removes the exact reference, emits, and reindexes the surviving columns', () => {
      const {service, backend} = build();
      const ctx = stubContext(service, backend);
      service.singleRackData$.next(rack({id: 1, rows: 1}));
      const keep = placed(moduleFixture(1, 'M1'), 1, 10, 0, 0);
      const drop = placed(moduleFixture(2, 'M2'), 1, 11, 0, 1);
      service.rowedRackedModules$.next([[keep, drop]]);

      ops.removeRackedModuleByReference(ctx, drop);

      const rows = service.rowedRackedModules$.value ?? [];
      expect(rows[0].length).toBe(1);
      expect(rows[0][0]).toBe(keep);
      expect(keep.rackingData.column).toBe(0);
      expect(keep.rackingData.row).toBe(0);
    });

    it('prunes an emptied trailing unracked row but keeps emptied rack rows', () => {
      const {service, backend} = build();
      const ctx = stubContext(service, backend);
      service.singleRackData$.next(rack({id: 1, rows: 1}));
      const rackedModule = placed(moduleFixture(1, 'M1'), 1, 10, 0, 0);
      const unracked = racked(moduleFixture(2, 'M2'), {rackid: 1});
      service.rowedRackedModules$.next([[rackedModule], [unracked]]);

      ops.removeRackedModuleByReference(ctx, unracked);

      expect(service.rowedRackedModules$.value?.length).toBe(1);

      service.rowedRackedModules$.next([[rackedModule]]);
      ops.removeRackedModuleByReference(ctx, rackedModule);

      expect(service.rowedRackedModules$.value?.length).toBe(1);
      expect(service.rowedRackedModules$.value?.[0]).toEqual([]);
    });

    it('leaves state untouched when the reference is already gone', () => {
      const {service, backend} = build();
      const ctx = stubContext(service, backend);
      service.singleRackData$.next(rack({id: 1, rows: 1}));
      const keep = placed(moduleFixture(1, 'M1'), 1, 10, 0, 0);
      service.rowedRackedModules$.next([[keep]]);
      const before = service.rowedRackedModules$.value;

      ops.removeRackedModuleByReference(ctx, placed(moduleFixture(99, 'Ghost'), 1, 999, 0, 5));

      expect(service.rowedRackedModules$.value).toBe(before);
    });
  });

  describe('P5 — callBackendToUpdateModulesOfRack', () => {
    it('short-circuits empty racks without touching the backend', () => {
      const {service, backend} = build();
      const ctx = stubContext(service, backend);

      let emitted: unknown = 'unset';
      ops.callBackendToUpdateModulesOfRack(ctx, [[], []], rack({id: 1})).subscribe(value => {
        emitted = value;
      });

      expect(emitted).toBeUndefined();
      expect(backend.update.rackedModules).not.toHaveBeenCalled();
    });

    it('syncs modules and assigns the persisted ids in place', () => {
      const {service, backend} = build();
      const ctx = stubContext(service, backend);
      const pending = racked(moduleFixture(777, 'Pending'), {rackid: 1, moduleid: 777, row: 0, column: 0});
      const rows: RackedModule[][] = [[pending]];
      const response = {data: [persistedRow({id: 205, moduleid: 777, row: 0, column: 0})]};
      backend.update.rackedModules.and.returnValue(of(response));

      let emitted: unknown;
      ops.callBackendToUpdateModulesOfRack(ctx, rows, rack({id: 1})).subscribe(value => {
        emitted = value;
      });

      expect(backend.update.rackedModules).toHaveBeenCalledWith([pending]);
      expect(pending.rackingData.id).toBe(205);
      expect(emitted).toBe(response);
      expect(backend.delete.rackedModules).not.toHaveBeenCalled();
    });

    it('surfaces backend error payloads to the caller instead of swallowing them', () => {
      const {service, backend} = build();
      const ctx = stubContext(service, backend);
      const failure = new Error('sync failed');
      const errorResponse = {error: failure};
      backend.update.rackedModules.and.returnValue(of(errorResponse));
      const rows: RackedModule[][] = [[racked(moduleFixture(5, 'M5'), {rackid: 1})]];
      const seen: unknown[] = [];
      const failures: unknown[] = [];

      ops.callBackendToUpdateModulesOfRack(ctx, rows, rack({id: 1})).subscribe({
        next: value => seen.push(value),
        error: error => failures.push(error)
      });

      // Characterization: the update path emits the error payload as a value
      // (the placement layer's catchError rolls back from there); only the
      // orphan-delete path throws via assertBackendSuccess.
      expect(seen).toEqual([errorResponse]);
      expect(failures).toEqual([]);
    });
  });

  describe('P6 — persistRackRowsAndModules sequences modules before rack', () => {
    it('updates modules first and only then persists the rack row count', () => {
      const {service, backend} = build();
      const ctx = stubContext(service, backend);
      const order: string[] = [];
      const pending = racked(moduleFixture(777, 'Pending'), {rackid: 1, moduleid: 777, row: 0, column: 0});
      const rows: RackedModule[][] = [[pending]];
      backend.update.rackedModules.and.callFake(() => {
        order.push('modules');
        return of({data: [persistedRow({id: 310, moduleid: 777})]});
      });
      backend.update.rack.and.callFake(() => {
        order.push('rack');
        return of({});
      });
      const nextRack = rack({id: 1, rows: 3});

      ops.persistRackRowsAndModules(ctx, rows, nextRack).subscribe();

      expect(order).toEqual(['modules', 'rack']);
      expect(backend.update.rack).toHaveBeenCalledWith(nextRack);
      expect(pending.rackingData.id).toBe(310);
    });
  });

  describe('P7 — subjects stay live on the aggregate service', () => {
    it('keeps rowed modules as a BehaviorSubject the ops layer can observe', () => {
      const {service} = build();

      expect(service.rowedRackedModules$ instanceof BehaviorSubject).toBeTrue();
      expect(service.singleRackData$ instanceof BehaviorSubject).toBeTrue();
    });
  });
});
