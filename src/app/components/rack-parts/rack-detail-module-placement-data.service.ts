import { Injectable } from '@angular/core';
import {
  EMPTY,
  of
} from 'rxjs';
import {
  catchError,
  exhaustMap,
  finalize,
  filter,
  map,
  switchMap,
  tap,
  withLatestFrom
} from 'rxjs/operators';
import { RackedModule } from '../../models/module';
import {
  nextRackModuleOrientation,
  normalizeRackModuleOrientation
} from '../../models/rack';
import { SharedConstants } from '../../shared-interproject/SharedConstants';
import {
  calculateBlankIdForSizeAndStandard,
  cloneRackData,
  resolveQuickBlankStandardForRow
} from './rack-detail-data.utils';
import { RackDetailDataContext } from './rack-detail-data.service.types';

@Injectable()
export class RackDetailModulePlacementDataService {
  bindRackOrdering(context: RackDetailDataContext): void {
    context.rackOrderChange$
      .pipe(
        withLatestFrom(context.rowedRackedModules$, context.singleRackData$),
        context.takeUntilDestroyed()
      )
      .subscribe(([
                    {
                      event,
                      newRow,
                      module
                    }, rackModules, rack
                  ]) => {
        const movingUnrackedModuleToUnrackedPosition: boolean = module.rackingData.row === null && newRow > rack.rows - 1;
        if (movingUnrackedModuleToUnrackedPosition) {
          context.snackBar.open(
            `Not moving unracked module. Please move it to a suitable position inside your rack above.
                Your rack has ${ rack.rows } rows`,
            null,
            {duration: 8000});
        } else {
          if (newRow === module.rackingData.row) {
            context.transferInRow(rackModules, newRow, event);
          } else {
            context.transferBetweenRows(rackModules, module, event, newRow);
          }

          context.rowedRackedModules$.next([...rackModules]);
          context.analytics.capture('rack.module_moved', { rack_id: rack.id });
          context.requestRackedModulesDbSync$.next();
        }
      });
  }

  bindModulePlacement(context: RackDetailDataContext): void {
    context.requestRackedModuleRemoval$
      .pipe(
        switchMap(rackedModule => context.waitForRackModuleOrientationUpdateIdle().pipe(
          map(() => ({
            rackedModule,
            rackModules: context.rowedRackedModules$.value
          }))
        )),
        switchMap(({rackedModule, rackModules}) => {
          if (!rackModules) {
            SharedConstants.errorCustom(context.snackBar, 'Rack data is still loading. Try removing this module again in a moment.');
            return EMPTY;
          }

          const targetModule = rackedModule.rackingData.id == null
            ? rackedModule
            : context.findRackedModuleById(rackModules, rackedModule.rackingData.id);
          if (!targetModule) {
            SharedConstants.errorCustom(context.snackBar, 'Could not find this module in the rack.');
            return EMPTY;
          }

          const snapshot: RackedModule[][] = cloneRackData(rackModules);
          const removedModule: RackedModule = cloneRackData(targetModule);
          const moduleId = targetModule.module.id;
          const rackId = context.singleRackData$.value?.id;

          context.removeRackedModuleFromRack(rackModules, targetModule);
          context.rowedRackedModules$.next(rackModules);

          if (targetModule.rackingData.id == null) {
            return of({ moduleId, rackId, removedModule });
          }

          return context.backend.delete.rackedModule(targetModule.rackingData.id).pipe(
            map(() => ({ moduleId, rackId, removedModule })),
            catchError(err => {
              console.error(`Error removing racked module: ${ err }`);
              context.rowedRackedModules$.next(context.withCurrentRackModuleOrientations(snapshot));
              SharedConstants.errorCustom(context.snackBar, 'Failed to remove module — changes reverted. Check your connection and try again.');
              return of(undefined);
            })
          );
        }),
        filter(x => x !== undefined),
        context.takeUntilDestroyed()
      )
      .subscribe((result) => {
        if (result) {
          context.analytics.capture('rack.module_removed', {
            rack_id:   result.rackId,
            module_id: result.moduleId
          });
          context.showUndoSnackBar(
            `"${ result.removedModule.module.name }" removed from rack.`,
            () => context.restoreRemovedModules$([result.removedModule]),
            `"${ result.removedModule.module.name }" restored.`
          );
        }
      });

    context.requestRackedModuleDuplication$
      .pipe(
        switchMap(rackedModule => context.waitForRackModuleOrientationUpdateIdle().pipe(
          map(() => ({
            rackedModule,
            rackModules: context.rowedRackedModules$.value
          }))
        )),
        context.takeUntilDestroyed()
      )
      .subscribe(({rackedModule, rackModules}) => {
        if (!rackModules) {
          SharedConstants.errorCustom(context.snackBar, 'Rack data is still loading. Try duplicating this module again in a moment.');
          return;
        }

        let targetModule: RackedModule | undefined = rackedModule;
        if (rackedModule.rackingData.id != null) {
          targetModule = context.findRackedModuleById(rackModules, rackedModule.rackingData.id);
          if (!targetModule) {
            SharedConstants.errorCustom(context.snackBar, 'Could not find this module in the rack.');
            return;
          }
        }

        context.duplicateModule(rackModules, targetModule);
        context.rowedRackedModules$.next(rackModules);
        context.analytics.capture('rack.module_duplicated', { rack_id: context.singleRackData$.value?.id, module_id: targetModule.module?.id });
        context.requestRackedModulesDbSync$.next();
      });

    context.requestRackedModulePanelSwitch$
      .pipe(
        withLatestFrom(context.rowedRackedModules$),
        switchMap(([{rackedModule, panelId}, rackModules]) => {
          let targetModule: RackedModule | undefined;
          let previousPanelId: number | null | undefined;
          if (rackModules) {
            for (const row of rackModules) {
              const target = row.find(m => m.rackingData.id === rackedModule.rackingData.id);
              if (target) {
                targetModule = target;
                previousPanelId = target.rackingData.selectedPanelId ?? null;
                target.rackingData.selectedPanelId = panelId;
                break;
              }
            }
            context.rowedRackedModules$.next(rackModules);
          }
          return context.backend.update.rackModulePanel(rackedModule.rackingData.id, panelId).pipe(
            tap(() => context.analytics.capture('rack.module_panel_switched', { rack_id: context.singleRackData$.value?.id, module_id: rackedModule.module?.id, panel_id: panelId })),
            catchError((err) => {
              console.error(`Error updating rack module panel: ${ err }`);
              if (targetModule) {
                targetModule.rackingData.selectedPanelId = previousPanelId ?? null;
                context.rowedRackedModules$.next(rackModules);
              }
              context.snackBar.open(SharedConstants.messages.operationFailed, undefined, {duration: 8000, panelClass: 'snack-error'});
              return of(undefined);
            })
          );
        }),
        context.takeUntilDestroyed()
      )
      .subscribe();

    context.requestRackedModuleOrientationToggle$
      .pipe(
        withLatestFrom(
          context.rowedRackedModules$,
          context.singleRackData$,
          context.isCurrentRackPropertyOfCurrentUser$,
          context.isCurrentRackEditable$
        ),
        exhaustMap(([rackedModule, rackModules, rack, isOwner, isEditable]) => {
          const rackModuleId = rackedModule.rackingData.id;
          if (!rackModules || !rack || !context.canToggleRackModuleOrientation(rackedModule, isOwner, isEditable)) {
            return EMPTY;
          }

          if (rackModuleId == null) {
            SharedConstants.errorCustom(context.snackBar, 'Rack changes are still syncing. Try flipping this module again in a moment.');
            return EMPTY;
          }

          if (context.isAnyRackModuleOrientationUpdating()) {
            return EMPTY;
          }

          const targetModule = context.findRackedModuleById(rackModules, rackModuleId);
          if (!targetModule) {
            SharedConstants.errorCustom(context.snackBar, 'Could not find this module in the rack.');
            return EMPTY;
          }

          const previousOrientation = normalizeRackModuleOrientation(targetModule.rackingData.orientation);
          const nextOrientation = nextRackModuleOrientation(previousOrientation);
          context.rackedModuleOrientationUpdatingId$.next(rackModuleId);

          return context.backend.update.rackModuleOrientation(rackModuleId, nextOrientation).pipe(
            tap(() => {
              context.applyRackModuleOrientation(rackModuleId, nextOrientation, rackedModule);
              context.analytics.capture('rack_module_orientation_flipped', {
                rack_id: rack.id,
                module_id: rackedModule.module.id,
                standard_id: rackedModule.module.standard?.id,
                from: previousOrientation,
                to: nextOrientation
              });
            }),
            catchError((err) => {
              console.error(`Error updating rack module orientation: ${ err }`);
              SharedConstants.errorCustom(context.snackBar, 'Failed to flip module. Check your connection and try again.');
              return EMPTY;
            }),
            finalize(() => context.rackedModuleOrientationUpdatingId$.next(null))
          );
        }),
        context.takeUntilDestroyed()
      )
      .subscribe();

    context.requestRackedModulesDbSync$
      .pipe(
        withLatestFrom(context.singleRackData$),
        switchMap(([_, rack]) => context.waitForRackModuleOrientationUpdateIdle().pipe(
          switchMap(() => {
            if (!rack) {
              return of(undefined);
            }

            const rackModules = context.rowedRackedModules$.value ?? [];
            const snapshot: RackedModule[][] = cloneRackData(rackModules);
            return context.callBackendToUpdateModulesOfRack(rackModules, rack).pipe(
              catchError((err) => {
                console.error(`Error syncing rack data with backend: ${ err }`);
                context.rowedRackedModules$.next(context.withCurrentRackModuleOrientations(snapshot));
                SharedConstants.errorCustom(context.snackBar, 'Failed to save rack changes — changes reverted. Check your connection and try again.');
                return of(undefined);
              })
            );
          })
        )),
        filter(x => !!x),
        context.takeUntilDestroyed()
      )
      .subscribe();
  }

  bindModuleAdditions(context: RackDetailDataContext): void {
    context.addModuleToRack$
      .pipe(
        withLatestFrom(context.singleRackData$, context.rowedRackedModules$),
        exhaustMap(([module, rack, rackModules]) => {
          if (!rack) {
            SharedConstants.errorCustom(context.snackBar, 'Rack data is still loading. Try again in a moment.');
            return EMPTY;
          }

          const currentRows = cloneRackData(rackModules ?? Array.from({length: rack.rows}, () => []));
          const optimisticModule = context.insertOptimisticModule(currentRows, {
            module: module as unknown as RackedModule['module'],
            row: null,
            column: null,
            rackId: rack.id
          });
          context.rowedRackedModules$.next(currentRows);

          return context.backend.add.rackModule(module.id, rack.id).pipe(
            map(response => context.assertBackendSuccess(response)),
            tap(response => {
              context.applyPersistedRackingIds(response, currentRows, [optimisticModule]);
              context.rowedRackedModules$.next(currentRows);
            }),
            map(() => ({module, rack}))
          ).pipe(
            catchError((err) => {
              console.error(`Error adding module to rack: ${ err }`);
              context.removeRackedModuleByReference(optimisticModule);
              SharedConstants.errorCustom(context.snackBar, 'Failed to add module — changes reverted. Check your connection and try again.');
              return EMPTY;
            })
          );
        }),
        context.takeUntilDestroyed()
      )
      .subscribe(({module, rack}) => {
        context.analytics.capture('rack.module_added', {
          rack_id:   rack.id,
          module_id: module.id
        });
        SharedConstants.successCustom(context.snackBar, `"${ module.name }" added to "${ rack.name }". Drag it into a row to place it.`);
        context.moduleAddedFromPicker$.next(module);
      });

    context.addBlankToRow$
      .pipe(
        withLatestFrom(context.singleRackData$, context.rowedRackedModules$),
        exhaustMap(([{rowId, hp}, rack, rackModules]) => {
          if (!rack) {
            SharedConstants.errorCustom(context.snackBar, 'Rack data is still loading. Try again in a moment.');
            return EMPTY;
          }
          if (rowId < 0 || rowId >= rack.rows) {
            SharedConstants.errorCustom(context.snackBar, 'This row cannot receive a blank panel.');
            return EMPTY;
          }

          const row = rackModules?.[rowId] ?? [];
          const blankStandard = resolveQuickBlankStandardForRow(row);
          const blankId = calculateBlankIdForSizeAndStandard(hp, blankStandard);
          if (blankId === -1) {
            SharedConstants.errorCustom(context.snackBar, 'No matching blank panel was found for this row format and size.');
            return EMPTY;
          }

          return context.backend.GET.moduleWithIdForRackDisplay(blankId).pipe(
            map(response => context.assertBackendSuccess(response)),
            switchMap(response => {
              const blankModule = (response as {data?: RackedModule['module']}).data;
              if (!blankModule) {
                throw new Error('Blank module lookup returned no data');
              }

              const currentRows = cloneRackData(rackModules ?? Array.from({length: rack.rows}, () => []));
              while (currentRows.length < rack.rows) {
                currentRows.push([]);
              }
              const row = currentRows[rowId] ?? [];
              currentRows[rowId] = row;
              const column = row.length;
              const optimisticBlank = context.insertOptimisticModule(currentRows, {
                module: blankModule,
                row: rowId,
                column,
                rackId: rack.id
              });
              context.updateModulesColumnIds(currentRows, rowId);
              context.rowedRackedModules$.next(currentRows);

              return context.backend.add.rackModule(blankId, rack.id, rowId, column).pipe(
                map(addResponse => context.assertBackendSuccess(addResponse)),
                tap(addResponse => {
                  context.applyPersistedRackingIds(addResponse, currentRows, [optimisticBlank]);
                  context.rowedRackedModules$.next(currentRows);
                  context.analytics.capture('rack.blank_panel_added', { rack_id: rack.id, hp });
                }),
                catchError((err) => {
                  console.error(`Error adding blank panel to rack: ${ err }`);
                  context.removeRackedModuleByReference(optimisticBlank);
                  SharedConstants.errorCustom(context.snackBar, 'Failed to add blank panel — changes reverted. Check your connection and try again.');
                  return EMPTY;
                })
              );
            }),
            catchError((err) => {
              console.error(`Error loading blank panel: ${ err }`);
              SharedConstants.errorCustom(context.snackBar, 'Failed to load the blank panel. Try again in a moment.');
              return EMPTY;
            })
          );
        }),
        context.takeUntilDestroyed()
      )
      .subscribe();
  }
}
