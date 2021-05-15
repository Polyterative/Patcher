import { Injectable }            from '@angular/core';
import { MatSnackBar }           from '@angular/material/snack-bar';
import {
  BehaviorSubject,
  merge,
  ReplaySubject,
  Subject
}                                from 'rxjs';
import { of }                    from 'rxjs/internal/observable/of';
import {
  switchMap,
  takeUntil,
  tap
}                                from 'rxjs/operators';
import { UserManagementService } from '../../features/backbone/login/user-management.service';
import { SupabaseService }       from '../../features/backend/supabase.service';
import { Rack }                  from '../../models/models';

@Injectable()
export class RackDetailDataService {
  updateSingleRackData$ = new ReplaySubject<number>();
  singleRackData$ = new BehaviorSubject<Rack | undefined>(undefined);
  rackEditingPanelOpenState$ = new BehaviorSubject<boolean>(false);
  userRacksList$: BehaviorSubject<Rack[]> = new BehaviorSubject<Rack[]>([]);
  // removeRackFromCollection$ = new Subject<number>();
  
  protected destroyEvent$: Subject<void> = new Subject();
  
  constructor(
    private snackBar: MatSnackBar,
    public userService: UserManagementService,
    public backend: SupabaseService
  ) {
    
    merge(this.userService.user$, this.updateSingleRackData$)
      .pipe(
        switchMap(x => this.userService.user$),
        switchMap(x => !!x ? this.backend.get.userRacks() : of([])),
        takeUntil(this.destroyEvent$)
      )
      .subscribe(x => {
        this.userRacksList$.next(x);
      });
  
    this.updateSingleRackData$
        .pipe(
          tap(x => this.singleRackData$.next(undefined)),
          switchMap(x => this.backend.get.rackWithId(x)),
          takeUntil(this.destroyEvent$)
        )
        .subscribe(x => this.singleRackData$.next(x.data));
  
  
    // this.removeRackFromCollection$
    //     .pipe(
    //       switchMap(x => this.backend.delete.userRack(x)),
    //       withLatestFrom(this.updateSingleRackData$),
    //       takeUntil(this.destroyEvent$)
    //     )
    //     .subscribe(([a, b]) => {
    //       snackBar.open('Removed', undefined, {duration: 1000});
    //       this.updateSingleRackData$.next(b);
    //     });
  
  }
  
  ngOnDestroy(): void {
    this.destroyEvent$.next();
    this.destroyEvent$.complete();
    
  }
}
