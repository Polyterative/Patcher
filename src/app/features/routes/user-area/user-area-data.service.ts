import { Injectable } from '@angular/core';
import {
  BehaviorSubject,
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
  //
  readonly updatePatchesData$ = new Subject<void>();
  readonly updateModulesData$ = new Subject<void>();
  readonly updateRackData$ = new Subject<string | undefined>(); // user id otherwise current (not yet implemented)
  readonly updateManualsData$ = new Subject<void>();
  readonly updateCommentsData$ = new Subject<void>();
  readonly addPatch$ = new Subject<void>();
  readonly addRack$ = new Subject<void>();
  
  constructor(
    public dialog: MatDialog,
    public backend: SupabaseService
  ) {
    super();
    
    this.updateCommentsData$
      .pipe(
        tap(() => this.commentsData$.next(undefined)),
        switchMap(() => this.backend.GET.currentUserComments(
          0,
          10
        )),
        takeUntil(this.destroy$)
      )
      .subscribe(x => this.commentsData$.next(x))
    
    this.updateModulesData$
      .pipe(
        tap(() => this.modulesData$.next(undefined)),
        switchMap(() => this.backend.GET.currentUserModules()),
        takeUntil(this.destroy$)
      )
      .subscribe(x => this.modulesData$.next(x))
    
    this.updatePatchesData$
      .pipe(
        tap(() => this.patchesData$.next(undefined)),
        switchMap(() => this.backend.get.currentUserPatches()),
        takeUntil(this.destroy$)
      )
      .subscribe(x => this.patchesData$.next(x))
    
    this.updateRackData$
      .pipe(
        tap(() => this.rackData$.next(undefined)),
        switchMap(() => this.backend.get.currentUserRacks()),
        takeUntil(this.destroy$)
      )
      .subscribe(x => this.rackData$.next(x))
    
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
          const data: RackCreatorInModel = {};
          
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