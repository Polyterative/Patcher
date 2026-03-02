import { Injectable } from '@angular/core';
import { PageEvent } from '@angular/material/paginator';
import {
  BehaviorSubject,
  combineLatest,
  Observable,
  Subject
} from 'rxjs';
import {
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
  
  constructor(
    public dialog: MatDialog,
    public backend: SupabaseService
  ) {
    super();

    this.pagedModulesData$ = combineLatest([
      this.modulesData$,
      this.modulesPagination.skip$,
      this.modulesPagination.take$,
    ]).pipe(
      map(([data, skip, take]) => data ? data.slice(skip, skip + take) : undefined),
    );

    this.commentsPageEvent$
      .pipe(takeUntil(this.destroy$))
      .subscribe(event => {
        this.commentsPagination.take$.next(event.pageSize);
        this.commentsPagination.skip$.next(event.pageIndex * event.pageSize);
        this.updateCommentsData$.next();
      });

    this.patchesPageEvent$
      .pipe(takeUntil(this.destroy$))
      .subscribe(event => {
        this.patchesPagination.take$.next(event.pageSize);
        this.patchesPagination.skip$.next(event.pageIndex * event.pageSize);
        this.updatePatchesData$.next();
      });

    this.racksPageEvent$
      .pipe(takeUntil(this.destroy$))
      .subscribe(event => {
        this.racksPagination.take$.next(event.pageSize);
        this.racksPagination.skip$.next(event.pageIndex * event.pageSize);
        this.updateRackData$.next(undefined);
      });

    this.modulesPageEvent$
      .pipe(takeUntil(this.destroy$))
      .subscribe(event => {
        this.modulesPagination.take$.next(event.pageSize);
        this.modulesPagination.skip$.next(event.pageIndex * event.pageSize);
      });

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
    
    this.addPatch$
      .pipe(
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
}