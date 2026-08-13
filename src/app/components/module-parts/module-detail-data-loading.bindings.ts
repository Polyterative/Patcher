import { combineLatest, of } from 'rxjs';
import { catchError, filter, map, switchMap, takeUntil, tap, withLatestFrom } from 'rxjs/operators';
import { SharedConstants } from 'src/app/shared-interproject/SharedConstants';
import { ReactionEntityTypes } from 'src/app/features/backend/supabase-reactions';
import { DetailAnalyticsSurface, shouldCaptureCanonicalDetailView } from '../detail-analytics-surface';
import { loadModulePriceHistorySnapshots$, loadModulePriceListings$ } from './module-detail-data.helpers';
import { ModuleDetailDataLoadingContext } from './module-detail-data-loading.types';

export type { ModuleDetailDataLoadingContext } from './module-detail-data-loading.types';

/**
 * Wires every data fetch that reloads when `updateSingleModuleData$` emits a module id:
 * the module record itself, its rack/patch/collection usage, price listings/history,
 * usage summary, possession counts, cool-reaction count, and the current user's acquisitions.
 * Extracted verbatim from ModuleDetailDataService's constructor (only `this.` -> `ctx.` and
 * `this.takeUntilDestroyed()` -> `takeUntil(ctx.destroy$)`) to keep that file under the repo's
 * 500-line soft limit — behavior is unchanged from the inline version.
 */
export function bindModuleDetailDataLoading(ctx: ModuleDetailDataLoadingContext): void {
  // get module data
  ctx.updateSingleModuleData$
    .pipe(
      tap(() => {
        ctx.singleModuleData$.next(undefined);
        ctx.moduleEditorHasPendingChanges$.next(false);
      }),
      withLatestFrom(ctx.detailAnalyticsSurface$),
      switchMap(([moduleId, surface]) => ctx.backend.GET.moduleWithId(moduleId).pipe(
        map(result => ({result, surface})),
        catchError(err => {
          console.error('Failed to load module:', err);
          SharedConstants.errorCustom(ctx.snackBar, 'Failed to load module details — check your connection and try again.');
          return of({result: {data: undefined}, surface});
        })
      )),
      takeUntil(ctx.destroy$)
    )
    .subscribe(({result, surface}) => {
      ctx.singleModuleData$.next(result.data);
      if (result.data && shouldCaptureCanonicalDetailView(surface)) {
        ctx.analytics.capture('module.viewed', {
          module_id: result.data.id,
          manufacturer_id: result.data.manufacturer?.id
        });
      }
    });

  // get racks with this module
  ctx.updateSingleModuleData$
    .pipe(
      tap(() => ctx.racksWithThisModule$.next(undefined)),
      switchMap(x => ctx.backend.get.racksWithModule(x).pipe(
        catchError(error => {
          console.error('Racked-in module usage could not be loaded.', error);
          return of({data: []});
        })
      )),
      takeUntil(ctx.destroy$)
    )
    .subscribe(x => ctx.racksWithThisModule$.next((x.data ?? []).map(y => y.rack)));

  // get patches with this module
  ctx.updateSingleModuleData$
    .pipe(
      tap(() => ctx.patchesWithThisModule$.next(undefined)),
      switchMap(x => ctx.backend.get.patchesWithModule(x).pipe(
        catchError(error => {
          console.error('Patched-in module usage could not be loaded.', error);
          return of([]);
        })
      )),
      takeUntil(ctx.destroy$)
    )
    .subscribe(x => ctx.patchesWithThisModule$.next(x));

  ctx.updateSingleModuleData$
    .pipe(
      tap(() => ctx.collectionsWithThisModule$.next(undefined)),
      switchMap(x => ctx.collectionsEnabled ? ctx.backend.GET.moduleCollectionsForModule(x) : of([])),
      takeUntil(ctx.destroy$)
    )
    .subscribe(collections => ctx.collectionsWithThisModule$.next(collections));

  loadModulePriceListings$(ctx.updateSingleModuleData$, moduleId => ctx.backend.GET.modulePriceListings(moduleId))
    .pipe(
      takeUntil(ctx.destroy$)
    )
    .subscribe(listings => ctx.modulePriceListings$.next(listings));

  loadModulePriceHistorySnapshots$(
    ctx.updateSingleModuleData$,
    moduleId => ctx.backend.GET.modulePriceHistorySnapshots(moduleId)
  )
    .pipe(
      takeUntil(ctx.destroy$)
    )
    .subscribe(snapshots => ctx.modulePriceHistorySnapshots$.next(snapshots));

  ctx.updateSingleModuleData$
    .pipe(
      tap(() => ctx.moduleUsageSummary$.next(undefined)),
      switchMap(x => ctx.backend.get.moduleUsageSummary(x)),
      takeUntil(ctx.destroy$)
    )
    .subscribe(summary => ctx.moduleUsageSummary$.next(summary));

  ctx.updateSingleModuleData$
    .pipe(
      tap(() => ctx.possessionCounts$.next(undefined)),
      switchMap(x => ctx.backend.get.modulePossessionCounts(x)),
      takeUntil(ctx.destroy$)
    )
    .subscribe(counts => ctx.possessionCounts$.next(counts));

  ctx.updateSingleModuleData$
    .pipe(
      tap(() => ctx.coolCount$.next(undefined)),
      switchMap(x => ctx.coolReactionsEnabled
        ? ctx.backend.get.reactionCount(ReactionEntityTypes.MODULE, x)
        : of(0)
      ),
      takeUntil(ctx.destroy$)
    )
    .subscribe(count => ctx.coolCount$.next(count));

  ctx.coolCountUpdate$
    .pipe(
      filter((count): count is number => count !== null),
      takeUntil(ctx.destroy$)
    )
    .subscribe(count => ctx.coolCount$.next(count));

  combineLatest([
    ctx.updateSingleModuleData$,
    ctx.userService.loggedUser$
  ])
    .pipe(
      tap(() => ctx.userModuleAcquisitions$.next(undefined)),
      switchMap(([moduleId, user]) => user
        ? ctx.backend.get.userModuleAcquisitionsForModule(moduleId)
        : of([])
      ),
      takeUntil(ctx.destroy$)
    )
    .subscribe(rows => ctx.userModuleAcquisitions$.next(rows));
}
