import {
  Observable,
  of
} from 'rxjs';
import {
  DbModule,
  RackedModule
} from 'src/app/models/module';
import {
  Rack,
  RackMinimal,
  RackingData
} from 'src/app/models/rack';
import { RackDetailDataService } from './rack-detail-data.service';
import {
  buildRowedModulesArray,
  calculateBlankIdForSizeAndStandard,
  isAnyModuleWithoutRackingId
} from './rack-detail-data.utils';

type ServiceConstructorArgs = ConstructorParameters<typeof RackDetailDataService>;
type BackendResponse<T> = {data: T};
type EmptyBackendResponse = Record<string, never>;
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
type RackModuleMutationResponse = EmptyBackendResponse | BackendResponse<RackModulePersistenceRow[]>;
type ModuleFixtureOverrides = Partial<Omit<DbModule, 'standard'>> & {
  standard?: Partial<DbModule['standard']>;
};
type RackDetailBackendDouble = {
  update: {
    rack: jasmine.Spy<(rack: Rack) => Observable<EmptyBackendResponse>>;
    rackedModules: jasmine.Spy<(modules: RackedModule[]) => Observable<RackModuleMutationResponse>>;
  };
  delete: {
    rackedModule: jasmine.Spy<(rackModuleId: number) => Observable<EmptyBackendResponse>>;
    rackedModules: jasmine.Spy<(rackModuleIds: number[]) => Observable<EmptyBackendResponse>>;
    modulesOfRack: jasmine.Spy<(rackId: number) => Observable<EmptyBackendResponse>>;
    commentsForRack: jasmine.Spy<(rackId: number) => Observable<EmptyBackendResponse>>;
    userRack: jasmine.Spy<(rackId: number) => Observable<EmptyBackendResponse>>;
  };
  add: {
    rackModule: jasmine.Spy<(
      moduleId: number,
      rackId: number,
      row: number | null,
      column: number | null
    ) => Observable<EmptyBackendResponse>>;
    rack: jasmine.Spy<(rack: Pick<RackMinimal, 'name' | 'hp' | 'rows' | 'public' | 'locked'>) =>
      Observable<BackendResponse<Array<{id: number}>>>>;
  };
  get: {
    rackedModules: jasmine.Spy<(rackId: number) => Observable<RackedModule[]>>;
  };
  GET: {
    rackWithId: jasmine.Spy<(rackId: number) => Observable<BackendResponse<Rack | null>>>;
  };
  storage: {
    uploadRackImage: jasmine.Spy<(file: Blob | File, filenameAndExtension: string) => Observable<string>>;
    deleteRackImage: jasmine.Spy<(filenameAndExtension: string) => Observable<EmptyBackendResponse>>;
  };
  auth: {
    hasAdminRole$: jasmine.Spy<() => Observable<boolean>>;
  };
};
type TestDialogResult = {answer: boolean};
type TestDialog = {
  open: jasmine.Spy<() => {
    afterClosed: () => Observable<TestDialogResult>;
  }>;
};
type RackDetailHelperAccess = {
  bumpUpVersionInNameOfOfRack: () => string;
  updateModulesColumnIds: (rackModules: RackedModule[][], row: number | undefined) => void;
  transferInRow: (
    rackedModules: RackedModule[][],
    row: number,
    event: {previousIndex: number; currentIndex: number}
  ) => void;
  transferBetweenRows: (
    rackedModules: RackedModule[][],
    rackedModule: RackedModule,
    event: {currentIndex: number},
    newRow: number
  ) => void;
  removeRackedModuleFromRack: (rackedModules: RackedModule[][], toRemove: RackedModule) => void;
  duplicateModule: (rackedModules: RackedModule[][], rackedModule: RackedModule) => void;
  removeInformationFromModulesOfCurrentRack: (newlyCreatedRackId: number) => RackedModule[][];
  callBackendToUpdateModulesOfRack: (
    rackModules: RackedModule[][],
    rack: Rack
  ) => Observable<RackModuleMutationResponse | undefined>;
  createNewRackOnBackendForCurrentUser: (userId: string) => Observable<BackendResponse<Array<{id: number}>>>;
  askForConfirmationWhenDuplicatingRack: () => Observable<TestDialogResult>;
};

describe('RackDetailDataService helpers', () => {
  let createdServices: RackDetailDataService[];

  function moduleFixture(
    id: number,
    name: string,
    hp = 8,
    standardId = 0,
    overrides: ModuleFixtureOverrides = {}
  ): DbModule {
    const {standard, ...moduleOverrides} = overrides;

    return {
      id,
      name,
      description: '',
      hp,
      public: true,
      manufacturer: {id: 1, name: 'Maker'},
      manufacturerId: 1,
      standard: {id: standardId, name: standardId === 0 ? 'Eurorack' : 'Intellijel 1U', ...standard},
      tags: [],
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

  function helperAccess(service: RackDetailDataService): RackDetailHelperAccess {
    return service as unknown as RackDetailHelperAccess;
  }

  function rackingIds(row: RackedModule[]): Array<number | undefined> {
    return row.map(module => module.rackingData.id);
  }

  function columns(row: RackedModule[]): Array<number | null> {
    return row.map(module => module.rackingData.column);
  }

  function build() {
    const backend: RackDetailBackendDouble = {
      update: {
        rack: jasmine.createSpy('update.rack').and.returnValue(of({})),
        rackedModules: jasmine.createSpy('update.rackedModules').and.returnValue(of({}))
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
        rack: jasmine.createSpy('add.rack').and.returnValue(of({data: [{id: 999}]}))
      },
      get: {
        rackedModules: jasmine.createSpy('get.rackedModules').and.returnValue(of([]))
      },
      GET: {
        rackWithId: jasmine.createSpy('GET.rackWithId').and.returnValue(of({data: null}))
      },
      storage: {
        uploadRackImage: jasmine.createSpy('storage.uploadRackImage').and.returnValue(of('img.jpg')),
        deleteRackImage: jasmine.createSpy('storage.deleteRackImage').and.returnValue(of({}))
      },
      auth: {
        hasAdminRole$: jasmine.createSpy('auth.hasAdminRole$').and.returnValue(of(false))
      }
    };
    
    const dialog = {
      open: jasmine.createSpy('open').and.returnValue({
        afterClosed: () => of({answer: true})
      })
    };
    
    const service = new RackDetailDataService(
      {open: jasmine.createSpy('snack.open')} as unknown as ServiceConstructorArgs[0],
      {loggedUser$: of(undefined)} as unknown as ServiceConstructorArgs[1],
      backend as unknown as ServiceConstructorArgs[2],
      dialog as unknown as ServiceConstructorArgs[3],
      jasmine.createSpyObj('Router', ['navigate']),
      {capture: () => {}, identify: () => {}, reset: () => {}} as unknown as ServiceConstructorArgs[5]
    );
    createdServices.push(service);
    
    return {service, backend, dialog};
  }

  beforeEach(() => {
    createdServices = [];
  });

  afterEach(() => {
    createdServices.forEach((service) => service.ngOnDestroy());
  });
  
  function mod(id: number | undefined, row: number | null, column: number | null, hp = 8, standardId = 0): RackedModule {
    const moduleId = id === undefined ? Number.NaN : 1000 + id;
    const rackingData: RackingData = {
      rackid: 1,
      moduleid: moduleId,
      row,
      column
    };
    if (id !== undefined) {
      rackingData.id = id;
    }

    return {
      module: moduleFixture(moduleId, `M${ id }`, hp, standardId),
      rackingData
    };
  }
  
  it('maps blank panel IDs for 3U and Intellijel standards', () => {
    const standard0Map: Record<number, number> = {
      1: 4666, 2: 4647, 3: 4665, 4: 4648, 5: 4664,
      6: 4649, 7: 4650, 8: 4651, 9: 4652, 10: 4653,
      11: 4654, 12: 4655, 13: 4656, 14: 4657, 15: 4658,
      16: 4659, 17: 4660, 18: 4661, 19: 4662, 20: 4663
    };
    Object.entries(standard0Map).forEach(([hp, id]) => {
      expect(calculateBlankIdForSizeAndStandard(Number(hp), 0)).toBe(id);
    });
    
    const standard1Map: Record<number, number> = {
      1: 4711, 2: 4712, 3: 4713, 4: 4714, 5: 4715,
      6: 4716, 7: 4717, 8: 4718, 9: 4719, 10: 4720,
      11: 4721, 12: 4722, 13: 4723, 14: 4724, 15: 4725,
      16: 4726, 17: 4727, 18: 4728, 19: 4729, 20: 4730,
      21: 4731, 22: 4732, 23: 4733, 24: 4734, 25: 4735
    };
    Object.entries(standard1Map).forEach(([hp, id]) => {
      expect(calculateBlankIdForSizeAndStandard(Number(hp), 1)).toBe(id);
    });
    
    expect(calculateBlankIdForSizeAndStandard(99, 0)).toBe(-1);
    expect(calculateBlankIdForSizeAndStandard(99, 1)).toBe(-1);
    expect(calculateBlankIdForSizeAndStandard(8, 999)).toBe(-1);
  });
  
  it('bumps rack version suffix or appends V2', () => {
    const {service} = build();
    const bump = helperAccess(service).bumpUpVersionInNameOfOfRack.bind(service);
    
    service.singleRackData$.next(rack({name: 'My Rack V2'}));
    expect(bump()).toBe('My Rack V3');
    
    service.singleRackData$.next(rack({name: 'My Rack'}));
    expect(bump()).toBe('My Rack V2');
  });
  
  it('builds rowed module arrays and appends unracked row', () => {
    const rowed = buildRowedModulesArray(
      [mod(1, 0, 0), mod(2, 1, 0), mod(3, null, null)],
      rack({rows: 2})
    );
    
    expect(rowed.length).toBe(3);
    expect(rackingIds(rowed[0])).toEqual([1]);
    expect(rackingIds(rowed[1])).toEqual([2]);
    expect(rackingIds(rowed[2])).toEqual([3]);
  });
  
  it('updates module columns and supports in-row and cross-row transfer', () => {
    const {service} = build();
    const helpers = helperAccess(service);
    const updateCols = helpers.updateModulesColumnIds.bind(service);
    const transferInRow = helpers.transferInRow.bind(service);
    const transferBetweenRows = helpers.transferBetweenRows.bind(service);
    
    const rows: RackedModule[][] = [[mod(1, 0, 0), mod(2, 0, 1)], [mod(3, 1, 0)]];
    updateCols(rows, undefined);
    transferInRow(rows, 0, {previousIndex: 0, currentIndex: 1});
    expect(rackingIds(rows[0])).toEqual([2, 1]);
    expect(columns(rows[0])).toEqual([0, 1]);
    
    transferBetweenRows(rows, rows[0][0], {currentIndex: 1}, 1);
    expect(rackingIds(rows[1])).toEqual([3, 2]);
    expect(columns(rows[1])).toEqual([0, 1]);
  });
  
  it('removes modules and handles unracked-row cleanup', () => {
    const {service} = build();
    const remove = helperAccess(service).removeRackedModuleFromRack.bind(service);
    
    const a = mod(1, 0, 0);
    const b = mod(2, 0, 1);
    const unracked = mod(99, null, null);
    const rows: RackedModule[][] = [[a, b], [unracked]];
    
    remove(rows, a);
    expect(rackingIds(rows[0])).toEqual([2]);
    expect(rows[0][0].rackingData.column).toBe(0);
    
    remove(rows, unracked);
    expect(rows.length).toBe(1);
  });
  
  it('duplicates modules for both racked and unracked cases', () => {
    const {service} = build();
    const duplicate = helperAccess(service).duplicateModule.bind(service);
    
    const rackedRows: RackedModule[][] = [[mod(1, 0, 0)]];
    duplicate(rackedRows, rackedRows[0][0]);
    expect(rackedRows[0].length).toBe(2);
    expect(rackedRows[0][1].rackingData.id).toBeUndefined();
    expect(columns(rackedRows[0])).toEqual([0, 1]);
    
    const unrackedRows: RackedModule[][] = [[], [mod(50, null, null)]];
    duplicate(unrackedRows, unrackedRows[1][0]);
    expect(unrackedRows[1].length).toBe(2);
    expect(unrackedRows[1][1].rackingData.id).toBeUndefined();
  });

  it('duplicates beside the current source index even when stored columns are stale', () => {
    const {service} = build();
    const duplicate = helperAccess(service).duplicateModule.bind(service);

    const source = mod(1, 0, 2);
    const neighbor = mod(2, 0, 0);
    const rows: RackedModule[][] = [[source, neighbor]];

    duplicate(rows, source);

    expect(rackingIds(rows[0])).toEqual([1, undefined, 2]);
    expect(columns(rows[0])).toEqual([0, 1, 2]);
  });
  
  it('preserves selectedPanelId when duplicating a module', () => {
    const {service} = build();
    const duplicate = helperAccess(service).duplicateModule.bind(service);
    
    const source = mod(1, 0, 0);
    source.rackingData.selectedPanelId = 3;
    const rows: RackedModule[][] = [[source]];
    
    duplicate(rows, rows[0][0]);
    
    expect(rows[0].length).toBe(2);
    expect(rows[0][1].rackingData.selectedPanelId).toBe(3);
    expect(rows[0][1].rackingData.id).toBeUndefined();
  });

  it('strips module identifiers when copying to new rack and detects unsynced modules', () => {
    const {service} = build();
    const strip = helperAccess(service).removeInformationFromModulesOfCurrentRack.bind(service);
    
    service.rowedRackedModules$.next([[mod(1, 0, 0), mod(2, 0, 1)]]);
    const copied = strip(77);
    
    expect(copied[0][0].rackingData.rackid).toBe(77);
    expect(copied[0][0].rackingData.id).toBeUndefined();
    expect(isAnyModuleWithoutRackingId(copied)).toBeTrue();
  });
  
  it('syncs rack modules through backend and assigns returned ids without refreshing rack', () => {
    const {service, backend} = build();
    const sync = helperAccess(service).callBackendToUpdateModulesOfRack.bind(service);
    const rackData = rack({id: 1, name: 'Rack', rows: 2, hp: 84});
    const nextSpy = spyOn(service.singleRackData$, 'next').and.callThrough();
    const rows: RackedModule[][] = [[mod(undefined, 0, 0), mod(2, 0, 1)]];
    backend.update.rackedModules.and.returnValue(of({
      data: [{
        id: 99,
        moduleid: rows[0][0].rackingData.moduleid,
        rackid: rows[0][0].rackingData.rackid,
        row: 0,
        column: 0,
        selected_panel_id: null
      }]
    }));
    
    sync(rows, rackData).subscribe();
    
    expect(backend.update.rackedModules).toHaveBeenCalledWith(rows.flatMap(x => x));
    expect(rows[0][0].rackingData.id).toBe(99);
    expect(nextSpy).not.toHaveBeenCalled();
  });

  it('does not call backend.update.rackedModules when there are no modules to sync', () => {
    const {service, backend} = build();
    const sync = helperAccess(service).callBackendToUpdateModulesOfRack.bind(service);

    sync([[], []], rack({id: 1, rows: 2})).subscribe(value => {
      expect(value).toBeUndefined();
    });

    expect(backend.update.rackedModules).not.toHaveBeenCalled();
  });
  
  it('creates duplicated rack payload for current user without reusing preview media and confirms duplication dialog', () => {
    const {service, backend, dialog} = build();
    const helpers = helperAccess(service);
    const create = helpers.createNewRackOnBackendForCurrentUser.bind(service);
    const ask = helpers.askForConfirmationWhenDuplicatingRack.bind(service);
    service.singleRackData$.next(rack({
      name: 'Demo Rack',
      hp: 104,
      rows: 3,
      image: 'img.jpg'
    }));
    
    create('user-2').subscribe();
    
    expect(backend.add.rack).toHaveBeenCalledWith({
      name: 'Demo Rack V2',
      hp: 104,
      rows: 3,
      public: true,
      locked: false
    });
    
    ask().subscribe(value => {
      expect(value).toEqual({answer: true});
    });
    expect(dialog.open).toHaveBeenCalled();
  });
});
