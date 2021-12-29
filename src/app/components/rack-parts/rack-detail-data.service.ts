import { CdkDragDrop }           from '@angular/cdk/drag-drop/drag-events';
import {
  ElementRef,
  Injectable
}                                from '@angular/core';
import { MatSnackBar }           from '@angular/material/snack-bar';
import {
  BehaviorSubject,
  combineLatest,
  merge,
  of,
  ReplaySubject,
  Subject
}                                from 'rxjs';
import {
  map,
  switchMap,
  takeUntil,
  tap,
  withLatestFrom
}                                from 'rxjs/operators';
import { UserManagementService } from '../../features/backbone/login/user-management.service';
import { SupabaseService }       from '../../features/backend/supabase.service';
import {
  Rack,
  RackedModule
}                                from '../../models/models';

@Injectable()
export class RackDetailDataService {
  updateSingleRackData$ = new ReplaySubject<number>();
  singleRackData$ = new BehaviorSubject<Rack | undefined>(undefined);
  userRacksList$: BehaviorSubject<Rack[]> = new BehaviorSubject<Rack[]>([]);
  // removeRackFromCollection$ = new Subject<number>();
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
  
    merge(this.userService.user$, this.updateSingleRackData$)
      .pipe(
        switchMap(x => this.userService.user$),
        switchMap(x => !!x ? this.backend.get.userRacks() : of([])),
        takeUntil(this.destroyEvent$)
      )
      .subscribe(x => {
        this.userRacksList$.next(x);
      });
  
    // when user toggles locked status of rack, update backend
    this.requestRackEditableStatusChange$
        .pipe(
          withLatestFrom(this.singleRackData$, this.isCurrentRackEditable$),
          map(([_, x, y]) => {
            let editable: boolean = !y;
            this.isCurrentRackEditable$.next(editable);
            x.locked = !editable;
            return x;
          }),
          switchMap(x => this.backend.update.rack(x)),
          takeUntil(this.destroyEvent$)
        )
        .subscribe(x => {
        });
  
  
    this.updateSingleRackData$
        .pipe(
          tap(x => this.singleRackData$.next(undefined)),
          switchMap(x => this.backend.get.rackWithId(x)),
          takeUntil(this.destroyEvent$)
        )
        .subscribe(x => this.singleRackData$.next(x.data));
  
    // when updated rack data is received, update locked status observable
    this.singleRackData$
        .pipe(
          takeUntil(this.destroyEvent$)
        )
        .subscribe(x => {
          if (x) {
            this.isCurrentRackEditable$.next(!x.locked);
          }
        });
  
  
    // track if rack is property of current user
    combineLatest([
      this.userService.user$,
      this.singleRackData$
    ])
      .pipe(
        tap(x => this.isCurrentRackPropertyOfCurrentUser$.next(false)),
        takeUntil(this.destroyEvent$)
      )
      .subscribe(([user, rackData]) => {
        if (user && rackData) {
          this.isCurrentRackPropertyOfCurrentUser$.next(user.id === rackData.author.id);
        }
      });
  
    // update rack lock status
  
  
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
