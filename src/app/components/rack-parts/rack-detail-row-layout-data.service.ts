import { Injectable } from '@angular/core';
import { EMPTY } from 'rxjs';
import {
  catchError,
  concatMap,
  exhaustMap,
  map,
  switchMap,
  tap,
  withLatestFrom
} from 'rxjs/operators';
import { RackedModule } from '../../models/module';
import { Rack } from '../../models/rack';
import { SharedConstants } from '../../shared-interproject/SharedConstants';
import { cloneRackData } from './rack-detail-data.utils';
import { RackDetailDataContext } from './rack-detail-data.service.types';

@Injectable()
export class RackDetailRowLayoutDataService {
  bind(context: RackDetailDataContext): void {
    context.requestRemoveRow$
      .pipe(
        withLatestFrom(context.singleRackData$, context.rowedRackedModules$),
        exhaustMap(([_, rack, rackModules]) => {
          if (!rack || rack.rows <= 1) {
            SharedConstants.infoCustom(context.snackBar, 'This row cannot be removed.');
            return EMPTY;
          }

          const rowToRemove = rack.rows - 1;
          const currentRows: RackedModule[][] = [...(rackModules ?? Array.from({length: rack.rows}, () => []))];
          while (currentRows.length < rack.rows) {
            currentRows.push([]);
          }
          const lastRackRow = currentRows[rowToRemove] ?? [];
          if (lastRackRow.length > 0) {
            SharedConstants.infoCustom(context.snackBar, 'Clear the last row before removing it.');
            return EMPTY;
          }

          const snapshotRack: Rack = cloneRackData(rack);
          const snapshotRows: RackedModule[][] = rackModules ?? cloneRackData(currentRows);
          const nextRack: Rack = {
            ...rack,
            rows: rack.rows - 1
          };
          currentRows.splice(rowToRemove, 1);
          context.singleRackData$.next(nextRack);
          context.rowedRackedModules$.next(currentRows);

          return context.backend.update.rack(nextRack).pipe(
            tap(response => context.assertBackendSuccess(response)),
            tap(() => context.analytics.capture('rack.row_removed', { rack_id: nextRack.id })),
            catchError((err) => {
              console.error(`Error removing rack row: ${ err }`);
              context.singleRackData$.next(snapshotRack);
              context.rowedRackedModules$.next(context.withCurrentRackModuleOrientations(snapshotRows));
              SharedConstants.errorCustom(context.snackBar, 'Failed to remove row — changes reverted. Check your connection and try again.');
              return EMPTY;
            })
          );
        }),
        context.takeUntilDestroyed()
      )
      .subscribe();

    context.requestAddNewRow$
      .pipe(
        withLatestFrom(context.singleRackData$, context.rowedRackedModules$),
        exhaustMap(([_, rack, rackModules]) => {
          if (!rack) {
            return EMPTY;
          }

          const snapshotRack: Rack = cloneRackData(rack);
          const currentRows: RackedModule[][] = [...(rackModules ?? Array.from({length: rack.rows}, () => []))];
          while (currentRows.length < rack.rows) {
            currentRows.push([]);
          }
          const snapshotRows: RackedModule[][] = rackModules ?? cloneRackData(currentRows);
          const nextRack: Rack = {
            ...rack,
            rows: rack.rows + 1
          };
          currentRows.splice(rack.rows, 0, []);
          context.singleRackData$.next(nextRack);
          context.rowedRackedModules$.next(currentRows);

          return context.backend.update.rack(nextRack).pipe(
            tap(response => context.assertBackendSuccess(response)),
            tap(() => context.analytics.capture('rack.row_added', { rack_id: nextRack.id })),
            catchError((err) => {
              console.error(`Error adding rack row: ${ err }`);
              context.singleRackData$.next(snapshotRack);
              context.rowedRackedModules$.next(context.withCurrentRackModuleOrientations(snapshotRows));
              SharedConstants.errorCustom(context.snackBar, 'Failed to add row — changes reverted. Check your connection and try again.');
              return EMPTY;
            })
          );
        }),
        context.takeUntilDestroyed()
      )
      .subscribe();

    context.requestMoveRow$
      .pipe(
        concatMap(({rowId, direction}) => context.waitForRackModuleOrientationUpdateIdle().pipe(
          switchMap(() => {
            const rackModules = context.rowedRackedModules$.value;
            const rack = context.singleRackData$.value;
            if (!rack || !rackModules) {
              SharedConstants.errorCustom(context.snackBar, 'Rack data is still loading. Try moving the row again in a moment.');
              return EMPTY;
            }

            const targetRow = direction === 'up' ? rowId - 1 : rowId + 1;
            const canMove = rowId >= 0
              && rowId < rack.rows
              && targetRow >= 0
              && targetRow < rack.rows;

            if (!canMove) {
              SharedConstants.infoCustom(context.snackBar, 'This row cannot move any further.');
              return EMPTY;
            }

            const snapshot: RackedModule[][] = cloneRackData(rackModules);
            const nextRackModules: RackedModule[][] = [...rackModules];
            [nextRackModules[rowId], nextRackModules[targetRow]] = [nextRackModules[targetRow], nextRackModules[rowId]];
            context.updateRackRowCoordinates(nextRackModules, rack.rows);
            context.rowedRackedModules$.next(nextRackModules);

            return context.callBackendToUpdateModulesOfRack(nextRackModules, rack).pipe(
              tap(() => context.analytics.capture('rack.row_moved', {
                rack_id: rack.id,
                direction
              })),
              catchError((err) => {
                console.error(`Error moving rack row: ${ err }`);
                context.rowedRackedModules$.next(context.withCurrentRackModuleOrientations(snapshot));
                SharedConstants.errorCustom(context.snackBar, 'Failed to move row — changes reverted. Check your connection and try again.');
                return EMPTY;
              })
            );
          })
        )),
        context.takeUntilDestroyed()
      )
      .subscribe();

    context.requestDuplicateRow$
      .pipe(
        switchMap(rowId => context.waitForRackModuleOrientationUpdateIdle().pipe(
          map(() => ({
            rowId,
            rackModules: context.rowedRackedModules$.value,
            rack: context.singleRackData$.value
          }))
        )),
        switchMap(({rowId, rackModules, rack}) => {
          if (!rack || !rackModules || rowId < 0 || rowId >= rack.rows) {
            SharedConstants.infoCustom(context.snackBar, 'This row cannot be duplicated.');
            return EMPTY;
          }

          const snapshotRack: Rack = cloneRackData(rack);
          const snapshotRackModules: RackedModule[][] = cloneRackData(rackModules);
          const nextRack: Rack = {
            ...rack,
            rows: rack.rows + 1
          };
          const nextRackModules: RackedModule[][] = [...rackModules];
          const duplicatedRow = cloneRackData(nextRackModules[rowId] ?? []);
          duplicatedRow.forEach(module => {
            module.rackingData.id = undefined;
          });
          nextRackModules.splice(rowId + 1, 0, duplicatedRow);
          context.updateRackRowCoordinates(nextRackModules, nextRack.rows);
          context.singleRackData$.next(nextRack);
          context.rowedRackedModules$.next(nextRackModules);

          return context.persistRackRowsAndModules(nextRackModules, nextRack).pipe(
            tap(() => context.analytics.capture('rack.row_duplicated', {
              rack_id: rack.id,
              row: rowId,
              module_count: duplicatedRow.length
            })),
            catchError((err) => {
              console.error(`Error duplicating rack row: ${ err }`);
              context.singleRackData$.next(snapshotRack);
              context.rowedRackedModules$.next(context.withCurrentRackModuleOrientations(snapshotRackModules));
              SharedConstants.errorCustom(context.snackBar, 'Failed to duplicate row — changes reverted. Check your connection and try again.');
              return EMPTY;
            })
          );
        }),
        context.takeUntilDestroyed()
      )
      .subscribe();

    context.requestDeleteRow$
      .pipe(
        switchMap(rowId => context.waitForRackModuleOrientationUpdateIdle().pipe(
          map(() => ({
            rowId,
            rackModules: context.rowedRackedModules$.value,
            rack: context.singleRackData$.value
          }))
        )),
        switchMap(({rowId, rackModules, rack}) => {
          if (!rack || !rackModules) {
            SharedConstants.errorCustom(context.snackBar, 'Rack data is still loading. Try deleting the row again in a moment.');
            return EMPTY;
          }

          const row = rackModules?.[rowId] ?? [];
          const canDelete = rack.rows > 1
            && rowId >= 0
            && rowId < rack.rows
            && row.length === 0;

          if (!canDelete) {
            SharedConstants.infoCustom(context.snackBar, row.length > 0
              ? 'Clear this row before deleting it.'
              : 'This row cannot be deleted.');
            return EMPTY;
          }

          const snapshotRack: Rack = cloneRackData(rack);
          const snapshotRackModules: RackedModule[][] = cloneRackData(rackModules);
          const nextRack: Rack = {
            ...rack,
            rows: rack.rows - 1
          };
          const nextRackModules: RackedModule[][] = [...rackModules];
          nextRackModules.splice(rowId, 1);
          context.updateRackRowCoordinates(nextRackModules, nextRack.rows);
          context.rowedRackedModules$.next(nextRackModules);

          return context.persistRackRowsAndModules(nextRackModules, nextRack).pipe(
            tap(() => {
              context.singleRackData$.next(nextRack);
              context.analytics.capture('rack.row_deleted', {
                rack_id: rack.id,
                row: rowId
              });
              context.showUndoSnackBar(
                'Row deleted.',
                () => context.undoDeletedRow$(rowId),
                'Row restored.'
              );
            }),
            catchError((err) => {
              console.error(`Error deleting rack row: ${ err }`);
              context.singleRackData$.next(snapshotRack);
              context.rowedRackedModules$.next(context.withCurrentRackModuleOrientations(snapshotRackModules));
              SharedConstants.errorCustom(context.snackBar, 'Failed to delete row — changes reverted. Check your connection and try again.');
              return EMPTY;
            })
          );
        }),
        context.takeUntilDestroyed()
      )
      .subscribe();

    context.requestLayoutRemix$
      .pipe(
        withLatestFrom(context.layoutScope$),
        switchMap(([_, layoutScope]) => {
          return context.waitForRackModuleOrientationUpdateIdle().pipe(
            switchMap(() => context.applyLayoutVariantAction(context.rowedRackedModules$.value, context.singleRackData$.value, layoutScope, 'remix'))
          );
        }),
        context.takeUntilDestroyed()
      )
      .subscribe();

    context.requestLayoutShuffle$
      .pipe(
        withLatestFrom(context.layoutScope$),
        switchMap(([_, layoutScope]) => {
          return context.waitForRackModuleOrientationUpdateIdle().pipe(
            switchMap(() => context.applyLayoutVariantAction(context.rowedRackedModules$.value, context.singleRackData$.value, layoutScope, 'shuffle'))
          );
        }),
        context.takeUntilDestroyed()
      )
      .subscribe();
  }
}
