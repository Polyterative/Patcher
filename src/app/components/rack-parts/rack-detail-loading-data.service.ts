import { Injectable, PendingTasks } from '@angular/core';
import {
  BehaviorSubject,
  combineLatest,
  EMPTY,
  merge
} from 'rxjs';
import {
  catchError,
  filter,
  map,
  pairwise,
  switchMap,
  take,
  tap,
  withLatestFrom
} from 'rxjs/operators';
import { RackedModule } from '../../models/module';
import { Rack } from '../../models/rack';
import { SharedConstants } from '../../shared-interproject/SharedConstants';
import { shouldCaptureCanonicalDetailView } from '../detail-analytics-surface';
import { bindSsrDetailLoadGuard } from '../../features/backend/supabase-ssr-fetch';
import {
  buildRackStatistics,
  mergeRefreshedModules
} from './rack-detail-data.utils';
import { RackDetailDataContext } from './rack-detail-data.service.types';

@Injectable()
export class RackDetailLoadingDataService {
  // Exposed as a BehaviorSubject (not a plain field) so the "unavailable" message
  // reconciliation below can react whenever this settles — see its comment for why
  // that matters. `.value` reads stay perfectly synchronous for the two switchMap
  // branches, so this changes no existing timing/behavior for them.
  private readonly usePublicDetailReads$ = new BehaviorSubject<boolean>(false);
  private rackViewedFired = false;

  setPublicDetailMode(enabled: boolean): void {
    this.usePublicDetailReads$.next(enabled);
  }

  bindDetailLoading(context: RackDetailDataContext, pendingTasks?: PendingTasks): void {
    if (pendingTasks) {
      // See bindSsrDetailLoadGuard's doc comment: createSsrPendingTasksFetch alone
      // only covers a single fetch while it's literally in flight, not the gap
      // between this lookup starting and its *chained* modules fetch (triggered
      // from inside this lookup's own subscribe callback below) actually
      // registering as a pending task — confirmed by tracing real requests to be
      // the cause of an intermittent wrong SSR page title for rack detail pages.
      bindSsrDetailLoadGuard(
        pendingTasks,
        merge(context.updateSingleRackData$, context.updateSingleRackByPublicId$),
        context.isRackDataLoading$.pipe(pairwise(), filter(([was, is]) => was && !is))
      );
    }

    context.updateSingleRackData$
      .pipe(
        tap(() => {
          context.isRackDataLoading$.next(true);
          context.rowedRackedModules$.next(null);
          context.rackDetailUnavailableMessage$.next(null);
        }),
        withLatestFrom(context.detailAnalyticsSurface$),
        switchMap(([x, surface]) => (this.usePublicDetailReads$.value
          ? context.backend.GET.publicRackWithId(x)
          : context.backend.GET.rackWithId(x)
        ).pipe(
          map(result => ({result, surface})),
          catchError((err) => {
            console.error('Failed to load rack details:', err);
            context.singleRackData$.next(undefined);
            context.rowedRackedModules$.next([]);
            context.isRackDataLoading$.next(false);
            context.rackDetailUnavailableMessage$.next(this.buildUnavailableMessage());
            SharedConstants.errorCustom(context.snackBar, 'Failed to load this rack. Refresh the page and try again.');
            return EMPTY;
          })
        )),
        context.takeUntilDestroyed()
      )
      .subscribe(({result, surface}) => {
        if (!result?.data) {
          context.singleRackData$.next(undefined);
          context.rowedRackedModules$.next([]);
          context.isRackDataLoading$.next(false);
          context.rackDetailUnavailableMessage$.next(this.buildUnavailableMessage());
          return;
        }

        context.loadedRackAnalyticsSurface$.next(surface);
        context.singleRackData$.next(result.data);
        context.loadModulesForRack$.next(result.data.id);
      });

    context.updateSingleRackByPublicId$
      .pipe(
        tap(() => {
          context.isRackDataLoading$.next(true);
          context.rowedRackedModules$.next(null);
          context.rackDetailUnavailableMessage$.next(null);
        }),
        withLatestFrom(context.detailAnalyticsSurface$),
        switchMap(([token, surface]) => context.backend.GET.rackByPublicId(token).pipe(
          map(result => ({result, surface})),
          catchError((err) => {
            console.error('Failed to load rack by token:', err);
            context.singleRackData$.next(undefined);
            context.rowedRackedModules$.next([]);
            context.isRackDataLoading$.next(false);
            context.rackDetailUnavailableMessage$.next(this.buildUnavailableMessage());
            return EMPTY;
          })
        )),
        context.takeUntilDestroyed()
      )
      .subscribe(({result, surface}) => {
        if (!result?.data) {
          context.singleRackData$.next(undefined);
          context.rowedRackedModules$.next([]);
          context.isRackDataLoading$.next(false);
          context.rackDetailUnavailableMessage$.next(this.buildUnavailableMessage());
          return;
        }
        context.loadedRackAnalyticsSurface$.next(surface);
        context.singleRackData$.next(result.data);
        context.loadModulesForRack$.next(result.data.id);
      });

    // The by-publicId fetch above (and the by-numeric-id one before it) can now
    // resolve before setPublicDetailMode() has settled to its auth-derived value —
    // by design, since RackBrowserDetailViewComponent intentionally no longer
    // blocks the fetch on loggedUser$ (that used to make SSR render every
    // anonymous/crawler rack page with zero data). If a "not found" message got
    // published using the not-yet-settled default, once usePublicDetailReads$
    // actually changes, recompute and republish it so the wording always ends up
    // matching the real, final auth state — without ever reintroducing the
    // fetch-blocking that caused the original bug.
    this.usePublicDetailReads$
      .pipe(
        filter(() => !context.singleRackData$.value && context.rackDetailUnavailableMessage$.value !== null),
        context.takeUntilDestroyed()
      )
      .subscribe(() => {
        context.rackDetailUnavailableMessage$.next(this.buildUnavailableMessage());
      });

    context.singleRackData$
      .pipe(
        filter(x => !!x),
        context.takeUntilDestroyed()
      )
      .subscribe(rack => {
        context.isCurrentRackEditable$.next(!rack.locked);
        context.isCurrentRackPrivate$.next(!rack.public);
        context.formData.name.control.reset(rack.name, {emitEvent: false});

        if (!this.rackViewedFired && shouldCaptureCanonicalDetailView(context.loadedRackAnalyticsSurface$.value)) {
          this.rackViewedFired = true;
          const isOwner = context.isCurrentRackPropertyOfCurrentUser$.value;
          context.analytics.capture('rack.viewed', {
            rack_id:  rack.id,
            is_owner: isOwner
          });
        }
      });

    context.singleRackData$
      .pipe(
        filter(x => !x),
        context.takeUntilDestroyed()
      )
      .subscribe(() => {
        context.rowedRackedModules$.next([]);
        context.isRackDataLoading$.next(false);
      });

    context.loadModulesForRack$.pipe(
      switchMap((rackId) => context.backend.get.rackedModules(rackId).pipe(
        map((rackedModules) => ({
          rackedModules,
          rackId
        })),
        catchError((err) => {
          console.error('Failed to load rack modules:', err);
          context.rowedRackedModules$.next([]);
          context.isRackDataLoading$.next(false);
          SharedConstants.errorCustom(context.snackBar, 'Failed to load rack modules. Refresh the page and try again.');
          return EMPTY;
        })
      )),
      withLatestFrom(context.singleRackData$),
      filter(([{rackId}, rack]) => !!rack && rack.id === rackId),
      context.takeUntilDestroyed()
    )
      .subscribe(([{rackedModules}, rack]: [{rackedModules: RackedModule[]; rackId: number}, Rack]) => {
        const rowedRackedModules = mergeRefreshedModules(context.rowedRackedModules$.value, rackedModules, rack);
        context.rowedRackedModules$.next(rowedRackedModules);
        context.isRackDataLoading$.next(false);
      });
  }

  bindOwnership(context: RackDetailDataContext): void {
    combineLatest([
      context.userService.loggedUser$,
      context.singleRackData$
    ])
      .pipe(
        tap(() => context.isCurrentRackPropertyOfCurrentUser$.next(false)),
        filter(([user, rackData]) => (!!user && !!rackData)),
        context.takeUntilDestroyed()
      )
      .subscribe(([user, rackData]) => {
        context.isCurrentRackPropertyOfCurrentUser$.next(user.id === rackData.author.id);
      });
  }

  bindStatistics(context: RackDetailDataContext): void {
    context.singleRackData$.pipe(
      tap(x => {
        if (!x) { context.rackStatistics$.next(null); }
      }),
      filter(x => !!x),
      switchMap(() => context.rowedRackedModules$.pipe(filter(y => !!y), take(1))),
      withLatestFrom(context.singleRackData$),
      context.takeUntilDestroyed()
    )
      .subscribe(([rows]) => context.rackStatistics$.next(buildRackStatistics(rows)));
  }

  private buildUnavailableMessage(): string {
    return this.usePublicDetailReads$.value
      ? `This rack isn't publicly available. If you have a share link from the owner, use that to view it.`
      : 'This rack could not be loaded.';
  }
}
