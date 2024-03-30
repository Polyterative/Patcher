import { Injectable } from '@angular/core';
import {
  BehaviorSubject,
  Subject
} from 'rxjs';
import {
  switchMap,
  takeUntil,
  tap
} from 'rxjs/operators';
import {
  PatchCreatorComponent,
  PatchCreatorInModel
} from '../../components/patch-parts/patch-creator/patch-creator.component';
import {
  RackCreatorComponent,
  RackCreatorInModel
} from '../../components/rack-parts/rack-creator/rack-creator.component';
import { MinimalModule } from '../../models/module';
import { Patch } from '../../models/patch';
import { Rack } from '../../models/rack';
import { SubManager } from '../../shared-interproject/directives/subscription-manager';
import { SupabaseService } from '../backend/supabase.service';
import { MatDialog } from "@angular/material/dialog";


@Injectable()
export class UserAreaDataService extends SubManager {
  modulesData$: BehaviorSubject<MinimalModule[] | undefined> = new BehaviorSubject(undefined);
  patchesData$: BehaviorSubject<Patch[] | undefined> = new BehaviorSubject(undefined);
  rackData$: BehaviorSubject<Rack[] | undefined> = new BehaviorSubject(undefined);
  readonly updatePatchesData$ = new Subject<void>();
  readonly updateModulesData$ = new Subject<void>();
  readonly addPatch$ = new Subject<void>();
  readonly addRack$ = new Subject<void>();
  readonly updateRackData$ = new Subject<string | undefined>(); // user id otherwise current (not yet implemented)
  
  constructor(
    public dialog: MatDialog,
    public backend: SupabaseService
  ) {
    super();
    
    this.updateModulesData$
      .pipe(
        tap(() => this.modulesData$.next(undefined)),
        switchMap(() => this.backend.get.userModules()),
        takeUntil(this.destroy$)
      )
      .subscribe(x => this.modulesData$.next(x))
    
    this.updatePatchesData$
      .pipe(
        tap(() => this.patchesData$.next(undefined)),
        switchMap(() => this.backend.get.userPatches()),
        takeUntil(this.destroy$)
      )
      .subscribe(x => this.patchesData$.next(x))
    
    this.updateRackData$
      .pipe(
        tap(() => this.rackData$.next(undefined)),
        switchMap(() => this.backend.get.userRacks()),
        takeUntil(this.destroy$)
      )
      .subscribe(x => this.rackData$.next(x))
    
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