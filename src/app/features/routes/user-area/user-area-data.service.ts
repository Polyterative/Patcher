import { Injectable } from '@angular/core';
import { PageEvent } from '@angular/material/paginator';
import {
  BehaviorSubject,
  combineLatest,
  Observable,
  Subject
} from 'rxjs';
import {
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
import { DbComment } from "src/app/models/comment";
import { matchesSearchQuery } from 'src/app/shared-interproject/components/@smart/mat-form-entity/string-utils';
import { CurrentUserContributorStats } from 'src/app/features/backend/supabase-queries';

function pagedSlice$<T>(
  data$: Observable<T[] | undefined>,
  skip$: Observable<number>,
  take$: Observable<number>
): Observable<T[] | undefined> {
  return combineLatest([data$, skip$, take$]).pipe(
    map(([data, skip, take]) => data ? data.slice(skip, skip + take) : undefined)
  );
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
  readonly activeTagFilter$ = new BehaviorSubject<string | null>(null);
  readonly filteredRacksData$: Observable<Rack[] | undefined>;
  readonly filteredRacksCount$: Observable<number>;
  readonly pagedRacksData$: Observable<Rack[] | undefined>;
  readonly filteredPatchesData$: Observable<Patch[] | undefined>;
  readonly filteredPatchesCount$: Observable<number>;
  readonly pagedPatchesData$: Observable<Patch[] | undefined>;
  readonly filteredManualsData$: Observable<DbModule[] | undefined>;
  readonly filteredCommentsData$: Observable<DbComment[] | undefined>;
  readonly allPatchTags$: Observable<string[]>;

  //
  readonly updatePatchesData$ = new Subject<void>();
  readonly updateModulesData$ = new Subject<void>();
  readonly updateRackData$ = new Subject<string | undefined>(); // user id otherwise current (not yet implemented)
  readonly updateManualsData$ = new Subject<void>();
  readonly updateCommentsData$ = new Subject<void>();
  readonly updateContributorStats$ = new Subject<void>();
  readonly commentsPageEvent$ = new Subject<PageEvent>();
  readonly patchesPageEvent$ = new Subject<PageEvent>();
  readonly racksPageEvent$ = new Subject<PageEvent>();
  readonly modulesPageEvent$ = new Subject<PageEvent>();
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
    private readonly discoveryTipService: DiscoveryTipService
  ) {
    super();

    this.filteredModulesData$ = combineLatest([
      this.modulesData$,
      this.searchQuery$
    ]).pipe(
      map(([modules, query]) => this.filterModules(modules, query))
    );

    this.filteredModulesCount$ = this.filteredModulesData$.pipe(
      map((modules) => modules?.length ?? 0)
    );

    this.pagedModulesData$ = pagedSlice$(
      this.filteredModulesData$,
      this.modulesPagination.skip$,
      this.modulesPagination.take$
    );

    this.filteredRacksData$ = combineLatest([
      this.rackData$,
      this.searchQuery$
    ]).pipe(
      map(([racks, query]) => this.filterRacks(racks, query))
    );

    this.filteredRacksCount$ = this.filteredRacksData$.pipe(
      map((racks) => racks?.length ?? 0)
    );

    this.pagedRacksData$ = pagedSlice$(
      this.filteredRacksData$,
      this.racksPagination.skip$,
      this.racksPagination.take$
    );

    this.filteredPatchesData$ = combineLatest([
      this.patchesData$,
      this.activeTagFilter$,
      this.searchQuery$
    ]).pipe(
      map(([patches, tag, query]) => {
        if (!patches) { return undefined; }

        return patches.filter((patch) => {
          const matchesTag = !tag || (patch.tags ?? []).includes(tag);
          if (!matchesTag) {
            return false;
          }

          const searchFields = [patch.name, patch.description, ...(patch.tags ?? [])];
          return matchesSearchQuery(query, ...searchFields);
        });
      })
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
      map(([manuals, query]) => this.filterManuals(manuals, query))
    );

    this.filteredCommentsData$ = combineLatest([
      this.commentsData$,
      this.searchQuery$
    ]).pipe(
      map(([comments, query]) => this.filterComments(comments, query))
    );

    this.allPatchTags$ = this.patchesData$.pipe(
      map(patches => patches
        ? Array.from(new Set(patches.flatMap(p => p.tags ?? []))).sort()
        : []
      )
    );

    this.bindPageEvent(this.commentsPageEvent$, this.commentsPagination, () => this.updateCommentsData$.next());
    this.bindPageEvent(this.patchesPageEvent$, this.patchesPagination);
    this.bindPageEvent(this.racksPageEvent$, this.racksPagination);
    this.bindPageEvent(this.modulesPageEvent$, this.modulesPagination);

    this.updateCommentsData$
      .pipe(
        tap(() => this.commentsData$.next(undefined)),
        switchMap(() => {
          const skip = this.commentsPagination.skip$.value;
          const take = this.commentsPagination.take$.value;
          return this.backend.GET.currentUserComments(skip, skip + take - 1);
        }),
        takeUntil(this.destroy$)
      )
      .subscribe(response => {
        this.commentsData$.next(response?.data ?? []);
        this.commentsCount$.next(response?.count ?? 0);
      });

    this.updateModulesData$
      .pipe(
        tap(() => this.modulesData$.next(undefined)),
        switchMap(() => this.backend.GET.currentUserModules()),
        takeUntil(this.destroy$)
      )
      .subscribe(x => this.modulesData$.next(x));

    this.updateContributorStats$
      .pipe(
        tap(() => this.contributorStats$.next(undefined)),
        switchMap(() => this.backend.GET.currentUserContributorStats()),
        takeUntil(this.destroy$)
      )
      .subscribe((stats) => this.contributorStats$.next(stats));

    this.updatePatchesData$
      .pipe(
        tap(() => this.patchesData$.next(undefined)),
        switchMap(() => this.backend.get.currentUserPatches()),
        takeUntil(this.destroy$)
      )
      .subscribe(patches => {
        const nextPatches = patches ?? [];
        this.patchesData$.next(nextPatches);
        this.patchesCount$.next(nextPatches.length);
      });

    this.updateRackData$
      .pipe(
        tap(() => this.rackData$.next(undefined)),
        switchMap(() => this.backend.get.currentUserRacks()),
        takeUntil(this.destroy$)
      )
      .subscribe(racks => {
        const nextRacks = racks ?? [];
        this.rackData$.next(nextRacks);
        this.racksCount$.next(nextRacks.length);
      });
    
    this.updateManualsData$
      .pipe(
        tap(() => this.manualsData$.next(undefined)),
        switchMap(() => this.backend.GET.currentUserModules(
          false,
          true
        )),
        map(x => x
          .filter(y => !!y.manualURL)
          .sort((a, b) => a.name.localeCompare(b.name))
        ),
        takeUntil(this.destroy$)
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
      map(([modules, racks, patches, manuals, comments, query]) => this.buildDiscoverySnapshot(
        modules,
        racks,
        patches,
        manuals,
        comments,
        query
      )),
      tap((snapshot) => this.discoveryTipService.updateUserAreaSnapshot(snapshot)),
      takeUntil(this.destroy$)
    ).subscribe();

    this.searchQuery$
      .pipe(
        tap(() => {
          this.modulesPagination.skip$.next(0);
          this.racksPagination.skip$.next(0);
          this.patchesPagination.skip$.next(0);
        }),
        takeUntil(this.destroy$)
      )
      .subscribe();

    this.activeTagFilter$
      .pipe(
        tap(() => this.patchesPagination.skip$.next(0)),
        takeUntil(this.destroy$)
      )
      .subscribe();

    this.addModulesToCollection$
      .pipe(
        tap(() => {
          this.discoveryTipService.recordAction('user-area.modules.add-clicked');
        }),
        takeUntil(this.destroy$)
      )
      .subscribe();
    
    this.addPatch$
      .pipe(
        tap(() => {
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
        takeUntil(this.destroy$)
      )
      .subscribe(() => this.updatePatchesData$.next());
    
    this.addRack$
      .pipe(
        tap(() => {
          this.discoveryTipService.recordAction('user-area.racks.create-clicked');
        }),
        switchMap(() => {
          const data: RackCreatorInModel = {
            userModules: this.modulesData$.value || []
          };
          
          return this.dialog.open(
            RackCreatorComponent,
            {
              data,
              width: '24rem',
              disableClose: false
            }
          )
            .afterClosed();
        }),
        takeUntil(this.destroy$)
      )
      .subscribe(() => this.updateRackData$.next(undefined));
    
    
  }

  connectDiscovery(searchQuery$: Observable<string>): void {
    this.disconnectDiscovery();
    searchQuery$.pipe(
      map((query) => query.trim()),
      tap((query) => this._searchQuery$.next(query)),
      filter((query) => query.length > 0),
      tap(() => this.discoveryTipService.recordAction('user-area.search-used')),
      takeUntil(this.discoverySearchDestroy$),
      takeUntil(this.destroy$)
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
  }

  override ngOnDestroy(): void {
    this.disconnectDiscovery();
    super.ngOnDestroy();
  }

  private bindPageEvent(
    pageEvent$: Observable<PageEvent>,
    pagination: { skip$: BehaviorSubject<number>; take$: BehaviorSubject<number> },
    onPageChange?: () => void
  ): void {
    pageEvent$
      .pipe(takeUntil(this.destroy$))
      .subscribe((event) => {
        pagination.take$.next(event.pageSize);
        pagination.skip$.next(event.pageIndex * event.pageSize);
        onPageChange?.();
      });
  }

  private buildDiscoverySnapshot(
    modules: MinimalModule[] | undefined,
    racks: Rack[] | undefined,
    patches: Patch[] | undefined,
    manuals: DbModule[] | undefined,
    comments: DbComment[] | undefined,
    query: string
  ): DiscoveryTipUserAreaSnapshot {
    const modulesCount = modules?.length ?? 0;
    const racksCount = racks?.length ?? 0;
    const patchesCount = patches?.length ?? 0;
    const manualsCount = manuals?.length ?? 0;
    const commentsCount = comments?.length ?? 0;

    return {
      modulesLoaded: modules !== undefined,
      racksLoaded: racks !== undefined,
      patchesLoaded: patches !== undefined,
      manualsLoaded: manuals !== undefined,
      commentsLoaded: comments !== undefined,
      modulesCount,
      racksCount,
      patchesCount,
      manualsCount,
      commentsCount,
      totalCount: modulesCount + racksCount + patchesCount,
      hasSearchQuery: query.length > 0
    };
  }

  private filterModules(
    modules: MinimalModule[] | undefined,
    query: string
  ): MinimalModule[] | undefined {
    if (!modules) {
      return undefined;
    }

    return modules.filter((module) => {
      const searchFields = [
        module.name,
        module.manufacturer?.name,
        module.description,
        ...(module.tags ?? []).map((tagVote) => tagVote.tag?.name ?? '')
      ];

      return matchesSearchQuery(query, ...searchFields);
    });
  }

  private filterRacks(
    racks: Rack[] | undefined,
    query: string
  ): Rack[] | undefined {
    if (!racks) {
      return undefined;
    }

    return racks.filter((rack) => matchesSearchQuery(query, rack.name, rack.description));
  }

  private filterManuals(
    manuals: DbModule[] | undefined,
    query: string
  ): DbModule[] | undefined {
    if (!manuals) {
      return undefined;
    }

    return manuals.filter((manual) => matchesSearchQuery(
      query,
      manual.name,
      manual.manufacturer?.name,
      manual.description
    ));
  }

  private filterComments(
    comments: DbComment[] | undefined,
    query: string
  ): DbComment[] | undefined {
    if (!comments) {
      return undefined;
    }

    return comments.filter((comment) => matchesSearchQuery(
      query,
      comment.content,
      comment.profile?.username
    ));
  }
}
