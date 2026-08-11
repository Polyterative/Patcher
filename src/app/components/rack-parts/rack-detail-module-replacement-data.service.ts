import { Injectable } from '@angular/core';
import {
  EMPTY,
  of
} from 'rxjs';
import {
  catchError,
  filter,
  map,
  switchMap,
  tap,
  withLatestFrom
} from 'rxjs/operators';
import { RackedModule } from '../../models/module';
import { DEFAULT_RACK_MODULE_ORIENTATION } from '../../models/rack';
import { SharedConstants } from '../../shared-interproject/SharedConstants';
import {
  calculateBlankIdForSizeAndStandard,
  cloneRackData
} from './rack-detail-data.utils';
import { RackDetailDataContext } from './rack-detail-data.service.types';

@Injectable()
export class RackDetailModuleReplacementDataService {
  bind(context: RackDetailDataContext): void {
    context.requestRackedModuleReplaceWithBlank$
      .pipe(
        map((rackedModule) => {
          const effectiveHp = rackedModule.module.hp;
          if (rackedModule.module.standard.id === 0) {
            if (effectiveHp > 20) {
              context.snackBar.open(`"${ rackedModule.module.name }" is ${ effectiveHp } HP — too big to replace with a blank (max 20 HP).`, undefined, {
                duration: 4000,
                panelClass: 'snack-error'
              });
              return [];
            }
          } else if (rackedModule.module.standard.id === 1) {
            if (effectiveHp > 26) {
              context.snackBar.open(`"${ rackedModule.module.name }" is ${ effectiveHp } HP — too big to replace with a blank (max 26 HP).`, undefined, {
                duration: 4000,
                panelClass: 'snack-error'
              });
              return [];
            }
          }
          return [rackedModule];
        }),
        filter(x => x.length > 0),
        map(([rackedModule]) => rackedModule),
        switchMap(rackedModule => context.waitForRackModuleOrientationUpdateIdle().pipe(
          map(() => ({
            rackedModule,
            rackModules: context.rowedRackedModules$.value,
            rack: context.singleRackData$.value
          }))
        )),
        switchMap(({rackedModule, rackModules, rack}) => {
          if (!rack || !rackModules) {
            SharedConstants.errorCustom(context.snackBar, 'Rack data is still loading. Try replacing this module again in a moment.');
            return EMPTY;
          }

          const targetModule = rackedModule.rackingData.id == null
            ? rackedModule
            : context.findRackedModuleById(rackModules, rackedModule.rackingData.id);
          if (!targetModule) {
            SharedConstants.errorCustom(context.snackBar, 'Could not find this module in the rack.');
            return EMPTY;
          }

          if (targetModule.rackingData.id == null) {
            SharedConstants.errorCustom(context.snackBar, 'Rack changes are still syncing. Try replacing this module again in a moment.');
            return EMPTY;
          }

          const blankModuleId = calculateBlankIdForSizeAndStandard(
            targetModule.module.hp,
            targetModule.module.standard.id
          );

          if (blankModuleId === -1) {
            SharedConstants.errorCustom(context.snackBar, 'No matching blank panel was found for this module.');
            return EMPTY;
          }

          const snapshot: RackedModule[][] = cloneRackData(rackModules);
          const currentRows: RackedModule[][] = cloneRackData(rackModules);
          const rowId = targetModule.rackingData.row;
          const row = rowId == null ? undefined : currentRows[rowId];
          const moduleIndex = row?.findIndex(module => module.rackingData.id === targetModule.rackingData.id) ?? -1;

          if (!row || moduleIndex < 0) {
            SharedConstants.errorCustom(context.snackBar, 'Could not find this module in the rack.');
            return EMPTY;
          }

          return context.backend.GET.moduleWithIdForRackDisplay(blankModuleId).pipe(
            map(response => context.assertBackendSuccess(response)),
            switchMap(response => {
              const blankModule = (response as {data?: RackedModule['module']}).data;
              if (!blankModule) {
                throw new Error('Blank module lookup returned no data');
              }

              const blankRackedModule: RackedModule = {
                module: blankModule,
                rackingData: {
                  id: undefined,
                  rackid: rack.id,
                  moduleid: blankModule.id,
                  row: targetModule.rackingData.row,
                  column: targetModule.rackingData.column,
                  selectedPanelId: null,
                  orientation: DEFAULT_RACK_MODULE_ORIENTATION
                }
              };
              row.splice(moduleIndex, 1, blankRackedModule);
              context.updateModulesColumnIds(currentRows, rowId);
              context.rowedRackedModules$.next(currentRows);
              const originalModule = cloneRackData(targetModule);

              return context.backend.delete.rackedModule(targetModule.rackingData.id).pipe(
                map(deleteResponse => context.assertBackendSuccess(deleteResponse)),
                catchError((err) => {
                  console.error(`Error replacing module with blank: ${ err }`);
                  context.rowedRackedModules$.next(context.withCurrentRackModuleOrientations(snapshot));
                  SharedConstants.errorCustom(context.snackBar, 'Failed to replace module with blank — changes reverted. Check your connection and try again.');
                  return EMPTY;
                }),
                switchMap(() => context.backend.add.rackModule(
                  blankModuleId,
                  rack.id,
                  blankRackedModule.rackingData.row,
                  blankRackedModule.rackingData.column,
                  DEFAULT_RACK_MODULE_ORIENTATION
                ).pipe(
                  map(addResponse => context.assertBackendSuccess(addResponse)),
                  tap(addResponse => {
                    context.applyPersistedRackingIds(addResponse, currentRows);
                    context.showUndoSnackBar(
                      `"${ originalModule.module.name }" replaced with a blank.`,
                      () => context.undoBlankReplacement$(originalModule, blankRackedModule),
                      `"${ originalModule.module.name }" restored.`
                    );
                  }),
                  catchError((err) => {
                    console.error(`Error adding replacement blank: ${ err }`);
                    const nextRows: RackedModule[][] = cloneRackData(context.rowedRackedModules$.value ?? []);
                    nextRows[rowId].splice(moduleIndex, 1);
                    context.updateModulesColumnIds(nextRows, rowId);
                    context.rowedRackedModules$.next(nextRows);
                    context.requestRackedModulesDbSync$.next();
                    SharedConstants.errorCustom(context.snackBar, 'The module was removed, but the blank panel could not be added. Try adding a blank manually.');
                    return EMPTY;
                  })
                ))
              );
            }),
            catchError((err) => {
              console.error(`Error preparing blank replacement: ${ err }`);
              SharedConstants.errorCustom(context.snackBar, 'Failed to load the matching blank panel. Try again in a moment.');
              return EMPTY;
            }),
            context.takeUntilDestroyed()
          );
        }),
        context.takeUntilDestroyed()
      )
      .subscribe(() => {
        context.analytics.capture('rack.module_replaced_with_blank', { rack_id: context.singleRackData$.value?.id });
      });

    context.requestRackedModuleRowClearing$
      .pipe(
        map(rackedModule => rackedModule.rackingData.row),
        filter((rowId): rowId is number => rowId != null),
        context.takeUntilDestroyed()
      )
      .subscribe(rowId => context.requestClearRow$.next(rowId));

    context.requestClearRow$
      .pipe(
        withLatestFrom(context.rowedRackedModules$, context.singleRackData$),
        switchMap(([rowId, allRackModule, rack]) => {
          if (!allRackModule) {
            return EMPTY;
          }

          const modulesInRow: RackedModule[] = [...(allRackModule?.[rowId] ?? [])];

          if (modulesInRow && modulesInRow.length > 0) {
            const persistedModules = modulesInRow.filter(module => module.rackingData.id != null);
            const persistedIds = persistedModules.map(module => module.rackingData.id as number);
            const clearPersistedModules$ = persistedIds.length > 0
              ? context.backend.delete.rackedModules(persistedIds).pipe(
                map(response => context.assertBackendSuccess(response))
              )
              : of(null);

            return clearPersistedModules$.pipe(
              tap(() => {
                const deletedIds = new Set(persistedIds);
                const deletedModules = new Set(modulesInRow);
                const clearedCount = modulesInRow.length;
                const failedCount = 0;
                const rackModules: RackedModule[][] = [...(context.rowedRackedModules$.value ?? [])];
                for (const row of rackModules) {
                  for (let index = row.length - 1; index >= 0; index--) {
                    if (deletedIds.has(row[index].rackingData.id) || deletedModules.has(row[index])) {
                      row.splice(index, 1);
                    }
                  }
                }
                context.updateRackRowCoordinates(rackModules, rack?.rows ?? rackModules.length);
                context.rowedRackedModules$.next(rackModules);

                context.analytics.capture('rack.row_cleared', {
                  rack_id: rack?.id,
                  row: rowId,
                  cleared_count: clearedCount,
                  failed_count: failedCount
                });

                context.showUndoSnackBar(
                  `${ modulesInRow.length } module${ modulesInRow.length === 1 ? '' : 's' } unracked from this row.`,
                  () => context.restoreRemovedModules$(modulesInRow),
                  `${ modulesInRow.length } module${ modulesInRow.length === 1 ? '' : 's' } restored.`
                );
              }),
              catchError((err) => {
                console.error(`Error clearing row modules: ${ err }`);
                const failedCount = persistedModules.length;
                context.analytics.capture('rack.row_cleared', {
                  rack_id: rack?.id,
                  row: rowId,
                  cleared_count: 0,
                  failed_count: failedCount
                });
                SharedConstants.errorCustom(context.snackBar, `${ failedCount } module${ failedCount === 1 ? '' : 's' } could not be unracked. Try again in a moment.`);
                return EMPTY;
              })
            );
          } else {
            SharedConstants.errorCustom(context.snackBar, 'This row type cannot be cleared.');
          }

          return EMPTY;
        }),
        context.takeUntilDestroyed()
      )
      .subscribe();
  }
}
