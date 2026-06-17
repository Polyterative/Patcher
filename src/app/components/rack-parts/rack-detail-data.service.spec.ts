import {
  fakeAsync,
  tick
} from '@angular/core/testing';
import {
  BehaviorSubject,
  of,
  Subject,
  throwError
} from 'rxjs';
import { RackDetailDataService } from './rack-detail-data.service';
import { RackedModule } from 'src/app/models/module';

describe('RackDetailDataService', () => {

  function makeRack(overrides: Partial<any> = {}): any {
    return {
      id: 1,
      name: 'Test Rack',
      hp: 84,
      rows: 3,
      public: true,
      locked: false,
      image: null,
      author: {id: 'user-1', username: 'alice'},
      ...overrides
    };
  }

  function makeRackedModule(overrides: Partial<any> = {}): any {
    return {
      rackingData: {id: 10, rackid: 1, moduleid: 5, row: 0, column: 0, selectedPanelId: null},
      module: {id: 5, name: 'VCO', hp: 8, standard: {id: 0}, functions: []},
      ...overrides
    };
  }

  function build(options: {usePublicReads?: boolean} = {}) {
    const loggedUser$ = new BehaviorSubject<any>({id: 'user-1', username: 'alice'});

    const backend = {
      GET: {
        rackWithId: jasmine.createSpy('rackWithId').and.callFake((id: number) =>
          of({data: makeRack({id})})
        ),
        publicRackWithId: jasmine.createSpy('publicRackWithId').and.callFake((id: number) =>
          of({data: makeRack({id})})
        )
      },
      get: {
        rackedModules: jasmine.createSpy('rackedModules').and.returnValue(of([]))
      },
      update: {
        rack: jasmine.createSpy('rack').and.callFake((r: any) => of(r)),
        rackedModules: jasmine.createSpy('rackedModules').and.returnValue(of({})),
        rackModulePanel: jasmine.createSpy('rackModulePanel').and.returnValue(of({}))
      },
      delete: {
        rackedModule: jasmine.createSpy('rackedModule').and.returnValue(of({})),
        modulesOfRack: jasmine.createSpy('modulesOfRack').and.returnValue(of({})),
        commentsForRack: jasmine.createSpy('commentsForRack').and.returnValue(of({})),
        userRack: jasmine.createSpy('userRack').and.returnValue(of({}))
      },
      add: {
        rack: jasmine.createSpy('rack').and.returnValue(of({data: [{id: 99}]})),
        rackModule: jasmine.createSpy('rackModule').and.returnValue(of({})),
        patch: jasmine.createSpy('patch').and.returnValue(of({data: [{id: 77}]}))
      },
      storage: {
        uploadRackImage: jasmine.createSpy('uploadRackImage').and.returnValue(of('url')),
        deleteRackImage: jasmine.createSpy('deleteRackImage').and.returnValue(of({}))
      },
      auth: {
        hasAdminRole$: jasmine.createSpy('hasAdminRole$').and.returnValue(of(false))
      }
    };

    const snackBar = {open: jasmine.createSpy('open')};
    const dialog = {open: jasmine.createSpy('open')};
    const router = jasmine.createSpyObj('Router', ['navigate']);
    const userService = {loggedUser$};

    const service = new RackDetailDataService(
      snackBar as any,
      userService as any,
      backend as any,
      dialog as any,
      router,
      {capture: () => {}, identify: () => {}, reset: () => {}} as any
    );

    if (options.usePublicReads) {
      service.setPublicDetailMode(true);
    }

    return {service, backend, snackBar, router, loggedUser$};
  }

  it('starts with expected default state', () => {
    const {service} = build();

    expect(service.singleRackData$.value).toBeUndefined();
    // BehaviorSubject starts null; constructor taps singleRackData$(undefined) and sets it to []
    expect(service.rowedRackedModules$.value).toEqual([]);
    expect(service.isRackDataLoading$.value).toBeFalse();
    expect(service.isCurrentRackPropertyOfCurrentUser$.value).toBeFalse();
    expect(service.isCurrentRackEditable$.value).toBeTrue();
    expect(service.isCurrentRackPrivate$.value).toBeFalse();
    expect(service.shouldShowPanelImages$.value).toBeTrue();
    expect(service.userRequestedSmallerScale$.value).toBeFalse();
  });

  it('loads rack data via private endpoint and sets isRackDataLoading$ correctly', fakeAsync(() => {
    const {service, backend} = build();

    service.updateSingleRackData$.next(1);
    tick();

    expect(service.isRackDataLoading$.value).toBeFalse();
    expect(backend.GET.rackWithId).toHaveBeenCalledWith(1);
    expect(backend.GET.publicRackWithId).not.toHaveBeenCalled();
    expect(service.singleRackData$.value?.id).toBe(1);
  }));

  it('uses publicRackWithId when public detail mode is enabled', fakeAsync(() => {
    const {service, backend} = build({usePublicReads: true});

    service.updateSingleRackData$.next(2);
    tick();

    expect(backend.GET.publicRackWithId).toHaveBeenCalledWith(2);
    expect(backend.GET.rackWithId).not.toHaveBeenCalled();
  }));

  it('fetches racked modules after rack data arrives and sets rowedRackedModules$', fakeAsync(() => {
    const module = makeRackedModule();
    const {service, backend} = build();
    backend.get.rackedModules.and.returnValue(of([module]));

    service.updateSingleRackData$.next(1);
    tick();

    expect(backend.get.rackedModules).toHaveBeenCalledWith(1);
    expect(service.rowedRackedModules$.value).not.toBeNull();
    const all = service.rowedRackedModules$.value!.flat();
    expect(all.length).toBe(1);
    expect(all[0].module.id).toBe(5);
  }));

  it('resets rowedRackedModules$ and isRackDataLoading$ when rack data is null', fakeAsync(() => {
    const {service, backend} = build();
    backend.GET.rackWithId.and.returnValue(of({data: null}));

    service.updateSingleRackData$.next(1);
    tick();

    expect(service.singleRackData$.value).toBeUndefined();
    expect(service.rowedRackedModules$.value).toEqual([]);
    expect(service.isRackDataLoading$.value).toBeFalse();
  }));

  it('syncs isCurrentRackEditable$ and isCurrentRackPrivate$ when rack data changes', fakeAsync(() => {
    const {service, backend} = build();
    backend.GET.rackWithId.and.returnValue(of({data: makeRack({locked: true, public: false})}));

    service.updateSingleRackData$.next(1);
    tick();

    expect(service.isCurrentRackEditable$.value).toBeFalse();
    expect(service.isCurrentRackPrivate$.value).toBeTrue();
  }));

  it('sets isCurrentRackPropertyOfCurrentUser$ true when logged user owns the rack', fakeAsync(() => {
    const {service, backend} = build();
    backend.GET.rackWithId.and.returnValue(of({data: makeRack({author: {id: 'user-1', username: 'alice'}})}));

    service.updateSingleRackData$.next(1);
    tick();

    expect(service.isCurrentRackPropertyOfCurrentUser$.value).toBeTrue();
  }));

  it('sets isCurrentRackPropertyOfCurrentUser$ false when rack belongs to another user', fakeAsync(() => {
    const {service, backend} = build();
    backend.GET.rackWithId.and.returnValue(of({data: makeRack({author: {id: 'user-99', username: 'bob'}})}));

    service.updateSingleRackData$.next(1);
    tick();

    expect(service.isCurrentRackPropertyOfCurrentUser$.value).toBeFalse();
  }));

  it('toggles privacy status and calls backend.update.rack', fakeAsync(() => {
    const {service, backend} = build();
    backend.GET.rackWithId.and.returnValue(of({data: makeRack({public: true})}));

    service.updateSingleRackData$.next(1);
    tick();
    expect(service.isCurrentRackPrivate$.value).toBeFalse();

    service.requestRackPrivacyStatusChange$.next();
    tick();

    expect(backend.update.rack).toHaveBeenCalled();
    expect(service.isCurrentRackPrivate$.value).toBeTrue();
  }));

  it('toggles editable status and calls backend.update.rack', fakeAsync(() => {
    const {service, backend} = build();
    backend.GET.rackWithId.and.returnValue(of({data: makeRack({locked: false})}));

    service.updateSingleRackData$.next(1);
    tick();
    expect(service.isCurrentRackEditable$.value).toBeTrue();

    service.requestRackEditableStatusChange$.next();
    tick();

    expect(backend.update.rack).toHaveBeenCalled();
    expect(service.isCurrentRackEditable$.value).toBeFalse();
  }));

  it('moves a rack row up and persists updated module coordinates', fakeAsync(() => {
    const {service, backend} = build();
    const rowZeroModule = makeRackedModule({
      rackingData: {id: 10, rackid: 1, moduleid: 5, row: 0, column: 0, selectedPanelId: null},
      module: {id: 5, name: 'VCO', hp: 8, standard: {id: 0}, functions: []}
    });
    const rowOneModule = makeRackedModule({
      rackingData: {id: 11, rackid: 1, moduleid: 6, row: 1, column: 0, selectedPanelId: null},
      module: {id: 6, name: 'VCF', hp: 10, standard: {id: 0}, functions: []}
    });

    const rowZero = [rowZeroModule];
    const rowOne = [rowOneModule];
    const rowTwo: any[] = [];
    service.singleRackData$.next(makeRack({rows: 3}));
    service.rowedRackedModules$.next([rowZero, rowOne, rowTwo]);
    backend.update.rackedModules.calls.reset();

    service.requestMoveRow$.next({rowId: 1, direction: 'up'});
    tick();

    const rows = service.rowedRackedModules$.value!;
    expect(rows[0][0].module.id).toBe(6);
    expect(rows[0]).toBe(rowOne);
    expect(rows[0][0].rackingData.row).toBe(0);
    expect(rows[1][0].module.id).toBe(5);
    expect(rows[1]).toBe(rowZero);
    expect(rows[1][0].rackingData.row).toBe(1);
    expect(rows[2]).toBe(rowTwo);
    expect(backend.update.rackedModules).toHaveBeenCalled();
  }));

  it('remixes rack layout through the existing racked module batch update path', fakeAsync(() => {
    const {service, backend, snackBar} = build();
    const wideModule = makeRackedModule({
      rackingData: {id: 10, rackid: 1, moduleid: 5, row: 0, column: 0, selectedPanelId: null},
      module: {id: 5, name: 'Wide', hp: 80, standard: {id: 0}, functions: []}
    });
    const smallModule = makeRackedModule({
      rackingData: {id: 11, rackid: 1, moduleid: 6, row: 0, column: 1, selectedPanelId: null},
      module: {id: 6, name: 'Small', hp: 10, standard: {id: 0}, functions: []}
    });
    const mediumModule = makeRackedModule({
      rackingData: {id: 12, rackid: 1, moduleid: 7, row: 1, column: 0, selectedPanelId: null},
      module: {id: 7, name: 'Medium', hp: 20, standard: {id: 0}, functions: []}
    });

    service.singleRackData$.next(makeRack({rows: 2, hp: 84}));
    service.rowedRackedModules$.next([[wideModule, smallModule], [mediumModule]]);
    backend.update.rackedModules.calls.reset();

    service.requestLayoutRemix$.next();
    tick();

    const rows = service.rowedRackedModules$.value!;
    expect(rows[0].map(module => module.module.id)).toEqual([5]);
    expect(rows[1].map(module => module.module.id)).toEqual([7, 6]);
    expect(smallModule.rackingData.row).toBe(1);
    expect(smallModule.rackingData.column).toBe(1);
    expect(backend.update.rackedModules).toHaveBeenCalled();
    const persistedModules = backend.update.rackedModules.calls.mostRecent().args[0] as RackedModule[];
    expect(persistedModules.find(module => module.module.id === 6)?.rackingData.row).toBe(1);
    expect(snackBar.open).toHaveBeenCalledWith('Remixed 1 module.', 'Undo', jasmine.objectContaining({duration: 10000}));
  }));

  it('remixes order inside a single 1u row', fakeAsync(() => {
    const {service, backend} = build();
    const smallOneU = makeRackedModule({
      rackingData: {id: 20, rackid: 1, moduleid: 15, row: 0, column: 0, selectedPanelId: null},
      module: {id: 15, name: 'Small 1U', hp: 4, standard: {id: 1}, functions: []}
    });
    const wideOneU = makeRackedModule({
      rackingData: {id: 21, rackid: 1, moduleid: 16, row: 0, column: 1, selectedPanelId: null},
      module: {id: 16, name: 'Wide 1U', hp: 12, standard: {id: 1}, functions: []}
    });

    service.singleRackData$.next(makeRack({rows: 1, hp: 84}));
    service.rowedRackedModules$.next([[smallOneU, wideOneU]]);
    backend.update.rackedModules.calls.reset();

    service.requestLayoutRemix$.next();
    tick();

    const rows = service.rowedRackedModules$.value!;
    expect(rows[0].map(module => module.module.id)).toEqual([16, 15]);
    expect(wideOneU.rackingData.column).toBe(0);
    expect(smallOneU.rackingData.column).toBe(1);
    expect(backend.update.rackedModules).toHaveBeenCalled();
  }));

  it('shuffles the selected layout scope through the same batch update path', fakeAsync(() => {
    const {service, backend, snackBar} = build();
    const rowZeroWide = makeRackedModule({
      rackingData: {id: 50, rackid: 1, moduleid: 50, row: 0, column: 0, selectedPanelId: null},
      module: {id: 50, name: 'Row 0 wide', hp: 12, standard: {id: 0}, functions: []}
    });
    const rowZeroSmall = makeRackedModule({
      rackingData: {id: 51, rackid: 1, moduleid: 51, row: 0, column: 1, selectedPanelId: null},
      module: {id: 51, name: 'Row 0 small', hp: 4, standard: {id: 0}, functions: []}
    });
    const rowOneWide = makeRackedModule({
      rackingData: {id: 52, rackid: 1, moduleid: 52, row: 1, column: 0, selectedPanelId: null},
      module: {id: 52, name: 'Row 1 wide', hp: 12, standard: {id: 0}, functions: []}
    });
    const rowOneSmall = makeRackedModule({
      rackingData: {id: 53, rackid: 1, moduleid: 53, row: 1, column: 1, selectedPanelId: null},
      module: {id: 53, name: 'Row 1 small', hp: 4, standard: {id: 0}, functions: []}
    });

    spyOn(Math, 'random').and.returnValue(0);
    service.singleRackData$.next(makeRack({rows: 2, hp: 84}));
    service.rowedRackedModules$.next([[rowZeroWide, rowZeroSmall], [rowOneWide, rowOneSmall]]);
    service.layoutScope$.next({rowIndex: 1});
    backend.update.rackedModules.calls.reset();

    service.requestLayoutShuffle$.next();
    tick();

    const rows = service.rowedRackedModules$.value!;
    expect(rows.map(row => row.map(module => module.module.id))).toEqual([
      [50, 51],
      [53, 52]
    ]);
    expect(rowOneSmall.rackingData.column).toBe(0);
    expect(rowOneWide.rackingData.column).toBe(1);
    expect(backend.update.rackedModules).toHaveBeenCalled();
    expect(snackBar.open).toHaveBeenCalledWith('Shuffled 2 modules.', 'Undo', jasmine.objectContaining({duration: 10000}));
  }));

  it('honours the selected remix scope when applying layout moves', fakeAsync(() => {
    const {service, backend} = build();
    const wideThreeU = makeRackedModule({
      rackingData: {id: 20, rackid: 1, moduleid: 20, row: 0, column: 0, selectedPanelId: null},
      module: {id: 20, name: 'Wide 3U', hp: 80, standard: {id: 0}, functions: []}
    });
    const smallThreeU = makeRackedModule({
      rackingData: {id: 21, rackid: 1, moduleid: 21, row: 0, column: 1, selectedPanelId: null},
      module: {id: 21, name: 'Small 3U', hp: 10, standard: {id: 0}, functions: []}
    });
    const mediumThreeU = makeRackedModule({
      rackingData: {id: 22, rackid: 1, moduleid: 22, row: 1, column: 0, selectedPanelId: null},
      module: {id: 22, name: 'Medium 3U', hp: 20, standard: {id: 0}, functions: []}
    });
    const smallOneU = makeRackedModule({
      rackingData: {id: 23, rackid: 1, moduleid: 23, row: 2, column: 0, selectedPanelId: null},
      module: {id: 23, name: 'Small 1U', hp: 4, standard: {id: 1}, functions: []}
    });
    const wideOneU = makeRackedModule({
      rackingData: {id: 24, rackid: 1, moduleid: 24, row: 2, column: 1, selectedPanelId: null},
      module: {id: 24, name: 'Wide 1U', hp: 12, standard: {id: 1}, functions: []}
    });

    service.singleRackData$.next(makeRack({rows: 3, hp: 84}));
    service.rowedRackedModules$.next([[wideThreeU, smallThreeU], [mediumThreeU], [smallOneU, wideOneU]]);
    service.layoutScope$.next('3u');
    backend.update.rackedModules.calls.reset();

    service.requestLayoutRemix$.next();
    tick();

    const rows = service.rowedRackedModules$.value!;
    expect(rows.map(row => row.map(module => module.module.id))).toEqual([
      [20],
      [22, 21],
      [23, 24]
    ]);
    expect(backend.update.rackedModules).toHaveBeenCalled();
  }));

  it('remixes only the selected single row scope', fakeAsync(() => {
    const {service, backend} = build();
    const rowZeroA = makeRackedModule({
      rackingData: {id: 40, rackid: 1, moduleid: 40, row: 0, column: 0, selectedPanelId: null},
      module: {id: 40, name: 'Row 0 A', hp: 4, standard: {id: 0}, functions: []}
    });
    const rowZeroB = makeRackedModule({
      rackingData: {id: 41, rackid: 1, moduleid: 41, row: 0, column: 1, selectedPanelId: null},
      module: {id: 41, name: 'Row 0 B', hp: 8, standard: {id: 0}, functions: []}
    });
    const rowOneA = makeRackedModule({
      rackingData: {id: 42, rackid: 1, moduleid: 42, row: 1, column: 0, selectedPanelId: null},
      module: {id: 42, name: 'Row 1 A', hp: 4, standard: {id: 0}, functions: []}
    });
    const rowOneB = makeRackedModule({
      rackingData: {id: 43, rackid: 1, moduleid: 43, row: 1, column: 1, selectedPanelId: null},
      module: {id: 43, name: 'Row 1 B', hp: 8, standard: {id: 0}, functions: []}
    });

    service.singleRackData$.next(makeRack({rows: 2, hp: 84}));
    service.rowedRackedModules$.next([[rowZeroA, rowZeroB], [rowOneA, rowOneB]]);
    service.layoutScope$.next({rowIndex: 1});
    backend.update.rackedModules.calls.reset();

    service.requestLayoutRemix$.next();
    tick();

    const rows = service.rowedRackedModules$.value!;
    expect(rows.map(row => row.map(module => module.module.id))).toEqual([
      [40, 41],
      [43, 42]
    ]);
    expect(backend.update.rackedModules).toHaveBeenCalled();
  }));

  it('skips no-op and unavailable remix variants to find a later valid alternative', fakeAsync(() => {
    const {service, backend, snackBar} = build();
    const wideA = makeRackedModule({
      rackingData: {id: 30, rackid: 1, moduleid: 30, row: 0, column: 0, selectedPanelId: null},
      module: {id: 30, name: 'Wide A', hp: 6, standard: {id: 0}, functions: []}
    });
    const smallA = makeRackedModule({
      rackingData: {id: 31, rackid: 1, moduleid: 31, row: 0, column: 1, selectedPanelId: null},
      module: {id: 31, name: 'Small A', hp: 4, standard: {id: 0}, functions: []}
    });
    const wideB = makeRackedModule({
      rackingData: {id: 32, rackid: 1, moduleid: 32, row: 1, column: 0, selectedPanelId: null},
      module: {id: 32, name: 'Wide B', hp: 6, standard: {id: 0}, functions: []}
    });
    const smallB = makeRackedModule({
      rackingData: {id: 33, rackid: 1, moduleid: 33, row: 1, column: 1, selectedPanelId: null},
      module: {id: 33, name: 'Small B', hp: 4, standard: {id: 0}, functions: []}
    });

    service.singleRackData$.next(makeRack({rows: 2, hp: 10}));
    service.rowedRackedModules$.next([[wideA, smallA], [wideB, smallB]]);
    backend.update.rackedModules.calls.reset();

    service.requestLayoutRemix$.next();
    tick();

    const rows = service.rowedRackedModules$.value!;
    expect(rows.map(row => row.map(module => module.module.id))).toEqual([
      [32, 31],
      [33, 30]
    ]);
    expect(backend.update.rackedModules).toHaveBeenCalled();
    expect(snackBar.open).not.toHaveBeenCalledWith(
      'This rack is already arranged as tightly as Remix can make it.',
      jasmine.anything(),
      jasmine.anything()
    );
  }));

  it('duplicates a rack row below the source row without recreating existing rows', fakeAsync(() => {
    const {service, backend} = build();
    const rowZeroModule = makeRackedModule({
      rackingData: {id: 10, rackid: 1, moduleid: 5, row: 0, column: 0, selectedPanelId: null},
      module: {id: 5, name: 'VCO', hp: 8, standard: {id: 0}, functions: []}
    });
    const rowOneModule = makeRackedModule({
      rackingData: {id: 11, rackid: 1, moduleid: 6, row: 1, column: 0, selectedPanelId: null},
      module: {id: 6, name: 'VCF', hp: 10, standard: {id: 0}, functions: []}
    });
    const unrackedModule = makeRackedModule({
      rackingData: {id: 12, rackid: 1, moduleid: 7, row: null, column: null, selectedPanelId: null},
      module: {id: 7, name: 'VCA', hp: 6, standard: {id: 0}, functions: []}
    });
    const rowZero = [rowZeroModule];
    const rowOne = [rowOneModule];
    const unrackedRow = [unrackedModule];

    service.singleRackData$.next(makeRack({rows: 2}));
    service.rowedRackedModules$.next([rowZero, rowOne, unrackedRow]);
    backend.update.rackedModules.calls.reset();
    backend.update.rack.calls.reset();

    service.requestDuplicateRow$.next(0);
    tick();

    const rows = service.rowedRackedModules$.value!;
    expect(service.singleRackData$.value.rows).toBe(3);
    expect(rows.length).toBe(4);
    expect(rows[0]).toBe(rowZero);
    expect(rows[2]).toBe(rowOne);
    expect(rows[3]).toBe(unrackedRow);
    expect(rows[1]).not.toBe(rowZero);
    expect(rows[1][0].module.id).toBe(5);
    expect(rows[1][0].rackingData.id).toBeUndefined();
    expect(rows[1][0].rackingData.row).toBe(1);
    expect(rowOneModule.rackingData.row).toBe(2);
    expect(unrackedModule.rackingData.row).toBeNull();
    expect(backend.update.rack).toHaveBeenCalledWith(jasmine.objectContaining({rows: 3}));
    expect(backend.update.rackedModules).toHaveBeenCalled();
  }));

  it('patches duplicated row module ids by object reference after the row moves before persistence returns', fakeAsync(() => {
    const {service, backend} = build();
    const duplicatePersist$ = new Subject<any>();
    const rowZeroModule = makeRackedModule({
      rackingData: {id: 10, rackid: 1, moduleid: 5, row: 0, column: 0, selectedPanelId: null},
      module: {id: 5, name: 'VCO', hp: 8, standard: {id: 0}, functions: []}
    });
    const rowOneModule = makeRackedModule({
      rackingData: {id: 11, rackid: 1, moduleid: 6, row: 1, column: 0, selectedPanelId: null},
      module: {id: 6, name: 'VCF', hp: 10, standard: {id: 0}, functions: []}
    });

    backend.update.rackedModules.and.returnValues(
      duplicatePersist$.asObservable(),
      of({data: []})
    );
    service.singleRackData$.next(makeRack({rows: 2}));
    service.rowedRackedModules$.next([[rowZeroModule], [rowOneModule]]);

    service.requestDuplicateRow$.next(0);
    const duplicatedModule = service.rowedRackedModules$.value![1][0];
    service.requestMoveRow$.next({rowId: 1, direction: 'down'});
    tick();

    expect(duplicatedModule.rackingData.row).toBe(2);
    expect(duplicatedModule.rackingData.id).toBeUndefined();

    duplicatePersist$.next({
      data: [{
        id: 88,
        moduleid: 5,
        rackid: 1,
        row: 1,
        column: 0,
        selected_panel_id: null
      }]
    });
    duplicatePersist$.complete();
    tick();

    expect(duplicatedModule.rackingData.id).toBe(88);
    expect(duplicatedModule.rackingData.row).toBe(2);
  }));

  it('does not move the first row up', fakeAsync(() => {
    const {service, backend} = build();
    const rowZeroModule = makeRackedModule();

    service.singleRackData$.next(makeRack({rows: 2}));
    service.rowedRackedModules$.next([[rowZeroModule], []]);
    backend.update.rackedModules.calls.reset();

    service.requestMoveRow$.next({rowId: 0, direction: 'up'});
    tick();

    expect(service.rowedRackedModules$.value![0][0].module.id).toBe(5);
    expect(backend.update.rackedModules).not.toHaveBeenCalled();
  }));

  it('deletes an empty row and shifts rows below it up', fakeAsync(() => {
    const {service, backend} = build();
    const rowZeroModule = makeRackedModule({
      rackingData: {id: 10, rackid: 1, moduleid: 5, row: 0, column: 0, selectedPanelId: null},
      module: {id: 5, name: 'VCO', hp: 8, standard: {id: 0}, functions: []}
    });
    const rowTwoModule = makeRackedModule({
      rackingData: {id: 12, rackid: 1, moduleid: 7, row: 2, column: 0, selectedPanelId: null},
      module: {id: 7, name: 'VCA', hp: 6, standard: {id: 0}, functions: []}
    });

    const rowZero = [rowZeroModule];
    const rowOne: any[] = [];
    const rowTwo = [rowTwoModule];
    service.singleRackData$.next(makeRack({rows: 3}));
    service.rowedRackedModules$.next([rowZero, rowOne, rowTwo]);
    backend.update.rackedModules.calls.reset();
    backend.update.rack.calls.reset();
    backend.get.rackedModules.calls.reset();

    service.requestDeleteRow$.next(1);
    tick();

    expect(backend.update.rackedModules).toHaveBeenCalled();
    expect(service.rowedRackedModules$.value![0]).toBe(rowZero);
    expect(service.rowedRackedModules$.value![1]).toBe(rowTwo);
    const persistedModules = backend.update.rackedModules.calls.mostRecent().args[0];
    expect(persistedModules.find((module: any) => module.module.id === 7).rackingData.row).toBe(1);
    expect(backend.update.rack).toHaveBeenCalledWith(jasmine.objectContaining({rows: 2}));
    expect(backend.get.rackedModules).not.toHaveBeenCalled();
  }));

  it('does not delete a row that still has modules', fakeAsync(() => {
    const {service, backend} = build();
    const rowZeroModule = makeRackedModule();

    service.singleRackData$.next(makeRack({rows: 2}));
    service.rowedRackedModules$.next([[rowZeroModule], []]);
    backend.update.rackedModules.calls.reset();
    backend.update.rack.calls.reset();

    service.requestDeleteRow$.next(0);
    tick();

    expect(backend.update.rackedModules).not.toHaveBeenCalled();
    expect(backend.update.rack).not.toHaveBeenCalled();
  }));

  it('pre-fills formData.name.control with the current rack name when activating edit mode', fakeAsync(() => {
    const {service, backend} = build();
    backend.GET.rackWithId.and.returnValue(of({data: makeRack({name: 'My Rack', locked: true})}));

    service.updateSingleRackData$.next(1);
    tick();
    expect(service.isCurrentRackEditable$.value).toBeFalse();

    service.requestRackEditableStatusChange$.next();
    tick();

    expect(service.isCurrentRackEditable$.value).toBeTrue();
    expect(service.formData.name.control.value).toBe('My Rack');
  }));

  it('requestAddNewRow$ increments rows by 1 and calls backend.update.rack', fakeAsync(() => {
    const {service, backend} = build();
    backend.GET.rackWithId.and.returnValue(of({data: makeRack({rows: 3})}));

    service.updateSingleRackData$.next(1);
    tick();

    service.requestAddNewRow$.next();
    tick();

    const updatedRack = backend.update.rack.calls.mostRecent().args[0];
    expect(updatedRack.rows).toBe(4);
  }));

  it('requestRemoveRow$ decrements rows by 1 and calls backend.update.rack', fakeAsync(() => {
    const {service, backend} = build();
    backend.GET.rackWithId.and.returnValue(of({data: makeRack({rows: 3})}));

    service.updateSingleRackData$.next(1);
    tick();

    service.requestRemoveRow$.next();
    tick();

    const updatedRack = backend.update.rack.calls.mostRecent().args[0];
    expect(updatedRack.rows).toBe(2);
  }));

  it('requestRackedModuleRemoval$ removes module from local state and deletes from backend', fakeAsync(() => {
    const module = makeRackedModule();
    const {service, backend} = build();
    backend.GET.rackWithId.and.returnValue(of({data: makeRack({rows: 1})}));

    // First call returns the module; subsequent calls (after removal triggers a refresh) return []
    let rackedModulesCallCount = 0;
    backend.get.rackedModules.and.callFake(() => {
      rackedModulesCallCount++;
      return rackedModulesCallCount === 1 ? of([module]) : of([]);
    });

    service.updateSingleRackData$.next(1);
    tick();

    const before = service.rowedRackedModules$.value!.flat().length;
    expect(before).toBe(1);

    service.requestRackedModuleRemoval$.next(module);
    tick();

    expect(backend.delete.rackedModule).toHaveBeenCalledWith(10);
    // After re-fetch triggered by singleRackData$.next, the stub returns [] so final state is empty
    const after = service.rowedRackedModules$.value!.flat().length;
    expect(after).toBe(0);
  }));

  it('requestRackedModuleRemoval$ rolls back local state when backend delete fails', fakeAsync(() => {
    const module = makeRackedModule();
    const {service, backend, snackBar} = build();
    backend.GET.rackWithId.and.returnValue(of({data: makeRack({rows: 1})}));
    backend.get.rackedModules.and.returnValue(of([module]));

    service.updateSingleRackData$.next(1);
    tick();

    expect(service.rowedRackedModules$.value!.flat().length).toBe(1);

    backend.delete.rackedModule.and.returnValue(throwError(() => new Error('network error')));
    service.requestRackedModuleRemoval$.next(module);
    tick();

    // State should be restored to 1 module after rollback
    expect(service.rowedRackedModules$.value!.flat().length).toBe(1);
    expect(snackBar.open).toHaveBeenCalled();
  }));

  it('formData.name.control updates singleRackData$.value.name immediately when valid', fakeAsync(() => {
    const {service, backend} = build();
    backend.GET.rackWithId.and.returnValue(of({data: makeRack({name: 'Original'})}));

    service.updateSingleRackData$.next(1);
    tick();

    service.formData.name.control.setValue('Updated Name');
    tick();

    expect(service.singleRackData$.value?.name).toBe('Updated Name');
  }));

  it('formData.name.control does NOT update when value is invalid (too short)', fakeAsync(() => {
    const {service, backend} = build();
    backend.GET.rackWithId.and.returnValue(of({data: makeRack({name: 'Original'})}));

    service.updateSingleRackData$.next(1);
    tick();

    service.formData.name.control.setValue('AB');
    tick();

    expect(service.singleRackData$.value?.name).toBe('Original');
  }));

  it('formData.name.control debounces auto-save to backend after 800ms', fakeAsync(() => {
    const {service, backend} = build();
    backend.GET.rackWithId.and.returnValue(of({data: makeRack()}));

    service.updateSingleRackData$.next(1);
    tick();

    const callsBefore = backend.update.rack.calls.count();

    service.formData.name.control.setValue('New Name Here');
    tick(400); // not yet
    expect(backend.update.rack.calls.count()).toBe(callsBefore);

    tick(800); // debounce fires
    expect(backend.update.rack.calls.count()).toBeGreaterThan(callsBefore);
  }));

  it('functionAnalysisLegendItems$ emits when rowedRackedModules$ updates', fakeAsync(() => {
    const {service} = build();
    let emitted: any;
    service.functionAnalysisLegendItems$.subscribe(v => emitted = v);

    service.rowedRackedModules$.next([[makeRackedModule()]]);
    tick();

    expect(emitted).toBeDefined();
  }));

  it('rackStatistics$ is null when singleRackData$ is null, then populated on load', fakeAsync(() => {
    const {service, backend} = build();
    expect(service.rackStatistics$.value).toBeNull();

    const module = makeRackedModule({module: {id: 5, name: 'VCO', hp: 8, standard: {id: 0}, functions: []}});
    backend.get.rackedModules.and.returnValue(of([module]));

    service.updateSingleRackData$.next(1);
    tick();

    expect(service.rackStatistics$.value).not.toBeNull();
    const stat = service.rackStatistics$.value!.find(s => s.name === '8HP count');
    expect(stat?.value).toBe('1');
  }));

  it('setPublicDetailMode switches between private and public read paths', fakeAsync(() => {
    const {service, backend} = build();

    service.updateSingleRackData$.next(1);
    tick();
    expect(backend.GET.rackWithId).toHaveBeenCalled();

    service.setPublicDetailMode(true);
    service.updateSingleRackData$.next(1);
    tick();
    expect(backend.GET.publicRackWithId).toHaveBeenCalled();
  }));

});
