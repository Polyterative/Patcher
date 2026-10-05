import {
  BehaviorSubject,
  NEVER,
  of,
  ReplaySubject,
  Subject,
  throwError
} from 'rxjs';
import { RackedModule } from '../../models/module';
import { Rack } from '../../models/rack';
import { RackDetailDataContext } from './rack-detail-data.service.types';
import { RackDetailLayoutOperationsService } from './rack-detail-layout-operations.service';
import { RackDetailModulePlacementDataService } from './rack-detail-module-placement-data.service';

function rm(id: number | undefined, moduleId: number, row: number, column: number): RackedModule {
  return {
    module: {id: moduleId, name: `m${moduleId}`, hp: 4},
    rackingData: {id, row, column, selectedPanelId: null}
  } as unknown as RackedModule;
}

interface Harness {
  context: RackDetailDataContext;
  rows$: BehaviorSubject<RackedModule[][] | null>;
  rack$: BehaviorSubject<Rack | undefined>;
  subjects: {
    removal$: Subject<RackedModule>;
    duplication$: Subject<RackedModule>;
    panelSwitch$: Subject<{rackedModule: RackedModule; panelId: number | null}>;
    dbSync$: Subject<void>;
    order$: Subject<{event: unknown; newRow: number; module: RackedModule}>;
    addModule$: Subject<unknown>;
    addBlank$: Subject<{rowId: number; hp: number}>;
  };
  backend: {
    delete: {rackedModule: jasmine.Spy};
    update: {rackModulePanel: jasmine.Spy; rackModuleOrientation: jasmine.Spy};
    add: {rackModule: jasmine.Spy};
    GET: {moduleWithIdForRackDisplay: jasmine.Spy};
  };
  snackBar: {open: jasmine.Spy};
  analytics: {capture: jasmine.Spy};
  callBackendToUpdateModulesOfRack: jasmine.Spy;
  showUndoSnackBar: jasmine.Spy;
  errors: () => string[];
}

function createHarness(initialRows: RackedModule[][] | null): Harness {
  const layoutOps = new RackDetailLayoutOperationsService();
  const rows$ = new BehaviorSubject<RackedModule[][] | null>(initialRows);
  const rack$ = new BehaviorSubject<Rack | undefined>({id: 7, name: 'My rack', rows: 3, hp: 84} as unknown as Rack);
  const subjects = {
    removal$: new Subject<RackedModule>(),
    duplication$: new Subject<RackedModule>(),
    panelSwitch$: new Subject<{rackedModule: RackedModule; panelId: number | null}>(),
    dbSync$: new Subject<void>(),
    order$: new Subject<{event: unknown; newRow: number; module: RackedModule}>(),
    addModule$: new Subject<unknown>(),
    addBlank$: new Subject<{rowId: number; hp: number}>()
  };
  const backend = {
    delete: {rackedModule: jasmine.createSpy('delete.rackedModule').and.returnValue(of({}))},
    update: {
      rackModulePanel: jasmine.createSpy('update.rackModulePanel').and.returnValue(of({})),
      rackModuleOrientation: jasmine.createSpy('update.rackModuleOrientation').and.returnValue(of({}))
    },
    add: {rackModule: jasmine.createSpy('add.rackModule').and.returnValue(of({data: [{id: 500}]}))},
    GET: {moduleWithIdForRackDisplay: jasmine.createSpy('GET.moduleWithIdForRackDisplay').and.returnValue(of({data: {id: 4666, name: 'Blank'}}))}
  };
  const snackBar = {open: jasmine.createSpy('snackBar.open')};
  const analytics = {capture: jasmine.createSpy('analytics.capture')};
  const callBackendToUpdateModulesOfRack = jasmine.createSpy('callBackendToUpdateModulesOfRack').and.returnValue(of({ok: true}));
  const showUndoSnackBar = jasmine.createSpy('showUndoSnackBar');

  const context = {
    snackBar,
    analytics,
    backend,
    rowedRackedModules$: rows$,
    singleRackData$: rack$,
    isCurrentRackPropertyOfCurrentUser$: new BehaviorSubject(true),
    isCurrentRackEditable$: new BehaviorSubject(true),
    rackedModuleOrientationUpdatingId$: new BehaviorSubject<number | null>(null),
    rackOrderChange$: subjects.order$,
    requestRackedModuleRemoval$: subjects.removal$,
    requestRackedModuleDuplication$: subjects.duplication$,
    requestRackedModulePanelSwitch$: subjects.panelSwitch$,
    requestRackedModuleOrientationToggle$: new Subject<RackedModule>(),
    requestRackedModulesDbSync$: subjects.dbSync$,
    addModuleToRack$: subjects.addModule$,
    addBlankToRow$: subjects.addBlank$,
    moduleAddedFromPicker$: new Subject<unknown>(),
    takeUntilDestroyed: () => <T>(source: T) => source,
    waitForRackModuleOrientationUpdateIdle: () => of(undefined),
    isAnyRackModuleOrientationUpdating: () => false,
    canToggleRackModuleOrientation: () => true,
    findRackedModuleById: (modules: RackedModule[][], id: number) =>
      modules.flat().find(m => m.rackingData.id === id),
    removeRackedModuleFromRack: (m: RackedModule[][], t: RackedModule) => layoutOps.removeRackedModuleFromRack(m, t),
    duplicateModule: (m: RackedModule[][], t: RackedModule) => layoutOps.duplicateModule(m, t),
    transferInRow: jasmine.createSpy('transferInRow'),
    transferBetweenRows: jasmine.createSpy('transferBetweenRows'),
    updateModulesColumnIds: (m: RackedModule[][], r: number) => layoutOps.updateModulesColumnIds(m, r),
    withCurrentRackModuleOrientations: (m: RackedModule[][]) => m,
    restoreRemovedModules$: jasmine.createSpy('restoreRemovedModules$'),
    showUndoSnackBar,
    callBackendToUpdateModulesOfRack,
    assertBackendSuccess: <T>(r: T) => r,
    insertOptimisticModule: jasmine.createSpy('insertOptimisticModule').and.callFake(
      (modules: RackedModule[][], data: {module: RackedModule['module']; row: number | null; column: number | null}) => {
        const optimistic = {module: data.module, rackingData: {id: undefined, row: data.row ?? 0, column: data.column ?? 0}} as unknown as RackedModule;
        (modules[data.row ?? modules.length - 1] ?? modules[modules.length - 1]).push(optimistic);
        return optimistic;
      }
    ),
    removeRackedModuleByReference: jasmine.createSpy('removeRackedModuleByReference'),
    applyPersistedRackingIds: jasmine.createSpy('applyPersistedRackingIds')
  } as unknown as RackDetailDataContext;

  return {
    context, rows$, rack$, subjects, backend, snackBar, analytics, callBackendToUpdateModulesOfRack, showUndoSnackBar,
    errors: () => snackBar.open.calls.allArgs().filter(args => (args[2] as {panelClass?: string} | undefined)?.panelClass === 'snack-error').map(args => String(args[0]))
  };
}

const grid = () => [
  [rm(1, 11, 0, 0), rm(2, 12, 0, 1)],
  [rm(3, 13, 1, 0)],
  []
];
const ids = (rows: RackedModule[][] | null) => (rows ?? []).map(row => row.map(m => m.rackingData.id));

describe('RackDetailModulePlacementDataService', () => {
  let service: RackDetailModulePlacementDataService;

  beforeEach(() => {
    service = new RackDetailModulePlacementDataService();
    spyOn(console, 'error');
  });

  describe('module removal', () => {
    it('removes optimistically, deletes on the backend, and offers undo', () => {
      const h = createHarness(grid());
      service.bindModulePlacement(h.context);

      h.subjects.removal$.next(rm(2, 12, 0, 1));

      expect(h.backend.delete.rackedModule).toHaveBeenCalledOnceWith(2);
      expect(ids(h.rows$.value)).toEqual([[1], [3], []]);
      expect(h.analytics.capture).toHaveBeenCalledWith('rack.module_removed', {rack_id: 7, module_id: 12});
      expect(h.showUndoSnackBar).toHaveBeenCalledTimes(1);
      expect(h.showUndoSnackBar.calls.mostRecent().args[0]).toContain('"m12" removed from rack.');
    });

    it('reverts the grid and reports the failure when the backend delete fails', () => {
      const h = createHarness(grid());
      h.backend.delete.rackedModule.and.returnValue(throwError(() => new Error('boom')));
      service.bindModulePlacement(h.context);

      h.subjects.removal$.next(rm(2, 12, 0, 1));

      expect(ids(h.rows$.value)).toEqual([[1, 2], [3], []]);
      expect(h.errors().some(m => m.includes('changes reverted'))).toBeTrue();
      expect(h.showUndoSnackBar).not.toHaveBeenCalled();
      expect(h.analytics.capture).not.toHaveBeenCalledWith('rack.module_removed', jasmine.anything());
    });

    it('keeps working after a failed removal (the stream does not die)', () => {
      const h = createHarness(grid());
      h.backend.delete.rackedModule.and.returnValues(throwError(() => new Error('boom')), of({}));
      service.bindModulePlacement(h.context);

      h.subjects.removal$.next(rm(2, 12, 0, 1));
      h.subjects.removal$.next(rm(2, 12, 0, 1));

      expect(h.backend.delete.rackedModule).toHaveBeenCalledTimes(2);
      expect(ids(h.rows$.value)).toEqual([[1], [3], []]);
    });

    it('removes an unsaved module locally without calling the backend', () => {
      const rows = grid();
      const unsaved = rm(undefined, 14, 1, 1);
      rows[1].push(unsaved);
      const h = createHarness(rows);
      service.bindModulePlacement(h.context);

      h.subjects.removal$.next(unsaved);

      expect(h.backend.delete.rackedModule).not.toHaveBeenCalled();
      expect(ids(h.rows$.value)).toEqual([[1, 2], [3], []]);
    });

    it('does nothing destructive when the module is not in the rack', () => {
      const h = createHarness(grid());
      service.bindModulePlacement(h.context);

      h.subjects.removal$.next(rm(999, 99, 0, 0));

      expect(h.backend.delete.rackedModule).not.toHaveBeenCalled();
      expect(ids(h.rows$.value)).toEqual([[1, 2], [3], []]);
      expect(h.errors()).toContain('Could not find this module in the rack.');
    });

    it('refuses to remove while the rack is still loading', () => {
      const h = createHarness(null);
      service.bindModulePlacement(h.context);

      h.subjects.removal$.next(rm(1, 11, 0, 0));

      expect(h.backend.delete.rackedModule).not.toHaveBeenCalled();
      expect(h.errors().some(m => m.includes('still loading'))).toBeTrue();
    });

    it('deletes by the id found in the live grid, not by the id on a stale object', () => {
      const h = createHarness(grid());
      service.bindModulePlacement(h.context);
      const stale = rm(3, 13, 0, 0);

      h.subjects.removal$.next(stale);

      expect(h.backend.delete.rackedModule).toHaveBeenCalledOnceWith(3);
      expect(ids(h.rows$.value)).toEqual([[1, 2], [], []]);
    });
  });

  describe('module duplication', () => {
    it('duplicates in the grid and requests a DB sync', () => {
      const h = createHarness(grid());
      service.bindModulePlacement(h.context);
      h.callBackendToUpdateModulesOfRack.calls.reset();

      h.subjects.duplication$.next(rm(1, 11, 0, 0));

      expect(ids(h.rows$.value)).toEqual([[1, undefined, 2], [3], []]);
      expect(h.callBackendToUpdateModulesOfRack).toHaveBeenCalledTimes(1);
      expect(h.analytics.capture).toHaveBeenCalledWith('rack.module_duplicated', {rack_id: 7, module_id: 11});
    });

    it('reports not-found and leaves the grid untouched', () => {
      const h = createHarness(grid());
      service.bindModulePlacement(h.context);

      h.subjects.duplication$.next(rm(999, 99, 0, 0));

      expect(ids(h.rows$.value)).toEqual([[1, 2], [3], []]);
      expect(h.callBackendToUpdateModulesOfRack).not.toHaveBeenCalled();
      expect(h.errors()).toContain('Could not find this module in the rack.');
    });

    it('refuses while loading', () => {
      const h = createHarness(null);
      service.bindModulePlacement(h.context);

      h.subjects.duplication$.next(rm(1, 11, 0, 0));

      expect(h.errors().some(m => m.includes('still loading'))).toBeTrue();
    });
  });

  describe('panel switch', () => {
    it('applies optimistically and persists the new panel', () => {
      const h = createHarness(grid());
      service.bindModulePlacement(h.context);

      h.subjects.panelSwitch$.next({rackedModule: rm(2, 12, 0, 1), panelId: 55});

      expect(h.rows$.value![0][1].rackingData.selectedPanelId).toBe(55);
      expect(h.backend.update.rackModulePanel).toHaveBeenCalledOnceWith(2, 55);
    });

    it('restores the previous panel (including null) when the backend fails', () => {
      const h = createHarness(grid());
      h.rows$.value![0][1].rackingData.selectedPanelId = 40;
      h.backend.update.rackModulePanel.and.returnValue(throwError(() => new Error('nope')));
      service.bindModulePlacement(h.context);

      h.subjects.panelSwitch$.next({rackedModule: rm(2, 12, 0, 1), panelId: 55});
      expect(h.rows$.value![0][1].rackingData.selectedPanelId).toBe(40);

      h.subjects.panelSwitch$.next({rackedModule: rm(1, 11, 0, 0), panelId: 9});
      expect(h.rows$.value![0][0].rackingData.selectedPanelId).toBeNull();
      expect(h.errors().length).toBe(2);
    });

    it('can clear the panel back to default', () => {
      const h = createHarness(grid());
      h.rows$.value![0][0].rackingData.selectedPanelId = 12;
      service.bindModulePlacement(h.context);

      h.subjects.panelSwitch$.next({rackedModule: rm(1, 11, 0, 0), panelId: null});

      expect(h.rows$.value![0][0].rackingData.selectedPanelId).toBeNull();
      expect(h.backend.update.rackModulePanel).toHaveBeenCalledWith(1, null);
    });
  });

  describe('DB sync', () => {
    it('sends the current grid with the current rack', () => {
      const h = createHarness(grid());
      service.bindModulePlacement(h.context);

      h.subjects.dbSync$.next();

      expect(h.callBackendToUpdateModulesOfRack).toHaveBeenCalledOnceWith(h.rows$.value!, h.rack$.value!);
    });

    it('reverts to the pre-sync snapshot when saving fails', () => {
      const h = createHarness(grid());
      h.callBackendToUpdateModulesOfRack.and.callFake((rows: RackedModule[][]) => {
        rows[0].splice(0, 1);
        return throwError(() => new Error('save failed'));
      });
      service.bindModulePlacement(h.context);

      h.subjects.dbSync$.next();

      expect(ids(h.rows$.value)).toEqual([[1, 2], [3], []]);
      expect(h.errors().some(m => m.includes('changes reverted'))).toBeTrue();
    });

    it('does not call the backend when there is no rack', () => {
      const h = createHarness(grid());
      h.rack$.next(undefined);
      service.bindModulePlacement(h.context);

      h.subjects.dbSync$.next();

      expect(h.callBackendToUpdateModulesOfRack).not.toHaveBeenCalled();
    });

    it('survives a failed sync and handles the next one', () => {
      const h = createHarness(grid());
      h.callBackendToUpdateModulesOfRack.and.returnValues(throwError(() => new Error('x')), of({ok: true}));
      service.bindModulePlacement(h.context);

      h.subjects.dbSync$.next();
      h.subjects.dbSync$.next();

      expect(h.callBackendToUpdateModulesOfRack).toHaveBeenCalledTimes(2);
    });
  });

  describe('rack ordering', () => {
    it('refuses to drop an unracked module below the last row', () => {
      const h = createHarness(grid());
      const unracked = rm(9, 19, 0, 0);
      (unracked.rackingData as {row: number | null}).row = null;
      service.bindRackOrdering(h.context);

      h.subjects.order$.next({event: {}, newRow: 3, module: unracked});

      expect(h.context.transferBetweenRows).not.toHaveBeenCalled();
      expect(h.context.transferInRow).not.toHaveBeenCalled();
      expect(h.snackBar.open).toHaveBeenCalled();
      expect(h.callBackendToUpdateModulesOfRack).not.toHaveBeenCalled();
    });

    it('moves within a row when the row is unchanged and across rows otherwise, then syncs', () => {
      const h = createHarness(grid());
      service.bindRackOrdering(h.context);
      service.bindModulePlacement(h.context);

      h.subjects.order$.next({event: {}, newRow: 0, module: h.rows$.value![0][0]});
      expect(h.context.transferInRow).toHaveBeenCalledTimes(1);
      expect(h.context.transferBetweenRows).not.toHaveBeenCalled();

      h.subjects.order$.next({event: {}, newRow: 2, module: h.rows$.value![0][0]});
      expect(h.context.transferBetweenRows).toHaveBeenCalledTimes(1);
      expect(h.callBackendToUpdateModulesOfRack).toHaveBeenCalledTimes(2);
    });

    it('allows an unracked module to be dropped on a valid row', () => {
      const h = createHarness(grid());
      const unracked = rm(9, 19, 0, 0);
      (unracked.rackingData as {row: number | null}).row = null;
      service.bindRackOrdering(h.context);

      h.subjects.order$.next({event: {}, newRow: 1, module: unracked});

      expect(h.context.transferBetweenRows).toHaveBeenCalledTimes(1);
    });
  });

  describe('adding modules', () => {
    it('reverts the optimistic module when the backend add fails', () => {
      const h = createHarness(grid());
      h.backend.add.rackModule.and.returnValue(throwError(() => new Error('x')));
      service.bindModuleAdditions(h.context);

      h.subjects.addModule$.next({id: 5, name: 'New'});

      expect(h.context.removeRackedModuleByReference).toHaveBeenCalledTimes(1);
      expect(h.errors().some(m => m.includes('changes reverted'))).toBeTrue();
      expect(h.analytics.capture).not.toHaveBeenCalledWith('rack.module_added', jasmine.anything());
    });

    it('persists ids and announces the addition on success', () => {
      const h = createHarness(grid());
      service.bindModuleAdditions(h.context);

      h.subjects.addModule$.next({id: 5, name: 'New'});

      expect(h.backend.add.rackModule).toHaveBeenCalledOnceWith(5, 7);
      expect(h.context.applyPersistedRackingIds).toHaveBeenCalledTimes(1);
      expect(h.analytics.capture).toHaveBeenCalledWith('rack.module_added', {rack_id: 7, module_id: 5});
    });

    it('refuses to add when there is no rack', () => {
      const h = createHarness(grid());
      h.rack$.next(undefined);
      service.bindModuleAdditions(h.context);

      h.subjects.addModule$.next({id: 5, name: 'New'});

      expect(h.backend.add.rackModule).not.toHaveBeenCalled();
    });

    it('ignores a second add while the first is in flight (exhaustMap)', () => {
      const h = createHarness(grid());
      h.backend.add.rackModule.and.returnValue(NEVER);
      service.bindModuleAdditions(h.context);

      h.subjects.addModule$.next({id: 5, name: 'A'});
      h.subjects.addModule$.next({id: 6, name: 'B'});

      expect(h.backend.add.rackModule).toHaveBeenCalledTimes(1);
    });

    it('rejects blank panels for rows outside the rack', () => {
      const h = createHarness(grid());
      service.bindModuleAdditions(h.context);

      for (const rowId of [-1, 3, 99]) {
        h.subjects.addBlank$.next({rowId, hp: 4});
      }

      expect(h.backend.GET.moduleWithIdForRackDisplay).not.toHaveBeenCalled();
      expect(h.backend.add.rackModule).not.toHaveBeenCalled();
      expect(h.errors().filter(m => m.includes('cannot receive a blank')).length).toBe(3);
    });

    it('rejects unsupported blank sizes without hitting the backend', () => {
      const h = createHarness(grid());
      service.bindModuleAdditions(h.context);

      h.subjects.addBlank$.next({rowId: 0, hp: 9999});

      expect(h.backend.GET.moduleWithIdForRackDisplay).not.toHaveBeenCalled();
      expect(h.errors().some(m => m.includes('No matching blank panel'))).toBeTrue();
    });

    it('reports a failed blank lookup and a failed blank add separately and stays alive', () => {
      const h = createHarness(grid());
      service.bindModuleAdditions(h.context);

      h.backend.GET.moduleWithIdForRackDisplay.and.returnValue(throwError(() => new Error('lookup')));
      h.subjects.addBlank$.next({rowId: 0, hp: 4});
      expect(h.errors().some(m => m.includes('Failed to load the blank panel'))).toBeTrue();

      h.backend.GET.moduleWithIdForRackDisplay.and.returnValue(of({data: {id: 4666, name: 'Blank'}}));
      h.backend.add.rackModule.and.returnValue(throwError(() => new Error('add')));
      h.subjects.addBlank$.next({rowId: 0, hp: 4});
      expect(h.context.removeRackedModuleByReference).toHaveBeenCalledTimes(1);
      expect(h.errors().some(m => m.includes('Failed to add blank panel'))).toBeTrue();
    });

    it('treats an empty blank lookup as a load failure', () => {
      const h = createHarness(grid());
      h.backend.GET.moduleWithIdForRackDisplay.and.returnValue(of({data: null}));
      service.bindModuleAdditions(h.context);

      h.subjects.addBlank$.next({rowId: 0, hp: 4});

      expect(h.backend.add.rackModule).not.toHaveBeenCalled();
      expect(h.errors().some(m => m.includes('Failed to load the blank panel'))).toBeTrue();
    });
  });
});
