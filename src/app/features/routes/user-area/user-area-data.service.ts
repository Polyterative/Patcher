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


@Injectable()
export class UserAreaDataService extends SubManager {
  modulesData$: BehaviorSubject<MinimalModule[] | undefined> = new BehaviorSubject(undefined);
  patchesData$: BehaviorSubject<Patch[] | undefined> = new BehaviorSubject(undefined);
  rackData$: BehaviorSubject<Rack[] | undefined> = new BehaviorSubject(undefined);
  manualsData$: BehaviorSubject<DbModule[] | undefined> = new BehaviorSubject(undefined);
  commentsData$: BehaviorSubject<DbComment[] | undefined> = new BehaviorSubject(undefined);

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
  readonly pagedModulesData$: Observable<MinimalModule[] | undefined>;

  //
  readonly updatePatchesData$ = new Subject<void>();
  readonly updateModulesData$ = new Subject<void>();
  readonly updateRackData$ = new Subject<string | undefined>(); // user id otherwise current (not yet implemented)
  readonly updateManualsData$ = new Subject<void>();
  readonly updateCommentsData$ = new Subject<void>();
  readonly commentsPageEvent$ = new Subject<PageEvent>();
  readonly patchesPageEvent$ = new Subject<PageEvent>();
  readonly racksPageEvent$ = new Subject<PageEvent>();
  readonly modulesPageEvent$ = new Subject<PageEvent>();
  readonly addPatch$ = new Subject<void>();
  readonly addRack$ = new Subject<void>();
  readonly addModulesToCollection$ = new Subject<void>();
  private readonly _searchQuery$ = new BehaviorSubject<string>('');
  private discoveryConnected = false;
  
  constructor(
    public dialog: MatDialog,
    public backend: SupabaseService,
    private readonly discoveryTipService: DiscoveryTipService
  ) {
    super();

    this.pagedModulesData$ = combineLatest([
      this.modulesData$,
      this.modulesPagination.skip$,
      this.modulesPagination.take$,
    ]).pipe(
      map(([data, skip, take]) => data ? data.slice(skip, skip + take) : undefined),
    );

    this.bindPageEvent(this.commentsPageEvent$, this.commentsPagination, () => this.updateCommentsData$.next());
    this.bindPageEvent(this.patchesPageEvent$, this.patchesPagination, () => this.updatePatchesData$.next());
    this.bindPageEvent(this.racksPageEvent$, this.racksPagination, () => this.updateRackData$.next(undefined));
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

    this.updatePatchesData$
      .pipe(
        tap(() => this.patchesData$.next(undefined)),
        switchMap(() => {
          const skip = this.patchesPagination.skip$.value;
          const take = this.patchesPagination.take$.value;
          return this.backend.GET.userPatchesPaginated(skip, skip + take - 1);
        }),
        takeUntil(this.destroy$)
      )
      .subscribe(response => {
        this.patchesData$.next((response?.data as Patch[]) ?? []);
        this.patchesCount$.next(response?.count ?? 0);
      });

    this.updateRackData$
      .pipe(
        tap(() => this.rackData$.next(undefined)),
        switchMap(() => {
          const skip = this.racksPagination.skip$.value;
          const take = this.racksPagination.take$.value;
          return this.backend.GET.userRacksPaginated(skip, skip + take - 1);
        }),
        takeUntil(this.destroy$)
      )
      .subscribe(response => {
        this.rackData$.next((response?.data as Rack[]) ?? []);
        this.racksCount$.next(response?.count ?? 0);
      });
    
    this.updateManualsData$
      .pipe(
        tap(() => this.manualsData$.next(undefined)),
        switchMap(() => this.backend.GET.currentUserModules(
          false,
          true
        )),
        map(x => x.filter(y => y.manualURL !== null && y.manualURL !== '' && y.manualURL !== undefined)),
        // order the entities of the array by name alphabetically
        map(x => x.sort((a, b) => a.name.localeCompare(b.name))),
        takeUntil(this.destroy$)
      )
      .subscribe(x => this.manualsData$.next(x))

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
      .subscribe(() => this.updatePatchesData$.next())
    
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
    if (this.discoveryConnected) {
      return;
    }

    this.discoveryConnected = true;
    searchQuery$.pipe(
      map((query) => query.trim()),
      tap((query) => this._searchQuery$.next(query)),
      filter((query) => query.length > 0),
      tap(() => this.discoveryTipService.recordAction('user-area.search-used')),
      takeUntil(this.destroy$)
    ).subscribe();
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
}
