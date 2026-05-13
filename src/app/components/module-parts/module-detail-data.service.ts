import { Injectable, OnDestroy } from '@angular/core';
import { MatSnackBar } from "@angular/material/snack-bar";
import {
  BehaviorSubject,
  delay,
  EMPTY,
  merge,
  Observable,
  of,
  ReplaySubject,
  Subject
} from 'rxjs';
import {
  filter,
  catchError,
  map,
  switchMap,
  take,
  takeUntil,
  tap,
  withLatestFrom
} from 'rxjs/operators';
import { RackModuleAdderDialogComponent } from 'src/app/components/rack-parts/rack-module-adder/rack-module-adder-dialog.component';
import { UserManagementService } from '../../features/backbone/login/user-management.service';
import { SupabaseService } from '../../features/backend/supabase.service';
import { DbModule } from '../../models/module';
import { PatchMinimal } from '../../models/patch';
import { RackMinimal } from '../../models/rack';
import { MatDialog } from "@angular/material/dialog";
import { AppStateService } from "src/app/shared-interproject/app-state.service";
import { Router } from "@angular/router";
import { SharedConstants } from "src/app/shared-interproject/SharedConstants";
import {
  HiddenUsageBucket,
  ModuleUsageSummary
} from './module-detail-data.models';

export type { HiddenUsageBucket, ModuleUsageSummary } from './module-detail-data.models';


@Injectable()
export class ModuleDetailDataService implements OnDestroy {
  readonly updateSingleModuleData$ = new ReplaySubject<number>();
  readonly singleModuleData$ = new BehaviorSubject<DbModule | null>(null);
  //
  readonly moduleEditingPanelOpenState$ = new BehaviorSubject<boolean>(false);
  readonly moduleEditorHasPendingChanges$ = new BehaviorSubject<boolean>(false);
  readonly userModulesList$: BehaviorSubject<DbModule[]> = new BehaviorSubject<DbModule[]>([]);
  // modulePatchesList$: BehaviorSubject<Patch[]> = new BehaviorSubject<Patch[]>([]);
  readonly addModuleToCollection$ = new Subject<number>();
  readonly requestAddModuleToRack$ = new Subject<DbModule>();
  readonly removeModuleFromCollection$ = new Subject<number>();
  readonly copyModuleNameAndManufacturer$ = new Subject<void>();
  //
  readonly racksWithThisModule$ = new BehaviorSubject<RackMinimal[] | undefined>(undefined);
  readonly patchesWithThisModule$ = new BehaviorSubject<PatchMinimal[] | undefined>(undefined);
  readonly moduleUsageSummary$ = new BehaviorSubject<ModuleUsageSummary | undefined>(undefined);
  readonly modulesBySameManufacturer$ = new BehaviorSubject<DbModule[] | undefined>(undefined);
  //
  readonly deleteModule$ = new Subject<number>();
  readonly deleteModuleAndOrphanManufacturer$ = new Subject<DbModule>();
  readonly deleteLastPanel$ = new Subject<DbModule>();
  readonly changeModule$ = new Subject<Partial<DbModule>>();
  readonly setStoreUrl$ = new Subject<{ id: number; url: string | null }>();
  /** Toggle the module editing panel open/closed through the service layer. */
  readonly requestModuleEditingToggle$ = new Subject<void>();
  readonly isAdmin$ = new BehaviorSubject<boolean>(false);
  protected readonly destroyEvent$ = new Subject<void>();
  
  constructor(
    public dialog: MatDialog,
    private snackBar: MatSnackBar,
    public userService: UserManagementService,
    public backend: SupabaseService,
    public appState: AppStateService,
    public router: Router,
  
  ) {
    
    this.backend.auth.hasAdminRole$()
      .pipe(takeUntil(this.destroyEvent$))
      .subscribe(x => this.isAdmin$.next(x));

    // when delete of the latest panel is requested, perform the deletion
    this.deleteLastPanel$
      .pipe(
        switchMap(module => this.requiresAdminOrDev(module)),
        map((x) => x.panels.sort((a, b) => a.id - b.id).pop()!),
        switchMap(x => this.backend.delete.modulePanel(x)),
        takeUntil(this.destroyEvent$)
      )
      .subscribe(x => {
        SharedConstants.successCustom(this.snackBar, 'Panel image removed from module.');
        
        this.updateSingleModuleData$.next(this.singleModuleData$.value.id);
      });
    
    this.copyModuleNameAndManufacturer$
      .pipe(
        withLatestFrom(this.singleModuleData$),
        takeUntil(this.destroyEvent$)
      )
      .subscribe(([a, b]) => {
        if (b) {
          const text: string = `${ b.name } by ${ b.manufacturer.name }`;
          navigator.clipboard.writeText(text);
          SharedConstants.successCustom(snackBar, `Copied to clipboard: ${ text }`);
        }
      });
    
    merge(this.userService.loggedUser$, this.updateSingleModuleData$)
      .pipe(
        switchMap(x => this.userService.loggedUser$),
        switchMap(x => !!x ? this.backend.GET.currentUserModules(false) : of([])),
        takeUntil(this.destroyEvent$)
      )
      .subscribe(x => {
        this.userModulesList$.next(x);
      });
    
    // get module data
    this.updateSingleModuleData$
      .pipe(
        tap(x => {
          this.singleModuleData$.next(undefined);
          this.moduleEditorHasPendingChanges$.next(false);
        }),
        switchMap(x => this.backend.GET.moduleWithId(x)),
        takeUntil(this.destroyEvent$)
      )
      .subscribe(x => this.singleModuleData$.next(x.data));
    
    // get racks with this module
    this.updateSingleModuleData$
      .pipe(
        tap(x => this.racksWithThisModule$.next(undefined)),
        delay(150),
        switchMap(x => this.backend.get.racksWithModule(x)),
        takeUntil(this.destroyEvent$)
      )
      .subscribe(x => this.racksWithThisModule$.next((x.data ?? []).map(y => y.rack)));
    
    // get patches with this module
    this.updateSingleModuleData$
      .pipe(
        tap(x => this.patchesWithThisModule$.next(undefined)),
        delay(200),
        switchMap(x => this.backend.get.patchesWithModule(x)),
        takeUntil(this.destroyEvent$)
      )
      .subscribe(x => this.patchesWithThisModule$.next(x));

    this.updateSingleModuleData$
      .pipe(
        tap(() => this.moduleUsageSummary$.next(undefined)),
        delay(175),
        switchMap(x => this.backend.get.moduleUsageSummary(x)),
        takeUntil(this.destroyEvent$)
      )
      .subscribe(summary => this.moduleUsageSummary$.next(summary));
    
    // get modules by same manufacturer
    this.singleModuleData$
      .pipe(
        filter(x => !!x && !!x.manufacturer),
        tap(x => this.modulesBySameManufacturer$.next(undefined)),
        delay(250),
        switchMap(singleModuleData => this.backend.get.modulesBySameManufacturer(singleModuleData.manufacturerId)
          .pipe(
            map(x => x.filter(module => module.id !== singleModuleData.id))
          )
        ),
        takeUntil(this.destroyEvent$)
      )
      .subscribe(x => this.modulesBySameManufacturer$.next(x));
    
    // hidden cause circular dependency
    // this.updateSingleModuleData$
    //     .pipe(
    //       tap(x => this.modulePatchesList$.next([])),
    //       switchMap(x => this.backend.get.patchWithModule(x)),
    //       takeUntil(this.destroyEvent$)
    //     )
    //     .subscribe(x => this.modulePatchesList$.next(x.data));
    
    this.addModuleToCollection$
      .pipe(
        switchMap(x => this.backend.add.userModule(x)),
        withLatestFrom(this.updateSingleModuleData$, this.singleModuleData$),
        takeUntil(this.destroyEvent$)
      )
      .subscribe(([a, b, module]) => {
        snackBar.open(`"${ module?.name }" added to your collection.`, undefined, {duration: 2000, panelClass: 'snack-success'});
        this.updateSingleModuleData$.next(b);
      });
    
    this.removeModuleFromCollection$
      .pipe(
        switchMap(x => this.backend.delete.userModule(x)),
        withLatestFrom(this.updateSingleModuleData$, this.singleModuleData$),
        takeUntil(this.destroyEvent$)
      )
      .subscribe(([a, b, module]) => {
        snackBar.open(`"${ module?.name }" removed from your collection.`, undefined, {duration: 2000, panelClass: 'snack-success'});
        this.updateSingleModuleData$.next(b);
      });
    
    this.requestAddModuleToRack$
      .pipe(
        switchMap(x => RackModuleAdderDialogComponent.open(this.dialog, {module: x})
          .afterClosed()),
        withLatestFrom(this.updateSingleModuleData$),
        takeUntil(this.destroyEvent$)
      )
      .subscribe(([a, b]) => {
        this.updateSingleModuleData$.next(b);
      });
    
    this.singleModuleData$.pipe(
      filter(x => !!x),
      switchMap(() => this.userService.loggedUser$),
      takeUntil(this.destroyEvent$)
    )
      .subscribe(user => {
        if (user) {
          this.moduleEditingPanelOpenState$.next(false);
        }
      });
    
    this.deleteModule$
      .pipe(
        filter(x => x > 0),
        switchMap(id => this.requiresAdminOrDev(id)),
        withLatestFrom(this.singleModuleData$),
        switchMap(([x, module]) => this.backend.delete.module(x).pipe(map(() => module))),
        takeUntil(this.destroyEvent$)
      )
      .subscribe(module => {
        snackBar.open(`"${ module?.name }" deleted from the database.`, undefined, {duration: 2000, panelClass: 'snack-success'});
        this.router.navigate(['/modules', 'browser']);
      });

    this.deleteModuleAndOrphanManufacturer$
      .pipe(
        filter(module => !!module?.id),
        switchMap(module => this.requiresAdminOrDev(module)),
        switchMap(module => this.backend.get.modulesBySameManufacturer(module.manufacturerId, 0, 20, 'id,manufacturerId').pipe(
          map(modules => ({
            module,
            shouldDeleteManufacturer: module.manufacturerId != null
              && modules.every(relatedModule => relatedModule.id === module.id)
          }))
        )),
        switchMap(({module, shouldDeleteManufacturer}) => this.backend.delete.module(module.id).pipe(
          switchMap(() => {
            if (!shouldDeleteManufacturer) {
              return of({module, manufacturerDeleted: false});
            }

            return this.backend.delete.manufacturer(module.manufacturerId).pipe(
              map(() => ({module, manufacturerDeleted: true}))
            );
          })
        )),
        takeUntil(this.destroyEvent$)
      )
      .subscribe(({module, manufacturerDeleted}) => {
        const successMessage = manufacturerDeleted
          ? `"${ module.name }" and orphan manufacturer "${ module.manufacturer.name }" deleted from the database.`
          : `"${ module.name }" deleted from the database.`;

        snackBar.open(successMessage, undefined, {duration: 2000, panelClass: 'snack-success'});
        this.router.navigate(['/modules', 'browser']);
      });
    
    this.changeModule$
      .pipe(
        switchMap(partial => this.requiresAdminOrDev(partial)),
        withLatestFrom(this.singleModuleData$),
        switchMap(([partial, original]) => this.backend.update.module({...original, ...partial}).pipe(map(() => ({...original, ...partial})))),
        takeUntil(this.destroyEvent$)
      )
      .subscribe(module => {
        snackBar.open(`"${ module?.name }" updated.`, undefined, {duration: 2000, panelClass: 'snack-success'});
        this.updateSingleModuleData$.next(this.singleModuleData$.value.id);
      });

    this.setStoreUrl$
      .pipe(
        switchMap(({id, url}) => this.backend.update.moduleStoreUrl(id, url).pipe(
          catchError(() => EMPTY)
        )),
        takeUntil(this.destroyEvent$)
      )
      .subscribe(() => {
        this.updateSingleModuleData$.next(this.singleModuleData$.value?.id);
      });
    
    // when user toggles edit mode via the FAB, flip the editing panel state
    this.requestModuleEditingToggle$
      .pipe(
        withLatestFrom(this.moduleEditingPanelOpenState$),
        takeUntil(this.destroyEvent$)
      )
      .subscribe(([_, current]) => {
        if (current) {
          this.moduleEditorHasPendingChanges$.next(false);
        }
        this.moduleEditingPanelOpenState$.next(!current);
      });
    
  }
  
  
  ngOnDestroy(): void {
    this.destroyEvent$.next();
    this.destroyEvent$.complete();
  }

  /** Emits `value` only when the current user is an admin or the app is running in dev mode; otherwise completes silently. */
  private requiresAdminOrDev<T>(value: T): Observable<T> {
    return this.backend.auth.hasAdminRole$().pipe(
      take(1),
      switchMap(isAdmin => (this.appState.isDev || isAdmin) ? of(value) : EMPTY)
    );
  }
}
