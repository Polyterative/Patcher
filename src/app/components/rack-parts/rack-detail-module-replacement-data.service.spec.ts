import {
  BehaviorSubject,
  of,
  Subject,
  throwError
} from 'rxjs';
import { RackedModule } from '../../models/module';
import { Rack } from '../../models/rack';
import { RackDetailDataContext } from './rack-detail-data.service.types';
import { RackDetailLayoutOperationsService } from './rack-detail-layout-operations.service';
import { RackDetailModuleReplacementDataService } from './rack-detail-module-replacement-data.service';

function rm(id: number | undefined, moduleId: number, row: number, column: number, hp = 4, standardId = 0): RackedModule {
  return {
    module: {id: moduleId, name: `m${moduleId}`, hp, standard: {id: standardId}},
    rackingData: {id, row, column, selectedPanelId: null}
  } as unknown as RackedModule;
}

function createHarness(initialRows: RackedModule[][] | null) {
  const layoutOps = new RackDetailLayoutOperationsService();
  const rows$ = new BehaviorSubject<RackedModule[][] | null>(initialRows);
  const rack$ = new BehaviorSubject<Rack | undefined>({id: 7, name: 'Rack', rows: 3, hp: 84} as unknown as Rack);
  const replace$ = new Subject<RackedModule>();
  const clearRow$ = new Subject<number>();
  const rowClearing$ = new Subject<RackedModule>();
  const dbSync$ = new Subject<void>();
  const backend = {
    GET: {moduleWithIdForRackDisplay: jasmine.createSpy('lookup').and.returnValue(of({data: {id: 4000, name: 'Blank', hp: 4}}))},
    delete: {
      rackedModule: jasmine.createSpy('delete.rackedModule').and.returnValue(of({})),
      rackedModules: jasmine.createSpy('delete.rackedModules').and.returnValue(of({}))
    },
    add: {rackModule: jasmine.createSpy('add.rackModule').and.returnValue(of({data: [{id: 900}]}))}
  };
  const snackBar = {open: jasmine.createSpy('open')};
  const analytics = {capture: jasmine.createSpy('capture')};
  const showUndoSnackBar = jasmine.createSpy('showUndoSnackBar');
  const syncs: number[] = [];
  dbSync$.subscribe(() => syncs.push(1));

  const context = {
    snackBar,
    analytics,
    backend,
    rowedRackedModules$: rows$,
    singleRackData$: rack$,
    requestRackedModuleReplaceWithBlank$: replace$,
    requestRackedModuleRowClearing$: rowClearing$,
    requestClearRow$: clearRow$,
    requestRackedModulesDbSync$: dbSync$,
    takeUntilDestroyed: () => <T>(source: T) => source,
    waitForRackModuleOrientationUpdateIdle: () => of(undefined),
    findRackedModuleById: (modules: RackedModule[][], id: number) => modules.flat().find(m => m.rackingData.id === id),
    assertBackendSuccess: <T>(r: T) => r,
    updateModulesColumnIds: (m: RackedModule[][], r: number) => layoutOps.updateModulesColumnIds(m, r),
    updateRackRowCoordinates: (m: RackedModule[][], n: number) => layoutOps.updateRackRowCoordinates(m, n),
    withCurrentRackModuleOrientations: (m: RackedModule[][]) => m,
    applyPersistedRackingIds: jasmine.createSpy('applyPersistedRackingIds'),
    undoBlankReplacement$: jasmine.createSpy('undoBlankReplacement$'),
    restoreRemovedModules$: jasmine.createSpy('restoreRemovedModules$'),
    showUndoSnackBar
  } as unknown as RackDetailDataContext;

  return {
    context, rows$, rack$, replace$, clearRow$, rowClearing$, backend, snackBar, analytics, showUndoSnackBar, syncs,
    errors: () => snackBar.open.calls.allArgs().map(a => String(a[0]))
  };
}

const grid = () => [
  [rm(1, 11, 0, 0), rm(2, 12, 0, 1), rm(3, 13, 0, 2)],
  [rm(4, 14, 1, 0)],
  []
];
const ids = (rows: RackedModule[][] | null) => (rows ?? []).map(row => row.map(m => m.rackingData.id));

describe('RackDetailModuleReplacementDataService', () => {
  let service: RackDetailModuleReplacementDataService;

  beforeEach(() => {
    service = new RackDetailModuleReplacementDataService();
    spyOn(console, 'error');
  });

  describe('replace with blank', () => {
    it('swaps the module for a blank at the same position, deletes the old row then adds the blank', () => {
      const h = createHarness(grid());
      service.bind(h.context);

      h.replace$.next(rm(2, 12, 0, 1));

      expect(h.backend.GET.moduleWithIdForRackDisplay).toHaveBeenCalledOnceWith(4648);
      expect(h.backend.delete.rackedModule).toHaveBeenCalledOnceWith(2);
      expect(h.backend.add.rackModule).toHaveBeenCalledOnceWith(4648, 7, 0, 1, jasmine.anything());
      expect(h.rows$.value![0].map(m => m.module.id)).toEqual([11, 4000, 13]);
      expect(h.rows$.value![0].map(m => m.rackingData.column)).toEqual([0, 1, 2]);
      expect(h.showUndoSnackBar).toHaveBeenCalledTimes(1);
      expect(h.analytics.capture).toHaveBeenCalledWith('rack.module_replaced_with_blank', {rack_id: 7});
    });

    it('never touches the backend for modules that are too big for a blank', () => {
      const h = createHarness(grid());
      service.bind(h.context);

      h.replace$.next(rm(2, 12, 0, 1, 21, 0));
      h.replace$.next(rm(2, 12, 0, 1, 27, 1));

      expect(h.backend.GET.moduleWithIdForRackDisplay).not.toHaveBeenCalled();
      expect(h.backend.delete.rackedModule).not.toHaveBeenCalled();
      expect(h.errors().filter(m => m.includes('too big')).length).toBe(2);
    });

    it('uses the largest available blanks (20 HP standard 0, 25 HP standard 1)', () => {
      const rows = grid();
      rows[0][1] = rm(2, 12, 0, 1, 20, 0);
      rows[1][0] = rm(4, 14, 1, 0, 25, 1);
      const h = createHarness(rows);
      service.bind(h.context);

      h.replace$.next(rows[0][1]);
      h.replace$.next(rows[1][0]);

      expect(h.backend.GET.moduleWithIdForRackDisplay.calls.allArgs().map(a => a[0])).toEqual([4663, 4735]);
      expect(h.backend.GET.moduleWithIdForRackDisplay.calls.count()).toBe(2);
    });

    it('a 26 HP standard-1 module passes the size guard but has no blank, so it errors before any delete', () => {
      const rows = grid();
      rows[1][0] = rm(4, 14, 1, 0, 26, 1);
      const h = createHarness(rows);
      service.bind(h.context);

      h.replace$.next(rows[1][0]);

      expect(h.backend.delete.rackedModule).not.toHaveBeenCalled();
      expect(h.errors()).toContain('No matching blank panel was found for this module.');
    });

    it('reports when no blank exists for the size/standard', () => {
      const rows = grid();
      rows[0][1] = rm(2, 12, 0, 1, 4, 5);
      const h = createHarness(rows);
      service.bind(h.context);

      h.replace$.next(rows[0][1]);

      expect(h.backend.delete.rackedModule).not.toHaveBeenCalled();
      expect(h.errors()).toContain('No matching blank panel was found for this module.');
    });

    it('does not delete anything when the blank lookup fails', () => {
      const h = createHarness(grid());
      h.backend.GET.moduleWithIdForRackDisplay.and.returnValue(throwError(() => new Error('lookup')));
      service.bind(h.context);

      h.replace$.next(rm(2, 12, 0, 1));

      expect(h.backend.delete.rackedModule).not.toHaveBeenCalled();
      expect(ids(h.rows$.value)).toEqual([[1, 2, 3], [4], []]);
      expect(h.errors().some(m => m.includes('Failed to load the matching blank'))).toBeTrue();
    });

    it('does not delete anything when the lookup returns no data', () => {
      const h = createHarness(grid());
      h.backend.GET.moduleWithIdForRackDisplay.and.returnValue(of({data: null}));
      service.bind(h.context);

      h.replace$.next(rm(2, 12, 0, 1));

      expect(h.backend.delete.rackedModule).not.toHaveBeenCalled();
    });

    it('restores the original grid and skips the add when the delete fails', () => {
      const h = createHarness(grid());
      h.backend.delete.rackedModule.and.returnValue(throwError(() => new Error('delete')));
      service.bind(h.context);

      h.replace$.next(rm(2, 12, 0, 1));

      expect(h.backend.add.rackModule).not.toHaveBeenCalled();
      expect(ids(h.rows$.value)).toEqual([[1, 2, 3], [4], []]);
      expect(h.errors().some(m => m.includes('changes reverted'))).toBeTrue();
      expect(h.showUndoSnackBar).not.toHaveBeenCalled();
    });

    it('when the blank add fails after the delete, drops the placeholder and re-syncs instead of leaving a ghost', () => {
      const h = createHarness(grid());
      h.backend.add.rackModule.and.returnValue(throwError(() => new Error('add')));
      service.bind(h.context);

      h.replace$.next(rm(2, 12, 0, 1));

      expect(h.backend.delete.rackedModule).toHaveBeenCalledTimes(1);
      expect(ids(h.rows$.value)[0].length).toBe(2);
      expect(h.rows$.value![0].map(m => m.module.id)).toEqual([11, 13]);
      expect(h.rows$.value![0].map(m => m.rackingData.column)).toEqual([0, 1]);
      expect(h.syncs.length).toBe(1);
      expect(h.errors().some(m => m.includes('module was removed, but the blank panel could not be added'))).toBeTrue();
      expect(h.analytics.capture).not.toHaveBeenCalledWith('rack.module_replaced_with_blank', jasmine.anything());
    });

    it('refuses an unsaved module (no persisted id yet) without calling the backend', () => {
      const rows = grid();
      const unsaved = rm(undefined, 15, 1, 1);
      rows[1].push(unsaved);
      const h = createHarness(rows);
      service.bind(h.context);

      h.replace$.next(unsaved);

      expect(h.backend.delete.rackedModule).not.toHaveBeenCalled();
      expect(h.errors().some(m => m.includes('still syncing'))).toBeTrue();
    });

    it('refuses when the module is not in the grid, and when the rack is still loading', () => {
      const h = createHarness(grid());
      service.bind(h.context);
      h.replace$.next(rm(999, 99, 0, 0));
      expect(h.errors()).toContain('Could not find this module in the rack.');

      const loading = createHarness(null);
      service.bind(loading.context);
      loading.replace$.next(rm(1, 11, 0, 0));
      expect(loading.errors().some(m => m.includes('still loading'))).toBeTrue();
      expect(loading.backend.delete.rackedModule).not.toHaveBeenCalled();
    });

    it('stays alive after a failure and handles the next request', () => {
      const h = createHarness(grid());
      h.backend.delete.rackedModule.and.returnValues(throwError(() => new Error('x')), of({}));
      service.bind(h.context);

      h.replace$.next(rm(2, 12, 0, 1));
      h.replace$.next(rm(1, 11, 0, 0));

      expect(h.backend.delete.rackedModule).toHaveBeenCalledTimes(2);
    });
  });

  describe('clear row', () => {
    it('deletes only persisted modules, removes every module in the row from the grid and offers undo', () => {
      const rows = grid();
      rows[0].push(rm(undefined, 15, 0, 3));
      const h = createHarness(rows);
      service.bind(h.context);

      h.clearRow$.next(0);

      expect(h.backend.delete.rackedModules).toHaveBeenCalledOnceWith([1, 2, 3]);
      expect(ids(h.rows$.value)).toEqual([[], [4], []]);
      expect(h.analytics.capture).toHaveBeenCalledWith('rack.row_cleared', {rack_id: 7, row: 0, cleared_count: 4, failed_count: 0});
      expect(h.showUndoSnackBar.calls.mostRecent().args[0]).toContain('4 modules unracked');
    });

    it('uses singular wording for a single module', () => {
      const h = createHarness(grid());
      service.bind(h.context);

      h.clearRow$.next(1);

      expect(h.showUndoSnackBar.calls.mostRecent().args[0]).toContain('1 module unracked');
    });

    it('skips the backend call when nothing in the row is persisted', () => {
      const rows = [[rm(undefined, 11, 0, 0)], [], []];
      const h = createHarness(rows);
      service.bind(h.context);

      h.clearRow$.next(0);

      expect(h.backend.delete.rackedModules).not.toHaveBeenCalled();
      expect(ids(h.rows$.value)).toEqual([[], [], []]);
    });

    it('keeps the grid intact and reports the failure when the batch delete fails', () => {
      const h = createHarness(grid());
      h.backend.delete.rackedModules.and.returnValue(throwError(() => new Error('x')));
      service.bind(h.context);

      h.clearRow$.next(0);

      expect(ids(h.rows$.value)).toEqual([[1, 2, 3], [4], []]);
      expect(h.analytics.capture).toHaveBeenCalledWith('rack.row_cleared', {rack_id: 7, row: 0, cleared_count: 0, failed_count: 3});
      expect(h.errors()).toContain('3 modules could not be unracked. Try again in a moment.');
      expect(h.showUndoSnackBar).not.toHaveBeenCalled();
    });

    it('does not touch other rows and renumbers the remaining ones', () => {
      const h = createHarness(grid());
      service.bind(h.context);

      h.clearRow$.next(0);

      expect(h.rows$.value![1][0].rackingData.row).toBe(1);
      expect(h.rows$.value![1][0].rackingData.column).toBe(0);
    });

    it('tells the user an empty row cannot be cleared and does not call the backend', () => {
      const h = createHarness(grid());
      service.bind(h.context);

      h.clearRow$.next(2);
      h.clearRow$.next(99);

      expect(h.backend.delete.rackedModules).not.toHaveBeenCalled();
      expect(h.errors().filter(m => m === 'This row type cannot be cleared.').length).toBe(2);
    });

    it('does nothing while the rack is loading', () => {
      const h = createHarness(null);
      service.bind(h.context);

      h.clearRow$.next(0);

      expect(h.backend.delete.rackedModules).not.toHaveBeenCalled();
      expect(h.errors()).toEqual([]);
    });

    it('routes a module-level clear request to its row, ignoring unracked modules', () => {
      const h = createHarness(grid());
      const clearRequests: number[] = [];
      h.clearRow$.subscribe(row => clearRequests.push(row));
      service.bind(h.context);

      h.rowClearing$.next(rm(1, 11, 0, 0));
      const unracked = rm(9, 19, 0, 0);
      (unracked.rackingData as {row: number | null}).row = null;
      h.rowClearing$.next(unracked);

      expect(clearRequests).toEqual([0]);
    });
  });
});
