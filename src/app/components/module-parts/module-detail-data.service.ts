import { Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { BehaviorSubject, delay, merge, of, ReplaySubject, Subject } from 'rxjs';
import { filter, map, switchMap, takeUntil, tap, withLatestFrom } from 'rxjs/operators';
import { RackModuleAdderComponent } from 'src/app/components/rack-parts/rack-module-adder/rack-module-adder.component';
import { UserManagementService } from '../../features/backbone/login/user-management.service';
import { SupabaseService } from '../../features/backend/supabase.service';
import { DbModule } from '../../models/module';
import { PatchMinimal } from '../../models/patch';
import { RackMinimal } from '../../models/rack';

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
  patchesWithThisModule$ = new BehaviorSubject<PatchMinimal[] | undefined>(undefined);
  modulesBySameManufacturer$ = new BehaviorSubject<DbModule[] | undefined>(undefined);
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
          delay(150),
          switchMap(x => this.backend.get.racksWithModule(x)),
          takeUntil(this.destroyEvent$)
        )
        .subscribe(x => this.racksWithThisModule$.next(x.data.map(y => y.rack)));
  
    // get patches with this module
    this.updateSingleModuleData$
        .pipe(
          tap(x => this.patchesWithThisModule$.next(undefined)),
          delay(200),
          switchMap(x => this.backend.get.patchesWithModule(x)),
          takeUntil(this.destroyEvent$)
        )
        .subscribe(x => this.patchesWithThisModule$.next(x));
  
    // get modules by same manufacturer
    this.singleModuleData$
        .pipe(
          filter(x => !!x && !!x.manufacturer),
          tap(x => this.modulesBySameManufacturer$.next(undefined)),
          delay(250),
          switchMap(singleModuleData => this.backend.get.modulesBySameManufacturer(singleModuleData.manufacturerId)
                                            .pipe(
                                              map(x => x.filter(module => module.id !== singleModuleData.id))
                                            )
          ),
          takeUntil(this.destroyEvent$)
        )
        .subscribe(x => this.modulesBySameManufacturer$.next(x));
  
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
            this.moduleEditingPanelOpenState$.next(!module.isComplete && module.manufacturer.id !== 10000);
          }
        });
    
  }
  
  ngOnDestroy(): void {
    this.destroyEvent$.next();
    this.destroyEvent$.complete();
    
  }
}
