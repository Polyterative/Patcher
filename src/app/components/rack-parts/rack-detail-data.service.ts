import { moveItemInArray }       from '@angular/cdk/drag-drop';
import { CdkDragDrop }           from '@angular/cdk/drag-drop/drag-events';
import {
  ElementRef,
  Injectable
}                                from '@angular/core';
import { MatSnackBar }           from '@angular/material/snack-bar';
import {
  BehaviorSubject,
  combineLatest,
  forkJoin,
  of,
  ReplaySubject,
  Subject
}                                from 'rxjs';
import {
  filter,
  map,
  switchMap,
  tap,
  withLatestFrom
}                                from 'rxjs/operators';
import { UserManagementService } from '../../features/backbone/login/user-management.service';
import { SupabaseService }       from '../../features/backend/supabase.service';
import {
  Rack,
  RackedModule,
  RackMinimal
}                                from '../../models/models';
import { SubManager }            from '../../shared-interproject/directives/subscription-manager';

@Injectable()
export class RackDetailDataService extends SubManager {
  updateSingleRackData$ = new ReplaySubject<number>();
  singleRackData$ = new BehaviorSubject<Rack | undefined>(undefined);
  // deleteRack$ = new Subject<number>();
  
  rowedRackedModules$ = new BehaviorSubject<RackedModule[][] | null>(null);
  
  rackOrderChange$ = new Subject<{ event: CdkDragDrop<ElementRef>, newRow: number, module: RackedModule }>();
  isCurrentRackPropertyOfCurrentUser$ = new BehaviorSubject<boolean>(false);
  isCurrentRackEditable$ = new BehaviorSubject<boolean>(true);
  requestRackEditableStatusChange$ = new Subject<void>();
  requestRackedModuleRemoval$ = new Subject<RackedModule>();
  requestRackedModulesDbSync$ = new Subject<void>();
  
  protected destroyEvent$ = new Subject<void>();
  
  constructor(
    private snackBar: MatSnackBar,
    public userService: UserManagementService,
    public backend: SupabaseService
  ) {
    super();
    
    // when user toggles locked status of rack, update backend
    this.manageSub(
      this.requestRackEditableStatusChange$
          .pipe(
            withLatestFrom(this.singleRackData$, this.isCurrentRackEditable$),
            map(([_, x, y]) => {
              let editable: boolean = !y;
              this.isCurrentRackEditable$.next(editable);
              x.locked = !editable;
              return x;
            }),
            switchMap(x => this.backend.update.rack(x))
          )
          .subscribe(x => {
          })
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
            let rowedRackedModules = this.buildRowedModulesArray(rackedModules, rack);
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
        this.userService.user$,
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
    
              // this.requestRackedModulesDbSync$.next(); // this does not work, because the rack data are upserted, so we need to delete in the backend manually
              return this.backend.delete.rackedModule(rackedModule.rackingData.id);
            })
          )
          .subscribe()
    );
    
    // on request to sync rack data with backend, update backend
    this.manageSub(
      this.requestRackedModulesDbSync$
          .pipe(
            withLatestFrom(this.rowedRackedModules$, this.singleRackData$),
            switchMap(([_, rackModules, rack]) => forkJoin([
                this.backend.update.rackedModules(rackModules.flatMap(row => row)),
                this.backend.update.rack(rack)
              ])
            ))
          .subscribe()
    );
    
    // on rack delete, update backend
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
    
  }
  
  private buildRowedModulesArray(rackedModules: RackedModule[], rackData: RackMinimal): RackedModule[][] {
    let rowedRackedModules: RackedModule[][] = [];
    for (let i = 0; i < rackData.rows; i++) {
      rowedRackedModules[i] = rackedModules.filter(module => module.rackingData.row === i);
    }
    return rowedRackedModules;
  }
  
  private transferInRow(rackModules: RackedModule[][], newRow: number, event: CdkDragDrop<ElementRef>): void {
    moveItemInArray(rackModules[newRow], event.previousIndex, event.currentIndex);
    // update module position
    this.updateModulesColumnIds(rackModules, newRow);
  }
  
  private updateModulesColumnIds(rackModules: RackedModule[][], row): void {
    rackModules[row].forEach((module, index) => {
      module.rackingData.column = index;
      module.rackingData.row = row;
    });
  }
  
  private transferBetweenRows(rackModules: RackedModule[][], module: RackedModule, event, newRow): void {
    // remove item from old array
    this.removeRackedModuleFromArray(rackModules, module);
    
    // add item to new array
    rackModules[newRow].splice(event.currentIndex, 0, module);
    this.updateModulesColumnIds(rackModules, newRow);
    
  }
  
  private removeRackedModuleFromArray(rackModules: RackedModule[][], module: RackedModule): void {
    rackModules[module.rackingData.row].splice(module.rackingData.column, 1);
    this.updateModulesColumnIds(rackModules, module.rackingData.row);
  }
}
