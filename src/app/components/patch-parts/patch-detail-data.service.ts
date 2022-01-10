import {
  Injectable,
  OnDestroy
}                                from '@angular/core';
import {
  FormControl,
  Validators
}                                from '@angular/forms';
import { MatDialog }             from '@angular/material/dialog';
import { MatSnackBar }           from '@angular/material/snack-bar';
import { Router }                from '@angular/router';
import {
  BehaviorSubject,
  ReplaySubject,
  Subject
}                                from 'rxjs';
import {
  filter,
  map,
  pairwise,
  switchMap,
  take,
  takeUntil,
  tap,
  withLatestFrom
}                                from 'rxjs/operators';
import {
  ConfirmDialogComponent,
  ConfirmDialogDataInModel,
  ConfirmDialogDataOutModel
}                                from 'src/app/shared-interproject/dialogs/confirm-dialog/confirm-dialog.component';
import { UserManagementService } from '../../features/backbone/login/user-management.service';
import { SupabaseService }       from '../../features/backend/supabase.service';
import { PatchConnection }       from '../../models/connection';
import { CVwithModule }          from '../../models/cv';
import { Patch }                 from '../../models/patch';

export interface CVConnectionEntity {
  cv: CVwithModule;
  kind: 'in' | 'out';
}

@Injectable()
export class PatchDetailDataService implements OnDestroy {
  updateSinglePatchData$ = new ReplaySubject<number>();
  singlePatchData$ = new BehaviorSubject<Patch | undefined>(undefined);
  //
  patchEditingPanelOpenState$ = new BehaviorSubject<boolean>(false);
  patchesConnections$: BehaviorSubject<PatchConnection[] | null> = new BehaviorSubject<PatchConnection[]>(null);
  editorConnections$: BehaviorSubject<PatchConnection[] | null> = new BehaviorSubject<PatchConnection[]>(null);
  removePatchFromCollection$ = new Subject<number>();
  //
  formData = {
    name:        {
      control: new FormControl('', Validators.compose([
        Validators.required,
        Validators.min(3),
        Validators.maxLength(144)
      ]))
    },
    description: {
      control: new FormControl('', Validators.compose([
        Validators.min(0),
        Validators.maxLength(144)
      ]))
    }
  };
  //
  clickOnModuleCV$ = new Subject<CVConnectionEntity>();
  resetSelectedForConnection$ = new Subject<void>();
  selectedForConnection$ = new BehaviorSubject<{ a: CVConnectionEntity | null, b: CVConnectionEntity | null }>({
    a: null,
    b: null
  });
  confirmSelectedConnection$ = new Subject<void>();
  removeConnectionFromEditor$ = new Subject<PatchConnection>();
  readonly savePatchEditing$ = new Subject<void>();
  readonly deletePatch$ = new Subject<number>();
  //
  protected destroyEvent$ = new Subject<void>();
  
  constructor(
    private router: Router,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
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
          tap(x => this.singlePatchData$.next(undefined)),
          tap(x => this.patchesConnections$.next(null)),
          tap(x => this.editorConnections$.next(null)),
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
    
    this.formData.name.control.valueChanges
        .pipe(
          filter(x => !!this.singlePatchData$.value),
          filter(x => this.formData.name.control.valid),
          takeUntil(this.destroyEvent$)
        )
        .subscribe(input => this.singlePatchData$.value.name = input);
    //
    this.formData.description.control.valueChanges
        .pipe(
          filter(x => !!this.singlePatchData$.value),
          filter(x => this.formData.description.control.valid),
          filter(x => !!this.formData.description.control.value || this.formData.description.control.value == ''),
          takeUntil(this.destroyEvent$)
        )
        .subscribe(input => this.singlePatchData$.value.description = input);
    
    this.singlePatchData$
        .pipe(
          filter(x => !!this.singlePatchData$.value),
          takeUntil(this.destroyEvent$)
        )
        .subscribe(data => {
          this.formData.name.control.reset();
          this.formData.description.control.reset();
  
          this.formData.name.control.patchValue(data.name);
  
          if (!!data.description) {
            this.formData.description.control.patchValue(data.description);
          }
        });
    
    this.singlePatchData$
        .pipe(
          filter(x => !!x),
          switchMap(x => this.backend.get.patchConnections(x.id)),
          takeUntil(this.destroyEvent$)
        )
        .subscribe(data => this.patchesConnections$.next(data));
    
    this.singlePatchData$
        .pipe(
          filter(x => !!x),
          filter(x => !!this.backend.getUser()),
          take(1),
          takeUntil(this.destroyEvent$)
        )
        .subscribe(data => this.patchEditingPanelOpenState$.next(!!data && data.author && this.backend.getUser() && this.backend.getUser().id == data.author.id));
    
    this.patchEditingPanelOpenState$
        .pipe(
          filter(x => !x),
          takeUntil(this.destroyEvent$)
        )
        .subscribe(value => this.resetSelectedForConnection$.next());
    
    this.patchEditingPanelOpenState$
        .pipe(
          pairwise(),
          filter(x => x[0] == true && x[1] == false),
          filter(x => !!this.singlePatchData$.value),
          takeUntil(this.destroyEvent$)
        )
        .subscribe(value => this.updateSinglePatchData$.next(this.singlePatchData$.value.id));
    
    this.resetSelectedForConnection$
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
    
    this.confirmSelectedConnection$
        .pipe(
          withLatestFrom(this.editorConnections$),
          takeUntil(this.destroyEvent$)
        )
        .subscribe(([_, patchConnections]) => {
          const selectedForConnection: { a: CVConnectionEntity | null; b: CVConnectionEntity | null } = this.selectedForConnection$.value;
  
          const patch: Patch = this.singlePatchData$.value;
  
          const newConnection: { patch: Patch; a: CVwithModule; b: CVwithModule } = {
            a: selectedForConnection.a.cv,
            b: selectedForConnection.b.cv,
            patch
          };
  
          const isAlreadyInList: boolean = !!patchConnections.find(connection => connection.a.id === newConnection.a.id && connection.b.id === newConnection.b.id);
  
          if (!isAlreadyInList) {
            this.snackBar.open('✔ Connection confirmed', undefined, {duration: 1000});
            this.editorConnections$.next([
              ...patchConnections,
              newConnection
            ]);
          } else { this.snackBar.open('⚠ This connection has already been made', undefined, {duration: 2000}); }
  
        });
    
    this.patchesConnections$
        .pipe(takeUntil(this.destroyEvent$))
        .subscribe(x => this.editorConnections$.next(x));
    
    this.removeConnectionFromEditor$
        .pipe(
          withLatestFrom(this.editorConnections$),
          takeUntil(this.destroyEvent$)
        )
        .subscribe(([x, data]) => this.editorConnections$.next(
            data.filter(
              connection => !(connection.a.id === x.a.id && connection.b.id === x.b.id))
          )
        );
    
    this.savePatchEditing$
        .pipe(
          withLatestFrom(this.editorConnections$, this.singlePatchData$),
          switchMap(([a, patchConnections, patch]) => this.backend.update.patchConnections(patchConnections)
                                                          .pipe(switchMap(x => this.backend.update.patch(patch)))),
          takeUntil(this.destroyEvent$)
        )
        .subscribe(value => {
          this.updateSinglePatchData$.next(this.singlePatchData$.value.id);
        });
    
    this.deletePatch$
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
          withLatestFrom(this.deletePatch$),
          switchMap(([z, x]) => this.backend.delete.patchConnectionsForPatch(x)
                                    .pipe(map(() => x))),
          switchMap((x) => this.backend.delete.patch(x)),
          takeUntil(this.destroyEvent$)
        )
        .subscribe(value => {
          this.router.navigate(['/user/area']);
        });
    
  }
  
  ngOnDestroy(): void {
    this.destroyEvent$.next();
    this.destroyEvent$.complete();
    
  }
}
