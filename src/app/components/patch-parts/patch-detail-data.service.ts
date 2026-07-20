import { Injectable, OnDestroy } from '@angular/core';
import { UntypedFormControl, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, ReplaySubject, Subject } from 'rxjs';
import { ISelectable } from 'src/app/shared-interproject/components/@smart/mat-form-entity/form-element-models';
import { SubManager } from 'src/app/shared-interproject/directives/subscription-manager';
import { AnalyticsService } from '../../features/backbone/analytics-integration/analytics.service';
import { UserManagementService } from '../../features/backbone/login/user-management.service';
import { SupabaseService } from '../../features/backend/supabase.service';
import { PatchConnection, PatchModuleInstance } from '../../models/connection';
import { CVConnectionEntity } from '../../models/cv';
import { DbModule, MinimalModule } from '../../models/module';
import { Patch } from '../../models/patch';
import { Rack } from '../../models/rack';
import { SelectionPanelBridgeService } from './selection-panel-bridge.service';
import {
  DETAIL_ANALYTICS_SURFACES,
  DetailAnalyticsSurface
} from '../detail-analytics-surface';
import { PATCH_EDITOR_OPERATION_MODES, PatchEditorOperationMode, PatchEditorSortStrategy, LinkedRackPreviewState } from './patch-editor/patch-editor.types';
import { CVConnectionState, EMPTY_CV_CONNECTION_STATE, LinkedRackUiState, MAX_INSTANCES_PER_MODULE, MultiInstanceModuleSummary } from './patch-detail-data.models';
import { DEFAULT_LINKED_RACK_UI_STATE } from './patch-detail-data.utils';
import { PatchDetailDataDependencies } from './patch-detail-data.context.types';
import {
  bindCurrentPatchPrivacyProjection,
  bindEditorPanelCloseRefresh,
  bindEditorPanelCloseSelectionReset,
  bindInstanceLabelMapProjection,
  bindMultiInstanceSummaryProjection,
  bindOwnedPatchEditorOpen,
  bindPatchConnectionsLoad,
  bindPatchFormHydration,
  bindPatchLoadByNumericId,
  bindPatchLoadByPublicId,
  bindPatchModuleInstancesLoad
} from './patch-detail-loading.bindings';
import {
  bindPatchDelete,
  bindPatchEditingToggle,
  bindPatchMetadataControls,
  bindPatchPrivacyToggle,
  bindPatchTagsAutoSave,
  bindRemovePatchFromCollection,
  addPatchTag as addPatchTagToState,
  removePatchTag as removePatchTagFromState
} from './patch-detail-save-sync.bindings';
import {
  bindCurrentUserRackOptions,
  bindLinkedRackControlChanges,
  bindLinkedRackPersistence,
  bindLinkedRackSelectionBlocking,
  bindLinkedRackState,
  clearLinkedRack as clearLinkedRackState,
  getRackPreviewUrl as buildRackPreviewUrl,
  loadEditorCollectionModules$ as loadEditorCollectionModulesFromBackend$,
  loadLinkedRackPreview$ as loadLinkedRackPreviewFromBackend$
} from './patch-detail-linked-rack.bindings';
import {
  bindConfirmSelectedConnection,
  bindConnectionDbSync,
  bindConnectionSelection,
  bindPatchConnectionMirror,
  bindPatchConnectionNoteSync,
  bindRemoveConnectionFromEditor,
  bindSelectionPanelBridge
} from './patch-detail-connection-operations.bindings';
import {
  bindAddModuleInstance,
  bindRemoveModuleInstance,
  ensureModuleInstance$ as ensurePatchModuleInstance$,
  relabelExistingInstance$ as relabelPatchModuleInstance$,
  renumberModuleInstances$ as renumberPatchModuleInstances$
} from './patch-detail-module-instance-operations.bindings';

export type { LinkedRackUiState, MultiInstanceModuleSummary } from './patch-detail-data.models';
export { MAX_INSTANCES_PER_MODULE } from './patch-detail-data.models';

@Injectable()
export class PatchDetailDataService extends SubManager implements OnDestroy {
  private usePublicDetailReads = false;
  readonly updateSinglePatchData$ = new ReplaySubject<number>();
  /**
   * Token-based detail fetch entry-point. Routed through the SECURITY DEFINER
   * RPC `get_patch_by_public_id` so anonymous holders of a private patch's
   * share token can view it without enabling enumeration by numeric ID.
   */
  readonly updateSinglePatchByPublicId$ = new ReplaySubject<string>(1);
  readonly singlePatchData$ = new BehaviorSubject<Patch | undefined>(undefined);
  readonly detailAnalyticsSurface$ = new BehaviorSubject<DetailAnalyticsSurface>(DETAIL_ANALYTICS_SURFACES.detailRoute);
  readonly patchEditingPanelOpenState$ = new BehaviorSubject<boolean>(false);
  readonly patchConnections$: BehaviorSubject<PatchConnection[] | null> = new BehaviorSubject<PatchConnection[]>(null);
  readonly editorConnections$: BehaviorSubject<PatchConnection[] | null> = new BehaviorSubject<PatchConnection[]>(null);
  readonly removePatchFromCollection$ = new Subject<number>();
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
  readonly clickOnModuleCV$ = new Subject<CVConnectionEntity>();
  readonly resetSelectedForConnection$ = new Subject<void>();
  readonly selectedForConnection$ = new BehaviorSubject<CVConnectionState>(EMPTY_CV_CONNECTION_STATE);
  readonly confirmSelectedConnection$ = new Subject<void>();
  readonly removeConnectionFromEditor$ = new Subject<PatchConnection>();
  readonly deletePatch$ = new Subject<number>();
  /** Serializes connection writes to the backend (mirrors rack's requestRackedModulesDbSync$). */
  readonly requestConnectionDbSync$ = new Subject<void>();
  /** Targeted single-row note sync — emits the full PatchConnection whose notes changed. */
  readonly requestNoteSync$ = new Subject<PatchConnection>();
  readonly patchModuleInstances$ = new BehaviorSubject<PatchModuleInstance[]>([]);
  readonly addModuleInstance$ = new Subject<MinimalModule>();
  readonly removeModuleInstance$ = new Subject<PatchModuleInstance>();
  /** User's collection modules — set by PatchEditorComponent on init */
  readonly collectionModules$ = new BehaviorSubject<DbModule[]>([]);
  readonly isCurrentPatchPrivate$ = new BehaviorSubject<boolean>(false);
  readonly patchDetailUnavailableMessage$ = new BehaviorSubject<string | null>(null);
  readonly requestPatchPrivacyStatusChange$ = new Subject<void>();
  /** Toggle the patch editing panel open/closed through the service layer. */
  readonly requestPatchEditingToggle$ = new Subject<void>();
  /** Map from instance ID → display label (e.g. "(1)", "(2)"). */
  readonly instanceLabelMap$ = new BehaviorSubject<Map<number, string>>(new Map());
  /** Summary of modules with 2+ instances. Emits [] when no multi-instance modules exist. */
  readonly multiInstanceSummary$ = new BehaviorSubject<MultiInstanceModuleSummary[]>([]);
  readonly shouldShowPanelImages$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(true);
  readonly patchTags$ = new BehaviorSubject<string[]>([]);
  readonly currentUserRacks$ = new BehaviorSubject<Rack[]>([]);
  readonly linkedRackOptions$ = new BehaviorSubject<ISelectable[]>([]);
  readonly linkedRackState$ = new BehaviorSubject<LinkedRackUiState>(DEFAULT_LINKED_RACK_UI_STATE);
  readonly editorOperationMode$ = new BehaviorSubject<PatchEditorOperationMode>(PATCH_EDITOR_OPERATION_MODES.collection);
  readonly linkedRackPersistenceBlocked$ = new BehaviorSubject<boolean>(false);
  readonly linkedRackPersistenceHint$ = new BehaviorSubject<string | null>(null);
  readonly linkedRackSelectionBlocked$ = new BehaviorSubject<boolean>(false);
  readonly linkedRackSelectionHint$ = new BehaviorSubject<string | null>(null);
  readonly requestLinkedRackChange$ = new Subject<number | null>();
  private readonly _tagsUpdate$ = new Subject<string[]>();
  private readonly connectionSyncPendingCount$ = new BehaviorSubject<number>(0);
  private readonly dependencies: PatchDetailDataDependencies;

  constructor(
    private router: Router,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    public userService: UserManagementService,
    public backend: SupabaseService,
    private bridge: SelectionPanelBridgeService,
    private analytics: AnalyticsService
  ) {
    super();
    this.dependencies = {router, snackBar, dialog, userService, backend, bridge, analytics};
    const publicReadAccess = {
      isPublicDetailMode: () => this.usePublicDetailReads,
      buildUnavailableMessage: () => this.buildUnavailableMessage()
    };

    bindPatchLoadByNumericId(this, this.dependencies, publicReadAccess);
    bindPatchLoadByPublicId(this, this.dependencies, publicReadAccess);
    bindCurrentPatchPrivacyProjection(this);
    bindRemovePatchFromCollection(this, this.dependencies);
    bindPatchPrivacyToggle(this, this.dependencies);
    bindPatchEditingToggle(this, this.dependencies);
    bindPatchMetadataControls(this, this.dependencies);
    bindPatchFormHydration(this);
    bindCurrentUserRackOptions(this, this.dependencies);
    bindLinkedRackState(this, this.dependencies, publicReadAccess);
    bindLinkedRackControlChanges(this);
    bindLinkedRackPersistence(this, this.dependencies);
    bindPatchConnectionsLoad(this, this.dependencies);
    bindOwnedPatchEditorOpen(this, this.dependencies);
    bindEditorPanelCloseSelectionReset(this);
    bindEditorPanelCloseRefresh(this, this.dependencies);
    bindConnectionSelection(this, this.dependencies);
    bindLinkedRackSelectionBlocking(this, this.connectionSyncPendingCount$);
    bindConfirmSelectedConnection(this, this.dependencies);
    bindPatchConnectionMirror(this, this.dependencies);
    bindRemoveConnectionFromEditor(this, this.dependencies);
    bindConnectionDbSync(this, this.dependencies, this.connectionSyncPendingCount$);
    bindPatchConnectionNoteSync(this, this.dependencies);
    bindPatchDelete(this, this.dependencies);
    bindPatchModuleInstancesLoad(this, this.dependencies);
    bindInstanceLabelMapProjection(this);
    bindMultiInstanceSummaryProjection(this);
    bindAddModuleInstance(this, this.dependencies);
    bindRemoveModuleInstance(this, this.dependencies);
    bindSelectionPanelBridge(this, this.dependencies);
    bindPatchTagsAutoSave(this, this.dependencies, this._tagsUpdate$);
  }

  setPublicDetailMode(enabled: boolean) {
    this.usePublicDetailReads = enabled;
  }

  setDetailAnalyticsSurface(surface: DetailAnalyticsSurface): void {
    this.detailAnalyticsSurface$.next(surface);
  }

  private buildUnavailableMessage(): string {
    return this.usePublicDetailReads
      ? `This patch isn't publicly available. If it's private, only the owner can open it while signed in.`
      : 'This patch could not be loaded.';
  }

  addPatchTag(tag: string): void {
    addPatchTagToState(this, this.analytics, this._tagsUpdate$, tag);
  }

  removePatchTag(tag: string): void {
    removePatchTagFromState(this, this.analytics, this._tagsUpdate$, tag);
  }

  getRackPreviewUrl(filename: string): string {
    return buildRackPreviewUrl(this.backend.storage.publicUrlBases.racks, filename);
  }

  clearLinkedRack(): void {
    clearLinkedRackState(this);
  }

  loadEditorCollectionModules$(strategy: PatchEditorSortStrategy): Observable<DbModule[]> {
    return loadEditorCollectionModulesFromBackend$(this.dependencies, strategy);
  }

  loadLinkedRackPreview$(linkedRackId: number | null): Observable<LinkedRackPreviewState> {
    return loadLinkedRackPreviewFromBackend$(this.dependencies, linkedRackId);
  }

  ngOnDestroy(): void {
    this.bridge.selectionState$.next({a: null, b: null});
    this.bridge.patchData$.next(undefined);
    super.ngOnDestroy();
  }

  ensureModuleInstance$(module: DbModule | MinimalModule, forceNew = false): Observable<number> {
    return ensurePatchModuleInstance$(this, this.dependencies, module, forceNew);
  }

  private relabelExistingInstance$(
    existingInstances: PatchModuleInstance[],
    moduleId: number,
    newLabel: string
  ) {
    return relabelPatchModuleInstance$(this, this.dependencies, existingInstances, moduleId, newLabel);
  }

  private renumberModuleInstances$(moduleId: number): Observable<null> {
    return renumberPatchModuleInstances$(this, this.dependencies, moduleId);
  }
}
