import { moveItemInArray }         from '@angular/cdk/drag-drop';
import { CdkDragDrop }             from '@angular/cdk/drag-drop/drag-events';
import {
  ElementRef,
  Injectable
}                                  from '@angular/core';
import { MatDialog }               from '@angular/material/dialog';
import { MatSnackBar }             from '@angular/material/snack-bar';
import { Router }                  from '@angular/router';
import _                           from 'lodash';
import {
  BehaviorSubject,
  combineLatest,
  of,
  ReplaySubject,
  Subject
}                                  from 'rxjs';
import {
  filter,
  map,
  switchMap,
  takeUntil,
  tap,
  withLatestFrom
}                                  from 'rxjs/operators';
import { UserManagementService }   from '../../features/backbone/login/user-management.service';
import { SupabaseService }         from '../../features/backend/supabase.service';
import {
  MinimalModule,
  RackedModule
}                                  from '../../models/module';
import {
  Rack,
  RackMinimal
}                                  from '../../models/rack';
import {
  ConfirmDialogComponent,
  ConfirmDialogDataInModel,
  ConfirmDialogDataOutModel
}                                  from '../../shared-interproject/dialogs/confirm-dialog/confirm-dialog.component';
import { SubManager }              from '../../shared-interproject/directives/subscription-manager';
import { SharedConstants }         from '../../shared-interproject/SharedConstants';
import { ModuleDetailDataService } from '../module-parts/module-detail-data.service';

@Injectable()
export class RackDetailDataService extends SubManager {
  updateSingleRackData$ = new ReplaySubject<number>();
  singleRackData$ = new BehaviorSubject<Rack | undefined>(undefined);
  deleteRack$ = new Subject<RackMinimal>();
  addModuleToRack$ = new Subject<MinimalModule>();
  shouldShowPanelImages$ = new BehaviorSubject<boolean>(true);
  
  rowedRackedModules$ = new BehaviorSubject<RackedModule[][] | null>(null);
  
  rackOrderChange$ = new Subject<{ event: CdkDragDrop<ElementRef>, newRow: number, module: RackedModule }>();
  isCurrentRackPropertyOfCurrentUser$ = new BehaviorSubject<boolean>(false);
  isCurrentRackEditable$ = new BehaviorSubject<boolean>(true);
  userRequestedSmallerScale$ = new BehaviorSubject<boolean>(false);
  //
  requestRackEditableStatusChange$ = new Subject<void>();
  requestRackedModuleRemoval$ = new Subject<RackedModule>();
  requestRackedModuleDuplication$ = new Subject<RackedModule>();
  requestRackedModulesDbSync$ = new Subject<void>();
  
  protected destroyEvent$ = new Subject<void>();
  
  constructor(
    private snackBar: MatSnackBar,
    private userService: UserManagementService,
    private backend: SupabaseService,
    private dialog: MatDialog,
    private router: Router,
    private moduleDetailDataService: ModuleDetailDataService
  ) {
    super();
    
    // when user toggles locked status of rack, update backend
    this.manageSub(
      this.requestRackEditableStatusChange$
          .pipe(
            withLatestFrom(this.singleRackData$, this.isCurrentRackEditable$),
            map(([_, x, y]) => {
              const editable: boolean = !y;
              this.isCurrentRackEditable$.next(editable);
              x.locked = !editable;
              return x;
            }),
            switchMap(x => this.backend.update.rack(x))
          )
          .subscribe()
    );
    
    this.manageSub(
      this.updateSingleRackData$
          .pipe(
            tap(x => this.singleRackData$.next(undefined)),
            switchMap(x => this.backend.get.rackWithId(x))
          )
          .subscribe(x => this.singleRackData$.next(x.data))
    );
    
    // when updated rack data is received, update locked status observable
    this.manageSub(
      this.singleRackData$
          .pipe(filter(x => !!x))
          .subscribe(x => this.isCurrentRackEditable$.next(!x.locked))
    );
    
    // when updated rack data is received, update rowedRackedModules$
    this.manageSub(
      this.singleRackData$.pipe(
        tap(x => this.rowedRackedModules$.next(null)),
        filter(x => !!x),
        switchMap(x => x ? this.backend.get.rackedModules(x.id) : of([])),
        withLatestFrom(this.singleRackData$)
      )
          .subscribe(([rackedModules, rack]: [RackedModule[], Rack]) => {
            // create a 2d array of racked modules and sort them by row
            const rowedRackedModules = this.buildRowedModulesArray(rackedModules, rack);
            this.rowedRackedModules$.next(rowedRackedModules);
          })
    );
    
    // on order change, update local rack data and backend
    this.manageSub(
      this.rackOrderChange$
          .pipe(
            withLatestFrom(this.rowedRackedModules$, this.singleRackData$)
          )
          .subscribe(([
                        {
                          event,
                          newRow,
                          module
                        }, rackModules, rack
                      ]) => {
  
  
            const movingUnrackedModule: boolean = module.rackingData.row === null && newRow > rack.rows - 1;
            if (movingUnrackedModule) {
              module.rackingData.column = 0;
              this.transferInRow(rackModules, newRow, event);
  
              // nothing to do, not moving unracked module
              this.snackBar.open(
                `Please move unracked module to a suitable position inside your rack.
                Your rack has ${ rack.rows } rows`,
                null,
                {duration: 5000});
  
              return;
            }
  
            // update array
            if (newRow === module.rackingData.row) {
              this.transferInRow(rackModules, newRow, event);
            } else {
              this.transferBetweenRows(rackModules, module, event, newRow);
            }
  
            this.rowedRackedModules$.next(rackModules);
  
            this.requestRackedModulesDbSync$.next();
          })
    );
    
    // track if rack is property of current user
    this.manageSub(
      combineLatest([
        this.userService.loggedUser$,
        this.singleRackData$
      ])
        .pipe(
          tap(x => this.isCurrentRackPropertyOfCurrentUser$.next(false)),
          filter(([user, rackData]) => (!!user && !!rackData))
        )
        .subscribe(([user, rackData]) => {
          this.isCurrentRackPropertyOfCurrentUser$.next(user.id === rackData.author.id);
        })
    );
    
    // when request to remove module is received, find module and remove it, then update the local rack data
    this.manageSub(
      this.requestRackedModuleRemoval$
          .pipe(
            withLatestFrom(this.rowedRackedModules$, this.singleRackData$),
            switchMap(([rackedModule, rackModules, rack]) => {
  
              this.removeRackedModuleFromArray(rackModules, rackedModule);
              this.rowedRackedModules$.next(rackModules);
  
              // this.requestRackedModulesDbSync$.next();
              // this does not work, because the rack data are upserted, so we need to delete in the backend manually
  
              return this.backend.delete.rackedModule(rackedModule.rackingData.id);
            }),
            withLatestFrom(this.singleRackData$)
          )
          .subscribe(([x, rackData]) => {
            this.singleRackData$.next(rackData);
          })
    );
  
    // when request to duplicate module is received, find module and duplicate it, then update the local rack data
    this.manageSub(
      this.requestRackedModuleDuplication$
          .pipe(
            withLatestFrom(this.rowedRackedModules$, this.singleRackData$)
          )
          .subscribe(([rackedModule, rackModules, rack]) => {
  
            this.duplicateModule(rackModules, rackedModule);
            this.rowedRackedModules$.next(rackModules);
  
            this.requestRackedModulesDbSync$.next();
  
          })
    );
  
    // on request to sync rack data with backend, update backend
    this.manageSub(
      this.requestRackedModulesDbSync$
          .pipe(
            withLatestFrom(this.rowedRackedModules$, this.singleRackData$),
            switchMap(([_, rackModules, rack]) => this.backend.update.rackedModules(rackModules.flatMap(row => row))
                                                      .pipe(
                                                        tap(x => {
                                                          if (this.isAnyModuleWithoutRackingId(rackModules)) {
                                                            this.singleRackData$.next(rack);
                                                          }
                                                        })
                                                      )
            )
          )
          .subscribe(x => {
            SharedConstants.successSaveShort(this.snackBar);
          })
    );
  
    // on rack delete, ask for confirmation and delete rack on backend
    this.deleteRack$
        .pipe(
          switchMap(x => {
  
            const data: ConfirmDialogDataInModel = {
              title:       'Deletion',
              description: 'Are you sure you want to delete this item?',
              positive:    {label: '✔️ Delete'},
              negative:    {label: '❌ Cancel'}
            };
  
            return this.dialog.open(
              ConfirmDialogComponent,
              {
                data,
                disableClose: true
              }
            )
                       .afterClosed()
                       .pipe(filter((x: ConfirmDialogDataOutModel) => x.answer)
                       );
          }),
          withLatestFrom(this.deleteRack$, this.rowedRackedModules$),
          switchMap(([z, x]) => this.backend.delete.modulesOfRack(x.id)
                                    .pipe(map(() => x))),
          switchMap(x => this.backend.delete.userRack(x.id)),
          takeUntil(this.destroyEvent$)
        )
        .subscribe(value => {
          this.router.navigate(['/user/area']);
          SharedConstants.successDelete(this.snackBar);
        });
  
    // this.deleteRack$
    //     .pipe(
    //       switchMap(x => this.backend.delete.userRack(x)),
    //       withLatestFrom(this.updateSingleRackData$),
    //
    //     )
    //     .subscribe(([a, b]) => {
    //       snackBar.open('Removed', undefined, {duration: 1000});
    //       this.updateSingleRackData$.next(b);
    //     });
  
    // add module from bottom picker
    this.addModuleToRack$
        .pipe(
          switchMap(module => this.backend.add.rackModule(
            module.id,
            this.singleRackData$.value.id
          )),
          takeUntil(this.destroyEvent$)
        )
        .subscribe(moduleToAdd => {
          snackBar.open('✅ Added', undefined, {duration: 4000});
    
          this.updateSingleRackData$.next(this.singleRackData$.value.id);
        });
  
  }
  
  private isAnyModuleWithoutRackingId(rackModules: RackedModule[][]): boolean {
    return rackModules.flatMap(row => row)
                      .filter(module => module.rackingData.id === undefined).length > 0;
  }
  
  private buildRowedModulesArray(rackedModules: RackedModule[], rackData: RackMinimal): RackedModule[][] {
    const rowedRackedModules: RackedModule[][] = [];
    for (let i = 0; i < rackData.rows; i++) {
      rowedRackedModules[i] = rackedModules.filter(module => module.rackingData.row === i);
    }
  
    // check if there are modules without row and column, add them to a new row
    const modulesWithoutRowAndColumn = rackedModules.filter(
      module => module.rackingData.row === null && module.rackingData.column === null
    );
  
    if (modulesWithoutRowAndColumn.length > 0) {
      rowedRackedModules.push(modulesWithoutRowAndColumn);
    }
  
    return rowedRackedModules;
  }
  
  private transferInRow(rackedModules: RackedModule[][], row: number, event: CdkDragDrop<ElementRef>): void {
    this.updateModulesColumnIds(rackedModules, row);
    moveItemInArray(rackedModules[row], event.previousIndex, event.currentIndex);
    // update module position
    this.updateModulesColumnIds(rackedModules, row);
  }
  
  private updateModulesColumnIds(rackModules: RackedModule[][], row: number | undefined): void {
    if (row === undefined) {
      return undefined; // do nothing if rack has not been placed yet
    }
    const modulesInRow: RackedModule[] | undefined = rackModules[row];
    
    if (modulesInRow) {
      modulesInRow.forEach((module, index) => {
        module.rackingData.column = index;
        module.rackingData.row = row;
      });
    }
    
  }
  
  private transferBetweenRows(rackedModules: RackedModule[][], rackedModule: RackedModule, event, newRow): void {
    // remove item from old array
    this.removeRackedModuleFromArray(rackedModules, rackedModule);
    
    // add item to new array
    rackedModules[newRow].splice(event.currentIndex, 0, rackedModule);
    this.updateModulesColumnIds(rackedModules, newRow);
    
  }
  
  private removeRackedModuleFromArray(rackedModules: RackedModule[][], rackedModule: RackedModule): void {
    this.updateModulesColumnIds(rackedModules, rackedModule.rackingData.row);
  
    // undefined accounts for unracked modules
    const modulesOfRow: RackedModule[] | undefined = rackedModules[rackedModule.rackingData.row];
    if (modulesOfRow) {
      // module was previously racked
      modulesOfRow.splice(rackedModule.rackingData.column, 1);
    } else {
      // module has not been racked yet
      const lastRow: RackedModule[] = rackedModules[rackedModules.length - 1];
  
      // remove unracked module from last row
      const unrackedModuleRowIndex: number = lastRow.findIndex(module => module.rackingData.id === rackedModule.rackingData.id);
      lastRow.splice(unrackedModuleRowIndex, 1);
  
      if (lastRow.length === 0) {
        // remove empty row
        rackedModules.splice(rackedModules.length - 1, 1);
      }
    }
  
    this.updateModulesColumnIds(rackedModules, rackedModule.rackingData.row);
  }
  
  private duplicateModule(rackedModules: RackedModule[][], rackedModule: RackedModule): void {
    // make a deep copy of the module with lodash
    const deepCopiedRackedModule: RackedModule = _.cloneDeep(rackedModule);
    
    deepCopiedRackedModule.rackingData.id = undefined;
    
    const moduleRow: RackedModule[] = rackedModules[deepCopiedRackedModule.rackingData.row];
    
    if (moduleRow) {
      // insert deep copied module into the array close to the original module
      const columnCoordinate: number = deepCopiedRackedModule.rackingData.column + 1;
      moduleRow.splice(
        columnCoordinate, 0, deepCopiedRackedModule
      );
    } else {
      // module to duplicate has not been racked yet
      // add deep copied module to the last row
      rackedModules[rackedModules.length - 1].push(deepCopiedRackedModule);
    }
    this.updateModulesColumnIds(rackedModules, deepCopiedRackedModule.rackingData.row);
  }
}
