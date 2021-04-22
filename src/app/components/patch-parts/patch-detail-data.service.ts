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
  withLatestFrom
}                                from 'rxjs/operators';
import { UserManagementService } from '../../features/backbone/login/user-management.service';
import { SupabaseService }       from '../../features/backend/supabase.service';
import { Patch }                 from '../../models/models';

@Injectable()
export class PatchDetailDataService {
  updateSinglePatchData$ = new ReplaySubject<number>();
  singlePatchData$ = new BehaviorSubject<Patch | undefined>(undefined);
  patchEditingPanelOpenState$ = new BehaviorSubject<boolean>(false);
  userPatchsList$: BehaviorSubject<Patch[]> = new BehaviorSubject<Patch[]>([]);
  removePatchFromCollection$ = new Subject<number>();
  
  protected destroyEvent$: Subject<void> = new Subject();
  
  constructor(
    private snackBar: MatSnackBar,
    public userService: UserManagementService,
    public backend: SupabaseService
  ) {
    
    merge(this.userService.user$, this.updateSinglePatchData$)
      .pipe(
        switchMap(x => this.userService.user$),
        switchMap(x => !!x ? this.backend.get.userPatches() : of([])),
        takeUntil(this.destroyEvent$)
      )
      .subscribe(x => {
        this.userPatchsList$.next(x);
      });
    
    this.updateSinglePatchData$
        .pipe(switchMap(x => this.backend.get.patchWithId(x)), takeUntil(this.destroyEvent$))
        .subscribe(x => this.singlePatchData$.next(x.data));
    
    
    this.removePatchFromCollection$
        .pipe(
          switchMap(x => this.backend.delete.userPatch(x)),
          withLatestFrom(this.updateSinglePatchData$),
          takeUntil(this.destroyEvent$)
        )
        .subscribe(([a, b]) => {
          snackBar.open('Removed', undefined, {duration: 1000});
          this.updateSinglePatchData$.next(b);
        });
    
  }
  
  ngOnDestroy(): void {
    this.destroyEvent$.next();
    this.destroyEvent$.complete();
    
  }
}
