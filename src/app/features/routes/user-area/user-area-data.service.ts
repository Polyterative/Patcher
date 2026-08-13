import { Injectable } from '@angular/core';
import {
  BehaviorSubject,
  combineLatest,
  Observable,
  of,
  Subject,
  throwError
} from 'rxjs';
import {
  catchError,
  filter,
  map,
  switchMap,
  takeUntil,
  tap
} from 'rxjs/operators';
import {
  PatchCreatorComponent,
  PatchCreatorInModel
} from 'src/app/components/patch-parts/patch-creator/patch-creator.component';
import {
  RackCreatorComponent,
  RACK_CREATOR_IMPORT_DIALOG_WIDTH,
  RACK_CREATOR_MANUAL_DIALOG_WIDTH,
  RackCreatorInModel
} from 'src/app/components/rack-parts/rack-creator/rack-creator.component';
import {
  DbModule,
  MinimalModule
} from 'src/app/models/module';
import { Patch } from 'src/app/models/patch';
import { Rack } from 'src/app/models/rack';
import {
  DiscoveryTipUserAreaSnapshot
} from 'src/app/shared-interproject/discovery-tips/discovery-tip.models';
import { DiscoveryTipService } from 'src/app/shared-interproject/discovery-tips/discovery-tip.service';
import { SubManager } from 'src/app/shared-interproject/directives/subscription-manager';
import { SupabaseService } from 'src/app/features/backend/supabase.service';
import { MatDialog } from "@angular/material/dialog";
import { MatSnackBar } from "@angular/material/snack-bar";
import { DbComment } from "src/app/models/comment";
import { CurrentUserContributorStats } from 'src/app/features/backend/supabase-queries';
import { recoverListRequest } from 'src/app/features/browser-data-recovery';
import {
  buildDiscoverySnapshot,
  collectPatchTags,
  filterComments,
  filterManuals,
  filterModules,
  filterModulesByPossession,
  filterPatches,
  filterRacks,
  hasMoreFromTake$,
  hasMoreLoaded$,
  pagedSlice$,
  remainingFromTake$,
  remainingLoaded$
} from './user-area-data.utils';
import { AnalyticsService } from 'src/app/features/backbone/analytics-integration/analytics.service';
import { SharedConstants } from 'src/app/shared-interproject/SharedConstants';

export type UserModuleCollectionFilter = 'MY_MODULES' | 'WISHLIST' | 'FOR_SALE';

interface UserAreaCommentsPage {
  data: DbComment[] | undefined;
  count: number;
  replace: boolean;
}

@Injectable()
export class UserAreaDataService extends SubManager {
  modulesData$: BehaviorSubject<MinimalModule[] | undefined> = new BehaviorSubject(undefined);
  patchesData$: BehaviorSubject<Patch[] | undefined> = new BehaviorSubject(undefined);
  rackData$: BehaviorSubject<Rack[] | undefined> = new BehaviorSubject(undefined);
  manualsData$: BehaviorSubject<DbModule[] | undefined> = new BehaviorSubject(undefined);
  commentsData$: BehaviorSubject<DbComment[] | undefined> = new BehaviorSubject(undefined);
  contributorStats$ = new BehaviorSubject<CurrentUserContributorStats | undefined>(undefined);

  readonly commentsCount$ = new BehaviorSubject<number>(0);
  readonly commentsPagination = {
    skip$: new BehaviorSubject<number>(0),
    take$: new BehaviorSubject<number>(10),
  };

  readonly patchesCount$ = new BehaviorSubject<number>(0);
  readonly patchesPagination = {
    skip$: new BehaviorSubject<number>(0),
    take$: new BehaviorSubject<number>(10),
  };

  readonly racksCount$ = new BehaviorSubject<number>(0);
  readonly racksPagination = {
    skip$: new BehaviorSubject<number>(0),
    take$: new BehaviorSubject<number>(10),
  };

  readonly modulesPagination = {
    skip$: new BehaviorSubject<number>(0),
    take$: new BehaviorSubject<number>(10),
  };
  readonly filteredModulesData$: Observable<MinimalModule[] | undefined>;
  readonly filteredModulesCount$: Observable<number>;
  readonly pagedModulesData$: Observable<MinimalModule[] | undefined>;
  readonly hasMoreModules$: Observable<boolean>;
  readonly remainingModulesCount$: Observable<number>;
  readonly moduleCollectionFilter$ = new BehaviorSubject<UserModuleCollectionFilter>('MY_MODULES');
  readonly activeTagFilter$ = new BehaviorSubject<string | null>(null);
  readonly selectModuleCollectionFilter$ = new Subject<UserModuleCollectionFilter>();
  readonly selectPatchTagFilter$ = new Subject<string | null>();
  readonly filteredRacksData$: Observable<Rack[] | undefined>;
  readonly filteredRacksCount$: Observable<number>;
  readonly pagedRacksData$: Observable<Rack[] | undefined>;
  readonly hasMoreRacks$: Observable<boolean>;
  readonly remainingRacksCount$: Observable<number>;
  readonly filteredPatchesData$: Observable<Patch[] | undefined>;
  readonly filteredPatchesCount$: Observable<number>;
  readonly pagedPatchesData$: Observable<Patch[] | undefined>;
  readonly filteredManualsData$: Observable<DbModule[] | undefined>;
  readonly filteredCommentsData$: Observable<DbComment[] | undefined>;
  readonly hasMoreComments$: Observable<boolean>;
  readonly remainingCommentsCount$: Observable<number>;
  readonly allPatchTags$: Observable<string[]>;
  readonly hasMorePatches$: Observable<boolean>;
  readonly remainingPatchesCount$: Observable<number>;

  //
  readonly updatePatchesData$ = new Subject<void>();
  readonly updateModulesData$ = new Subject<void>();
  readonly updateRackData$ = new Subject<string | undefined>(); // user id otherwise current (not yet implemented)
  readonly updateManualsData$ = new Subject<void>();
  readonly updateCommentsData$ = new Subject<void>();
  readonly updateContributorStats$ = new Subject<void>();
  readonly loadMoreComments$ = new Subject<void>();
  readonly loadMoreModules$ = new Subject<void>();
  readonly loadMoreRacks$ = new Subject<void>();
  readonly loadMorePatches$ = new Subject<void>();
  readonly addPatch$ = new Subject<void>();
  readonly addRack$ = new Subject<void>();
  readonly addModulesToCollection$ = new Subject<void>();
  private readonly _searchQuery$ = new BehaviorSubject<string>('');
  readonly searchQuery$ = this._searchQuery$.asObservable();
  readonly hasSearchQuery$ = this.searchQuery$.pipe(
    map((query) => query.length > 0)
  );
  private discoverySearchDestroy$ = new Subject<void>();
  
  constructor(
    public dialog: MatDialog,
    public backend: SupabaseService,
    private readonly discoveryTipService: DiscoveryTipService,
    private readonly analytics: AnalyticsService,
    private readonly snackBar: MatSnackBar
  ) {
    super();

    this.filteredModulesData$ = combineLatest([
      this.modulesData$,
      this.moduleCollectionFilter$,
      this.searchQuery$
    ]).pipe(
      map(([modules, collectionFilter, query]) => filterModules(
        filterModulesByPossession(modules, collectionFilter),
        query
      ))
    );

    this.filteredModulesCount$ = this.filteredModulesData$.pipe(
      map((modules) => modules?.length ?? 0)
    );

    this.pagedModulesData$ = pagedSlice$(
      this.filteredModulesData$,
      this.modulesPagination.skip$,
      this.modulesPagination.take$
    );

    this.hasMoreModules$ = hasMoreFromTake$(this.filteredModulesCount$, this.modulesPagination.take$);

    this.remainingModulesCount$ = remainingFromTake$(this.filteredModulesCount$, this.modulesPagination.take$);

    this.filteredRacksData$ = combineLatest([
      this.rackData$,
      this.searchQuery$
    ]).pipe(
      map(([racks, query]) => filterRacks(racks, query))
    );

    this.filteredRacksCount$ = this.filteredRacksData$.pipe(
      map((racks) => racks?.length ?? 0)
    );

    this.pagedRacksData$ = pagedSlice$(
      this.filteredRacksData$,
      this.racksPagination.skip$,
      this.racksPagination.take$
    );

    this.hasMoreRacks$ = hasMoreFromTake$(this.filteredRacksCount$, this.racksPagination.take$);

    this.remainingRacksCount$ = remainingFromTake$(this.filteredRacksCount$, this.racksPagination.take$);

    this.filteredPatchesData$ = combineLatest([
      this.patchesData$,
      this.activeTagFilter$,
      this.searchQuery$
    ]).pipe(
      map(([patches, tag, query]) => filterPatches(patches, tag, query))
    );

    this.filteredPatchesCount$ = this.filteredPatchesData$.pipe(
      map((patches) => patches?.length ?? 0)
    );

    this.pagedPatchesData$ = pagedSlice$(
      this.filteredPatchesData$,
      this.patchesPagination.skip$,
      this.patchesPagination.take$
    );

    this.filteredManualsData$ = combineLatest([
      this.manualsData$,
      this.searchQuery$
    ]).pipe(
      map(([manuals, query]) => filterManuals(manuals, query))
    );

    this.filteredCommentsData$ = combineLatest([
      this.commentsData$,
      this.searchQuery$
    ]).pipe(
      map(([comments, query]) => filterComments(comments, query))
    );

    this.hasMoreComments$ = hasMoreLoaded$(this.commentsCount$, this.commentsData$);

    this.remainingCommentsCount$ = remainingLoaded$(this.commentsCount$, this.commentsData$);

    this.allPatchTags$ = this.patchesData$.pipe(
      map(patches => collectPatchTags(patches))
    );

    this.hasMorePatches$ = hasMoreFromTake$(this.filteredPatchesCount$, this.patchesPagination.take$);

    this.remainingPatchesCount$ = remainingFromTake$(this.filteredPatchesCount$, this.patchesPagination.take$);

    this.loadMoreComments$
      .pipe(this.takeUntilDestroyed())
      .subscribe(() => {
        this.analytics.capture('user_area.comments.load_more', { current_loaded: this.commentsData$.value?.length ?? 0 });
        this.commentsPagination.skip$.next(this.commentsData$.value?.length ?? 0);
        this.updateCommentsData$.next();
      });

    this.loadMoreModules$
      .pipe(this.takeUntilDestroyed())
      .subscribe(() => {
        this.analytics.capture('user_area.modules.load_more', { current_take: this.modulesPagination.take$.value });
        this.modulesPagination.take$.next(this.modulesPagination.take$.value + 10);
      });

    this.loadMoreRacks$
      .pipe(this.takeUntilDestroyed())
      .subscribe(() => {
        this.analytics.capture('user_area.racks.load_more', { current_take: this.racksPagination.take$.value });
        this.racksPagination.take$.next(this.racksPagination.take$.value + 10);
      });

    this.loadMorePatches$
      .pipe(this.takeUntilDestroyed())
      .subscribe(() => {
        this.analytics.capture('user_area.patches.load_more', { current_take: this.patchesPagination.take$.value });
        this.patchesPagination.take$.next(this.patchesPagination.take$.value + 10);
      });

    this.updateCommentsData$
      .pipe(
        switchMap(() => {
          const skip = this.commentsPagination.skip$.value;
          const take = this.commentsPagination.take$.value;
          const previousData = this.commentsData$.value;
          const previousCount = this.commentsCount$.value;
          if (skip === 0) {
            this.commentsData$.next(undefined);
          }

          return recoverListRequest<UserAreaCommentsPage>(
            () => this.backend.GET.currentUserComments(skip, skip + take - 1).pipe(
              switchMap(response => response?.error
                ? throwError(() => response.error)
                : of({
                  data: response?.data ?? [],
                  count: response?.count ?? previousCount,
                  replace: skip === 0
                })
              )
            ),
            {
              data: previousData,
              count: previousCount,
              replace: true
            },
            '[user-area] Failed to load comments',
            {beforeRetry: () => this.backend.cacheResetter$.next(['currentUserComments'])}
          );
        }),
        this.takeUntilDestroyed()
      )
      .subscribe(response => {
        if (response.data === undefined) {
          return;
        }

        const incoming = response.data;
        const current = this.commentsData$.value ?? [];
        this.commentsData$.next(response.replace ? incoming : [...current, ...incoming]);
        this.commentsCount$.next(response.count);
      });

    this.updateModulesData$
      .pipe(
        switchMap(() => {
          const previousData = this.modulesData$.value;
          this.modulesData$.next(undefined);
          return this.recoverUserAreaList(
            () => this.backend.GET.currentUserModules(true, false, undefined, true),
            previousData,
            '[user-area] Failed to load modules',
            ['currentUserModules']
          );
        }),
        this.takeUntilDestroyed()
      )
      .subscribe(x => this.modulesData$.next(x));

    this.updateContributorStats$
      .pipe(
        tap(() => this.contributorStats$.next(undefined)),
        switchMap(() => this.backend.GET.currentUserContributorStats().pipe(
          catchError(err => {
            console.error('Failed to load contributor stats:', err);
            SharedConstants.errorCustom(this.snackBar, 'Failed to load contributor stats — check your connection and try again.');
            return of(undefined);
          })
        )),
        this.takeUntilDestroyed()
      )
      .subscribe((stats) => this.contributorStats$.next(stats));

    this.updatePatchesData$
      .pipe(
        switchMap(() => {
          const previousData = this.patchesData$.value;
          this.patchesData$.next(undefined);
          return this.recoverUserAreaList(
            () => this.backend.get.currentUserPatches(true),
            previousData,
            '[user-area] Failed to load patches',
            ['patches']
          );
        }),
        this.takeUntilDestroyed()
      )
      .subscribe(patches => {
        this.patchesData$.next(patches);
        if (patches !== undefined) {
          this.patchesCount$.next(patches.length);
        }
      });

    this.updateRackData$
      .pipe(
        switchMap(() => {
          const previousData = this.rackData$.value;
          this.rackData$.next(undefined);
          return this.recoverUserAreaList(
            () => this.backend.get.currentUserRacks(true),
            previousData,
            '[user-area] Failed to load racks',
            ['rackWithId']
          );
        }),
        this.takeUntilDestroyed()
      )
      .subscribe(racks => {
        this.rackData$.next(racks);
        if (racks !== undefined) {
          this.racksCount$.next(racks.length);
        }
      });
    
    this.updateManualsData$
      .pipe(
        switchMap(() => {
          const previousData = this.manualsData$.value;
          this.manualsData$.next(undefined);
          return this.recoverUserAreaList(
            () => this.backend.GET.currentUserModules(
              false,
              true,
              undefined,
              true
            ).pipe(
              map(x => x
                .filter(y => !!y.manualURL)
                .sort((a, b) => a.name.localeCompare(b.name))
              )
            ),
            previousData,
            '[user-area] Failed to load manuals',
            ['currentUserModules']
          );
        }),
        this.takeUntilDestroyed()
      )
      .subscribe(x => this.manualsData$.next(x));

    combineLatest([
      this.modulesData$,
      this.rackData$,
      this.patchesData$,
      this.manualsData$,
      this.commentsData$,
      this._searchQuery$
    ]).pipe(
      map(([modules, racks, patches, manuals, comments, query]) => buildDiscoverySnapshot(
        modules,
        racks,
        patches,
        manuals,
        comments,
        query
      )),
      tap((snapshot) => this.discoveryTipService.updateUserAreaSnapshot(snapshot)),
      this.takeUntilDestroyed()
    ).subscribe();

    this.searchQuery$
      .pipe(
        tap(() => {
          this.commentsPagination.skip$.next(0);
          this.modulesPagination.skip$.next(0);
          this.modulesPagination.take$.next(10);
          this.racksPagination.skip$.next(0);
          this.racksPagination.take$.next(10);
          this.patchesPagination.skip$.next(0);
        }),
        this.takeUntilDestroyed()
      )
      .subscribe();

    this.selectModuleCollectionFilter$
      .pipe(
        tap((filter) => {
          this.analytics.capture('user_area.modules.collection_filter_changed', { collection_filter: filter });
          this.moduleCollectionFilter$.next(filter);
        }),
        this.takeUntilDestroyed()
      )
      .subscribe();

    this.moduleCollectionFilter$
      .pipe(
        tap(() => {
          this.modulesPagination.skip$.next(0);
          this.modulesPagination.take$.next(10);
        }),
        this.takeUntilDestroyed()
      )
      .subscribe();

    this.selectPatchTagFilter$
      .pipe(
        tap((tag) => {
          this.analytics.capture('user_area.patches.tag_filter_changed', { tag_filter: tag });
          this.activeTagFilter$.next(tag);
        }),
        this.takeUntilDestroyed()
      )
      .subscribe();

    this.activeTagFilter$
      .pipe(
        tap(() => {
          this.patchesPagination.skip$.next(0);
        }),
        this.takeUntilDestroyed()
      )
      .subscribe();

    this.addModulesToCollection$
      .pipe(
        tap(() => {
          this.analytics.capture('user_area.modules.add_initiated', {});
          this.discoveryTipService.recordAction('user-area.modules.add-clicked');
        }),
        this.takeUntilDestroyed()
      )
      .subscribe();
    
    this.addPatch$
      .pipe(
        tap(() => {
          this.analytics.capture('user_area.patch.create_clicked', {});
          this.discoveryTipService.recordAction('user-area.patches.create-clicked');
        }),
        switchMap(() => {
          const data: PatchCreatorInModel = {};
          
          return this.dialog.open(
            PatchCreatorComponent,
            {
              data,
              width: '24rem',
            }
          )
            .afterClosed();
        }),
        this.takeUntilDestroyed()
      )
      .subscribe(() => this.updatePatchesData$.next());
    
    this.addRack$
      .pipe(
        tap(() => {
          this.analytics.capture('user_area.rack.create_clicked', {});
          this.discoveryTipService.recordAction('user-area.racks.create-clicked');
        }),
        switchMap(() => {
          const data: RackCreatorInModel = {
            // WANTS modules excluded — rack balance analysis uses only physically-owned modules
            userModules: (this.modulesData$.value || []).filter(m => m.possessionKind !== 'WANTS')
          };
          
          return this.dialog.open(
            RackCreatorComponent,
            {
              data,
              width: RACK_CREATOR_MANUAL_DIALOG_WIDTH,
              maxWidth: RACK_CREATOR_IMPORT_DIALOG_WIDTH,
              disableClose: false
            }
          )
            .afterClosed();
        }),
        this.takeUntilDestroyed()
      )
      .subscribe(() => this.updateRackData$.next(undefined));
    
    
  }

  private recoverUserAreaList<T>(
    requestFactory: () => Observable<T[]>,
    previousData: T[] | undefined,
    logMessage: string,
    cacheKeys: Parameters<SupabaseService['cacheResetter$']['next']>[0]
  ): Observable<T[] | undefined> {
    return recoverListRequest<T[] | undefined>(
      requestFactory,
      previousData,
      logMessage,
      {beforeRetry: () => this.backend.cacheResetter$.next(cacheKeys)}
    );
  }

  connectDiscovery(searchQuery$: Observable<string>): void {
    this.disconnectDiscovery();
    searchQuery$.pipe(
      map((query) => query.trim()),
      tap((query) => this._searchQuery$.next(query)),
      filter((query) => query.length > 0),
      tap(() => {
        this.analytics.capture('user_area.search_used', {});
        this.discoveryTipService.recordAction('user-area.search-used');
      }),
      takeUntil(this.discoverySearchDestroy$),
      this.takeUntilDestroyed()
    ).subscribe();
  }

  disconnectDiscovery(): void {
    this.discoverySearchDestroy$.next();
    this.discoverySearchDestroy$.complete();
    this.discoverySearchDestroy$ = new Subject<void>();
  }

  resetUiState(): void {
    this.disconnectDiscovery();
    this._searchQuery$.next('');
    this.activeTagFilter$.next(null);
    this.moduleCollectionFilter$.next('MY_MODULES');
  }

  override ngOnDestroy(): void {
    this.disconnectDiscovery();
    super.ngOnDestroy();
  }

}
