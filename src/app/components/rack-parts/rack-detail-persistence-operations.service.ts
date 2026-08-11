import { Injectable } from '@angular/core';
import {
  EMPTY,
  Observable,
  of
} from 'rxjs';
import {
  catchError,
  map,
  switchMap,
  take
} from 'rxjs/operators';
import { RackedModule } from '../../models/module';
import {
  DEFAULT_RACK_MODULE_ORIENTATION,
  normalizeRackModuleOrientation,
  Rack
} from '../../models/rack';
import { SharedConstants } from '../../shared-interproject/SharedConstants';
import {
  cloneRackData,
  isAnyModuleWithoutRackingId
} from './rack-detail-data.utils';
import { RackDetailDataContext } from './rack-detail-data.service.types';

@Injectable()
export class RackDetailPersistenceOperationsService {
  callBackendToUpdateModulesOfRack(
    context: RackDetailDataContext,
    rackModules: RackedModule[][],
    _rack: Rack
  ) {
    const modules = rackModules.flatMap(row => row);
    const unsyncedModules = modules.filter(module => module.rackingData.id === undefined);

    if (modules.length === 0) {
      return of(undefined);
    }

    return context.backend.update.rackedModules(modules)
      .pipe(
        switchMap(response => {
          this.applyPersistedRackingIds(response, rackModules, unsyncedModules);
          const activeModules = new Set(rackModules.flatMap(row => row));
          const orphanedPersistedModules = unsyncedModules
            .filter(module => !activeModules.has(module) && module.rackingData.id != null);

          if (orphanedPersistedModules.length === 0) {
            return of(response);
          }

          const orphanedPersistedIds = orphanedPersistedModules.map(module => module.rackingData.id as number);
          return context.backend.delete.rackedModules(orphanedPersistedIds).pipe(
            map(deleteResponse => this.assertBackendSuccess(deleteResponse)),
            map(() => response)
          );
        })
      );
  }

  assertBackendSuccess<T>(response: T): T {
    const error = (response as {error?: unknown} | undefined)?.error;
    if (error) {
      throw error;
    }

    return response;
  }

  applyPersistedRackingIds(
    response: unknown,
    rackModules: RackedModule[][],
    targetUnsyncedModules: RackedModule[] = []
  ): void {
    const persistedRows = (response as {
      data?: Array<{
        id?: number;
        moduleid?: number;
        rackid?: number;
        row?: number;
        column?: number;
        selected_panel_id?: number | null;
        orientation?: string | null;
      }>;
    } | undefined)?.data ?? [];

    if (persistedRows.length === 0) {
      return;
    }

    for (const [index, target] of targetUnsyncedModules.entries()) {
      const persistedRow = persistedRows[index];
      if (target?.rackingData.id === undefined && persistedRow?.id != null) {
        target.rackingData.id = persistedRow.id;
        target.rackingData.selectedPanelId = persistedRow.selected_panel_id ?? null;
        target.rackingData.orientation = normalizeRackModuleOrientation(persistedRow.orientation ?? target.rackingData.orientation);
      }
    }

    if (!isAnyModuleWithoutRackingId(rackModules)) {
      return;
    }

    const unsyncedModules = rackModules.flatMap(row => row)
      .filter(module => module.rackingData.id === undefined);

    for (const module of unsyncedModules) {
      const persistedRow = persistedRows.find(row =>
        row.id != null
        && row.moduleid === module.rackingData.moduleid
        && row.rackid === module.rackingData.rackid
        && row.row === module.rackingData.row
        && row.column === module.rackingData.column
      );

      if (persistedRow?.id != null) {
        module.rackingData.id = persistedRow.id;
        module.rackingData.selectedPanelId = persistedRow.selected_panel_id ?? null;
        module.rackingData.orientation = normalizeRackModuleOrientation(persistedRow.orientation ?? module.rackingData.orientation);
      }
    }
  }

  insertOptimisticModule(
    context: RackDetailDataContext,
    rackModules: RackedModule[][],
    data: {
      module: RackedModule['module'];
      row: number | null;
      column: number | null;
      rackId: number;
    }
  ): RackedModule {
    const optimisticModule: RackedModule = {
      module: data.module,
      rackingData: {
        id: undefined,
        rackid: data.rackId,
        moduleid: data.module.id,
        row: data.row,
        column: data.column,
        selectedPanelId: null,
        orientation: DEFAULT_RACK_MODULE_ORIENTATION
      }
    };

    if (data.row == null) {
      const rack = context.singleRackData$.value;
      const unrackedRowIndex = rack && rackModules.length > rack.rows ? rackModules.length - 1 : rackModules.length;
      if (!rackModules[unrackedRowIndex]) {
        rackModules[unrackedRowIndex] = [];
      }
      rackModules[unrackedRowIndex].push(optimisticModule);
      return optimisticModule;
    }

    if (!rackModules[data.row]) {
      rackModules[data.row] = [];
    }
    rackModules[data.row].splice(data.column ?? rackModules[data.row].length, 0, optimisticModule);
    return optimisticModule;
  }

  removeRackedModuleByReference(context: RackDetailDataContext, target: RackedModule): void {
    const rack = context.singleRackData$.value;
    const rows = [...(context.rowedRackedModules$.value ?? [])];
    for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
      const row = rows[rowIndex];
      const moduleIndex = row.findIndex(module => module === target);
      if (moduleIndex < 0) {
        continue;
      }

      row.splice(moduleIndex, 1);
      if (rack && rowIndex >= rack.rows && row.length === 0) {
        rows.splice(rowIndex, 1);
      } else if (!rack || rowIndex < rack.rows) {
        context.updateModulesColumnIds(rows, rowIndex);
      }
      context.rowedRackedModules$.next(rows);
      return;
    }
  }

  persistRackRowsAndModules(context: RackDetailDataContext, rackModules: RackedModule[][], rack: Rack) {
    return context.callBackendToUpdateModulesOfRack(rackModules, rack).pipe(
      switchMap(() => context.backend.update.rack(rack))
    );
  }

  showUndoSnackBar(
    context: RackDetailDataContext,
    message: string,
    undoFactory: () => Observable<unknown>,
    undoSuccessMessage: string,
    duration = 5000
  ): void {
    const snackRef = context.snackBar.open(message, 'Undo', {
      duration,
      panelClass: 'snack-success'
    });
    const action$ = snackRef?.onAction?.();
    if (!action$) {
      return;
    }

    action$
      .pipe(
        take(1),
        switchMap(() => undoFactory().pipe(
          catchError(err => {
            console.error('Error undoing rack action:', err);
            SharedConstants.errorCustom(context.snackBar, 'Undo failed — refresh the rack and try again.');
            return EMPTY;
          })
        )),
        context.takeUntilDestroyed()
      )
      .subscribe(() => SharedConstants.successCustom(context.snackBar, undoSuccessMessage));
  }

  restoreRackLayout$(context: RackDetailDataContext, snapshotRows: RackedModule[][]): Observable<unknown> {
    return context.waitForRackModuleOrientationUpdateIdle().pipe(
      switchMap(() => {
        const rack = context.singleRackData$.value;
        if (!rack) {
          return EMPTY;
        }

        const failureSnapshot = cloneRackData(context.rowedRackedModules$.value ?? []);
        const nextRows = context.withCurrentRackModuleOrientations(cloneRackData(snapshotRows));
        context.updateRackRowCoordinates(nextRows, rack.rows);
        context.rowedRackedModules$.next(nextRows);

        return context.callBackendToUpdateModulesOfRack(nextRows, rack).pipe(
          catchError(err => {
            context.rowedRackedModules$.next(context.withCurrentRackModuleOrientations(failureSnapshot));
            throw err;
          })
        );
      })
    );
  }

  restoreRemovedModules$(context: RackDetailDataContext, modules: RackedModule[]): Observable<unknown> {
    return context.waitForRackModuleOrientationUpdateIdle().pipe(
      switchMap(() => {
        const rack = context.singleRackData$.value;
        if (!rack) {
          return EMPTY;
        }

        const snapshot = cloneRackData(context.rowedRackedModules$.value ?? []);
        const nextRows = [...(context.rowedRackedModules$.value ?? Array.from({length: rack.rows}, () => []))];
        const modulesToRestore = cloneRackData(modules)
          .sort((a, b) => {
            const rowA = a.rackingData.row ?? Number.MAX_SAFE_INTEGER;
            const rowB = b.rackingData.row ?? Number.MAX_SAFE_INTEGER;
            if (rowA !== rowB) {
              return rowA - rowB;
            }

            return (a.rackingData.column ?? Number.MAX_SAFE_INTEGER) - (b.rackingData.column ?? Number.MAX_SAFE_INTEGER);
          });

        for (const module of modulesToRestore) {
          this.insertRestoredModule(context, nextRows, module, rack.rows);
        }
        context.updateRackRowCoordinates(nextRows, rack.rows);
        context.rowedRackedModules$.next(nextRows);

        return context.callBackendToUpdateModulesOfRack(nextRows, rack).pipe(
          catchError(err => {
            context.rowedRackedModules$.next(context.withCurrentRackModuleOrientations(snapshot));
            throw err;
          })
        );
      })
    );
  }

  undoBlankReplacement$(
    context: RackDetailDataContext,
    originalModule: RackedModule,
    blankModule: RackedModule
  ): Observable<unknown> {
    return context.waitForRackModuleOrientationUpdateIdle().pipe(
      switchMap(() => {
        const rack = context.singleRackData$.value;
        if (!rack) {
          return EMPTY;
        }

        const blankRackingId = blankModule.rackingData.id;
        const snapshot = cloneRackData(context.rowedRackedModules$.value ?? []);
        const deleteBlank$ = blankRackingId == null
          ? of(undefined)
          : context.backend.delete.rackedModule(blankRackingId).pipe(map(response => context.assertBackendSuccess(response)));

        return deleteBlank$.pipe(
          switchMap(() => {
            const nextRows = [...(context.rowedRackedModules$.value ?? Array.from({length: rack.rows}, () => []))];
            this.removeModuleByRackingId(nextRows, blankRackingId);
            this.insertRestoredModule(context, nextRows, originalModule, rack.rows);
            context.updateRackRowCoordinates(nextRows, rack.rows);
            context.rowedRackedModules$.next(nextRows);

            return context.callBackendToUpdateModulesOfRack(nextRows, rack).pipe(
              catchError(err => {
                context.rowedRackedModules$.next(context.withCurrentRackModuleOrientations(snapshot));
                throw err;
              })
            );
          })
        );
      })
    );
  }

  undoDeletedRow$(context: RackDetailDataContext, rowId: number): Observable<unknown> {
    return context.waitForRackModuleOrientationUpdateIdle().pipe(
      switchMap(() => {
        const rack = context.singleRackData$.value;
        if (!rack) {
          return EMPTY;
        }

        const snapshotRack = cloneRackData(rack);
        const snapshotRows = cloneRackData(context.rowedRackedModules$.value ?? []);
        const nextRack: Rack = {
          ...rack,
          rows: rack.rows + 1
        };
        const nextRows = [...(context.rowedRackedModules$.value ?? Array.from({length: rack.rows}, () => []))];
        const insertIndex = Math.max(0, Math.min(rowId, rack.rows));
        nextRows.splice(insertIndex, 0, []);
        context.updateRackRowCoordinates(nextRows, nextRack.rows);
        context.singleRackData$.next(nextRack);
        context.rowedRackedModules$.next(nextRows);

        return context.persistRackRowsAndModules(nextRows, nextRack).pipe(
          catchError(err => {
            context.singleRackData$.next(snapshotRack);
            context.rowedRackedModules$.next(context.withCurrentRackModuleOrientations(snapshotRows));
            throw err;
          })
        );
      })
    );
  }

  private insertRestoredModule(
    context: RackDetailDataContext,
    rackModules: RackedModule[][],
    module: RackedModule,
    rowCount: number
  ): void {
    const restoredModule = cloneRackData(module);
    restoredModule.rackingData.id = undefined;
    const rowId = restoredModule.rackingData.row;

    if (rowId == null || rowId >= rowCount) {
      const unrackedRowIndex = rackModules.length > rowCount ? rackModules.length - 1 : rackModules.length;
      if (!rackModules[unrackedRowIndex]) {
        rackModules[unrackedRowIndex] = [];
      }
      restoredModule.rackingData.row = null;
      restoredModule.rackingData.column = null;
      rackModules[unrackedRowIndex].push(restoredModule);
      return;
    }

    while (rackModules.length < rowCount) {
      rackModules.push([]);
    }

    const row = rackModules[rowId] ?? [];
    rackModules[rowId] = row;
    const column = Math.max(0, Math.min(restoredModule.rackingData.column ?? row.length, row.length));
    row.splice(column, 0, restoredModule);
    context.updateModulesColumnIds(rackModules, rowId);
  }

  private removeModuleByRackingId(rackModules: RackedModule[][], rackingId: number | undefined): void {
    if (rackingId == null) {
      return;
    }

    for (const row of rackModules) {
      const index = row.findIndex(module => module.rackingData.id === rackingId);
      if (index >= 0) {
        row.splice(index, 1);
        return;
      }
    }
  }
}
