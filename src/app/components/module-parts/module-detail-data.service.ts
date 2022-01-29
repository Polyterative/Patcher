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
  filter,
  switchMap,
  takeUntil,
  tap,
  withLatestFrom
}                                   from 'rxjs/operators';
import { RackModuleAdderComponent } from 'src/app/components/rack-parts/rack-module-adder/rack-module-adder.component';
import { UserManagementService }    from '../../features/backbone/login/user-management.service';
import { SupabaseService }          from '../../features/backend/supabase.service';
import { DbModule }                 from '../../models/module';
import { RackMinimal }              from '../../models/rack';

@Injectable()
export class ModuleDetailDataService {
  updateSingleModuleData$ = new ReplaySubject<number>();
  singleModuleData$ = new BehaviorSubject<DbModule | null>(null);
  //
  moduleEditingPanelOpenState$ = new BehaviorSubject<boolean>(false);
  userModulesList$: BehaviorSubject<DbModule[]> = new BehaviorSubject<DbModule[]>([]);
  // modulePatchesList$: BehaviorSubject<Patch[]> = new BehaviorSubject<Patch[]>([]);
  addModuleToCollection$ = new Subject<number>();
  requestAddModuleToRack$ = new Subject<DbModule>();
  removeModuleFromCollection$ = new Subject<number>();
  //
  racksWithThisModule$ = new BehaviorSubject<RackMinimal[] | undefined>(undefined);
  //
  protected destroyEvent$ = new Subject<void>();
  
  constructor(
    public dialog: MatDialog,
    private snackBar: MatSnackBar,
    public userService: UserManagementService,
    public backend: SupabaseService
  ) {
    
    merge(this.userService.loggedUser$, this.updateSingleModuleData$)
      .pipe(
        switchMap(x => this.userService.loggedUser$),
        switchMap(x => !!x ? this.backend.get.userModules() : of([])),
        takeUntil(this.destroyEvent$)
      )
      .subscribe(x => {
        this.userModulesList$.next(x);
      });
    
    // get module data
    this.updateSingleModuleData$
        .pipe(
          tap(x => this.singleModuleData$.next(undefined)),
          switchMap(x => this.backend.get.moduleWithId(x)),
          takeUntil(this.destroyEvent$)
        )
        .subscribe(x => this.singleModuleData$.next(x.data));
    
    // get racks with this module
    this.updateSingleModuleData$
        .pipe(
          tap(x => this.racksWithThisModule$.next(undefined)),
          switchMap(x => this.backend.get.racksWithModule(x)),
          takeUntil(this.destroyEvent$)
        )
        .subscribe(x => this.racksWithThisModule$.next(x.data.map(y => y.rack)));
    
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
    
    this.singleModuleData$.pipe(
      filter(x => !!x),
      switchMap(x => this.userService.loggedUser$.pipe(withLatestFrom(of(x)))),
      takeUntil(this.destroyEvent$)
    )
        .subscribe(([user, module]) => {
          if (user) {
            this.moduleEditingPanelOpenState$.next(!module.isComplete);
          }
        });
    
  }
  
  ngOnDestroy(): void {
    this.destroyEvent$.next();
    this.destroyEvent$.complete();
    
  }
}
