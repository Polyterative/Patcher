import { Injectable }            from '@angular/core';
import { MatSnackBar }           from '@angular/material/snack-bar';
import {
  BehaviorSubject,
  ReplaySubject,
  Subject
}                                from 'rxjs';
import {
  filter,
  switchMap,
  takeUntil,
  withLatestFrom
}                                from 'rxjs/operators';
import { UserManagementService } from '../../features/backbone/login/user-management.service';
import { SupabaseService }       from '../../features/backend/supabase.service';
import {
  CV,
  MinimalModule,
  Patch,
  PatchConnection
}                                from '../../models/models';

export type CVConnectionEntity = { cv: CV, module: MinimalModule, kind: 'in' | 'out' };

@Injectable()
export class PatchDetailDataService {
  updateSinglePatchData$ = new ReplaySubject<number>();
  singlePatchData$ = new BehaviorSubject<Patch | undefined>(undefined);
  //
  patchEditingPanelOpenState$ = new BehaviorSubject<boolean>(false);
  patchsConnections$: BehaviorSubject<PatchConnection[]> = new BehaviorSubject<PatchConnection[]>([]);
  removePatchFromCollection$ = new Subject<number>();
  //
  clickOnModuleCV$ = new Subject<CVConnectionEntity>();
  resetSelectedForConnection$$ = new Subject<void>();
  selectedForConnection$ = new BehaviorSubject<{ a: CVConnectionEntity | null, b: CVConnectionEntity | null, }>({
    a: null,
    b: null
  });
  protected destroyEvent$: Subject<void> = new Subject();
  
  
  constructor(
    private snackBar: MatSnackBar,
    public userService: UserManagementService,
    public backend: SupabaseService
  ) {
    
    // merge(this.userService.user$, this.updateSinglePatchData$)
    //   .pipe(
    //     switchMap(x => this.userService.user$),
    //     switchMap(x => !!x ? this.backend.get.userPatches() : of([])),
    //     takeUntil(this.destroyEvent$)
    //   )
    //   .subscribe(x => {
    //     this.userPatchsList$.next(x);
    //   });
    
    this.updateSinglePatchData$
        .pipe(
          switchMap(x => this.backend.get.patchWithId(x)),
          takeUntil(this.destroyEvent$)
        )
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
  
  
    this.singlePatchData$
        .pipe(
          filter(x => !!x),
          switchMap(x => this.backend.get.patchConnections(x.id)),
          takeUntil(this.destroyEvent$)
        )
        .subscribe(data => this.patchsConnections$.next(data));
  
    this.patchEditingPanelOpenState$
        .pipe(
          filter(x => !x),
          takeUntil(this.destroyEvent$)
        )
        .subscribe(value => this.resetSelectedForConnection$$.next());
  
    this.resetSelectedForConnection$$
        .pipe(takeUntil(this.destroyEvent$))
        .subscribe(value => this.selectedForConnection$.next({
          a: null,
          b: null
        }));
  
    this.clickOnModuleCV$
        .pipe(
          withLatestFrom(this.selectedForConnection$),
          takeUntil(this.destroyEvent$)
        )
        .subscribe(([x, z]) => {
    
          switch (x.kind) {
            case 'in':
              this.selectedForConnection$.next({
                a: z.a,
                b: x
              });
              break;
            case 'out':
        
              this.selectedForConnection$.next({
                a: x,
                b: z.b
              });
              break;
          }
    
        });
  }
  
  ngOnDestroy(): void {
    this.destroyEvent$.next();
    this.destroyEvent$.complete();
    
  }
}
