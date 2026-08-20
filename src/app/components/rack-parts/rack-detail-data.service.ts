import { CdkDragDrop } from '@angular/cdk/drag-drop';
import { ElementRef, Inject, Injectable, Optional, PendingTasks, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FormControl, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { BehaviorSubject, combineLatest, Observable, ReplaySubject, Subject } from 'rxjs';
import {
  distinctUntilChanged,
  filter,
  map,
  shareReplay,
  take
} from 'rxjs/operators';
import { AnalyticsService } from '../../features/backbone/analytics-integration/analytics.service';
import { DETAIL_ANALYTICS_SURFACES, DetailAnalyticsSurface } from '../detail-analytics-surface';
import { UserManagementService } from '../../features/backbone/login/user-management.service';
import { SupabaseService } from '../../features/backend/supabase.service';
import {
  MinimalModule,
  RackedModule
} from '../../models/module';
import {
  isFlippableRackModuleStandard,
  normalizeRackModuleOrientation,
  RackModuleOrientation,
  RACK_MODULE_ORIENTATIONS,
  Rack,
  RackMinimal
} from '../../models/rack';
import { SubManager } from '../../shared-interproject/directives/subscription-manager';
import {
  RackAnalysisMode,
  RackLayoutHoverMode,
  RACK_ANALYSIS_MODES,
  RACK_LAYOUT_HOVER_MODES
} from './rack-analysis-mode';
import { RackBalanceAnalysisService } from './rack-balance-analysis.service';
import { RackBalanceAxisResult } from './rack-balance-analysis.types';
import { RackDetailCopyOperationsService } from './rack-detail-copy-operations.service';
import { RackDetailEditingDataService } from './rack-detail-editing-data.service';
import { RackDetailImageOperationsService } from './rack-detail-image-operations.service';
import { RackDetailLayoutOperationsService } from './rack-detail-layout-operations.service';
import { RackDetailLoadingDataService } from './rack-detail-loading-data.service';
import { RackDetailMediaImportDataService } from './rack-detail-media-import-data.service';
import { RackDetailModulePlacementDataService } from './rack-detail-module-placement-data.service';
import { RackDetailModuleReplacementDataService } from './rack-detail-module-replacement-data.service';
import { RackDetailPersistenceOperationsService } from './rack-detail-persistence-operations.service';
import { RackDetailRowLayoutDataService } from './rack-detail-row-layout-data.service';
import { SignalFocusArea } from './rack-signal-analysis.utils';
import {
  buildFunctionAnalysisCoverageSummary,
  buildFunctionAnalysisLegendItems,
  buildFunctionAnalysisResidualLabel
} from './rack-function-visuals.utils';
import { RackLayoutScope } from './rack-layout-analysis.utils';
import {
  RackDetailDataContext,
  RackDetailFormData
} from './rack-detail-data.service.types';

@Injectable()
export class RackDetailDataService extends SubManager {
  readonly updateSingleRackData$ = new ReplaySubject<number>();
  readonly updateSingleRackByPublicId$ = new ReplaySubject<string>(1);
  readonly singleRackData$ = new BehaviorSubject<Rack | undefined>(undefined);
  readonly detailAnalyticsSurface$ = new BehaviorSubject<DetailAnalyticsSurface>(DETAIL_ANALYTICS_SURFACES.detailRoute);
  readonly loadedRackAnalyticsSurface$ = new BehaviorSubject<DetailAnalyticsSurface>(DETAIL_ANALYTICS_SURFACES.detailRoute);
  readonly rackDetailUnavailableMessage$ = new BehaviorSubject<string | null>(null);
  readonly deleteRack$ = new Subject<RackMinimal>();
  readonly duplicateRack$ = new Subject<RackMinimal>();
  readonly downloadRackImageToUserComputer$ = new Subject<void>();
  readonly updateRackImagePreview$ = new Subject<void>();
  readonly currentDownloadElementRef$: BehaviorSubject<{screen: ElementRef} | undefined> =
    new BehaviorSubject<{screen: ElementRef}>(undefined);
  readonly addModuleToRack$ = new Subject<MinimalModule>();
  readonly addBlankToRow$ = new Subject<{rowId: number; hp: number}>();
  readonly moduleAddedFromPicker$ = new Subject<MinimalModule>();
  readonly shouldShowPanelImages$ = new BehaviorSubject<boolean>(true);
  readonly analysisMode$ = new BehaviorSubject<RackAnalysisMode>(RACK_ANALYSIS_MODES.off);
  readonly layoutHoverMode$ = new BehaviorSubject<RackLayoutHoverMode>(RACK_LAYOUT_HOVER_MODES.sameHp);
  readonly signalFocusArea$ = new BehaviorSubject<SignalFocusArea | null>(null);
  readonly formData: RackDetailFormData = {
    name: {
      control: new FormControl('', [
        Validators.required,
        Validators.minLength(3),
        Validators.maxLength(30),
        Validators.pattern('^(?!\\s*$).+')
      ])
    }
  };
  readonly rackStatistics$ = new BehaviorSubject<{name: string; value: string}[] | null>(null);
  readonly isRackDataLoading$ = new BehaviorSubject<boolean>(false);
  readonly rowedRackedModules$ = new BehaviorSubject<RackedModule[][] | null>(null);
  readonly weakestBalanceAxis$: Observable<RackBalanceAxisResult | null>;
  readonly isRackImageCaptureInProgress$ = new BehaviorSubject<boolean>(false);
  readonly functionAnalysisLegendItems$: Observable<ReturnType<typeof buildFunctionAnalysisLegendItems>>;
  readonly functionAnalysisResidualLabel$: Observable<ReturnType<typeof buildFunctionAnalysisResidualLabel>>;
  readonly functionAnalysisCoverageSummary$: Observable<ReturnType<typeof buildFunctionAnalysisCoverageSummary>>;
  readonly rackOrderChange$ = new Subject<{
    event: CdkDragDrop<ElementRef>;
    newRow: number;
    module: RackedModule;
  }>();
  readonly isCurrentRackPropertyOfCurrentUser$ = new BehaviorSubject<boolean>(false);
  readonly isCurrentUserAdmin$: Observable<boolean>;
  readonly canUpdateRackImagePreview$: Observable<boolean>;
  readonly isCurrentRackEditable$ = new BehaviorSubject<boolean>(true);
  readonly isCurrentRackPrivate$ = new BehaviorSubject<boolean>(false);
  readonly userRequestedSmallerScale$ = new BehaviorSubject<boolean>(false);
  readonly requestRackEditableStatusChange$ = new Subject<void>();
  readonly requestCreatePatchFromRack$ = new Subject<void>();
  readonly createPatchFromRackInProgress$ = new BehaviorSubject<boolean>(false);
  readonly requestRackPrivacyStatusChange$ = new Subject<void>();
  readonly requestRackedModuleRemoval$ = new Subject<RackedModule>();
  readonly requestRackedModuleDuplication$ = new Subject<RackedModule>();
  readonly requestRackedModuleReplaceWithBlank$ = new Subject<RackedModule>();
  readonly requestRackedModuleRowClearing$ = new Subject<RackedModule>();
  readonly requestRackedModulePanelSwitch$ = new Subject<{ rackedModule: RackedModule; panelId: number | null }>();
  readonly requestRackedModuleOrientationToggle$ = new Subject<RackedModule>();
  readonly rackedModuleOrientationUpdatingId$ = new BehaviorSubject<number | null>(null);
  readonly requestAddNewRow$ = new Subject<void>();
  readonly requestRemoveRow$ = new Subject<void>();
  readonly requestMoveRow$ = new Subject<{rowId: number; direction: 'up' | 'down'}>();
  readonly requestDuplicateRow$ = new Subject<number>();
  readonly requestClearRow$ = new Subject<number>();
  readonly requestDeleteRow$ = new Subject<number>();
  readonly requestLayoutRemix$ = new Subject<void>();
  readonly requestLayoutShuffle$ = new Subject<void>();
  readonly layoutScope$ = new BehaviorSubject<RackLayoutScope>('all');
  readonly requestRackedModulesDbSync$ = new Subject<void>();
  private readonly loadModulesForRack$ = new Subject<number>();

  private readonly rowLayoutFlows: RackDetailRowLayoutDataService;
  private readonly editingFlows: RackDetailEditingDataService;
  private readonly loadingFlows: RackDetailLoadingDataService;
  private readonly replacementFlows: RackDetailModuleReplacementDataService;
  private readonly modulePlacementFlows: RackDetailModulePlacementDataService;
  private readonly mediaImportFlows: RackDetailMediaImportDataService;
  private readonly copyOperations: RackDetailCopyOperationsService;
  private readonly persistenceOperations: RackDetailPersistenceOperationsService;
  private readonly layoutOperations: RackDetailLayoutOperationsService;
  private readonly imageOperations: RackDetailImageOperationsService;

  constructor(
    private snackBar: MatSnackBar,
    private userService: UserManagementService,
    private backend: SupabaseService,
    private dialog: MatDialog,
    private router: Router,
    private analytics: AnalyticsService,
    private balanceAnalysis: RackBalanceAnalysisService = new RackBalanceAnalysisService(),
    @Optional() rowLayoutFlows?: RackDetailRowLayoutDataService,
    @Optional() editingFlows?: RackDetailEditingDataService,
    @Optional() loadingFlows?: RackDetailLoadingDataService,
    @Optional() replacementFlows?: RackDetailModuleReplacementDataService,
    @Optional() modulePlacementFlows?: RackDetailModulePlacementDataService,
    @Optional() mediaImportFlows?: RackDetailMediaImportDataService,
    @Optional() copyOperations?: RackDetailCopyOperationsService,
    @Optional() persistenceOperations?: RackDetailPersistenceOperationsService,
    @Optional() layoutOperations?: RackDetailLayoutOperationsService,
    @Optional() imageOperations?: RackDetailImageOperationsService,
    @Optional() pendingTasks?: PendingTasks,
    @Optional() @Inject(PLATFORM_ID) platformId?: object,
  ) {
    super();
    this.rowLayoutFlows = rowLayoutFlows ?? new RackDetailRowLayoutDataService();
    this.editingFlows = editingFlows ?? new RackDetailEditingDataService();
    this.loadingFlows = loadingFlows ?? new RackDetailLoadingDataService();
    this.replacementFlows = replacementFlows ?? new RackDetailModuleReplacementDataService();
    this.modulePlacementFlows = modulePlacementFlows ?? new RackDetailModulePlacementDataService();
    this.mediaImportFlows = mediaImportFlows ?? new RackDetailMediaImportDataService();
    this.copyOperations = copyOperations ?? new RackDetailCopyOperationsService();
    this.persistenceOperations = persistenceOperations ?? new RackDetailPersistenceOperationsService();
    this.layoutOperations = layoutOperations ?? new RackDetailLayoutOperationsService();
    this.imageOperations = imageOperations ?? new RackDetailImageOperationsService();
    // Undefined platformId (e.g. tests constructing this service directly, bypassing
    // DI) is treated as "browser" so the SSR-only guard below never activates outside
    // real SSR requests.
    const isBrowserPlatform = platformId === undefined ? true : isPlatformBrowser(platformId);

    this.isCurrentUserAdmin$ = this.backend.auth.hasAdminRole$().pipe(shareReplay(1));
    this.canUpdateRackImagePreview$ = combineLatest([
      this.isCurrentRackPropertyOfCurrentUser$,
      this.isCurrentUserAdmin$
    ]).pipe(
      map(([isOwner, isAdmin]) => isOwner || isAdmin),
      distinctUntilChanged(),
      shareReplay(1)
    );
    this.weakestBalanceAxis$ = this.rowedRackedModules$.pipe(
      map(rowedRackedModules => {
        const analysis = this.balanceAnalysis.analyze(rowedRackedModules);
        if (analysis.isEmpty || analysis.recognizedModuleCount === 0) {
          return null;
        }

        return [...analysis.axes].sort((a, b) => a.share - b.share)[0] ?? null;
      }),
      shareReplay(1)
    );
    this.functionAnalysisLegendItems$ = this.rowedRackedModules$.pipe(
      map(rowedRackedModules => buildFunctionAnalysisLegendItems(rowedRackedModules)),
      shareReplay(1)
    );
    this.functionAnalysisResidualLabel$ = this.rowedRackedModules$.pipe(
      map(rowedRackedModules => buildFunctionAnalysisResidualLabel(rowedRackedModules)),
      shareReplay(1)
    );
    this.functionAnalysisCoverageSummary$ = this.rowedRackedModules$.pipe(
      map(rowedRackedModules => buildFunctionAnalysisCoverageSummary(rowedRackedModules)),
      shareReplay(1)
    );

    const context = this.buildContext();
    this.rowLayoutFlows.bind(context);
    this.editingFlows.bind(context);
    this.loadingFlows.bindDetailLoading(context, !isBrowserPlatform ? pendingTasks : undefined);
    this.replacementFlows.bind(context);
    this.mediaImportFlows.bindMedia(context);
    this.modulePlacementFlows.bindRackOrdering(context);
    this.loadingFlows.bindOwnership(context);
    this.modulePlacementFlows.bindModulePlacement(context);
    this.mediaImportFlows.bindImport(context);
    this.modulePlacementFlows.bindModuleAdditions(context);
    this.loadingFlows.bindStatistics(context);
  }

  setPublicDetailMode(enabled: boolean): void {
    this.loadingFlows.setPublicDetailMode(enabled);
  }

  setDetailAnalyticsSurface(surface: DetailAnalyticsSurface): void { this.detailAnalyticsSurface$.next(surface); }

  private generateRackJpeg$(el: HTMLElement) {
    return this.imageOperations.generateRackJpeg$(el);
  }

  private generateRackJpegWithoutAnalysisOverlays$(el: HTMLElement) {
    return this.imageOperations.generateRackJpegWithoutAnalysisOverlays$(
      this.buildContext(),
      el,
      element => this.generateRackJpeg$(element)
    );
  }

  private bumpUpVersionInNameOfOfRack() {
    return this.copyOperations.bumpUpVersionInNameOfOfRack(this.buildContext());
  }

  private updateModulesColumnIds(rackModules: RackedModule[][], row: number | undefined): void {
    this.layoutOperations.updateModulesColumnIds(rackModules, row);
  }

  private transferInRow(rackedModules: RackedModule[][], row: number, event: {previousIndex: number; currentIndex: number}): void {
    this.layoutOperations.transferInRow(rackedModules, row, event as never);
  }

  private transferBetweenRows(
    rackedModules: RackedModule[][],
    rackedModule: RackedModule,
    event: {currentIndex: number},
    newRow: number
  ): void {
    this.layoutOperations.transferBetweenRows(rackedModules, rackedModule, event as never, newRow);
  }

  private removeRackedModuleFromRack(rackedModules: RackedModule[][], toRemove: RackedModule): void {
    this.layoutOperations.removeRackedModuleFromRack(rackedModules, toRemove);
  }

  private duplicateModule(rackedModules: RackedModule[][], rackedModule: RackedModule): void {
    this.layoutOperations.duplicateModule(rackedModules, rackedModule);
  }

  private removeInformationFromModulesOfCurrentRack(newlyCreatedRackId: number): RackedModule[][] {
    return this.copyOperations.removeInformationFromModulesOfCurrentRack(this.buildContext(), newlyCreatedRackId);
  }

  private callBackendToUpdateModulesOfRack(rackModules: RackedModule[][], rack: Rack) {
    return this.persistenceOperations.callBackendToUpdateModulesOfRack(this.buildContext(), rackModules, rack);
  }

  private createNewRackOnBackendForCurrentUser(userId: string) {
    return this.copyOperations.createNewRackOnBackendForCurrentUser(this.buildContext(), userId);
  }

  private askForConfirmationWhenDuplicatingRack() {
    return this.copyOperations.askForConfirmationWhenDuplicatingRack(this.buildContext());
  }

  private buildContext(): RackDetailDataContext {
    let context: RackDetailDataContext;
    context = {
      snackBar: this.snackBar,
      userService: this.userService,
      backend: this.backend,
      dialog: this.dialog,
      router: this.router,
      analytics: this.analytics,
      updateSingleRackData$: this.updateSingleRackData$,
      updateSingleRackByPublicId$: this.updateSingleRackByPublicId$,
      singleRackData$: this.singleRackData$,
      detailAnalyticsSurface$: this.detailAnalyticsSurface$,
      loadedRackAnalyticsSurface$: this.loadedRackAnalyticsSurface$,
      rackDetailUnavailableMessage$: this.rackDetailUnavailableMessage$,
      deleteRack$: this.deleteRack$,
      duplicateRack$: this.duplicateRack$,
      downloadRackImageToUserComputer$: this.downloadRackImageToUserComputer$,
      updateRackImagePreview$: this.updateRackImagePreview$,
      currentDownloadElementRef$: this.currentDownloadElementRef$,
      addModuleToRack$: this.addModuleToRack$,
      addBlankToRow$: this.addBlankToRow$,
      moduleAddedFromPicker$: this.moduleAddedFromPicker$,
      shouldShowPanelImages$: this.shouldShowPanelImages$,
      analysisMode$: this.analysisMode$,
      layoutHoverMode$: this.layoutHoverMode$,
      signalFocusArea$: this.signalFocusArea$,
      formData: this.formData,
      rackStatistics$: this.rackStatistics$,
      isRackDataLoading$: this.isRackDataLoading$,
      rowedRackedModules$: this.rowedRackedModules$,
      isRackImageCaptureInProgress$: this.isRackImageCaptureInProgress$,
      rackOrderChange$: this.rackOrderChange$,
      isCurrentRackPropertyOfCurrentUser$: this.isCurrentRackPropertyOfCurrentUser$,
      isCurrentUserAdmin$: this.isCurrentUserAdmin$,
      isCurrentRackEditable$: this.isCurrentRackEditable$,
      isCurrentRackPrivate$: this.isCurrentRackPrivate$,
      userRequestedSmallerScale$: this.userRequestedSmallerScale$,
      requestRackEditableStatusChange$: this.requestRackEditableStatusChange$,
      requestCreatePatchFromRack$: this.requestCreatePatchFromRack$,
      createPatchFromRackInProgress$: this.createPatchFromRackInProgress$,
      requestRackPrivacyStatusChange$: this.requestRackPrivacyStatusChange$,
      requestRackedModuleRemoval$: this.requestRackedModuleRemoval$,
      requestRackedModuleDuplication$: this.requestRackedModuleDuplication$,
      requestRackedModuleReplaceWithBlank$: this.requestRackedModuleReplaceWithBlank$,
      requestRackedModuleRowClearing$: this.requestRackedModuleRowClearing$,
      requestRackedModulePanelSwitch$: this.requestRackedModulePanelSwitch$,
      requestRackedModuleOrientationToggle$: this.requestRackedModuleOrientationToggle$,
      rackedModuleOrientationUpdatingId$: this.rackedModuleOrientationUpdatingId$,
      requestAddNewRow$: this.requestAddNewRow$,
      requestRemoveRow$: this.requestRemoveRow$,
      requestMoveRow$: this.requestMoveRow$,
      requestDuplicateRow$: this.requestDuplicateRow$,
      requestClearRow$: this.requestClearRow$,
      requestDeleteRow$: this.requestDeleteRow$,
      requestLayoutRemix$: this.requestLayoutRemix$,
      requestLayoutShuffle$: this.requestLayoutShuffle$,
      layoutScope$: this.layoutScope$,
      requestRackedModulesDbSync$: this.requestRackedModulesDbSync$,
      loadModulesForRack$: this.loadModulesForRack$,
      takeUntilDestroyed: <T>() => this.takeUntilDestroyed<T>(),
      askForConfirmationWhenDuplicatingRack: () => this.copyOperations.askForConfirmationWhenDuplicatingRack(context),
      askForConfirmationWhenCreatingPatchFromRack: rack => this.copyOperations.askForConfirmationWhenCreatingPatchFromRack(context, rack),
      removeInformationFromModulesOfCurrentRack: rackId => this.copyOperations.removeInformationFromModulesOfCurrentRack(context, rackId),
      createNewRackOnBackendForCurrentUser: userId => this.copyOperations.createNewRackOnBackendForCurrentUser(context, userId),
      callBackendToUpdateModulesOfRack: (rackModules, rack) => this.persistenceOperations.callBackendToUpdateModulesOfRack(context, rackModules, rack),
      applyLayoutVariantAction: (rackModules, rack, scope, action) => this.layoutOperations.applyLayoutVariantAction(context, rackModules, rack, scope, action),
      assertBackendSuccess: response => this.persistenceOperations.assertBackendSuccess(response),
      applyPersistedRackingIds: (response, rackModules, targetUnsyncedModules) =>
        this.persistenceOperations.applyPersistedRackingIds(response, rackModules, targetUnsyncedModules),
      insertOptimisticModule: (rackModules, data) => this.persistenceOperations.insertOptimisticModule(context, rackModules, data),
      removeRackedModuleByReference: target => this.persistenceOperations.removeRackedModuleByReference(context, target),
      persistRackRowsAndModules: (rackModules, rack) => this.persistenceOperations.persistRackRowsAndModules(context, rackModules, rack),
      showUndoSnackBar: (message, undoFactory, undoSuccessMessage, duration) =>
        this.persistenceOperations.showUndoSnackBar(context, message, undoFactory, undoSuccessMessage, duration),
      restoreRackLayout$: snapshotRows => this.persistenceOperations.restoreRackLayout$(context, snapshotRows),
      restoreRemovedModules$: modules => this.persistenceOperations.restoreRemovedModules$(context, modules),
      undoBlankReplacement$: (originalModule, blankModule) =>
        this.persistenceOperations.undoBlankReplacement$(context, originalModule, blankModule),
      undoDeletedRow$: rowId => this.persistenceOperations.undoDeletedRow$(context, rowId),
      generateRackJpegWithoutAnalysisOverlays$: el => this.generateRackJpegWithoutAnalysisOverlays$(el),
      transferInRow: (rackedModules, row, event) => this.layoutOperations.transferInRow(rackedModules, row, event),
      updateModulesColumnIds: (rackModules, row) => this.layoutOperations.updateModulesColumnIds(rackModules, row),
      updateRackRowCoordinates: (rackModules, rowCount) => this.layoutOperations.updateRackRowCoordinates(rackModules, rowCount),
      transferBetweenRows: (rackedModules, module, event, newRow) =>
        this.layoutOperations.transferBetweenRows(rackedModules, module, event, newRow),
      removeRackedModuleFromRack: (rackedModules, toRemove) => this.layoutOperations.removeRackedModuleFromRack(rackedModules, toRemove),
      duplicateModule: (rackedModules, module) => this.layoutOperations.duplicateModule(rackedModules, module),
      canToggleRackModuleOrientation: (rackedModule, isOwner, isEditable) =>
        this.canToggleRackModuleOrientation(rackedModule, isOwner, isEditable),
      isAnyRackModuleOrientationUpdating: () => this.isAnyRackModuleOrientationUpdating(),
      waitForRackModuleOrientationUpdateIdle: () => this.waitForRackModuleOrientationUpdateIdle(),
      findRackedModuleById: (rackModules, rackModuleId) => this.findRackedModuleById(rackModules, rackModuleId),
      applyRackModuleOrientation: (rackModuleId, orientation, requestedModule) =>
        this.applyRackModuleOrientation(rackModuleId, orientation, requestedModule),
      withCurrentRackModuleOrientations: rackModules => this.withCurrentRackModuleOrientations(rackModules),
    };
    return context;
  }

  canToggleRackModuleOrientation(
    rackedModule: RackedModule,
    isOwner: boolean = this.isCurrentRackPropertyOfCurrentUser$.value,
    isEditable: boolean = this.isCurrentRackEditable$.value
  ): boolean {
    return isOwner
      && isEditable
      && rackedModule.rackingData.id != null
      && isFlippableRackModuleStandard(rackedModule.module?.standard?.id);
  }

  rackModuleOrientationActionLabel(rackedModule: RackedModule): string {
    return normalizeRackModuleOrientation(rackedModule.rackingData.orientation) === RACK_MODULE_ORIENTATIONS.rot180
      ? 'Undo flip'
      : 'Flip 180°';
  }

  rackModuleOrientationActionIcon(rackedModule: RackedModule): string {
    return normalizeRackModuleOrientation(rackedModule.rackingData.orientation) === RACK_MODULE_ORIENTATIONS.rot180
      ? 'rotate_left'
      : 'rotate_right';
  }

  rackModuleOrientationActionTooltip(rackedModule: RackedModule): string {
    return normalizeRackModuleOrientation(rackedModule.rackingData.orientation) === RACK_MODULE_ORIENTATIONS.rot180
      ? 'Restore normal orientation'
      : 'Flip module 180°';
  }

  isRackModuleOrientationUpdating(_rackedModule: RackedModule): boolean {
    return this.isAnyRackModuleOrientationUpdating();
  }

  isAnyRackModuleOrientationUpdating(): boolean {
    return this.rackedModuleOrientationUpdatingId$.value !== null;
  }

  private findRackedModuleById(rackModules: RackedModule[][], rackModuleId: number): RackedModule | undefined {
    return rackModules.flatMap(row => row)
      .find(module => module.rackingData.id === rackModuleId);
  }

  private applyRackModuleOrientation(
    rackModuleId: number,
    orientation: RackModuleOrientation,
    requestedModule: RackedModule
  ): void {
    const rackModules = this.rowedRackedModules$.value ?? [];
    const targetModule = this.findRackedModuleById(rackModules, rackModuleId);
    if (!targetModule) {
      return;
    }

    targetModule.rackingData.orientation = orientation;
    if (requestedModule.rackingData.id === rackModuleId) {
      requestedModule.rackingData.orientation = orientation;
    }
    this.rowedRackedModules$.next(rackModules.map(row => [...row]));
  }

  private withCurrentRackModuleOrientations(rackModules: RackedModule[][]): RackedModule[][] {
    const orientationByRackingId = new Map<number, RackModuleOrientation>();
    for (const module of this.rowedRackedModules$.value?.flat() ?? []) {
      const rackingId = module.rackingData.id;
      if (rackingId != null) {
        orientationByRackingId.set(rackingId, normalizeRackModuleOrientation(module.rackingData.orientation));
      }
    }

    for (const module of rackModules.flat()) {
      const rackingId = module.rackingData.id;
      const currentOrientation = rackingId == null ? undefined : orientationByRackingId.get(rackingId);
      if (currentOrientation) {
        module.rackingData.orientation = currentOrientation;
      }
    }

    return rackModules;
  }

  private waitForRackModuleOrientationUpdateIdle(): Observable<number | null> {
    return this.rackedModuleOrientationUpdatingId$.pipe(
      filter(id => id === null),
      take(1)
    );
  }
}

export const RACK_DETAIL_DATA_SUBSERVICES = [
  RackDetailRowLayoutDataService,
  RackDetailEditingDataService,
  RackDetailLoadingDataService,
  RackDetailModuleReplacementDataService,
  RackDetailModulePlacementDataService,
  RackDetailMediaImportDataService,
  RackDetailCopyOperationsService,
  RackDetailPersistenceOperationsService,
  RackDetailLayoutOperationsService,
  RackDetailImageOperationsService,
];

export const RACK_DETAIL_DATA_PROVIDERS = [
  ...RACK_DETAIL_DATA_SUBSERVICES,
  RackDetailDataService,
];
