import {
  Injectable,
  OnDestroy
} from '@angular/core';
import {
  UntypedFormControl,
  Validators
} from '@angular/forms';
import { MatDialog } from "@angular/material/dialog";
import { MatSnackBar } from "@angular/material/snack-bar";
import { Router } from '@angular/router';
import {
  BehaviorSubject,
  combineLatest,
  EMPTY,
  forkJoin,
  merge,
  Observable,
  of,
  ReplaySubject,
  Subject
} from 'rxjs';
import {
  catchError,
  concatMap,
  debounceTime,
  distinctUntilChanged,
  filter,
  map,
  pairwise,
  scan,
  switchMap,
  take,
  takeUntil,
  tap,
  withLatestFrom
} from 'rxjs/operators';
import {
  findAndApplyOptionForId,
  getCleanedValueId,
  ISelectable
} from 'src/app/shared-interproject/components/@smart/mat-form-entity/form-element-models';
import { Rack } from '../../models/rack';
import {
  ConfirmDialogComponent,
  ConfirmDialogDataInModel,
  ConfirmDialogDataOutModel
} from 'src/app/shared-interproject/dialogs/confirm-dialog/confirm-dialog.component';
import { UserManagementService } from '../../features/backbone/login/user-management.service';
import { SupabaseService } from '../../features/backend/supabase.service';
import {
  PatchConnection,
  PatchModuleInstance
} from '../../models/connection';
import { CVConnectionEntity } from '../../models/cv';
import { Patch } from '../../models/patch';
import {
  DbModule,
  MinimalModule
} from '../../models/module';
import { SharedConstants } from "src/app/shared-interproject/SharedConstants";
import { SelectionPanelBridgeService } from './selection-panel-bridge.service';
import {
  isLinkedRackSchemaMissingError,
  LINKED_RACK_PENDING_ENVIRONMENT_MESSAGE
} from './linked-rack-rollout';


/** Maximum number of instances (copies) allowed per module in a single patch. */
export const MAX_INSTANCES_PER_MODULE = 20;

/** Summary entry for modules that have 2+ instances in a patch. */
export interface MultiInstanceModuleSummary {
  moduleId: number;
  moduleName: string;
  manufacturerName: string;
  instanceCount: number;
  labels: string[];
}

export interface LinkedRackUiState {
  kind: 'unlinked' | 'linked' | 'unavailable';
  statusLabel: string;
  description: string;
  rackName?: string;
  rackId?: number | null;
}

const defaultLinkedRackUiState: LinkedRackUiState = {
  kind: 'unlinked',
  statusLabel: 'In collection only',
  description: 'No rack is linked to this patch yet. You can choose one for orientation without changing collection-first editing.',
  rackId: null
};


@Injectable()
export class PatchDetailDataService implements OnDestroy {
  private usePublicDetailReads = false;
  updateSinglePatchData$ = new ReplaySubject<number>();
  singlePatchData$ = new BehaviorSubject<Patch | undefined>(undefined);
  //
  patchEditingPanelOpenState$ = new BehaviorSubject<boolean>(false);
  patchConnections$: BehaviorSubject<PatchConnection[] | null> = new BehaviorSubject<PatchConnection[]>(null);
  editorConnections$: BehaviorSubject<PatchConnection[] | null> = new BehaviorSubject<PatchConnection[]>(null);
  removePatchFromCollection$ = new Subject<number>();
  //
  formData = {
    name: {
      control: new UntypedFormControl('', Validators.compose([
        Validators.required,
        Validators.min(3),
        Validators.maxLength(144)
      ]))
    },
    description: {
      control: new UntypedFormControl('', Validators.compose([
        Validators.min(0),
        Validators.maxLength(144)
      ]))
    },
    linkedRack: {
      control: new UntypedFormControl('')
    }
  };
  //
  clickOnModuleCV$ = new Subject<CVConnectionEntity>();
  resetSelectedForConnection$ = new Subject<void>();
  selectedForConnection$ = new BehaviorSubject<{
    a: CVConnectionEntity | null,
    b: CVConnectionEntity | null
  }>({
    a: null,
    b: null
  });
  confirmSelectedConnection$ = new Subject<void>();
  removeConnectionFromEditor$ = new Subject<PatchConnection>();
  readonly deletePatch$ = new Subject<number>();
  /** Serializes connection writes to the backend (mirrors rack's requestRackedModulesDbSync$). */
  readonly requestConnectionDbSync$ = new Subject<void>();
  /** Targeted single-row note sync — emits the full PatchConnection whose notes changed. */
  readonly requestNoteSync$ = new Subject<PatchConnection>();
  //
  // Module instances
  patchModuleInstances$ = new BehaviorSubject<PatchModuleInstance[]>([]);
  addModuleInstance$ = new Subject<MinimalModule>();
  removeModuleInstance$ = new Subject<PatchModuleInstance>();
  /** User's collection modules — set by PatchEditorComponent on init */
  collectionModules$ = new BehaviorSubject<DbModule[]>([]);
  //
  isCurrentPatchPrivate$ = new BehaviorSubject<boolean>(false);
  patchDetailUnavailableMessage$ = new BehaviorSubject<string | null>(null);
  requestPatchPrivacyStatusChange$ = new Subject<void>();
  /** Toggle the patch editing panel open/closed through the service layer. */
  requestPatchEditingToggle$ = new Subject<void>();
  /**
   * Map from instance ID → display label (e.g. "(1)", "(2)").
   * Only contains entries for modules that have 2+ instances.
   * Used by read-only connection list to show which copy a connection belongs to.
   */
  instanceLabelMap$ = new BehaviorSubject<Map<number, string>>(new Map());
  /**
   * Summary of modules with 2+ instances. Emits [] when no multi-instance modules exist.
   * Derived from patchModuleInstances$ + patchConnections$ (for module names).
   */
  multiInstanceSummary$ = new BehaviorSubject<MultiInstanceModuleSummary[]>([]);
  //
  protected destroyEvent$ = new Subject<void>();
  shouldShowPanelImages$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(true);
  readonly patchTags$ = new BehaviorSubject<string[]>([]);
  readonly currentUserRacks$ = new BehaviorSubject<Rack[]>([]);
  readonly linkedRackOptions$ = new BehaviorSubject<ISelectable[]>([]);
  readonly linkedRackState$ = new BehaviorSubject<LinkedRackUiState>(defaultLinkedRackUiState);
  readonly linkedRackPersistenceBlocked$ = new BehaviorSubject<boolean>(false);
  readonly linkedRackPersistenceHint$ = new BehaviorSubject<string | null>(null);
  readonly requestLinkedRackChange$ = new Subject<number | null>();
  private readonly _tagsUpdate$ = new Subject<string[]>();
  
  constructor(
    private router: Router,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    public userService: UserManagementService,
    public backend: SupabaseService,
    private bridge: SelectionPanelBridgeService
  ) {
    
    this.updateSinglePatchData$
      .pipe(
        tap(_ => this.patchConnections$.next(null)),
        tap(_ => this.editorConnections$.next(null)),
        tap(() => this.patchModuleInstances$.next([])),
        tap(() => this.singlePatchData$.next(undefined)),
        tap(() => this.patchDetailUnavailableMessage$.next(null)),
        tap(() => this.backend.cacheResetter$.next(['patchModuleInstances'])),
        switchMap(x => this.usePublicDetailReads
          ? this.backend.GET.publicPatchWithId(x)
          : this.backend.get.patchWithId(x)
        ),
        catchError(() => of({data: undefined, error: null})),
        takeUntil(this.destroyEvent$)
      )
      .subscribe(x => {
        const patch = x?.data ?? undefined;
        this.singlePatchData$.next(patch);
        if (!patch) {
          this.patchDetailUnavailableMessage$.next(this.buildUnavailableMessage());
        }
      });
    
    // when updated patch data is received, update privacy status observable
    this.singlePatchData$
      .pipe(
        filter(x => !!x),
        takeUntil(this.destroyEvent$)
      )
      .subscribe(x => this.isCurrentPatchPrivate$.next(!x.public));
    
    this.removePatchFromCollection$
      .pipe(
        switchMap(x => this.backend.delete.userPatch(x)),
        withLatestFrom(this.updateSinglePatchData$),
        takeUntil(this.destroyEvent$)
      )
      .subscribe(([_a, b]) => {
        const patchName = this.singlePatchData$.value?.name;
        snackBar.open(`"${ patchName }" removed from your library.`, undefined, {duration: 2000, panelClass: 'snack-success'});
        this.updateSinglePatchData$.next(b);
      });
    
    // when user requests to change privacy status of patch, update local state and backend
    this.requestPatchPrivacyStatusChange$
      .pipe(
        withLatestFrom(this.singlePatchData$),
        map(([_, patch]) => {
          patch.public = !patch.public;
          this.isCurrentPatchPrivate$.next(!patch.public);
          return {...patch}; // clone so backend.update.patch can't mutate the live object
        }),
        switchMap(patch => this.backend.update.patch(patch).pipe(
          tap(() => {
            const msg = patch.public
              ? `"${ patch.name }" is now public — visible to everyone.`
              : `"${ patch.name }" is now private — only you can see it.`;
            SharedConstants.successCustom(this.snackBar, msg);
          })
        )),
        takeUntil(this.destroyEvent$),
      )
      .subscribe();
    
    // when user toggles edit mode via the FAB, flip the editing panel state
    this.requestPatchEditingToggle$
      .pipe(
        withLatestFrom(this.patchEditingPanelOpenState$),
        takeUntil(this.destroyEvent$)
      )
      .subscribe(([_, current]) => this.patchEditingPanelOpenState$.next(!current));
    
    this.formData.name.control.valueChanges
      .pipe(
        filter(_ => !!this.singlePatchData$.value),
        filter(_ => this.formData.name.control.valid),
        takeUntil(this.destroyEvent$)
      )
      .subscribe(input => this.singlePatchData$.value.name = input);
    //
    this.formData.description.control.valueChanges
      .pipe(
        filter(_ => !!this.singlePatchData$.value),
        filter(_ => this.formData.description.control.valid),
        filter(_ => !!this.formData.description.control.value || this.formData.description.control.value === ''),
        takeUntil(this.destroyEvent$)
      )
      .subscribe(input => this.singlePatchData$.value.description = input);
    
    // Auto-save patch metadata (name/description) with debounce
    merge(
      this.formData.name.control.valueChanges,
      this.formData.description.control.valueChanges
    ).pipe(
      debounceTime(800),
      distinctUntilChanged(),
      withLatestFrom(this.singlePatchData$),
      filter(([_, patch]) => !!patch),
      filter(() => this.formData.name.control.valid && this.formData.description.control.valid),
      switchMap(([_, patch]) =>
        this.backend.update.patchSilent({...patch}).pipe(
          catchError(err => {
            console.error('Failed to auto-save patch metadata:', err);
            SharedConstants.errorCustom(this.snackBar, 'Failed to save — check your connection and try again.');
            return EMPTY;
          })
        )
      ),
      takeUntil(this.destroyEvent$)
    ).subscribe();
    
    this.singlePatchData$
      .pipe(
        filter(_ => !!this.singlePatchData$.value),
        takeUntil(this.destroyEvent$)
      )
      .subscribe(data => {
        this.formData.name.control.reset(data.name, {emitEvent: false});
        this.formData.description.control.reset(data.description ?? '', {emitEvent: false});
        this.patchTags$.next(data.tags ?? []);
      });

    combineLatest([
      this.singlePatchData$,
      this.backend.auth.getUserSession$()
    ])
      .pipe(
        switchMap(([patch, user]) => patch && user && patch.author?.id === user.id
          ? this.backend.get.currentUserRacks()
          : of([])
        ),
        takeUntil(this.destroyEvent$)
      )
      .subscribe(racks => this.currentUserRacks$.next(racks));

    this.currentUserRacks$
      .pipe(takeUntil(this.destroyEvent$))
      .subscribe(racks => {
        this.linkedRackOptions$.next(
          racks.map(rack => ({
            id: `${ rack.id }`,
            name: rack.name || `Rack #${ rack.id }`
          }))
        );
        this.syncLinkedRackControl(this.singlePatchData$.value, racks);
      });

    this.singlePatchData$
      .pipe(takeUntil(this.destroyEvent$))
      .subscribe(patch => {
        this.linkedRackState$.next(this.buildLinkedRackUiState(patch, this.currentUserRacks$.value));
        this.syncLinkedRackControl(patch, this.currentUserRacks$.value);
      });

    this.formData.linkedRack.control.valueChanges
      .pipe(takeUntil(this.destroyEvent$))
      .subscribe(() => this.requestLinkedRackChange$.next(this.getSelectedLinkedRackId()));

    this.requestLinkedRackChange$
      .pipe(
        withLatestFrom(this.singlePatchData$),
        filter(([_, patch]) => !!patch),
        filter(([linkedRackId, patch]) => (patch?.linked_rack_id ?? null) !== linkedRackId),
        switchMap(([linkedRackId, patch]) => {
          const nextPatch: Patch = {
            ...patch!,
            linked_rack_id: linkedRackId
          };
          return this.backend.update.patchSilent(nextPatch).pipe(
            tap(() => {
              this.setLinkedRackPersistenceBlocked(false, null);
              if (this.singlePatchData$.value) {
                this.singlePatchData$.value.linked_rack_id = linkedRackId;
                this.linkedRackState$.next(this.buildLinkedRackUiState(this.singlePatchData$.value, this.currentUserRacks$.value));
                this.syncLinkedRackControl(this.singlePatchData$.value, this.currentUserRacks$.value);
              }
              const message = linkedRackId == null
                ? 'Linked rack cleared.'
                : 'Linked rack updated.';
              SharedConstants.successCustom(this.snackBar, message);
            }),
            catchError(err => {
              this.syncLinkedRackControl(patch!, this.currentUserRacks$.value);
              if (isLinkedRackSchemaMissingError(err)) {
                this.setLinkedRackPersistenceBlocked(true, LINKED_RACK_PENDING_ENVIRONMENT_MESSAGE);
                SharedConstants.errorCustom(this.snackBar, 'Linked rack saving is not available yet in this environment.');
              } else {
                SharedConstants.errorCustom(this.snackBar, 'Failed to save linked rack — check your connection and try again.');
              }
              console.error('Failed to save linked rack:', err);
              return EMPTY;
            })
          );
        }),
        takeUntil(this.destroyEvent$)
      )
      .subscribe();
    
    this.singlePatchData$
      .pipe(
        filter(x => !!x),
        switchMap(x => this.backend.GET.patchConnections(x.id)),
        // Normalize DB nulls → undefined to match the model's optional fields.
        // DB returns `null` for missing instance_id_a/b; our model uses `?:` (undefined).
        // Without this, `===` comparisons (duplicate detection, scrub, etc.) would break.
        map((connections: PatchConnection[]) => connections?.map(c => ({
          ...c,
          instance_id_a: c.instance_id_a ?? undefined,
          instance_id_b: c.instance_id_b ?? undefined
        }))),
        takeUntil(this.destroyEvent$)
      )
      .subscribe(data => this.patchConnections$.next(data));
    
    // if patch is owned by logged-in user, open editing panel on patch load
    this.singlePatchData$
      .pipe(
        filter(x => !!x),
        // check if patch is owned by logged-in user
        withLatestFrom(this.backend.auth.getUserSession$()),
        filter(([patch, user]) => !!patch && !!user && patch.author.id === user.id),
        // check data integrity and if ids exist
        filter(([patch, user]) => !!patch && !!patch.id && user && !!user.id),
        take(1),
        takeUntil(this.destroyEvent$)
      )
      .subscribe(([patch, user]) => {
        // open editing panel only if patch is owned by logged-in user
        this.patchEditingPanelOpenState$.next(
          patch.author.id === user.id
        );
        
      });
    
    this.patchEditingPanelOpenState$
      .pipe(
        filter(x => !x),
        takeUntil(this.destroyEvent$)
      )
      .subscribe(_ => this.resetSelectedForConnection$.next());
    
    // when editing panel closes (was open -> closed), trigger patch refresh
    this.patchEditingPanelOpenState$
      .pipe(
        pairwise(),
        filter(x => x[0] === true && x[1] === false),
        filter(() => !!this.singlePatchData$.value),
        takeUntil(this.destroyEvent$)
      )
      .subscribe(() => this.updateSinglePatchData$.next(this.singlePatchData$.value.id));
    
    merge(
      this.clickOnModuleCV$.pipe(map(cv => ({type: 'cv', cv} as any))),
      this.resetSelectedForConnection$.pipe(map(() => ({type: 'reset'} as any))),
      this.bridge.resetA$.pipe(map(() => ({type: 'resetA'} as any))),
      this.bridge.resetB$.pipe(map(() => ({type: 'resetB'} as any)))
    )
      .pipe(
        scan((state: {
          a: CVConnectionEntity | null;
          b: CVConnectionEntity | null
        }, ev: any) => {
          let next = {...state};
          switch (ev.type) {
            case 'reset':
              next = {a: null, b: null};
              break;
            case 'resetA':
              next = {a: null, b: state.b};
              break;
            case 'resetB':
              next = {a: state.a, b: null};
              break;
            case 'cv':
              const x: CVConnectionEntity = ev.cv;
              if (x.kind === 'in') {
                next = {a: state.a, b: x};
              } else {
                next = {a: x, b: state.b};
              }
              break;
            default:
            // noop
          }
          return next;
        }, {a: null, b: null} as {
          a: CVConnectionEntity | null;
          b: CVConnectionEntity | null
        }),
        takeUntil(this.destroyEvent$)
      )
      .subscribe((state) => {
        this.selectedForConnection$.next(state);
      });
    
    this.confirmSelectedConnection$
      .pipe(
        withLatestFrom(this.editorConnections$),
        takeUntil(this.destroyEvent$)
      )
      .subscribe(([_, patchConnections]) => {
        patchConnections = patchConnections || [];
        const selectedForConnection: {
          a: CVConnectionEntity | null;
          b: CVConnectionEntity | null
        } = this.selectedForConnection$.value;
        const patch: Patch = this.singlePatchData$.value;
        if (!selectedForConnection.a || !selectedForConnection.b || !patch) { return; }
        const newConnection: PatchConnection = {
          a: selectedForConnection.a.cv,
          b: selectedForConnection.b.cv,
          patch,
          instance_id_a: selectedForConnection.a.cv.instance_id,
          instance_id_b: selectedForConnection.b.cv.instance_id
        };
        const isAlreadyInList: boolean = !!patchConnections.find(connection =>
          connection.a.id === newConnection.a.id
          && connection.b.id === newConnection.b.id
          && connection.instance_id_a === newConnection.instance_id_a
          && connection.instance_id_b === newConnection.instance_id_b
        );
        if (!isAlreadyInList) {
          const nextList = [
            ...patchConnections,
            newConnection
          ];
          this.editorConnections$.next(nextList);
          this.bridge.editorConnections$.next(nextList);
          this.requestConnectionDbSync$.next();
          SharedConstants.successCustom(this.snackBar, `${ newConnection.a.module.name } "${ newConnection.a.name }" → ${ newConnection.b.module.name } "${ newConnection.b.name }" recorded.`);
          
          // notify outlet of confirmation: emit a record event. Keep the current selection so user can tweak one side.
          this.bridge.record$.next();
          
        } else {
          SharedConstants.errorCustom(this.snackBar, `${ newConnection.a.module.name } "${ newConnection.a.name }" → ${ newConnection.b.module.name } "${ newConnection.b.name }" is already in this patch.`);
        }
      });
    
    this.patchConnections$
      .pipe(takeUntil(this.destroyEvent$))
      .subscribe(x => {
        this.editorConnections$.next(x);
        this.bridge.editorConnections$.next(x);
      });
    
    this.removeConnectionFromEditor$
      .pipe(
        withLatestFrom(this.editorConnections$),
        takeUntil(this.destroyEvent$)
      )
      .subscribe(([x, data]) => {
        const next = data.filter(
          connection => !(connection.a.id === x.a.id && connection.b.id === x.b.id
            && connection.instance_id_a === x.instance_id_a
            && connection.instance_id_b === x.instance_id_b))
        ;
        this.editorConnections$.next(next);
        this.bridge.editorConnections$.next(next);
        this.requestConnectionDbSync$.next();
      });
    
    // Auto-save connections: serialize writes with concatMap to prevent race conditions
    this.requestConnectionDbSync$
      .pipe(
        withLatestFrom(this.editorConnections$, this.singlePatchData$),
        concatMap(([_, connections, patch]) => {
          if (!patch) { return of(null); }
          if (connections === null) { return of(null); }
          if (connections.length === 0) {
            return this.backend.delete.patchConnectionsForPatch(patch.id).pipe(
              catchError(err => {
                console.error('Failed to save connections:', err);
                SharedConstants.errorCustom(this.snackBar, 'Failed to save — check your connection and try again.');
                return EMPTY;
              })
            );
          }
          return this.backend.update.patchConnectionsSilent(connections).pipe(
            catchError(err => {
              console.error('Failed to save connections:', err);
              SharedConstants.errorCustom(this.snackBar, 'Failed to save — check your connection and try again.');
              return EMPTY;
            })
          );
        }),
        takeUntil(this.destroyEvent$)
      )
      .subscribe();
    
    // Targeted note auto-save: switchMap is correct (last value wins, idempotent write)
    this.requestNoteSync$
      .pipe(
        switchMap(conn =>
          this.backend.update.patchConnectionNoteSilent(conn).pipe(
            catchError(_ => {
              SharedConstants.errorCustom(this.snackBar, 'Failed to save note — check your connection.');
              return EMPTY;
            })
          )
        ),
        takeUntil(this.destroyEvent$)
      )
      .subscribe();
    
    this.deletePatch$
      .pipe(
        switchMap(_ => {
          const data: ConfirmDialogDataInModel = {
            title: 'Delete this patch?',
            description: 'This action cannot be undone. All connections associated with this patch will also be deleted.',
            positive: {
              label: 'Delete',
              theme: 'warning'
            }
          };
          return this.dialog.open(
            ConfirmDialogComponent,
            {
              data,
              disableClose: false,
              width: '32rem'
            }
          )
            .afterClosed()
            .pipe(
              tap((x: ConfirmDialogDataOutModel) => {
                if (!x?.answer) SharedConstants.infoCustom(this.snackBar, 'No changes made.');
              }),
              filter((x: ConfirmDialogDataOutModel) => !!x?.answer));
        }),
        withLatestFrom(this.deletePatch$),
        switchMap(([_z, x]) => this.backend.delete.patchConnectionsForPatch(x)
          .pipe(map(() => x))),
        switchMap((x) => this.backend.delete.patchModuleInstancesForPatch(x)
          .pipe(map(() => x))),
        switchMap((x) => this.backend.delete.patch(x)),
        takeUntil(this.destroyEvent$)
      )
      .subscribe(_ => {
        this.router.navigate(['/user/area']);
      });
    
    // -- Module instances --
    
    // Load instances when patch data arrives
    this.singlePatchData$
      .pipe(
        filter(x => !!x),
        switchMap(patch => this.backend.GET.patchModuleInstances(patch.id)),
        takeUntil(this.destroyEvent$)
      )
      .subscribe(instances => this.patchModuleInstances$.next(instances));
    
    // Build instance-label lookup map whenever instances change.
    // Only includes labels for modules with 2+ instances.
    this.patchModuleInstances$
      .pipe(
        map(instances => {
          const labelMap = new Map<number, string>();
          const byModule = this.groupInstancesByModuleId(instances);
          for (const [, moduleInstances] of byModule) {
            if (moduleInstances.length >= 2) {
              moduleInstances.forEach((inst, idx) => {
                labelMap.set(inst.id, inst.instance_label || `(${ idx + 1 })`);
              });
            }
          }
          return labelMap;
        }),
        takeUntil(this.destroyEvent$)
      )
      .subscribe(labelMap => this.instanceLabelMap$.next(labelMap));
    
    // Build multi-instance summary for read-only display.
    this.patchModuleInstances$
      .pipe(
        map(instances => {
          if (!instances.length) { return []; }
          const byModule = this.groupInstancesByModuleId(instances);
          const summary: MultiInstanceModuleSummary[] = [];
          for (const [moduleId, moduleInstances] of byModule) {
            if (moduleInstances.length >= 2) {
              const firstWithModule = moduleInstances.find(i => i.module?.name);
              summary.push({
                moduleId,
                moduleName: firstWithModule?.module?.name ?? `Module #${ moduleId }`,
                manufacturerName: firstWithModule?.module?.manufacturer?.name ?? '',
                instanceCount: moduleInstances.length,
                labels: moduleInstances
                  .sort((a, b) => a.id - b.id)
                  .map((inst, idx) => inst.instance_label || `(${ idx + 1 })`)
              });
            }
          }
          return summary;
        }),
        takeUntil(this.destroyEvent$)
      )
      .subscribe(summary => this.multiInstanceSummary$.next(summary));
    
    // Add a module instance (for "add another copy" — generates label)
    // When sameModuleCount === 0, creates TWO instances so count jumps to 2.
    // Otherwise, creates one instance. Labels are assigned by renumberModuleInstances$().
    this.addModuleInstance$
      .pipe(
        withLatestFrom(this.singlePatchData$, this.patchModuleInstances$),
        filter(([_, patch]) => !!patch),
        switchMap(([module, patch, existingInstances]) => {
          const sameModuleCount = (existingInstances || []).filter(i => i.module_id === module.id).length;

          // Enforce copy limit — account for jumpstart (count=0 → creates 2)
          const wouldBeCount = sameModuleCount + (sameModuleCount === 0 ? 2 : 1);
          if (wouldBeCount > MAX_INSTANCES_PER_MODULE) {
            SharedConstants.errorCustom(this.snackBar, `Maximum of ${ MAX_INSTANCES_PER_MODULE } copies per module reached.`);
            return EMPTY;
          }

          if (sameModuleCount === 0) {
            // Jumpstart: batch insert two instances in a single DB call
            return this.backend.add.patchModuleInstances([
              {patch_id: patch.id, module_id: module.id, instance_label: '(1)'},
              {patch_id: patch.id, module_id: module.id, instance_label: '(2)'}
            ]).pipe(
              catchError(err => {
                console.error('Failed to add module instances:', err);
                SharedConstants.errorCustom(this.snackBar, 'Failed to add module copies.');
                return EMPTY;
              })
            );
          }

          // If there's currently only 1 instance (unlabeled), relabel + insert in parallel
          if (sameModuleCount === 1) {
            return forkJoin([
              this.relabelExistingInstance$(existingInstances, module.id, '(1)'),
              this.backend.add.patchModuleInstance(patch.id, module.id, '(2)')
            ]).pipe(
              // Extract only the new instance (relabel returns null or updated instance)
              map(([_, newInstance]) => [newInstance]),
              catchError(err => {
                console.error('Failed to add module instance:', err);
                SharedConstants.errorCustom(this.snackBar, 'Failed to add module copy.');
                return EMPTY;
              })
            );
          }

          // 2+ instances: just add one more
          return this.backend.add.patchModuleInstance(patch.id, module.id, `(${ sameModuleCount + 1 })`).pipe(
            // Wrap single instance in array for uniform handling in subscribe
            map(instance => [instance]),
            catchError(err => {
              console.error('Failed to add module instance:', err);
              SharedConstants.errorCustom(this.snackBar, 'Failed to add module copy.');
              return EMPTY;
            })
          );
        }),
        takeUntil(this.destroyEvent$)
      )
      .subscribe(newInstances => {
        this.patchModuleInstances$.next([...this.patchModuleInstances$.value, ...newInstances]);
        const moduleId = newInstances[0]?.module_id;
        if (moduleId != null) {
          this.renumberModuleInstances$(moduleId).subscribe();
        }
        const msg = newInstances.length > 1 ? 'Module split into 2 copies.' : 'Copy added.';
        SharedConstants.successCustom(this.snackBar, msg);
      });
    
    // Remove a module instance (with confirmation if it has connections)
    this.removeModuleInstance$
      .pipe(
        switchMap(instance => {
          // Count connections referencing this instance
          const connections = this.editorConnections$.value || [];
          const connCount = connections.filter(
            c => c.instance_id_a === instance.id || c.instance_id_b === instance.id
          ).length;
          
          if (connCount > 0) {
            // Show confirmation dialog
            const dialogData: ConfirmDialogDataInModel = {
              title: 'Remove this copy?',
              description: `This copy has ${ connCount } connection${ connCount > 1 ? 's' : '' } that will be disconnected.`,
              positive: {label: 'Remove', theme: 'warning'}
            };
            return this.dialog.open(ConfirmDialogComponent, {
              data: dialogData,
              disableClose: false,
              width: '32rem'
            }).afterClosed().pipe(
              tap((result: ConfirmDialogDataOutModel) => {
                if (!result?.answer) SharedConstants.infoCustom(this.snackBar, 'No changes made.');
              }),
              filter((result: ConfirmDialogDataOutModel) => result?.answer === true),
              map(() => instance)
            );
          }
          
          // No connections — proceed immediately
          return of(instance);
        }),
        switchMap(instance =>
          this.backend.delete.patchModuleInstance(instance.id).pipe(
            map(() => instance),
            catchError(err => {
              console.error('Failed to remove module instance:', err);
              SharedConstants.errorCustom(this.snackBar, 'Failed to remove instance.');
              return EMPTY;
            })
          )
        ),
        takeUntil(this.destroyEvent$)
      )
      .subscribe(removed => {
        this.patchModuleInstances$.next(
          this.patchModuleInstances$.value.filter(i => i.id !== removed.id)
        );
        
        // Scrub editorConnections$: mirror DB's ON DELETE SET NULL.
        // Any connection referencing the deleted instance_id must have it
        // set to undefined so that save doesn't write a stale FK.
        const currentConnections = this.editorConnections$.value;
        if (currentConnections) {
          const scrubbed = currentConnections.map(conn => {
            let changed = false;
            const patched = {...conn};
            if (patched.instance_id_a === removed.id) {
              patched.instance_id_a = undefined;
              changed = true;
            }
            if (patched.instance_id_b === removed.id) {
              patched.instance_id_b = undefined;
              changed = true;
            }
            return changed ? patched : conn;
          });
          this.editorConnections$.next(scrubbed);
          this.bridge.editorConnections$.next(scrubbed);
          this.requestConnectionDbSync$.next();
        }
        
        // Renumber surviving instances of this module sequentially
        this.renumberModuleInstances$(removed.module_id).subscribe();
        
        // If the removed instance was selected, clear only the affected side(s)
        const sel = this.selectedForConnection$.value;
        const aAffected = sel?.a?.cv?.instance_id === removed.id;
        const bAffected = sel?.b?.cv?.instance_id === removed.id;
        if (aAffected && bAffected) {
          this.resetSelectedForConnection$.next();
        } else if (aAffected) {
          this.bridge.resetA$.next();
        } else if (bAffected) {
          this.bridge.resetB$.next();
        }
        
        SharedConstants.successCustom(this.snackBar, `Instance removed.`);
      });
    
    // ── Bridge mirroring — push state into SelectionPanelBridgeService ─────
    this.selectedForConnection$
      .pipe(takeUntil(this.destroyEvent$))
      .subscribe(v => this.bridge.selectionState$.next(v));
    
    this.singlePatchData$
      .pipe(takeUntil(this.destroyEvent$))
      .subscribe(v => this.bridge.patchData$.next(v));
    
    this.instanceLabelMap$
      .pipe(takeUntil(this.destroyEvent$))
      .subscribe(v => this.bridge.instanceLabelMap$.next(v));
    
    // ── Bridge action buses (outlet → bridge → service) ───────────────────
    this.bridge.reset$
      .pipe(takeUntil(this.destroyEvent$))
      .subscribe(() => this.resetSelectedForConnection$.next());
    
    this.bridge.confirm$
      .pipe(takeUntil(this.destroyEvent$))
      .subscribe(() => this.confirmSelectedConnection$.next());

    // ── Patch tags auto-save ───────────────────────────────────────────────
    this._tagsUpdate$
      .pipe(
        switchMap(tags => {
          const patch = this.singlePatchData$.value;
          if (!patch) { return EMPTY; }
          return this.backend.update.patchTags(patch.id, tags).pipe(
            catchError(err => {
              console.error('Failed to save tags:', err);
              SharedConstants.errorCustom(this.snackBar, 'Failed to save tags — check your connection.');
              return EMPTY;
            })
          );
        }),
        takeUntil(this.destroyEvent$)
      )
      .subscribe();
  }

  setPublicDetailMode(enabled: boolean) {
    this.usePublicDetailReads = enabled;
  }

  private buildUnavailableMessage(): string {
    return this.usePublicDetailReads
      ? `This patch isn't publicly available. If it's private, only the owner can open it while signed in.`
      : 'This patch could not be loaded.';
  }

  addPatchTag(tag: string): void {
    const trimmed = tag.trim();
    if (!trimmed) { return; }
    const current = this.patchTags$.value;
    if (current.includes(trimmed)) { return; }
    const next = [...current, trimmed];
    this.patchTags$.next(next);
    if (this.singlePatchData$.value) {
      this.singlePatchData$.value.tags = next;
    }
    this._tagsUpdate$.next(next);
  }

  removePatchTag(tag: string): void {
    const next = this.patchTags$.value.filter(t => t !== tag);
    this.patchTags$.next(next);
    if (this.singlePatchData$.value) {
      this.singlePatchData$.value.tags = next;
    }
    this._tagsUpdate$.next(next);
  }

  clearLinkedRack(): void {
    this.requestLinkedRackChange$.next(null);
  }
  
  private groupInstancesByModuleId(instances: PatchModuleInstance[]): Map<number, PatchModuleInstance[]> {
    const map = new Map<number, PatchModuleInstance[]>();
    for (const inst of instances) {
      const list = map.get(inst.module_id) ?? [];
      list.push(inst);
      map.set(inst.module_id, list);
    }
    return map;
  }

  ngOnDestroy(): void {
    // Clear the bridge so the floating panel disappears when navigating away
    this.bridge.selectionState$.next({a: null, b: null});
    this.bridge.patchData$.next(undefined);
    this.destroyEvent$.next();
    this.destroyEvent$.complete();
  }
  
  /**
   * Ensures an instance exists for the given module in the current patch.
   * If one already exists, returns its id. If not, creates one and returns the new id.
   * Used by module-cvs for lazy auto-create on first CV click.
   */
  ensureModuleInstance$(module: DbModule | MinimalModule): Observable<number> {
    const patch = this.singlePatchData$.value;
    if (!patch) { return EMPTY as Observable<number>; }
    
    // Check if an instance already exists
    const existing = this.patchModuleInstances$.value.find(i => i.module_id === module.id);
    if (existing) {
      return of(existing.id);
    }
    
    // Auto-create one
    return this.backend.add.patchModuleInstance(patch.id, module.id, null).pipe(
      map(instance => {
        // Update local state so the editor cards react
        this.patchModuleInstances$.next([...this.patchModuleInstances$.value, instance]);
        return instance.id as number;
      }),
      catchError(err => {
        console.error('Failed to auto-create instance:', err);
        return EMPTY as Observable<number>;
      })
    );
  }
  
  /**
   * Relabels the first instance of a given module to the specified label.
   * Used when a second copy is added — the original unlabeled instance gets "(1)".
   */
  private relabelExistingInstance$(
    existingInstances: PatchModuleInstance[],
    moduleId: number,
    newLabel: string
  ) {
    const first = existingInstances.find(i => i.module_id === moduleId);
    if (!first || first.instance_label === newLabel) { return of(null); }
    return this.backend.update.patchModuleInstanceLabel(first.id, newLabel).pipe(
      tap(_ => {
        // Update local state
        const current = this.patchModuleInstances$.value;
        const idx = current.findIndex(i => i.id === first.id);
        if (idx >= 0) {
          current[idx] = {...current[idx], instance_label: newLabel};
          this.patchModuleInstances$.next([...current]);
        }
      }),
      catchError(err => {
        console.error('Failed to relabel instance:', err);
        return of(null);
      })
    );
  }
  
  /**
   * Renumber all instances of a module sequentially: (1), (2), (3), …
   * Sorted by `id` (creation order) so the numbering is stable.
   * Only updates instances whose label actually changed.
   * Updates both DB and local `patchModuleInstances$`.
   */
  private renumberModuleInstances$(moduleId: number): Observable<null> {
    const all = this.patchModuleInstances$.value;
    const moduleInstances = all.filter(i => i.module_id === moduleId).sort((a, b) => a.id - b.id);
    
    // If 0 or 1 instances, no labels needed — clear label if present
    if (moduleInstances.length <= 1) {
      const single = moduleInstances[0];
      if (single && single.instance_label != null) {
        return this.backend.update.patchModuleInstanceLabel(single.id, null).pipe(
          tap(() => {
            const idx = all.findIndex(i => i.id === single.id);
            if (idx >= 0) {
              const updated = [...all];
              updated[idx] = {...updated[idx], instance_label: null};
              this.patchModuleInstances$.next(updated);
            }
          }),
          map(() => null),
          catchError(err => {
            console.error('Failed to clear instance label:', err);
            return of(null);
          })
        );
      }
      return of(null);
    }
    
    // Build list of updates needed
    const updates: {
      instance: PatchModuleInstance;
      newLabel: string
    }[] = [];
    moduleInstances.forEach((inst, idx) => {
      const expectedLabel = `(${ idx + 1 })`;
      if (inst.instance_label !== expectedLabel) {
        updates.push({instance: inst, newLabel: expectedLabel});
      }
    });
    
    if (updates.length === 0) { return of(null); }
    
    // Fire all label updates in parallel
    return forkJoin(
      updates.map(u => this.backend.update.patchModuleInstanceLabel(u.instance.id, u.newLabel).pipe(
        catchError(err => {
          console.error(`Failed to renumber instance ${ u.instance.id }:`, err);
          return of(null);
        })
      ))
    ).pipe(
      tap(() => {
        // Update local state in one batch
        const current = [...this.patchModuleInstances$.value];
        for (const u of updates) {
          const idx = current.findIndex(i => i.id === u.instance.id);
          if (idx >= 0) {
            current[idx] = {...current[idx], instance_label: u.newLabel};
          }
        }
        this.patchModuleInstances$.next(current);
      }),
      map(() => null)
    );
  }

  private getSelectedLinkedRackId(): number | null {
    const selectedId = Number.parseInt(getCleanedValueId(this.formData.linkedRack.control), 10);
    return Number.isFinite(selectedId) ? selectedId : null;
  }

  private setLinkedRackPersistenceBlocked(blocked: boolean, hint: string | null): void {
    this.linkedRackPersistenceBlocked$.next(blocked);
    this.linkedRackPersistenceHint$.next(hint);

    if (blocked) {
      this.formData.linkedRack.control.disable({emitEvent: false});
      return;
    }

    this.formData.linkedRack.control.enable({emitEvent: false});
  }

  private syncLinkedRackControl(patch: Patch | undefined, racks: Rack[]): void {
    this.formData.linkedRack.control.reset('', {emitEvent: false});
    if (patch?.linked_rack_id == null) {
      return;
    }

    const matchingRack = racks.find(rack => rack.id === patch.linked_rack_id);
    if (!matchingRack) {
      return;
    }

    const options = this.linkedRackOptions$.value;
    findAndApplyOptionForId(`${ matchingRack.id }`, this.formData.linkedRack.control, options);
  }

  private buildLinkedRackUiState(patch: Patch | undefined, racks: Rack[]): LinkedRackUiState {
    if (!patch || patch.linked_rack_id == null) {
      return defaultLinkedRackUiState;
    }

    const linkedRack = racks.find(rack => rack.id === patch.linked_rack_id);
    if (!linkedRack) {
      return {
        kind: 'unavailable',
        statusLabel: 'Linked rack unavailable',
        description: 'This patch still remembers a linked rack, but it is no longer available. You can choose a different rack or clear the link without affecting the patch.',
        rackId: patch.linked_rack_id
      };
    }

    return {
      kind: 'linked',
      statusLabel: 'In linked rack',
      description: 'This rack is optional context only. The patch still edits against your collection and patch-local copies.',
      rackName: linkedRack.name,
      rackId: linkedRack.id
    };
  }
}
