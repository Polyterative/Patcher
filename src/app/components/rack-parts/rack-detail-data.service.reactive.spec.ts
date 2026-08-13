import {
  CdkDragDrop
} from '@angular/cdk/drag-drop';
import { ElementRef } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import {
  MatSnackBar,
  MatSnackBarRef,
  TextOnlySnackBar
} from '@angular/material/snack-bar';
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
  RackMinimal,
  RackingData
} from 'src/app/models/rack';
import { TagType } from 'src/app/models/tag';
import { SharedConstants } from 'src/app/shared-interproject/SharedConstants';
import { RackDetailDataService } from './rack-detail-data.service';

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

describe('RackDetailDataService reactive flows', () => {
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

  function tagEntry(name: string, type: TagType, votes = 0): DbModule['tags'][number] {
    return {
      id: type * 100 + votes,
      tag: {id: type, name, type},
      voteCount: Array.from({length: votes}, (_, moduletagid) => ({moduletagid}))
    };
  }

  function moduleInRack(
    id: number | undefined,
    row: number | null,
    column: number | null,
    hp = 8,
    standardId = 0
  ): RackedModule {
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

  function rackingIds(row: RackedModule[]): Array<number | undefined> {
    return row.map(module => module.rackingData.id);
  }

  function moduleIds(row: RackedModule[]): number[] {
    return row.map(module => module.module.id);
  }

  function rowRackingIds(rows: RackedModule[][] | null): Array<Array<number | undefined>> {
    return (rows ?? []).map(rackingIds);
  }

  function dragDropEvent(previousIndex: number, currentIndex: number): CdkDragDrop<ElementRef> {
    return {previousIndex, currentIndex} as CdkDragDrop<ElementRef>;
  }

  function snackBarRefWithAction(action$: Subject<void>): MatSnackBarRef<TextOnlySnackBar> {
    return {
      onAction: () => action$.asObservable()
    } as MatSnackBarRef<TextOnlySnackBar>;
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
          data: [{id: 88, moduleid: 4651, rackid: 1, row: 0, column: 0, selected_panel_id: null}]
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
    
    return {service, backend, dialog, snackBar, router, loggedUser$, analytics};
  }

  beforeEach(() => {
    createdServices = [];
  });

  afterEach(() => {
    createdServices.forEach((service) => service.ngOnDestroy());
  });

  it('derives the weakest rack balance axis from current rowed modules', () => {
    const {service} = build();
    let weakestAxisId: string | null | undefined;
    service.weakestBalanceAxis$.subscribe(axis => weakestAxisId = axis?.id ?? null);

    service.rowedRackedModules$.next([[
      {
        ...moduleInRack(1, 0, 0),
        module: {
          ...moduleInRack(1, 0, 0).module,
          tags: [tagEntry('VCO', TagType.Source)]
        }
      }
    ]]);

    expect(weakestAxisId).toBe('modulation');
  });

  it('does not derive a weakest balance axis for an empty rack', () => {
    const {service} = build();
    let weakestAxisId: string | null | undefined = undefined;
    service.weakestBalanceAxis$.subscribe(axis => weakestAxisId = axis?.id ?? null);

    service.rowedRackedModules$.next([[]]);

    expect(weakestAxisId).toBeNull();
  });
  
  it('adds and removes rack rows locally without refreshing rack data', () => {
    const {service, backend} = build();
    service.singleRackData$.next(rack({id: 7, rows: 2}));
    const placedRow = [moduleInRack(1, 0, 0)];
    const emptyRow: RackedModule[] = [];
    const unrackedModule = moduleInRack(3, null, null);
    const unrackedRow = [unrackedModule];
    service.rowedRackedModules$.next([
      placedRow,
      emptyRow,
      unrackedRow
    ]);
    const refreshSpy = spyOn(service.updateSingleRackData$, 'next').and.callThrough();
    
    service.requestAddNewRow$.next();
    expect(service.singleRackData$.value.rows).toBe(3);
    expect(service.rowedRackedModules$.value.length).toBe(4);
    expect(service.rowedRackedModules$.value[0]).toBe(placedRow);
    expect(service.rowedRackedModules$.value[1]).toBe(emptyRow);
    expect(service.rowedRackedModules$.value[2]).toEqual([]);
    expect(service.rowedRackedModules$.value[3]).toBe(unrackedRow);
    expect(service.rowedRackedModules$.value[3][0].rackingData.id).toBe(3);

    service.requestRemoveRow$.next();
    
    expect(backend.update.rack).toHaveBeenCalledTimes(2);
    expect(service.singleRackData$.value.rows).toBe(2);
    expect(service.rowedRackedModules$.value.length).toBe(3);
    expect(service.rowedRackedModules$.value[0]).toBe(placedRow);
    expect(service.rowedRackedModules$.value[1]).toBe(emptyRow);
    expect(service.rowedRackedModules$.value[2]).toBe(unrackedRow);
    expect(service.rowedRackedModules$.value[2][0].rackingData.id).toBe(3);
    expect(refreshSpy).not.toHaveBeenCalled();
  });

  it('does not remove the last rack row when it still contains modules', () => {
    spyOn(SharedConstants, 'infoCustom').and.callFake(() => {
    });
    const {service, backend} = build();
    service.singleRackData$.next(rack({id: 7, rows: 2}));
    service.rowedRackedModules$.next([
      [],
      [moduleInRack(2, 1, 0)]
    ]);

    service.requestRemoveRow$.next();

    expect(service.singleRackData$.value.rows).toBe(2);
    expect(service.rowedRackedModules$.value.length).toBe(2);
    expect(backend.update.rack).not.toHaveBeenCalled();
    expect(SharedConstants.infoCustom).toHaveBeenCalled();
  });
  
  it('toggles privacy and editable state and persists to backend', () => {
    const {service, backend} = build();
    service.singleRackData$.next(rack({public: true, locked: false}));
    
    service.requestRackPrivacyStatusChange$.next();
    expect(service.isCurrentRackPrivate$.value).toBeTrue();
    
    service.requestRackEditableStatusChange$.next();
    expect(service.isCurrentRackEditable$.value).toBeFalse();
    expect(backend.update.rack).toHaveBeenCalled();
  });
  
  it('reverts rack.public and isCurrentRackPrivate$ when privacy toggle persist fails', () => {
    spyOn(SharedConstants, 'errorCustom').and.callFake(() => {
    });
    const {service, backend} = build();
    service.singleRackData$.next(rack({public: true}));
    const preToggle = service.isCurrentRackPrivate$.value;
    
    backend.update.rack.and.returnValue(throwError(() => new Error('privacy update failed')));
    service.requestRackPrivacyStatusChange$.next();
    
    expect(service.isCurrentRackPrivate$.value).toBe(preToggle);
    expect(service.singleRackData$.value?.public).toBeTrue();
    expect(SharedConstants.errorCustom).toHaveBeenCalled();
  });
  
  it('reverts rack.locked, isCurrentRackEditable$, and the name control when edit-lock toggle persist fails', () => {
    spyOn(SharedConstants, 'errorCustom').and.callFake(() => {
    });
    const {service, backend} = build();
    service.singleRackData$.next(rack({locked: true, name: 'Original Name'}));
    service.formData.name.control.setValue('Original Name', {emitEvent: false});
    const preToggleEditable = service.isCurrentRackEditable$.value;
    const preToggleLocked = service.singleRackData$.value?.locked;
    const preToggleName = service.formData.name.control.value;
    
    backend.update.rack.and.returnValue(throwError(() => new Error('edit lock update failed')));
    service.requestRackEditableStatusChange$.next();
    
    expect(service.isCurrentRackEditable$.value).toBe(preToggleEditable);
    expect(service.singleRackData$.value?.locked).toBe(preToggleLocked);
    expect(service.formData.name.control.value).toBe(preToggleName);
    expect(SharedConstants.errorCustom).toHaveBeenCalled();
  });
  
  it('rejects replace-with-blank when module HP exceeds standard limits', () => {
    const {service, snackBar} = build();
    service.rowedRackedModules$.next([[moduleInRack(1, 0, 0, 21, 0)]]);
    service.singleRackData$.next(rack());
    
    service.requestRackedModuleReplaceWithBlank$.next(moduleInRack(1, 0, 0, 21, 0));
    service.requestRackedModuleReplaceWithBlank$.next(moduleInRack(2, 0, 0, 27, 1));
    
    expect(snackBar.open).toHaveBeenCalled();
  });

  it('summarizes function-analysis coverage and residual modules from rack rows', () => {
    const {service} = build();
    const voice = moduleInRack(1, 0, 0, 8, 0);
    voice.module.tags = [tagEntry('VCO', TagType.Source, 3)];
    const unclassified = moduleInRack(2, 0, 1, 6, 0);
    let residual: string | null | undefined;
    let summary: string | undefined;

    service.functionAnalysisResidualLabel$.subscribe(value => residual = value);
    service.functionAnalysisCoverageSummary$.subscribe(value => summary = value);
    service.rowedRackedModules$.next([[voice, unclassified]]);

    expect(summary).toBe('Tracked 1/2 modules · 8/14HP');
    expect(residual).toBe('1 blank or unclassified (6HP)');

    service.rowedRackedModules$.next([]);
    expect(summary).toBe('No modules to classify yet.');
    expect(residual).toBeNull();
  });

  it('ignores row add/remove requests when rack data is missing', () => {
    const {service, backend} = build();
    service.singleRackData$.next(undefined);
    service.rowedRackedModules$.next([]);

    service.requestAddNewRow$.next();
    service.requestRemoveRow$.next();

    expect(backend.update.rack).not.toHaveBeenCalled();
  });

  it('pads missing rows before adding and removing rows', () => {
    const {service, backend} = build();
    service.singleRackData$.next(rack({rows: 3}));
    service.rowedRackedModules$.next([[moduleInRack(1, 0, 0)]]);

    service.requestAddNewRow$.next();
    expect(service.rowedRackedModules$.value.length).toBe(4);
    expect(service.rowedRackedModules$.value[1]).toEqual([]);
    expect(service.rowedRackedModules$.value[2]).toEqual([]);
    expect(backend.update.rack).toHaveBeenCalledWith(jasmine.objectContaining({rows: 4}));

    service.singleRackData$.next(rack({rows: 3}));
    service.rowedRackedModules$.next([[moduleInRack(2, 0, 0)]]);
    service.requestRemoveRow$.next();
    expect(service.singleRackData$.value.rows).toBe(2);
    expect(service.rowedRackedModules$.value.length).toBe(2);
    expect(service.rowedRackedModules$.value[1]).toEqual([]);
  });

  it('rolls back add and remove row changes when rack persistence fails', () => {
    spyOn(SharedConstants, 'errorCustom').and.callFake(() => {});
    const {service, backend} = build();
    backend.update.rack.and.returnValue(throwError(() => new Error('rack update failed')));
    const originalRows = [[moduleInRack(1, 0, 0)]];
    service.singleRackData$.next(rack({rows: 2}));
    service.rowedRackedModules$.next(originalRows);

    service.requestAddNewRow$.next();

    expect(service.singleRackData$.value.rows).toBe(2);
    expect(service.rowedRackedModules$.value).toEqual(originalRows);

    service.rowedRackedModules$.next([originalRows[0], []]);
    service.requestRemoveRow$.next();

    expect(service.singleRackData$.value.rows).toBe(2);
    expect(service.rowedRackedModules$.value).toEqual([originalRows[0], []]);
    expect(SharedConstants.errorCustom).toHaveBeenCalledTimes(2);
  });

  it('optimistically adds a picker module before backend racking id is returned', () => {
    const {service, backend} = build();
    const addResult$ = new Subject<RackModuleMutationResponse>();
    backend.add.rackModule.and.returnValue(addResult$.asObservable());
    const refreshSpy = spyOn(service.updateSingleRackData$, 'next').and.callThrough();
    const module = moduleFixture(77, 'New module', 10, 0);
    service.singleRackData$.next(rack({id: 1, rows: 1, name: 'Add Rack'}));
    service.rowedRackedModules$.next([[moduleInRack(1, 0, 0)]]);

    service.addModuleToRack$.next(module);

    let rows = service.rowedRackedModules$.value;
    expect(rows.length).toBe(2);
    expect(rows[1][0].module.id).toBe(77);
    expect(rows[1][0].rackingData.id).toBeUndefined();
    expect(backend.add.rackModule).toHaveBeenCalledWith(77, 1);
    expect(refreshSpy).not.toHaveBeenCalled();

    addResult$.next({
      data: [{id: 99, moduleid: 77, rackid: 1, row: null, column: null, selected_panel_id: null}]
    });
    addResult$.complete();

    rows = service.rowedRackedModules$.value;
    expect(rows[1][0].rackingData.id).toBe(99);
    expect(refreshSpy).not.toHaveBeenCalled();
  });

  it('rolls back optimistic picker module add when backend persistence fails', () => {
    spyOn(SharedConstants, 'errorCustom').and.callFake(() => {});
    const {service, backend} = build();
    backend.add.rackModule.and.returnValue(throwError(() => new Error('add failed')));
    const originalRows = [[moduleInRack(1, 0, 0)]];
    service.singleRackData$.next(rack({id: 1, rows: 1}));
    service.rowedRackedModules$.next(originalRows);

    service.addModuleToRack$.next(moduleFixture(77, 'New module', 10, 0));

    expect(service.rowedRackedModules$.value).toEqual(originalRows);
    expect(SharedConstants.errorCustom).toHaveBeenCalled();
  });

  it('adds a blank panel to a row without reloading the rack', () => {
    const {service, backend} = build();
    const refreshSpy = spyOn(service.updateSingleRackData$, 'next').and.callThrough();
    service.singleRackData$.next(rack({id: 1, rows: 1}));
    service.rowedRackedModules$.next([[moduleInRack(1, 0, 0)]]);

    service.addBlankToRow$.next({rowId: 0, hp: 8});

    expect(backend.GET.moduleWithIdForRackDisplay).toHaveBeenCalledWith(4651);
    expect(backend.add.rackModule).toHaveBeenCalledWith(4651, 1, 0, 1);
    expect(service.rowedRackedModules$.value[0].length).toBe(2);
    expect(service.rowedRackedModules$.value[0][1].module.id).toBe(4651);
    expect(service.rowedRackedModules$.value[0][1].rackingData.id).toBe(88);
    expect(refreshSpy).not.toHaveBeenCalled();
  });

  it('rolls back optimistic blank panel add when backend persistence fails', () => {
    spyOn(SharedConstants, 'errorCustom').and.callFake(() => {});
    const {service, backend} = build();
    backend.add.rackModule.and.returnValue(throwError(() => new Error('blank add failed')));
    service.singleRackData$.next(rack({id: 1, rows: 1}));
    service.rowedRackedModules$.next([[moduleInRack(1, 0, 0)]]);

    service.addBlankToRow$.next({rowId: 0, hp: 8});

    expect(service.rowedRackedModules$.value[0].length).toBe(1);
    expect(service.rowedRackedModules$.value[0][0].module.id).toBe(1001);
    expect(SharedConstants.errorCustom).toHaveBeenCalled();
  });

  it('rolls back move, duplicate, and delete row changes when persistence fails', () => {
    spyOn(SharedConstants, 'errorCustom').and.callFake(() => {});
    spyOn(SharedConstants, 'infoCustom').and.callFake(() => {});
    const {service, backend} = build();
    const rowZero = [moduleInRack(1, 0, 0)];
    const rowOne: RackedModule[] = [];
    const rowTwo = [moduleInRack(2, 2, 0)];
    service.singleRackData$.next(rack({rows: 3}));
    service.rowedRackedModules$.next([rowZero, rowOne, rowTwo]);

    backend.update.rackedModules.and.returnValue(throwError(() => new Error('module update failed')));
    service.requestMoveRow$.next({rowId: 2, direction: 'up'});
    expect(service.rowedRackedModules$.value[0][0].rackingData.id).toBe(1);
    expect(service.rowedRackedModules$.value[2][0].rackingData.id).toBe(2);

    service.requestDuplicateRow$.next(-1);
    expect(SharedConstants.infoCustom).toHaveBeenCalledWith(jasmine.anything(), 'This row cannot be duplicated.');

    backend.update.rackedModules.and.returnValue(of({}));
    backend.update.rack.and.returnValue(throwError(() => new Error('rack update failed')));
    service.requestDuplicateRow$.next(0);
    expect(service.singleRackData$.value.rows).toBe(3);
    expect(rowRackingIds(service.rowedRackedModules$.value)).toEqual([[1], [], [2]]);

    service.requestDeleteRow$.next(1);
    expect(service.singleRackData$.value.rows).toBe(3);
    expect(rowRackingIds(service.rowedRackedModules$.value)).toEqual([[1], [], [2]]);
    expect(SharedConstants.errorCustom).toHaveBeenCalledTimes(3);
  });
  
  it('replaces a module with a blank without refreshing rack modules', () => {
    const {service, backend} = build();
    const currentRack = rack({id: 1});
    service.singleRackData$.next(currentRack);
    service.rowedRackedModules$.next([[moduleInRack(1, 0, 0, 8, 0)]]);
    const refreshSpy = spyOn(service.updateSingleRackData$, 'next').and.callThrough();
    
    service.requestRackedModuleReplaceWithBlank$.next(moduleInRack(1, 0, 0, 8, 0));
    
    expect(backend.GET.moduleWithIdForRackDisplay).toHaveBeenCalledWith(4651);
    expect(backend.delete.rackedModule).toHaveBeenCalled();
    expect(backend.add.rackModule).toHaveBeenCalled();
    expect(refreshSpy).not.toHaveBeenCalled();
    expect(service.rowedRackedModules$.value[0][0].module.id).toBe(4651);
    expect(service.rowedRackedModules$.value[0][0].rackingData.id).toBe(88);
  });

  it('guards replace-with-blank when the module cannot be safely replaced', () => {
    spyOn(SharedConstants, 'errorCustom').and.callFake(() => {});
    const {service, backend} = build();
    service.singleRackData$.next(rack());

    service.rowedRackedModules$.next([[moduleInRack(undefined, 0, 0, 8, 0)]]);
    service.requestRackedModuleReplaceWithBlank$.next(service.rowedRackedModules$.value[0][0]);

    service.rowedRackedModules$.next([[moduleInRack(2, 0, 0, 26, 1)]]);
    service.requestRackedModuleReplaceWithBlank$.next(service.rowedRackedModules$.value[0][0]);

    service.rowedRackedModules$.next([[]]);
    service.requestRackedModuleReplaceWithBlank$.next(moduleInRack(3, 0, 0, 8, 0));

    expect(backend.GET.moduleWithIdForRackDisplay).not.toHaveBeenCalled();
    expect(SharedConstants.errorCustom).toHaveBeenCalledTimes(3);
  });

  it('rolls back replace-with-blank when deleting the original module fails', () => {
    spyOn(SharedConstants, 'errorCustom').and.callFake(() => {});
    const {service, backend} = build();
    const original = moduleInRack(1, 0, 0, 8, 0);
    service.singleRackData$.next(rack());
    service.rowedRackedModules$.next([[original]]);
    backend.delete.rackedModule.and.returnValue(throwError(() => new Error('delete failed')));

    service.requestRackedModuleReplaceWithBlank$.next(original);

    expect(service.rowedRackedModules$.value[0][0].rackingData.id).toBe(1);
    expect(service.rowedRackedModules$.value[0][0].module.id).toBe(1001);
    expect(backend.add.rackModule).not.toHaveBeenCalled();
    expect(SharedConstants.errorCustom).toHaveBeenCalled();
  });

  it('removes the original module when replacement blank add fails after delete succeeds', () => {
    spyOn(SharedConstants, 'errorCustom').and.callFake(() => {});
    const {service, backend} = build();
    const original = moduleInRack(1, 0, 0, 8, 0);
    service.singleRackData$.next(rack());
    service.rowedRackedModules$.next([[original]]);
    backend.add.rackModule.and.returnValue(throwError(() => new Error('add failed')));
    const syncSpy = spyOn(service.requestRackedModulesDbSync$, 'next').and.callThrough();

    service.requestRackedModuleReplaceWithBlank$.next(original);

    expect(backend.delete.rackedModule).toHaveBeenCalledWith(1);
    expect(service.rowedRackedModules$.value[0]).toEqual([]);
    expect(syncSpy).toHaveBeenCalled();
    expect(SharedConstants.errorCustom).toHaveBeenCalled();
  });

  it('shows a replace-with-blank preparation error when blank lookup fails or returns no data', () => {
    spyOn(SharedConstants, 'errorCustom').and.callFake(() => {});
    const {service, backend} = build();
    service.singleRackData$.next(rack());
    service.rowedRackedModules$.next([[moduleInRack(1, 0, 0, 8, 0)]]);
    backend.GET.moduleWithIdForRackDisplay.and.returnValue(of({data: null}));

    service.requestRackedModuleReplaceWithBlank$.next(service.rowedRackedModules$.value[0][0]);

    backend.GET.moduleWithIdForRackDisplay.and.returnValue(throwError(() => new Error('lookup failed')));
    service.requestRackedModuleReplaceWithBlank$.next(service.rowedRackedModules$.value[0][0]);

    expect(backend.delete.rackedModule).not.toHaveBeenCalled();
    expect(SharedConstants.errorCustom).toHaveBeenCalledTimes(2);
  });
  
  it('clears row modules and handles invalid rows', () => {
    spyOn(SharedConstants, 'errorCustom').and.callFake(() => {
    });
    const {service, backend, snackBar} = build();
    const currentRack = rack({rows: 2});
    service.singleRackData$.next(currentRack);
    service.rowedRackedModules$.next([
      [moduleInRack(1, 0, 0), moduleInRack(2, 0, 1)],
      []
    ]);
    
    service.requestRackedModuleRowClearing$.next(moduleInRack(1, 0, 0));
    service.requestRackedModuleRowClearing$.next(moduleInRack(3, 1, 0));
    
    expect(backend.delete.rackedModules).toHaveBeenCalledOnceWith([1, 2]);
    expect(snackBar.open).toHaveBeenCalledWith('2 modules unracked from this row.', 'Undo', {
      duration: 5000,
      panelClass: 'snack-success'
    });
    expect(SharedConstants.errorCustom).toHaveBeenCalled();
  });

  it('undoes a module removal from the confirmation snackbar', () => {
    spyOn(SharedConstants, 'successCustom').and.callFake(() => {});
    const undoAction$ = new Subject<void>();
    const {service, backend, snackBar} = build();
    snackBar.open.and.returnValue(snackBarRefWithAction(undoAction$));
    backend.update.rackedModules.and.returnValue(of({
      data: [{id: 77, moduleid: 1001, rackid: 1, row: 0, column: 0, selected_panel_id: null}]
    }));
    const removedModule = moduleInRack(1, 0, 0);
    const remainingModule = moduleInRack(2, 0, 1);
    service.singleRackData$.next(rack({rows: 1}));
    service.rowedRackedModules$.next([[removedModule, remainingModule]]);

    service.requestRackedModuleRemoval$.next(removedModule);
    expect(rackingIds(service.rowedRackedModules$.value?.[0] ?? [])).toEqual([2]);

    undoAction$.next();
    undoAction$.complete();

    expect(moduleIds(service.rowedRackedModules$.value?.[0] ?? [])).toEqual([1001, 1002]);
    expect(service.rowedRackedModules$.value[0][0].rackingData.id).toBe(77);
    expect(backend.update.rackedModules).toHaveBeenCalled();
    expect(SharedConstants.successCustom).toHaveBeenCalledWith(snackBar, '"M1" restored.');
  });

  it('undoes a full row clear from the confirmation snackbar', () => {
    spyOn(SharedConstants, 'successCustom').and.callFake(() => {});
    const undoAction$ = new Subject<void>();
    const {service, backend, snackBar} = build();
    snackBar.open.and.returnValue(snackBarRefWithAction(undoAction$));
    backend.update.rackedModules.and.returnValue(of({
      data: [
        {id: 81, moduleid: 1001, rackid: 1, row: 0, column: 0, selected_panel_id: null},
        {id: 82, moduleid: 1002, rackid: 1, row: 0, column: 1, selected_panel_id: null}
      ]
    }));
    service.singleRackData$.next(rack({rows: 1}));
    service.rowedRackedModules$.next([[moduleInRack(1, 0, 0), moduleInRack(2, 0, 1)]]);

    service.requestClearRow$.next(0);
    expect(service.rowedRackedModules$.value[0]).toEqual([]);

    undoAction$.next();
    undoAction$.complete();

    expect(moduleIds(service.rowedRackedModules$.value?.[0] ?? [])).toEqual([1001, 1002]);
    expect(rackingIds(service.rowedRackedModules$.value?.[0] ?? [])).toEqual([81, 82]);
    expect(backend.update.rackedModules).toHaveBeenCalled();
    expect(SharedConstants.successCustom).toHaveBeenCalledWith(snackBar, '2 modules restored.');
  });

  it('undoes replace-with-blank by removing the blank and restoring the original module', () => {
    spyOn(SharedConstants, 'successCustom').and.callFake(() => {});
    const undoAction$ = new Subject<void>();
    const {service, backend, snackBar} = build();
    snackBar.open.and.returnValue(snackBarRefWithAction(undoAction$));
    backend.update.rackedModules.and.returnValue(of({
      data: [{id: 91, moduleid: 1001, rackid: 1, row: 0, column: 0, selected_panel_id: null}]
    }));
    const original = moduleInRack(1, 0, 0, 8, 0);
    service.singleRackData$.next(rack({rows: 1}));
    service.rowedRackedModules$.next([[original]]);

    service.requestRackedModuleReplaceWithBlank$.next(original);
    expect(service.rowedRackedModules$.value[0][0].module.id).toBe(4651);
    expect(service.rowedRackedModules$.value[0][0].rackingData.id).toBe(88);

    undoAction$.next();
    undoAction$.complete();

    expect(backend.delete.rackedModule).toHaveBeenCalledWith(88);
    expect(service.rowedRackedModules$.value[0][0].module.id).toBe(1001);
    expect(service.rowedRackedModules$.value[0][0].rackingData.id).toBe(91);
    expect(SharedConstants.successCustom).toHaveBeenCalledWith(snackBar, '"M1" restored.');
  });

  it('undoes deleting an empty row from the confirmation snackbar', () => {
    spyOn(SharedConstants, 'successCustom').and.callFake(() => {});
    const undoAction$ = new Subject<void>();
    const {service, backend, snackBar} = build();
    snackBar.open.and.returnValue(snackBarRefWithAction(undoAction$));
    service.singleRackData$.next(rack({rows: 3}));
    service.rowedRackedModules$.next([[moduleInRack(1, 0, 0)], [], [moduleInRack(2, 2, 0)]]);

    service.requestDeleteRow$.next(1);
    expect(service.singleRackData$.value.rows).toBe(2);
    expect(service.rowedRackedModules$.value.length).toBe(2);

    undoAction$.next();
    undoAction$.complete();

    expect(service.singleRackData$.value.rows).toBe(3);
    expect(service.rowedRackedModules$.value.length).toBe(3);
    expect(service.rowedRackedModules$.value[1]).toEqual([]);
    expect(backend.update.rack).toHaveBeenCalledWith(jasmine.objectContaining({rows: 3}));
    expect(SharedConstants.successCustom).toHaveBeenCalledWith(snackBar, 'Row restored.');
  });

  it('ignores clear-row requests until row data is available', () => {
    const {service, backend} = build();
    service.singleRackData$.next(rack({rows: 1}));
    service.rowedRackedModules$.next(null);

    service.requestClearRow$.next(0);

    expect(backend.delete.rackedModule).not.toHaveBeenCalled();
    expect(backend.delete.rackedModules).not.toHaveBeenCalled();
  });

  it('clears locally duplicated modules before their backend racking ids finish syncing', () => {
    const {service, backend, snackBar} = build();
    const optimisticModule = moduleInRack(undefined, 0, 0);
    service.singleRackData$.next(rack({rows: 1}));
    service.rowedRackedModules$.next([[optimisticModule]]);

    service.requestClearRow$.next(0);

    expect(backend.delete.rackedModule).not.toHaveBeenCalled();
    expect(backend.delete.rackedModules).not.toHaveBeenCalled();
    expect(service.rowedRackedModules$.value[0]).toEqual([]);
    expect(snackBar.open).toHaveBeenCalledWith('1 module unracked from this row.', 'Undo', {
      duration: 5000,
      panelClass: 'snack-success'
    });
  });

  it('removes locally duplicated modules before their backend racking ids finish syncing', () => {
    const {service, backend, snackBar} = build();
    const optimisticModule = moduleInRack(undefined, 0, 0);
    optimisticModule.module.name = 'Duplicated';
    const stableModule = moduleInRack(2, 0, 1);
    service.singleRackData$.next(rack({rows: 1}));
    service.rowedRackedModules$.next([[optimisticModule, stableModule]]);

    service.requestRackedModuleRemoval$.next(optimisticModule);

    expect(backend.delete.rackedModule).not.toHaveBeenCalled();
    expect(rackingIds(service.rowedRackedModules$.value?.[0] ?? [])).toEqual([2]);
    expect(snackBar.open).toHaveBeenCalledWith('"Duplicated" removed from rack.', 'Undo', {
      duration: 5000,
      panelClass: 'snack-success'
    });
  });

  it('deletes a late backend insert when a duplicated row is cleared before persistence returns', () => {
    const {service, backend} = build();
    const duplicatePersist$ = new Subject<RackModuleMutationResponse>();
    const sourceModule = moduleInRack(1, 0, 0);
    sourceModule.rackingData.moduleid = sourceModule.module.id;
    backend.update.rackedModules.and.returnValue(duplicatePersist$.asObservable());
    service.singleRackData$.next(rack({rows: 1}));
    service.rowedRackedModules$.next([[sourceModule]]);

    service.requestDuplicateRow$.next(0);
    expect(service.rowedRackedModules$.value[1][0].rackingData.id).toBeUndefined();

    service.requestClearRow$.next(1);
    expect(service.rowedRackedModules$.value[1]).toEqual([]);
    expect(backend.delete.rackedModule).not.toHaveBeenCalled();
    expect(backend.delete.rackedModules).not.toHaveBeenCalled();

    duplicatePersist$.next({
      data: [{id: 123, moduleid: sourceModule.module.id, rackid: 1, row: 1, column: 0, selected_panel_id: null}]
    });
    duplicatePersist$.complete();

    expect(backend.delete.rackedModules).toHaveBeenCalledOnceWith([123]);
    expect(service.rowedRackedModules$.value[1]).toEqual([]);
  });

  it('reverts the whole row clear when the batch delete fails', () => {
    spyOn(SharedConstants, 'errorCustom').and.callFake(() => {
    });
    const {service, backend} = build();
    const firstModule = moduleInRack(1, 0, 0);
    const failingModule = moduleInRack(2, 0, 1);
    const unaffectedModule = moduleInRack(3, 1, 0);
    const rowToClear = [firstModule, failingModule];
    const unaffectedRow = [unaffectedModule];
    backend.delete.rackedModules.and.returnValue(of({error: new Error('delete failed')}));
    service.singleRackData$.next(rack({rows: 2}));
    service.rowedRackedModules$.next([rowToClear, unaffectedRow]);

    service.requestClearRow$.next(0);

    expect(service.rowedRackedModules$.value[0]).toBe(rowToClear);
    expect(rackingIds(service.rowedRackedModules$.value?.[0] ?? [])).toEqual([1, 2]);
    expect(service.rowedRackedModules$.value[1]).toBe(unaffectedRow);
    expect(backend.delete.rackedModules).toHaveBeenCalledOnceWith([1, 2]);
    expect(SharedConstants.errorCustom).toHaveBeenCalled();
  });

  it('keeps a cleared row removed locally when a racking id changes before delete returns', () => {
    const {service, backend} = build();
    const deleteResult$ = new Subject<{}>();
    const module = moduleInRack(1, 0, 0);
    const rowToClear = [module];
    backend.delete.rackedModules.and.returnValue(deleteResult$.asObservable());
    service.singleRackData$.next(rack({rows: 1}));
    service.rowedRackedModules$.next([rowToClear]);

    service.requestClearRow$.next(0);
    module.rackingData.id = 99;
    deleteResult$.next({});
    deleteResult$.complete();

    expect(service.rowedRackedModules$.value[0]).toBe(rowToClear);
    expect(service.rowedRackedModules$.value[0]).toEqual([]);
  });
  
  it('loads rack data on updateSingleRackData$ and recalculates ownership/status', () => {
    const {service, backend} = build();
    backend.GET.rackWithId.and.returnValue(of({
      data: rack({id: 22, public: false, locked: true, author: {id: 'u1', username: 'user'}})
    }));
    
    service.updateSingleRackData$.next(22);
    
    expect(service.singleRackData$.value?.id).toBe(22);
    expect(service.isCurrentRackPrivate$.value).toBeTrue();
    expect(service.isCurrentRackEditable$.value).toBeFalse();
    expect(service.isCurrentRackPropertyOfCurrentUser$.value).toBeTrue();
    expect(service.isRackDataLoading$.value).toBeFalse();
    expect(service.rowedRackedModules$.value).toEqual([[], []]);
  });

  it('uses public rack reads when public detail mode is enabled', () => {
    const {service, backend} = build();

    service.setPublicDetailMode(true);
    service.updateSingleRackData$.next(33);

    expect(backend.GET.publicRackWithId).toHaveBeenCalledWith(33);
    expect(backend.GET.rackWithId).not.toHaveBeenCalledWith(33);
  });

  it('clears the loading state when rack detail loading fails', () => {
    spyOn(SharedConstants, 'errorCustom').and.callFake(() => {
    });
    const {service, backend} = build();
    backend.GET.rackWithId.and.returnValue(throwError(() => new Error('load fail')));

    service.updateSingleRackData$.next(99);

    expect(service.isRackDataLoading$.value).toBeFalse();
    expect(service.rowedRackedModules$.value).toEqual([]);
    expect(SharedConstants.errorCustom).toHaveBeenCalled();
  });

  it('clears the loading state when rack modules fail to load', () => {
    spyOn(SharedConstants, 'errorCustom').and.callFake(() => {
    });
    const {service, backend} = build();
    backend.get.rackedModules.and.returnValue(throwError(() => new Error('module load fail')));

    service.updateSingleRackData$.next(55);

    expect(service.isRackDataLoading$.value).toBeFalse();
    expect(service.rowedRackedModules$.value).toEqual([]);
    expect(SharedConstants.errorCustom).toHaveBeenCalled();
  });

  it('clears loading and unavailable state when public-token rack loading fails', () => {
    const {service, backend} = build();
    backend.GET.rackByPublicId.and.returnValue(throwError(() => new Error('token load fail')));

    service.updateSingleRackByPublicId$.next('bad-token');

    expect(service.singleRackData$.value).toBeUndefined();
    expect(service.rowedRackedModules$.value).toEqual([]);
    expect(service.isRackDataLoading$.value).toBeFalse();
    expect(service.rackDetailUnavailableMessage$.value).toBeTruthy();
  });
  


  it('loads rack data on updateSingleRackByPublicId$ and clears unavailable state', () => {
    const {service, backend} = build();
    backend.GET.rackByPublicId.and.returnValue(of({data: rack({id: 44, name: 'Token Rack'})}));

    service.updateSingleRackByPublicId$.next('aBcD1234_-Xy');

    expect(backend.GET.rackByPublicId).toHaveBeenCalledWith('aBcD1234_-Xy');
    expect(service.singleRackData$.value?.id).toBe(44);
    expect(service.rackDetailUnavailableMessage$.value).toBeNull();
  });

  it('sets unavailable state when updateSingleRackByPublicId$ returns no rack', () => {
    const {service, backend} = build();
    backend.GET.rackByPublicId.and.returnValue(of({data: null}));

    service.updateSingleRackByPublicId$.next('zYxW9876_-Ab');

    expect(backend.GET.rackByPublicId).toHaveBeenCalledWith('zYxW9876_-Ab');
    expect(service.singleRackData$.value).toBeUndefined();
    expect(service.rackDetailUnavailableMessage$.value).toBeTruthy();
  });

  it('handles rack order changes for disallowed and allowed moves', () => {
    const {service, snackBar} = build();
    const currentRack = rack({rows: 1});
    service.singleRackData$.next(currentRack);
    const syncSpy = spyOn(service.requestRackedModulesDbSync$, 'next').and.callThrough();
    
    const unracked = moduleInRack(1, null, null);
    service.rowedRackedModules$.next([[], [unracked]]);
    service.rackOrderChange$.next({
      event: dragDropEvent(0, 0),
      newRow: 2,
      module: unracked
    });
    expect(snackBar.open).toHaveBeenCalled();
    
    const a = moduleInRack(2, 0, 0);
    const b = moduleInRack(3, 0, 1);
    service.rowedRackedModules$.next([[a, b], []]);
    service.rackOrderChange$.next({
      event: dragDropEvent(0, 1),
      newRow: 0,
      module: a
    });
    expect(syncSpy).toHaveBeenCalled();
  });

  it('transfers a module between rack rows during drag-drop order changes', () => {
    const {service} = build();
    service.singleRackData$.next(rack({rows: 2}));
    const moving = moduleInRack(1, 0, 0);
    const existing = moduleInRack(2, 1, 0);
    service.rowedRackedModules$.next([[moving], [existing]]);
    const syncSpy = spyOn(service.requestRackedModulesDbSync$, 'next').and.callThrough();

    service.rackOrderChange$.next({
      event: dragDropEvent(0, 1),
      newRow: 1,
      module: moving
    });

    expect(service.rowedRackedModules$.value[0]).toEqual([]);
    expect(rackingIds(service.rowedRackedModules$.value?.[1] ?? [])).toEqual([2, 1]);
    expect(moving.rackingData.row).toBe(1);
    expect(moving.rackingData.column).toBe(1);
    expect(syncSpy).toHaveBeenCalled();
  });
  
  it('removes, duplicates, and syncs rack modules with error handling', () => {
    spyOn(SharedConstants, 'errorCustom');
    const {service, backend} = build();
    service.singleRackData$.next(rack());
    const rows = [[moduleInRack(1, 0, 0), moduleInRack(2, 0, 1)]];
    service.rowedRackedModules$.next(rows);
    const syncSpy = spyOn(service.requestRackedModulesDbSync$, 'next').and.callThrough();
    const rackRefreshSpy = spyOn(service.singleRackData$, 'next').and.callThrough();
    
    service.requestRackedModuleRemoval$.next(rows[0][0]);
    expect(backend.delete.rackedModule).toHaveBeenCalled();
    expect(rackRefreshSpy).not.toHaveBeenCalled();
    expect(rackingIds(service.rowedRackedModules$.value?.[0] ?? [])).toEqual([2]);
    
    service.requestRackedModuleDuplication$.next(rows[0][0]);
    expect(syncSpy).toHaveBeenCalled();
    
    backend.update.rackedModules.and.returnValue(throwError(() => new Error('sync fail')));
    service.rowedRackedModules$.next([[moduleInRack(4, 0, 0)]]);
    service.requestRackedModulesDbSync$.next();
    expect(SharedConstants.errorCustom).toHaveBeenCalled();
  });
  
  it('deletes a rack after confirmation and navigates away', () => {
    spyOn(SharedConstants, 'successCustom').and.callFake(() => {
    });
    const {service, backend, router} = build();
    service.deleteRack$.next(rack({id: 4, name: 'To Delete', image: 'img.jpg'}));
    
    expect(backend.delete.modulesOfRack).toHaveBeenCalledWith(4);
    expect(backend.delete.commentsForRack).toHaveBeenCalledWith(4);
    expect(backend.storage.deleteRackImage).toHaveBeenCalledWith('img.jpg');
    expect(backend.delete.userRack).toHaveBeenCalledWith(4);
    expect(router.navigate).toHaveBeenCalledWith(['/user/area']);
  });

  it('retries a rack delete after a prior delete attempt failed partway through', () => {
    spyOn(SharedConstants, 'successCustom').and.callFake(() => {
    });
    spyOn(SharedConstants, 'errorCustom');
    spyOn(console, 'error');
    const {service, backend, router, analytics} = build();
    backend.delete.commentsForRack.and.returnValue(throwError(() => new Error('comments delete failed')));

    service.deleteRack$.next(rack({id: 4, name: 'To Delete', image: 'img.jpg'}));

    expect(SharedConstants.errorCustom).toHaveBeenCalledWith(
      jasmine.anything(),
      jasmine.stringContaining('Failed to delete rack')
    );
    expect(router.navigate).not.toHaveBeenCalled();

    backend.delete.commentsForRack.and.returnValue(of({}));
    service.deleteRack$.next(rack({id: 5, name: 'Retry Delete', image: 'img2.jpg'}));

    expect(backend.delete.modulesOfRack).toHaveBeenCalledWith(5);
    expect(backend.delete.userRack).toHaveBeenCalledWith(5);
    expect(router.navigate).toHaveBeenCalledWith(['/user/area']);
    expect(analytics.capture).toHaveBeenCalledWith('rack.deleted', { rack_id: 5 });
  });

  it('surfaces one error snackbar and does not navigate when any delete step fails', () => {
    spyOn(SharedConstants, 'errorCustom');
    spyOn(console, 'error');
    const {service, backend, router} = build();
    backend.storage.deleteRackImage.and.returnValue(throwError(() => new Error('image delete failed')));

    service.deleteRack$.next(rack({id: 4, name: 'To Delete', image: 'img.jpg'}));

    expect(backend.delete.modulesOfRack).toHaveBeenCalledWith(4);
    expect(backend.delete.commentsForRack).toHaveBeenCalledWith(4);
    expect(backend.storage.deleteRackImage).toHaveBeenCalledWith('img.jpg');
    expect(backend.delete.userRack).not.toHaveBeenCalled();
    expect(SharedConstants.errorCustom).toHaveBeenCalledTimes(1);
    expect(router.navigate).not.toHaveBeenCalled();
  });
  
  it('adds module to rack as an unracked local row without refreshing', () => {
    spyOn(SharedConstants, 'successCustom').and.callFake(() => {
    });
    const {service, backend} = build();
    service.singleRackData$.next(rack({id: 50, name: 'Demo'}));
    service.rowedRackedModules$.next([[]]);
    backend.add.rackModule.and.returnValue(of({
      data: [{id: 123, moduleid: 777, rackid: 50, row: null, column: null, selected_panel_id: null}]
    }));
    const refreshSpy = spyOn(service.updateSingleRackData$, 'next').and.callThrough();
    
    service.addModuleToRack$.next(moduleFixture(777, 'New Module', 8, 0));
    
    expect(backend.add.rackModule).toHaveBeenCalledWith(777, 50);
    expect(refreshSpy).not.toHaveBeenCalled();
    expect(service.rowedRackedModules$.value.length).toBe(2);
    expect(service.rowedRackedModules$.value[1][0].module.id).toBe(777);
    expect(service.rowedRackedModules$.value[1][0].rackingData.id).toBe(123);
  });

  it('adds a blank panel to a row at the correct column position', () => {
    const {service, backend} = build();
    service.singleRackData$.next(rack({id: 50}));
    const rows = [[moduleInRack(1, 0, 0), moduleInRack(2, 0, 1)]];
    service.rowedRackedModules$.next(rows);
    const refreshSpy = spyOn(service.updateSingleRackData$, 'next').and.callThrough();

    service.addBlankToRow$.next({rowId: 0, hp: 4});

    // blank ID for hp=4 standard=0 is 4648 (from BLANK_IDS_STANDARD_0)
    expect(backend.GET.moduleWithIdForRackDisplay).toHaveBeenCalledWith(4648);
    expect(backend.add.rackModule).toHaveBeenCalledWith(4648, 50, 0, 2);
    expect(service.rowedRackedModules$.value[0].length).toBe(3);
    expect(service.rowedRackedModules$.value[0][2].module.id).toBe(4648);
    expect(service.rowedRackedModules$.value[0][2].rackingData.id).toBe(88);
    expect(refreshSpy).not.toHaveBeenCalled();
  });

  it('creates a linked patch from the current rack and routes straight to it', () => {
    spyOn(SharedConstants, 'successCustom').and.callFake(() => {});
    const {service, backend, router, dialog, snackBar} = build();
    service.singleRackData$.next(rack({id: 50, name: 'Performance Rack'}));
    service.isCurrentRackPropertyOfCurrentUser$.next(true);

    service.requestCreatePatchFromRack$.next();

    expect(dialog.open).toHaveBeenCalled();
    expect(backend.add.patch).toHaveBeenCalledWith({
      name: jasmine.any(String),
      public: true,
      linked_rack_id: 50
    });
    expect(snackBar.open).toHaveBeenCalledWith(jasmine.stringMatching(/^Creating "/), undefined);
    expect(router.navigate).toHaveBeenCalledWith(['/patches/details', 321]);
    expect(SharedConstants.successCustom).toHaveBeenCalledWith(
      snackBar,
      jasmine.stringMatching(/Performance Rack/)
    );
  });

  it('does not create a patch from rack when confirmation is cancelled', () => {
    spyOn(SharedConstants, 'infoCustom').and.callFake(() => {});
    const {service, backend, dialog} = build();
    service.singleRackData$.next(rack({id: 50, name: 'Performance Rack'}));
    service.isCurrentRackPropertyOfCurrentUser$.next(true);
    dialog.open.and.returnValue({
      afterClosed: () => of({answer: false})
    });

    service.requestCreatePatchFromRack$.next();

    expect(backend.add.patch).not.toHaveBeenCalled();
    expect(SharedConstants.infoCustom).toHaveBeenCalledWith(jasmine.anything(), 'No patch created.');
  });

  it('shows the linked-rack rollout message when rack-linked patch creation is unavailable', () => {
    spyOn(SharedConstants, 'errorCustom').and.callFake(() => {});
    const {service, backend, router} = build();
    service.singleRackData$.next(rack({id: 50, name: 'Performance Rack'}));
    service.isCurrentRackPropertyOfCurrentUser$.next(true);
    backend.add.patch.and.returnValue(throwError(() => ({
      code: 'PGRST204',
      message: "Column 'linked_rack_id' of relation 'patches' does not exist"
    })));

    service.requestCreatePatchFromRack$.next();

    expect(SharedConstants.errorCustom).toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalledWith(['/patches/details', jasmine.anything()]);
  });
  
  describe('requestRackedModulePanelSwitch$', () => {
    it('updates selectedPanelId in local state and calls backend', () => {
      const {service, backend} = build();
      const module = moduleInRack(5, 0, 0);
      service.rowedRackedModules$.next([[module]]);
      
      service.requestRackedModulePanelSwitch$.next({rackedModule: module, panelId: 2});
      
      expect(service.rowedRackedModules$.value[0][0].rackingData.selectedPanelId).toBe(2);
      expect(backend.update.rackModulePanel).toHaveBeenCalledWith(5, 2);
    });
    
    it('can clear panel selection by setting panelId to null', () => {
      const {service, backend} = build();
      const module = moduleInRack(7, 0, 1);
      module.rackingData.selectedPanelId = 3;
      service.rowedRackedModules$.next([[module]]);
      
      service.requestRackedModulePanelSwitch$.next({rackedModule: module, panelId: null});
      
      expect(service.rowedRackedModules$.value[0][0].rackingData.selectedPanelId).toBeNull();
      expect(backend.update.rackModulePanel).toHaveBeenCalledWith(7, null);
    });
    
    it('rolls back local panel selection and shows an error when backend call fails', () => {
      const {service, backend, snackBar} = build();
      backend.update.rackModulePanel.and.returnValue(throwError(() => new Error('DB error')));
      const module = moduleInRack(9, 0, 0);
      module.rackingData.selectedPanelId = 4;
      service.rowedRackedModules$.next([[module]]);
      
      service.requestRackedModulePanelSwitch$.next({rackedModule: module, panelId: 1});
      
      expect(service.rowedRackedModules$.value[0][0].rackingData.selectedPanelId).toBe(4);
      expect(snackBar.open).toHaveBeenCalled();
    });
  });

  it('shows error and blocks patch creation when rack data is not yet loaded', () => {
    spyOn(SharedConstants, 'errorCustom').and.callFake(() => {});
    const {service, backend} = build();
    service.singleRackData$.next(undefined);
    service.isCurrentRackPropertyOfCurrentUser$.next(true);

    service.requestCreatePatchFromRack$.next();

    expect(SharedConstants.errorCustom).toHaveBeenCalledWith(
      jasmine.anything(),
      jasmine.stringMatching(/still loading/)
    );
    expect(backend.add.patch).not.toHaveBeenCalled();
  });

  it('shows error and blocks patch creation when user is not the rack owner', () => {
    spyOn(SharedConstants, 'errorCustom').and.callFake(() => {});
    const {service, backend} = build();
    service.singleRackData$.next(rack({id: 50, name: 'Other Rack'}));
    service.isCurrentRackPropertyOfCurrentUser$.next(false);

    service.requestCreatePatchFromRack$.next();

    expect(SharedConstants.errorCustom).toHaveBeenCalledWith(
      jasmine.anything(),
      jasmine.stringMatching(/owner/)
    );
    expect(backend.add.patch).not.toHaveBeenCalled();
  });

  it('deletes rack image from storage when deleting a rack that has a preview image', () => {
    spyOn(SharedConstants, 'successCustom').and.callFake(() => {});
    const {service, backend, router} = build();
    service.singleRackData$.next(rack({id: 10, name: 'Image Rack', image: 'rack-preview.jpg'}));

    service.deleteRack$.next(service.singleRackData$.value as RackMinimal);

    expect(backend.storage.deleteRackImage).toHaveBeenCalledWith('rack-preview.jpg');
    expect(backend.delete.userRack).toHaveBeenCalledWith(10);
    expect(router.navigate).toHaveBeenCalledWith(['/user/area']);
  });

  it('resets rackStatistics$ to null when rack data is cleared', () => {
    const {service} = build();
    service.rackStatistics$.next([{name: 'HP used', value: '42'}]);

    service.singleRackData$.next(undefined);

    expect(service.rackStatistics$.value).toBeNull();
  });

  it('detects ownership correctly when user matches rack author', () => {
    const {service, loggedUser$} = build();
    service.singleRackData$.next(rack({id: 1, author: {id: 'user-owner', username: 'owner'}}));
    loggedUser$.next(simpleUser('user-owner'));

    expect(service.isCurrentRackPropertyOfCurrentUser$.value).toBeTrue();
  });

  it('detects non-ownership when user id does not match rack author', () => {
    const {service, loggedUser$} = build();
    service.singleRackData$.next(rack({id: 1, author: {id: 'user-owner', username: 'owner'}}));
    loggedUser$.next(simpleUser('different-user'));

    expect(service.isCurrentRackPropertyOfCurrentUser$.value).toBeFalse();
  });

  // Timestamp-bump fix (Option A — DB triggers).
  // The DB triggers on rack_modules now propagate updated timestamp to the parent racks row
  // automatically on any INSERT/UPDATE/DELETE, so the frontend only needs to call
  // backend.update.rackedModules — no explicit parent-row touch required.
  // Deeper verification (that racks.updated actually changes) requires a live-DB integration
  // test; this unit test asserts the frontend side of the contract.
  it('calls backend.update.rackedModules when module positions are synced to DB', () => {
    const {service, backend} = build();
    service.singleRackData$.next(rack({id: 1}));
    const modules = [moduleInRack(1, 0, 0), moduleInRack(2, 0, 1)];
    service.rowedRackedModules$.next([modules]);

    service.requestRackedModulesDbSync$.next();

    expect(backend.update.rackedModules).toHaveBeenCalled();
  });

});
