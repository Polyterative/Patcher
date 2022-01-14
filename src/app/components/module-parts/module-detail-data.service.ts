import { Injectable }               from '@angular/core';
import { MatDialog }                from '@angular/material/dialog';
import { MatSnackBar }              from '@angular/material/snack-bar';
import {
  BehaviorSubject,
  merge,
  of,
  ReplaySubject,
  Subject
}                                   from 'rxjs';
import {
  switchMap,
  takeUntil,
  tap,
  withLatestFrom
}                                from 'rxjs/operators';
import {
  RackModuleAdderComponent,
  RackModuleAdderInModel
}                                from 'src/app/components/rack-parts/rack-module-adder/rack-module-adder.component';
import { UserManagementService } from '../../features/backbone/login/user-management.service';
import { SupabaseService } from '../../features/backend/supabase.service';
import { DbModule }        from '../../models/module';

@Injectable()
export class ModuleDetailDataService {
  updateSingleModuleData$ = new ReplaySubject<number>();
  singleModuleData$ = new BehaviorSubject<DbModule | null>(null);
  moduleEditingPanelOpenState$ = new BehaviorSubject<boolean>(false);
  userModulesList$: BehaviorSubject<DbModule[]> = new BehaviorSubject<DbModule[]>([]);
  // modulePatchesList$: BehaviorSubject<Patch[]> = new BehaviorSubject<Patch[]>([]);
  addModuleToCollection$ = new Subject<number>();
  requestAddModuleToRack$ = new Subject<DbModule>();
  removeModuleFromCollection$ = new Subject<number>();
  
  protected destroyEvent$ = new Subject<void>();
  
  constructor(
    public dialog: MatDialog,
    private snackBar: MatSnackBar,
    public userService: UserManagementService,
    public backend: SupabaseService
  ) {
    
    merge(this.userService.user$, this.updateSingleModuleData$)
      .pipe(
        switchMap(x => this.userService.user$),
        switchMap(x => !!x ? this.backend.get.userModules() : of([])),
        takeUntil(this.destroyEvent$)
      )
      .subscribe(x => {
        this.userModulesList$.next(x);
      });
  
    this.updateSingleModuleData$
        .pipe(
          tap(x => this.singleModuleData$.next(undefined)),
          switchMap(x => this.backend.get.moduleWithId(x)),
          takeUntil(this.destroyEvent$)
        )
        .subscribe(x => this.singleModuleData$.next(x.data));
  
  
    // hidden cause circular dependency
    // this.updateSingleModuleData$
    //     .pipe(
    //       tap(x => this.modulePatchesList$.next([])),
    //       switchMap(x => this.backend.get.patchWithModule(x)),
    //       takeUntil(this.destroyEvent$)
    //     )
    //     .subscribe(x => this.modulePatchesList$.next(x.data));
  
    this.addModuleToCollection$
        .pipe(
          switchMap(x => this.backend.add.userModule(x)),
          withLatestFrom(this.updateSingleModuleData$),
          takeUntil(this.destroyEvent$)
        )
        .subscribe(([a, b]) => {
          snackBar.open('Added', undefined, {duration: 1000});
          this.updateSingleModuleData$.next(b);
        });
  
    this.removeModuleFromCollection$
        .pipe(
          switchMap(x => this.backend.delete.userModule(x)),
          withLatestFrom(this.updateSingleModuleData$),
          takeUntil(this.destroyEvent$)
        )
        .subscribe(([a, b]) => {
          snackBar.open('Removed', undefined, {duration: 1000});
          this.updateSingleModuleData$.next(b);
        });
  
    this.requestAddModuleToRack$
        .pipe(
          switchMap(x => RackModuleAdderComponent.open(this.dialog, {module: x})
                                                 .afterClosed()),
          withLatestFrom(this.updateSingleModuleData$),
          takeUntil(this.destroyEvent$)
        )
        .subscribe(([a, b]) => {
          this.updateSingleModuleData$.next(b);
        });
  
  }
  
  ngOnDestroy(): void {
    this.destroyEvent$.next();
    this.destroyEvent$.complete();
    
  }
}
