import { UntypedFormControl } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { BehaviorSubject, ReplaySubject, Subject } from 'rxjs';
import { UserManagementService } from '../../features/backbone/login/user-management.service';
import type { SupabaseService } from '../../features/backend/supabase.service';
import { AnalyticsService } from '../../features/backbone/analytics-integration/analytics.service';
import { PatchConnection, PatchModuleInstance } from '../../models/connection';
import { CVConnectionEntity } from '../../models/cv';
import { DbModule, MinimalModule } from '../../models/module';
import { Patch } from '../../models/patch';
import { Rack } from '../../models/rack';
import { ISelectable } from 'src/app/shared-interproject/components/@smart/mat-form-entity/form-element-models';
import { SelectionPanelBridgeService } from './selection-panel-bridge.service';
import { PatchEditorOperationMode } from './patch-editor/patch-editor.types';
import { CVConnectionState, LinkedRackUiState, MultiInstanceModuleSummary } from './patch-detail-data.models';

export interface PatchDetailFormData {
  name: { control: UntypedFormControl };
  description: { control: UntypedFormControl };
  linkedRack: { control: UntypedFormControl };
}

export interface PatchDetailDataContext {
  updateSinglePatchData$: ReplaySubject<number>;
  updateSinglePatchByPublicId$: ReplaySubject<string>;
  singlePatchData$: BehaviorSubject<Patch | undefined>;
  patchEditingPanelOpenState$: BehaviorSubject<boolean>;
  patchConnections$: BehaviorSubject<PatchConnection[] | null>;
  editorConnections$: BehaviorSubject<PatchConnection[] | null>;
  removePatchFromCollection$: Subject<number>;
  formData: PatchDetailFormData;
  clickOnModuleCV$: Subject<CVConnectionEntity>;
  resetSelectedForConnection$: Subject<void>;
  selectedForConnection$: BehaviorSubject<CVConnectionState>;
  confirmSelectedConnection$: Subject<void>;
  removeConnectionFromEditor$: Subject<PatchConnection>;
  deletePatch$: Subject<number>;
  requestConnectionDbSync$: Subject<void>;
  requestNoteSync$: Subject<PatchConnection>;
  patchModuleInstances$: BehaviorSubject<PatchModuleInstance[]>;
  addModuleInstance$: Subject<MinimalModule>;
  removeModuleInstance$: Subject<PatchModuleInstance>;
  collectionModules$: BehaviorSubject<DbModule[]>;
  isCurrentPatchPrivate$: BehaviorSubject<boolean>;
  patchDetailUnavailableMessage$: BehaviorSubject<string | null>;
  requestPatchPrivacyStatusChange$: Subject<void>;
  requestPatchEditingToggle$: Subject<void>;
  instanceLabelMap$: BehaviorSubject<Map<number, string>>;
  multiInstanceSummary$: BehaviorSubject<MultiInstanceModuleSummary[]>;
  shouldShowPanelImages$: BehaviorSubject<boolean>;
  patchTags$: BehaviorSubject<string[]>;
  currentUserRacks$: BehaviorSubject<Rack[]>;
  linkedRackOptions$: BehaviorSubject<ISelectable[]>;
  linkedRackState$: BehaviorSubject<LinkedRackUiState>;
  editorOperationMode$: BehaviorSubject<PatchEditorOperationMode>;
  linkedRackPersistenceBlocked$: BehaviorSubject<boolean>;
  linkedRackPersistenceHint$: BehaviorSubject<string | null>;
  linkedRackSelectionBlocked$: BehaviorSubject<boolean>;
  linkedRackSelectionHint$: BehaviorSubject<string | null>;
  requestLinkedRackChange$: Subject<number | null>;
  destroy$: Subject<void>;
}

export interface PatchDetailDataDependencies {
  router: Router;
  snackBar: MatSnackBar;
  dialog: MatDialog;
  userService: UserManagementService;
  backend: SupabaseService;
  bridge: SelectionPanelBridgeService;
  analytics: AnalyticsService;
}
