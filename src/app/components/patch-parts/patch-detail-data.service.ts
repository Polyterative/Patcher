import { Injectable }            from '@angular/core';
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
  switchMap,
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
import {
  CVwithModule,
  Patch,
  PatchConnection
}                                from '../../models/models';

export interface CVConnectionEntity {
  cv: CVwithModule;
  kind: 'in' | 'out';
}

@Injectable()
export class PatchDetailDataService {
  updateSinglePatchData$ = new ReplaySubject<number>();
  singlePatchData$ = new BehaviorSubject<Patch | undefined>(undefined);
  //
  patchEditingPanelOpenState$ = new BehaviorSubject<boolean>(false);
  patchesConnections$: ReplaySubject<PatchConnection[]> = new ReplaySubject<PatchConnection[]>(1);
  editorConnections$: BehaviorSubject<PatchConnection[]> = new BehaviorSubject<PatchConnection[]>([]);
  removePatchFromCollection$ = new Subject<number>();
  //
  clickOnModuleCV$ = new Subject<CVConnectionEntity>();
  resetSelectedForConnection$ = new Subject<void>();
  selectedForConnection$ = new BehaviorSubject<{ a: CVConnectionEntity | null, b: CVConnectionEntity | null }>({
    a: null,
    b: null
  });
  confirmSelectedConnection$: Subject<void> = new Subject();
  removeConnectionFromEditor$: Subject<PatchConnection> = new Subject();
  readonly savePatchEditing$ = new Subject();
  readonly deletePatch$ = new Subject<number>();
  //
  protected destroyEvent$: Subject<void> = new Subject();
  
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
          tap(x => this.patchesConnections$.next([])),
          tap(x => this.editorConnections$.next([])),
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
        .subscribe(data => this.patchesConnections$.next(data));
  
    this.singlePatchData$
        .pipe(
          takeUntil(this.destroyEvent$)
        )
        .subscribe(data => this.patchEditingPanelOpenState$.next(!!data && data.author && this.backend.getUser() && this.backend.getUser().id == data.author.id));
  
    this.patchEditingPanelOpenState$
        .pipe(
          filter(x => !x),
          takeUntil(this.destroyEvent$)
        )
        .subscribe(value => this.resetSelectedForConnection$.next());
  
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
        .pipe(takeUntil(this.destroyEvent$))
        .subscribe(x => {
          const patchConnections: PatchConnection[] = this.editorConnections$.value;
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
          withLatestFrom(this.editorConnections$),
          switchMap(([a, data]) => this.backend.update.patchConnections(data)),
          takeUntil(this.destroyEvent$)
        )
        .subscribe(value => {
          this.updateSinglePatchData$.next(this.singlePatchData$.value.id);
        });
  
  
    this.deletePatch$
        .pipe(
          switchMap(x => {
  
            let data: ConfirmDialogDataInModel = {
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
          switchMap(([z, x]) => this.backend.delete.patch(x)),
          takeUntil(this.destroyEvent$)
        )
        .subscribe(value => {
          this.router.navigate(['/patches/browser']);
        });
  
  }
  
  ngOnDestroy(): void {
    this.destroyEvent$.next();
    this.destroyEvent$.complete();
    
  }
}
