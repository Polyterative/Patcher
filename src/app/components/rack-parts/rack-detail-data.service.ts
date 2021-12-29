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
  of,
  ReplaySubject,
  Subject
}                                from 'rxjs';
import {
  filter,
  map,
  switchMap,
  take,
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
  
  rowedRackedModules$ = new BehaviorSubject<RackedModule[][]>([]);
  rackOrderChange$ = new Subject<{ event: CdkDragDrop<ElementRef>, newRow: number, module: RackedModule }>();
  isCurrentRackPropertyOfCurrentUser$ = new BehaviorSubject<boolean>(false);
  isCurrentRackEditable$ = new BehaviorSubject<boolean>(true);
  requestRackEditableStatusChange$ = new Subject<void>();
  
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
          .pipe(
    
          )
          .subscribe(x => {
            if (x) {
              this.isCurrentRackEditable$.next(!x.locked);
            }
          })
    );
  
    // when updated rack data is received, update rowedRackedModules$
    this.manageSub(
      this.singleRackData$.pipe(
        tap(x => this.rowedRackedModules$.next([])),
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
      
            // update backend
            this.backend.update.rackedModules(rackModules.flatMap(row => row))
                .pipe(take(1))
                .subscribe();
      
            this.backend.update.rack(rack)
                .pipe(take(1))
                .subscribe();
      
          })
    );
  
  
    // track if rack is property of current user
    this.manageSub(
      combineLatest([
        this.userService.user$,
        this.singleRackData$
      ])
        .pipe(
          tap(x => this.isCurrentRackPropertyOfCurrentUser$.next(false))
        )
        .subscribe(([user, rackData]) => {
          if (user && rackData) {
            this.isCurrentRackPropertyOfCurrentUser$.next(user.id === rackData.author.id);
          }
        })
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
    rackModules[module.rackingData.row].splice(event.previousIndex, 1);
    this.updateModulesColumnIds(rackModules, module.rackingData.row);
    
    
    // add item to new array
    rackModules[newRow].splice(event.currentIndex, 0, module);
    this.updateModulesColumnIds(rackModules, newRow);
    
  }
  
}
