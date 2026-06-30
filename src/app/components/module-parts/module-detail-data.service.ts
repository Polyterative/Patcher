import { SubManager } from 'src/app/shared-interproject/directives/subscription-manager';
import { Injectable, OnDestroy } from '@angular/core';
import { MatSnackBar } from "@angular/material/snack-bar";
import {
  BehaviorSubject,
  combineLatest,
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
  exhaustMap,
  map,
  switchMap,
  take,
  tap,
  withLatestFrom
} from 'rxjs/operators';
import { RackModuleAdderDialogComponent } from 'src/app/components/rack-parts/rack-module-adder/rack-module-adder-dialog.component';
import { UserManagementService } from '../../features/backbone/login/user-management.service';
import { SupabaseService } from '../../features/backend/supabase.service';
import { MergeModuleResult } from '../../features/backend/supabase-merge';
import {
  DbModule,
  UserModulePossessionKind
} from '../../models/module';
import { PatchMinimal } from '../../models/patch';
import { RackMinimal } from '../../models/rack';
import { ModuleCollectionSummary } from '../../models/module-collection';
import { MatDialog } from "@angular/material/dialog";
import { AppStateService } from "src/app/shared-interproject/app-state.service";
import { Router } from "@angular/router";
import { SharedConstants } from "src/app/shared-interproject/SharedConstants";
import {
  HiddenUsageBucket,
  ModulePossessionCounts,
  ModuleUsageSummary
} from './module-detail-data.models';
import { AnalyticsService } from '../../features/backbone/analytics-integration/analytics.service';
import { environment } from 'src/environments/environment';
import { UserModuleAcquisition, UserModuleAcquisitionDraft } from 'src/app/models/user-module-acquisition';
import { ModulePossessionDialogResult } from './module-possession-dialog/module-possession-dialog.component';
import { formatMarketplaceMinorUnits } from 'src/app/features/marketplace/marketplace-money.utils';
import { ReactionEntityTypes } from 'src/app/features/backend/supabase-reactions';

export type { HiddenUsageBucket, ModulePossessionCounts, ModuleUsageSummary } from './module-detail-data.models';

@Injectable()
export class ModuleDetailDataService extends SubManager implements OnDestroy {
  private readonly collectionsEnabled = environment.features.collectionsEnabled;
  private readonly coolReactionsEnabled = environment.features.coolReactionsEnabled;
  readonly updateSingleModuleData$ = new ReplaySubject<number>();
  readonly singleModuleData$ = new BehaviorSubject<DbModule | null>(null);
  //
  readonly moduleEditingPanelOpenState$ = new BehaviorSubject<boolean>(false);
  readonly moduleEditorHasPendingChanges$ = new BehaviorSubject<boolean>(false);
  readonly userModulesList$: BehaviorSubject<DbModule[]> = new BehaviorSubject<DbModule[]>([]);
  readonly addModuleToCollection$ = new Subject<number>();
  readonly requestAddModuleToRack$ = new Subject<DbModule>();
  readonly removeModuleFromCollection$ = new Subject<number>();
  readonly setModulePossession$ = new Subject<UserModulePossessionKind | ModulePossessionDialogResult | null>();
  readonly currentModulePossession$: Observable<UserModulePossessionKind | null>;
  readonly userModuleAcquisitions$ = new BehaviorSubject<UserModuleAcquisition[] | undefined>(undefined);
  readonly latestFormattedAcquisitionValue$: Observable<string | null>;
  readonly copyModuleNameAndManufacturer$ = new Subject<void>();
  readonly racksWithThisModule$ = new BehaviorSubject<RackMinimal[] | undefined>(undefined);
  readonly patchesWithThisModule$ = new BehaviorSubject<PatchMinimal[] | undefined>(undefined);
  readonly collectionsWithThisModule$ = new BehaviorSubject<ModuleCollectionSummary[] | undefined>(undefined);
  readonly moduleUsageSummary$ = new BehaviorSubject<ModuleUsageSummary | undefined>(undefined);
  readonly possessionCounts$ = new BehaviorSubject<ModulePossessionCounts | undefined>(undefined);
  readonly coolCount$ = new BehaviorSubject<number | undefined>(undefined);
  readonly coolCountUpdate$ = new Subject<number | null>();
  readonly deleteModule$ = new Subject<number>();
  readonly deleteModuleAndOrphanManufacturer$ = new Subject<DbModule>();
  readonly mergeIntoTargetModule$ = new Subject<{ sourceId: number; targetId: number }>();
  readonly moduleMergeResult$ = new Subject<MergeModuleResult>();
  readonly deleteLastPanel$ = new Subject<DbModule>();
  readonly changeModule$ = new Subject<Partial<DbModule>>();
  readonly setStoreUrl$ = new Subject<{ id: number; url: string | null }>();
  readonly requestModuleEditingToggle$ = new Subject<void>();
  readonly isAdmin$ = new BehaviorSubject<boolean>(false);
  
  constructor(
    public dialog: MatDialog,
    private snackBar: MatSnackBar,
    public userService: UserManagementService,
    public backend: SupabaseService,
    public appState: AppStateService,
    public router: Router,
    private analytics: AnalyticsService,
  ) {
    super();
    
    this.backend.auth.hasAdminRole$()
      .pipe(this.takeUntilDestroyed())
      .subscribe(x => this.isAdmin$.next(x));

    // when delete of the latest panel is requested, perform the deletion
    this.deleteLastPanel$
      .pipe(
        switchMap(module => this.requiresAdminOrDev(module)),
        map((x) => x.panels.sort((a, b) => a.id - b.id).pop()!),
        exhaustMap(x => this.backend.delete.modulePanel(x)),
        this.takeUntilDestroyed()
      )
      .subscribe(x => {
        SharedConstants.successCustom(this.snackBar, 'Panel image removed from module.');
        this.analytics.capture('module.panel_deleted', { module_id: this.singleModuleData$.value?.id });
        this.updateSingleModuleData$.next(this.singleModuleData$.value.id);
      });
    
    this.copyModuleNameAndManufacturer$
      .pipe(
        withLatestFrom(this.singleModuleData$),
        this.takeUntilDestroyed()
      )
      .subscribe(([a, b]) => {
        if (b) {
          const text: string = `${ b.name } by ${ b.manufacturer.name }`;
          navigator.clipboard.writeText(text).then(
            () => {
              SharedConstants.successCustom(snackBar, `Copied to clipboard: ${ text }`);
              this.analytics.capture('module.info_copied', { module_id: b?.id });
            },
            () => snackBar.open('Clipboard write failed — copy manually.', undefined, {duration: 3000, panelClass: 'snack-error'})
          );
        }
      });
    
    merge(this.userService.loggedUser$, this.updateSingleModuleData$)
      .pipe(
        switchMap(x => this.userService.loggedUser$),
        switchMap(x => !!x ? this.backend.GET.currentUserModules(false) : of([])),
        this.takeUntilDestroyed()
      )
      .subscribe(x => {
        this.userModulesList$.next(x);
      });

    this.currentModulePossession$ = combineLatest([
      this.userModulesList$,
      this.singleModuleData$
    ]).pipe(
      map(([list, module]) => {
        if (!module) return null;
        const row = list.find(userModule => userModule.id === module.id);
        return row?.possessionKind ?? null;
      })
    );

    this.latestFormattedAcquisitionValue$ = this.userModuleAcquisitions$.pipe(
      map(rows => {
        const latest = rows?.[0];
        if (!latest) return null;
        if (latest.price_amount_minor !== null && latest.currency) {
          return formatMarketplaceMinorUnits(latest.price_amount_minor, latest.currency);
        }
        return `Acquired ${ latest.acquired_at }`;
      })
    );

    this.setModulePossession$
      .pipe(
        withLatestFrom(this.singleModuleData$, this.updateSingleModuleData$),
        exhaustMap(([request, module]) => {
          if (!module) return EMPTY;
          const kind = this.getPossessionRequestKind(request);
          if (kind === null) {
            return this.backend.delete.userModule(module.id).pipe(map(() => ({kind, module})));
          }
          return this.backend.update.userModulePossession(module.id, kind).pipe(
            switchMap(() => {
              const acquisition = this.getMeaningfulAcquisitionDraft(request);
              return acquisition
                ? this.backend.add.userModuleAcquisition(module.id, acquisition)
                  .pipe(
                    map(() => ({kind, module})),
                    catchError(() => {
                      this.snackBar.open('Ownership saved, but purchase history could not be recorded.', undefined, {
                        duration: 5000,
                        panelClass: 'snack-error'
                      });
                      return of({kind, module});
                    })
                  )
                : of({kind, module});
            })
          );
        }),
        withLatestFrom(this.updateSingleModuleData$),
        this.takeUntilDestroyed()
      )
      .subscribe(([{kind, module}, moduleId]) => {
        const state = kind === null ? 'removed' : 'added';
        this.analytics.capture('module.collection_toggled', { module_id: module?.id, state });
        const message = kind === null
          ? `"${module.name}" removed from your collection.`
          : `"${module.name}" marked as ${this.possessionKindLabel(kind)}.`;
        SharedConstants.successCustom(this.snackBar, message);
        this.updateSingleModuleData$.next(moduleId);
      });
    
    // get module data
    this.updateSingleModuleData$
      .pipe(
        tap(x => {
          this.singleModuleData$.next(undefined);
          this.moduleEditorHasPendingChanges$.next(false);
        }),
        switchMap(x => this.backend.GET.moduleWithId(x)),
        this.takeUntilDestroyed()
      )
      .subscribe(x => {
        this.singleModuleData$.next(x.data);
        if (x.data) {
          this.analytics.capture('module.viewed', {
            module_id:       x.data.id,
            manufacturer_id: x.data.manufacturer?.id
          });
        }
      });
    
    // get racks with this module
    this.updateSingleModuleData$
      .pipe(
        tap(x => this.racksWithThisModule$.next(undefined)),
        switchMap(x => this.backend.get.racksWithModule(x).pipe(
          catchError(error => {
            console.error('Racked-in module usage could not be loaded.', error);
            return of({data: []});
          })
        )),
        this.takeUntilDestroyed()
      )
      .subscribe(x => this.racksWithThisModule$.next((x.data ?? []).map(y => y.rack)));
    
    // get patches with this module
    this.updateSingleModuleData$
      .pipe(
        tap(x => this.patchesWithThisModule$.next(undefined)),
        switchMap(x => this.backend.get.patchesWithModule(x).pipe(
          catchError(error => {
            console.error('Patched-in module usage could not be loaded.', error);
            return of([]);
          })
        )),
        this.takeUntilDestroyed()
      )
      .subscribe(x => this.patchesWithThisModule$.next(x));

    this.updateSingleModuleData$
      .pipe(
        tap(() => this.collectionsWithThisModule$.next(undefined)),
        switchMap(x => this.collectionsEnabled ? this.backend.GET.moduleCollectionsForModule(x) : of([])),
        this.takeUntilDestroyed()
      )
      .subscribe(collections => this.collectionsWithThisModule$.next(collections));

    this.updateSingleModuleData$
      .pipe(
        tap(() => this.moduleUsageSummary$.next(undefined)),
        switchMap(x => this.backend.get.moduleUsageSummary(x)),
        this.takeUntilDestroyed()
      )
      .subscribe(summary => this.moduleUsageSummary$.next(summary));

    this.updateSingleModuleData$
      .pipe(
        tap(() => this.possessionCounts$.next(undefined)),
        switchMap(x => this.backend.get.modulePossessionCounts(x)),
        this.takeUntilDestroyed()
      )
      .subscribe(counts => this.possessionCounts$.next(counts));

    this.updateSingleModuleData$
      .pipe(
        tap(() => this.coolCount$.next(undefined)),
        switchMap(x => this.coolReactionsEnabled
          ? this.backend.get.reactionCount(ReactionEntityTypes.MODULE, x)
          : of(0)
        ),
        this.takeUntilDestroyed()
      )
      .subscribe(count => this.coolCount$.next(count));

    this.coolCountUpdate$
      .pipe(
        filter((count): count is number => count !== null),
        this.takeUntilDestroyed()
      )
      .subscribe(count => this.coolCount$.next(count));

    combineLatest([
      this.updateSingleModuleData$,
      this.userService.loggedUser$
    ])
      .pipe(
        tap(() => this.userModuleAcquisitions$.next(undefined)),
        switchMap(([moduleId, user]) => user
          ? this.backend.get.userModuleAcquisitionsForModule(moduleId)
          : of([])
        ),
        this.takeUntilDestroyed()
      )
      .subscribe(rows => this.userModuleAcquisitions$.next(rows));
    
    // hidden cause circular dependency
    // this.updateSingleModuleData$
    //     .pipe(
    //       tap(x => this.modulePatchesList$.next([])),
    //       switchMap(x => this.backend.get.patchWithModule(x)),
    //       this.takeUntilDestroyed()
    //     )
    //     .subscribe(x => this.modulePatchesList$.next(x.data));
    
    this.addModuleToCollection$
      .pipe(
        exhaustMap(x => this.backend.add.userModule(x)),
        withLatestFrom(this.updateSingleModuleData$, this.singleModuleData$),
        this.takeUntilDestroyed()
      )
      .subscribe(([a, b, module]) => {
        this.analytics.capture('module.collection_toggled', { module_id: module?.id, state: 'added' });
        snackBar.open(`"${ module?.name }" added to your collection.`, undefined, {duration: 2000, panelClass: 'snack-success'});
        this.updateSingleModuleData$.next(b);
      });
    
    this.removeModuleFromCollection$
      .pipe(
        exhaustMap(x => this.backend.delete.userModule(x)),
        withLatestFrom(this.updateSingleModuleData$, this.singleModuleData$),
        this.takeUntilDestroyed()
      )
      .subscribe(([a, b, module]) => {
        this.analytics.capture('module.collection_toggled', { module_id: module?.id, state: 'removed' });
        snackBar.open(`"${ module?.name }" removed from your collection.`, undefined, {duration: 2000, panelClass: 'snack-success'});
        this.updateSingleModuleData$.next(b);
      });
    
    this.requestAddModuleToRack$
      .pipe(
        switchMap(x => RackModuleAdderDialogComponent.open(this.dialog, {module: x})
          .afterClosed()),
        withLatestFrom(this.updateSingleModuleData$),
        this.takeUntilDestroyed()
      )
      .subscribe(([a, b]) => {
        this.updateSingleModuleData$.next(b);
      });
    
    this.singleModuleData$.pipe(
      filter(x => !!x),
      switchMap(() => this.userService.loggedUser$),
      this.takeUntilDestroyed()
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
        exhaustMap(([x, module]) => this.backend.delete.module(x).pipe(map(() => module))),
        this.takeUntilDestroyed()
      )
      .subscribe(module => {
        this.analytics.capture('module.deleted', { module_id: module?.id });
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
        exhaustMap(({module, shouldDeleteManufacturer}) => this.backend.delete.module(module.id).pipe(
          switchMap(() => {
            if (!shouldDeleteManufacturer) {
              return of({module, manufacturerDeleted: false});
            }

            return this.backend.delete.manufacturer(module.manufacturerId).pipe(
              map(() => ({module, manufacturerDeleted: true}))
            );
          })
        )),
        this.takeUntilDestroyed()
      )
      .subscribe(({module, manufacturerDeleted}) => {
        this.analytics.capture('module.deleted', { module_id: module?.id, manufacturer_deleted: manufacturerDeleted });
        const successMessage = manufacturerDeleted
          ? `"${ module.name }" and orphan manufacturer "${ module.manufacturer.name }" deleted from the database.`
          : `"${ module.name }" deleted from the database.`;

        snackBar.open(successMessage, undefined, {duration: 2000, panelClass: 'snack-success'});
        this.router.navigate(['/modules', 'browser']);
      });

    this.mergeIntoTargetModule$
      .pipe(
        filter(({sourceId, targetId}) => sourceId > 0 && targetId > 0),
        switchMap(request => this.requiresAdminOrDev(request)),
        exhaustMap(({sourceId, targetId}) => this.backend.merge.moduleInto(sourceId, targetId).pipe(
          catchError(error => {
            this.snackBar.open(error?.message || 'Module merge failed.', undefined, {
              duration: 6000,
              panelClass: 'snack-error'
            });
            return EMPTY;
          })
        )),
        this.takeUntilDestroyed()
      )
      .subscribe(result => {
        this.moduleMergeResult$.next(result);
        this.analytics.capture('module.merged', {
          source_id: result.sourceId,
          target_id: result.targetId,
          duplicate_ownership_rows_removed: result.duplicateOwnershipRowsRemoved,
          duplicate_tag_rows_removed: result.duplicateTagRowsRemoved,
          ownership_rows_moved: result.ownershipRowsMoved,
          tag_rows_moved: result.tagRowsMoved,
          rack_module_rows_moved: result.rackModuleRowsMoved
        });
        this.snackBar.open(this.formatMergeResultMessage(result), undefined, {duration: 5000, panelClass: 'snack-success'});
        this.router.navigate(['/modules', 'details', result.targetId]);
      });
    
    this.changeModule$
      .pipe(
        switchMap(partial => this.requiresAdminOrDev(partial)),
        withLatestFrom(this.singleModuleData$),
        exhaustMap(([partial, original]) => this.backend.update.module({...original, ...partial}).pipe(map(() => ({...original, ...partial})))),
        this.takeUntilDestroyed()
      )
      .subscribe(module => {
        this.analytics.capture('module.metadata_changed', { module_id: module?.id });
        snackBar.open(`"${ module?.name }" updated.`, undefined, {duration: 2000, panelClass: 'snack-success'});
        this.updateSingleModuleData$.next(this.singleModuleData$.value.id);
      });

    this.setStoreUrl$
      .pipe(
        exhaustMap(({id, url}) => this.backend.update.moduleStoreUrl(id, url).pipe(
          catchError(() => EMPTY)
        )),
        this.takeUntilDestroyed()
      )
      .subscribe(() => {
        this.analytics.capture('module.store_url_updated', { module_id: this.singleModuleData$.value?.id });
        this.updateSingleModuleData$.next(this.singleModuleData$.value?.id);
      });
    
    // when user toggles edit mode via the FAB, flip the editing panel state
    this.requestModuleEditingToggle$
      .pipe(
        withLatestFrom(this.moduleEditingPanelOpenState$),
        this.takeUntilDestroyed()
      )
      .subscribe(([_, current]) => {
        if (current) {
          this.moduleEditorHasPendingChanges$.next(false);
        }
        this.moduleEditingPanelOpenState$.next(!current);
      });
    
  }
  
  
  ngOnDestroy(): void {
    super.ngOnDestroy();
  }

  /** Emits `value` only when the current user is an admin or the app is running in dev mode; otherwise completes silently. */
  private requiresAdminOrDev<T>(value: T): Observable<T> {
    return this.backend.auth.hasAdminRole$().pipe(
      take(1),
      switchMap(isAdmin => (this.appState.isDev || isAdmin) ? of(value) : EMPTY)
    );
  }

  private possessionKindLabel(kind: UserModulePossessionKind): string {
    switch (kind) {
      case 'HAS':
        return 'owned';
      case 'WANTS':
        return 'wanted';
      case 'SELLS':
        return 'for sale';
    }
  }

  private getPossessionRequestKind(
    request: UserModulePossessionKind | ModulePossessionDialogResult | null
  ): UserModulePossessionKind | null {
    if (request === null) return null;
    return typeof request === 'object' ? request.kind : request;
  }

  private getMeaningfulAcquisitionDraft(
    request: UserModulePossessionKind | ModulePossessionDialogResult | null
  ): UserModuleAcquisitionDraft | undefined {
    if (typeof request !== 'object' || request?.kind !== 'HAS' || !request.acquisition) {
      return undefined;
    }

    const note = request.acquisition.note?.trim() || null;
    return {...request.acquisition, note};
  }

  private formatMergeResultMessage(result: MergeModuleResult): string {
    return `Merged module ${ result.sourceId } into ${ result.targetId }: moved ${ result.ownershipRowsMoved } ownership, ${ result.tagRowsMoved } tag, ${ result.rackModuleRowsMoved } rack rows; removed ${ result.duplicateOwnershipRowsRemoved } duplicate ownership and ${ result.duplicateTagRowsRemoved } duplicate tag rows.`;
  }
}
