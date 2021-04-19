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
import { DbModule }              from '../../models/models';
import { UserManagementService } from '../backbone/login/user-management.service';
import { SupabaseService }       from '../backend/supabase.service';

@Injectable()
export class ModuleDetailDataService {
  updateSingleModuleData$ = new ReplaySubject<number>();
  singleModuleData$ = new BehaviorSubject<DbModule | undefined>(undefined);
  moduleEditingPanelOpenState$ = new BehaviorSubject<boolean>(false);
  userModulesList$: BehaviorSubject<DbModule[]> = new BehaviorSubject<DbModule[]>([]);
  addModuleToCollection$ = new Subject<number>();
  removeModuleFromCollection$ = new Subject<number>();
  
  constructor(
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
        .pipe(switchMap(x => this.backend.get.moduleWithId(x)), takeUntil(this.destroyEvent$))
        .subscribe(x => this.singleModuleData$.next(x.data));
    
    
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
    
    
  }
  
  protected destroyEvent$: Subject<void> = new Subject();
  
  ngOnDestroy(): void {
    this.destroyEvent$.next();
    this.destroyEvent$.complete();
    
  }
}
