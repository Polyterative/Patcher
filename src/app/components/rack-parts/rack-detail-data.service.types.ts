import { CdkDragDrop } from '@angular/cdk/drag-drop';
import { ElementRef } from '@angular/core';
import { FormControl } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import {
  BehaviorSubject,
  MonoTypeOperatorFunction,
  Observable,
  ReplaySubject,
  Subject
} from 'rxjs';
import { AnalyticsService } from '../../features/backbone/analytics-integration/analytics.service';
import { DetailAnalyticsSurface } from '../detail-analytics-surface';
import { UserManagementService } from '../../features/backbone/login/user-management.service';
import { SupabaseService } from '../../features/backend/supabase.service';
import {
  MinimalModule,
  RackedModule
} from '../../models/module';
import {
  Rack,
  RackModuleOrientation,
  RackMinimal
} from '../../models/rack';
import {
  RackAnalysisMode,
  RackLayoutHoverMode
} from './rack-analysis-mode';
import { RackLayoutScope } from './rack-layout-analysis.utils';
import { SignalFocusArea } from './rack-signal-analysis.utils';

export interface RackDetailFormData {
  name: {
    control: FormControl<string | null>;
  };
}

export interface RackDetailDataContext {
  snackBar: MatSnackBar;
  userService: UserManagementService;
  backend: SupabaseService;
  dialog: MatDialog;
  router: Router;
  analytics: AnalyticsService;

  updateSingleRackData$: ReplaySubject<number>;
  updateSingleRackByPublicId$: ReplaySubject<string>;
  singleRackData$: BehaviorSubject<Rack | undefined>;
  detailAnalyticsSurface$: BehaviorSubject<DetailAnalyticsSurface>;
  loadedRackAnalyticsSurface$: BehaviorSubject<DetailAnalyticsSurface>;
  rackDetailUnavailableMessage$: BehaviorSubject<string | null>;
  deleteRack$: Subject<RackMinimal>;
  duplicateRack$: Subject<RackMinimal>;
  downloadRackImageToUserComputer$: Subject<void>;
  updateRackImagePreview$: Subject<void>;
  currentDownloadElementRef$: BehaviorSubject<{screen: ElementRef} | undefined>;
  addModuleToRack$: Subject<MinimalModule>;
  addBlankToRow$: Subject<{rowId: number; hp: number}>;
  moduleAddedFromPicker$: Subject<MinimalModule>;
  shouldShowPanelImages$: BehaviorSubject<boolean>;
  analysisMode$: BehaviorSubject<RackAnalysisMode>;
  layoutHoverMode$: BehaviorSubject<RackLayoutHoverMode>;
  signalFocusArea$: BehaviorSubject<SignalFocusArea | null>;
  formData: RackDetailFormData;
  rackStatistics$: BehaviorSubject<{name: string; value: string}[] | null>;
  isRackDataLoading$: BehaviorSubject<boolean>;
  rowedRackedModules$: BehaviorSubject<RackedModule[][] | null>;
  isRackImageCaptureInProgress$: BehaviorSubject<boolean>;
  rackOrderChange$: Subject<{
    event: CdkDragDrop<ElementRef>;
    newRow: number;
    module: RackedModule;
  }>;
  isCurrentRackPropertyOfCurrentUser$: BehaviorSubject<boolean>;
  isCurrentUserAdmin$: Observable<boolean>;
  isCurrentRackEditable$: BehaviorSubject<boolean>;
  isCurrentRackPrivate$: BehaviorSubject<boolean>;
  userRequestedSmallerScale$: BehaviorSubject<boolean>;
  requestRackEditableStatusChange$: Subject<void>;
  requestCreatePatchFromRack$: Subject<void>;
  createPatchFromRackInProgress$: BehaviorSubject<boolean>;
  requestRackPrivacyStatusChange$: Subject<void>;
  requestRackedModuleRemoval$: Subject<RackedModule>;
  requestRackedModuleDuplication$: Subject<RackedModule>;
  requestRackedModuleReplaceWithBlank$: Subject<RackedModule>;
  requestRackedModuleRowClearing$: Subject<RackedModule>;
  requestRackedModulePanelSwitch$: Subject<{rackedModule: RackedModule; panelId: number | null}>;
  requestRackedModuleOrientationToggle$: Subject<RackedModule>;
  rackedModuleOrientationUpdatingId$: BehaviorSubject<number | null>;
  requestAddNewRow$: Subject<void>;
  requestRemoveRow$: Subject<void>;
  requestMoveRow$: Subject<{rowId: number; direction: 'up' | 'down'}>;
  requestDuplicateRow$: Subject<number>;
  requestClearRow$: Subject<number>;
  requestDeleteRow$: Subject<number>;
  requestLayoutRemix$: Subject<void>;
  requestLayoutShuffle$: Subject<void>;
  layoutScope$: BehaviorSubject<RackLayoutScope>;
  requestRackedModulesDbSync$: Subject<void>;
  loadModulesForRack$: Subject<number>;

  takeUntilDestroyed<T>(): MonoTypeOperatorFunction<T>;
  askForConfirmationWhenDuplicatingRack(): Observable<unknown>;
  askForConfirmationWhenCreatingPatchFromRack(rack: RackMinimal): Observable<RackMinimal>;
  removeInformationFromModulesOfCurrentRack(newlyCreatedRackId: number): RackedModule[][];
  createNewRackOnBackendForCurrentUser(userId: string): Observable<{data?: Array<{id: number; public_id?: string}>}>;
  callBackendToUpdateModulesOfRack(rackModules: RackedModule[][], rack: Rack): Observable<unknown>;
  applyLayoutVariantAction(
    rackModules: RackedModule[][] | null,
    rack: Rack | undefined,
    layoutScope: RackLayoutScope,
    action: 'remix' | 'shuffle'
  ): Observable<unknown>;
  assertBackendSuccess<T>(response: T): T;
  applyPersistedRackingIds(
    response: unknown,
    rackModules: RackedModule[][],
    targetUnsyncedModules?: RackedModule[]
  ): void;
  insertOptimisticModule(
    rackModules: RackedModule[][],
    data: {
      module: RackedModule['module'];
      row: number | null;
      column: number | null;
      rackId: number;
    }
  ): RackedModule;
  removeRackedModuleByReference(target: RackedModule): void;
  persistRackRowsAndModules(rackModules: RackedModule[][], rack: Rack): Observable<unknown>;
  showUndoSnackBar(
    message: string,
    undoFactory: () => Observable<unknown>,
    undoSuccessMessage: string,
    duration?: number
  ): void;
  restoreRackLayout$(snapshotRows: RackedModule[][]): Observable<unknown>;
  restoreRemovedModules$(modules: RackedModule[]): Observable<unknown>;
  undoBlankReplacement$(originalModule: RackedModule, blankModule: RackedModule): Observable<unknown>;
  undoDeletedRow$(rowId: number): Observable<unknown>;
  generateRackJpegWithoutAnalysisOverlays$(el: HTMLElement): Observable<string>;
  transferInRow(rackedModules: RackedModule[][], row: number, event: CdkDragDrop<ElementRef>): void;
  updateModulesColumnIds(rackModules: RackedModule[][], row: number | undefined): void;
  updateRackRowCoordinates(rackModules: RackedModule[][], rowCount: number): void;
  transferBetweenRows(
    rackedModules: RackedModule[][],
    rackedModule: RackedModule,
    event: CdkDragDrop<ElementRef>,
    newRow: number
  ): void;
  removeRackedModuleFromRack(rackedModules: RackedModule[][], toRemove: RackedModule): void;
  duplicateModule(rackedModules: RackedModule[][], rackedModule: RackedModule): void;
  canToggleRackModuleOrientation(rackedModule: RackedModule, isOwner?: boolean, isEditable?: boolean): boolean;
  isAnyRackModuleOrientationUpdating(): boolean;
  waitForRackModuleOrientationUpdateIdle(): Observable<number | null>;
  findRackedModuleById(rackModules: RackedModule[][], rackModuleId: number): RackedModule | undefined;
  applyRackModuleOrientation(rackModuleId: number, orientation: RackModuleOrientation, requestedModule: RackedModule): void;
  withCurrentRackModuleOrientations(rackModules: RackedModule[][]): RackedModule[][];
}
