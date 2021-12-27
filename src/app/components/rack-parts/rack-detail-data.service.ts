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
  rackOrderChange$ = new Subject<CdkDragDrop<ElementRef>>();
  isCurrentRackPropertyOfCurrentUser$ = new BehaviorSubject<boolean>(false);
  isCurrentRackEditable$ = new BehaviorSubject<boolean>(false);
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
  
    // when user locks the rack, set rack as not editable
    // this.requestRackEditableStatusChange$
    //   .pipe(
    //     switchMap(x => this.userService.user$),
    //     switchMap(x => !!x ? this.backend.get.userRacks() : of([])),
    //     takeUntil(this.destroyEvent$)
    //   )
    //   .subscribe(x => {
    //     this.isCurrentRackEditable$.next(x.find(y => y.id === this.singleRackData$.value.id) !== undefined);
    //   });
  
  
    this.updateSingleRackData$
        .pipe(
          tap(x => this.singleRackData$.next(undefined)),
          switchMap(x => this.backend.get.rackWithId(x)),
          takeUntil(this.destroyEvent$)
        )
        .subscribe(x => this.singleRackData$.next(x.data));
  
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
