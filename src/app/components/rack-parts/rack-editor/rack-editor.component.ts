import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  HostListener,
  Input,
  OnChanges,
  OnInit,
  SimpleChanges,
  ViewChild
} from '@angular/core';
import { animate, animateChild, query, style, transition, trigger } from '@angular/animations';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subject } from 'rxjs';
import {
  filter,
  withLatestFrom
} from 'rxjs/operators';
import { AnalyticsService } from 'src/app/features/backbone/analytics-integration/analytics.service';
import { RackedModule } from 'src/app/models/module';
import { RackMinimal } from 'src/app/models/rack';
import { RackDetailDataService } from 'src/app/components/rack-parts/rack-detail-data.service';
import {
  GeneralContextMenuDataService
} from 'src/app/shared-interproject/components/@smart/general-context-menu/general-context-menu-data.service';
import { SubManager } from 'src/app/shared-interproject/directives/subscription-manager';
import {
  defaultModuleMinimalViewConfig,
  ModuleMinimalViewConfig
} from '../../module-parts/module-minimal/module-minimal.component';
import {
  RackAnalysisMode,
  RackLayoutHoverMode,
  RACK_ANALYSIS_MODE_OPTIONS,
  RACK_ANALYSIS_MODES,
  RACK_ANALYSIS_PANEL_COPY,
  RACK_LAYOUT_ANALYSIS_LEGEND_ITEMS,
  RACK_LAYOUT_HOVER_MODE_OPTIONS,
  RACK_LAYOUT_SCOPE_OPTIONS,
  RACK_SIGNAL_ANALYSIS_LEGEND_ITEMS,
  RACK_SIGNAL_FOCUS_OPTIONS
} from '../rack-analysis-mode';
import { RackLayoutScope } from '../rack-layout-analysis.utils';
import { SignalFocusArea } from '../rack-signal-analysis.utils';
import { prefersTouchInteraction } from 'src/app/shared-interproject/touch-interaction.utils';
import {
  ModuleRightClick,
  RackEditorModuleAction,
  RowOverflowClick
} from './rack-editor.types';
import { RackEditorViewportService } from './rack-editor-viewport.service';
import { RackEditorModuleActionsService } from './rack-editor-module-actions.service';
import {
  RackEditorLayoutAnalysisService,
  RackLayoutRowScopeOption
} from './rack-editor-layout-analysis.service';

export type { ModuleRightClick } from './rack-editor.types';

@Component({
  selector: 'app-rack-editor',
  templateUrl: './rack-editor.component.html',
  styleUrls: ['./rack-editor.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    GeneralContextMenuDataService,
    RackEditorViewportService,
    RackEditorModuleActionsService,
    RackEditorLayoutAnalysisService
  ],
  animations: [
    trigger('enter', [
      transition(':enter', [
        style({opacity: 0}),
        animate('1525ms {{ delay }}ms ease', style({opacity: 1})),
        query('@*', animateChild(), { optional: true })
      ], { params: { delay: 0 } })
    ]),
    trigger('leave', [
      transition(':leave', [
        animate('1ms ease', style({opacity: 0}))
      ])
    ])
  ],
  standalone: false
})
export class RackEditorComponent extends SubManager implements OnInit, OnChanges, AfterViewInit {
  @Input() data: RackMinimal;

  readonly touchInteractionMode = prefersTouchInteraction();
  readonly analysisModes = RACK_ANALYSIS_MODES;
  readonly analysisModeOptions = RACK_ANALYSIS_MODE_OPTIONS;
  readonly analysisPanelCopy = RACK_ANALYSIS_PANEL_COPY;
  readonly layoutHoverModeOptions = RACK_LAYOUT_HOVER_MODE_OPTIONS;
  readonly layoutScopeOptions = RACK_LAYOUT_SCOPE_OPTIONS;
  readonly signalAnalysisLegendItems = RACK_SIGNAL_ANALYSIS_LEGEND_ITEMS;
  readonly layoutAnalysisLegendItems = RACK_LAYOUT_ANALYSIS_LEGEND_ITEMS;
  readonly signalFocusOptions = RACK_SIGNAL_FOCUS_OPTIONS;
  readonly moduleActions: RackEditorModuleAction[];
  readonly touchTrayModuleActions: RackEditorModuleAction[];

  moduleRightClick$ = new Subject<ModuleRightClick>();
  selectedTouchModule: RackedModule | null = null;

  viewConfig: ModuleMinimalViewConfig = {
    ...defaultModuleMinimalViewConfig,
    hideLabels: true,
    hideManufacturer: false,
    hideDescription: false,
    hideButtons: true,
    hideHP: false,
    hideDates: true,
    hideTags: true
  };

  @ViewChild('screen') screenReference: ElementRef;
  @ViewChild('rackViewport') set rackViewport(reference: ElementRef<HTMLElement> | undefined) {
    this.syncViewportRackData();
    this.viewport.setRackViewport(reference);
  }
  @ViewChild('rackScaleSurface', {read: ElementRef}) set rackScaleSurface(reference: ElementRef<HTMLElement> | undefined) {
    this.syncViewportRackData();
    this.viewport.setRackScaleSurface(reference);
  }
  @ViewChild('canvas') canvasReference: ElementRef;
  @ViewChild('download') downloadReference: ElementRef;

  constructor(
    public snackBar: MatSnackBar,
    public dataService: RackDetailDataService,
    public contextMenu: GeneralContextMenuDataService,
    private cdr: ChangeDetectorRef,
    dialog: MatDialog,
    analytics: AnalyticsService,
    private readonly viewport: RackEditorViewportService = new RackEditorViewportService(cdr),
    private readonly moduleActionService: RackEditorModuleActionsService = new RackEditorModuleActionsService(
      dataService,
      contextMenu,
      dialog,
      analytics
    ),
    private readonly layoutAnalysisService: RackEditorLayoutAnalysisService = new RackEditorLayoutAnalysisService(
      dataService,
      analytics
    )
  ) {
    super();
    this.moduleActions = this.moduleActionService.moduleActions;
    this.touchTrayModuleActions = this.moduleActionService.touchTrayModuleActions;
  }

  get autoScale(): number {
    return this.viewport.autoScale;
  }

  set autoScale(value: number) {
    this.viewport.autoScale = value;
  }

  get viewOptionsExpanded(): boolean {
    return this.viewport.viewOptionsExpanded;
  }

  set viewOptionsExpanded(value: boolean) {
    this.viewport.viewOptionsExpanded = value;
  }

  private get rackViewportRef(): ElementRef<HTMLElement> | undefined {
    return this.viewport.rackViewportRef;
  }

  private set rackViewportRef(reference: ElementRef<HTMLElement> | undefined) {
    this.viewport.rackViewportRef = reference;
  }

  private get rackScaleSurfaceRef(): ElementRef<HTMLElement> | undefined {
    return this.viewport.rackScaleSurfaceRef;
  }

  private set rackScaleSurfaceRef(reference: ElementRef<HTMLElement> | undefined) {
    this.viewport.rackScaleSurfaceRef = reference;
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    this.syncViewportRackData();
    this.viewport.onWindowResize();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['data']) {
      this.selectedTouchModule = null;
      this.viewport.setRackData(this.data, true);
    }
  }

  ngOnInit(): void {
    this.updateAutoScale();

    this.moduleRightClick$.pipe(
      withLatestFrom(
        this.dataService.isCurrentRackPropertyOfCurrentUser$,
        this.dataService.isCurrentRackEditable$
      ),
      filter(([, isCurrentRackPropertyOfCurrentUser, isCurrentRackEditable]) =>
        isCurrentRackPropertyOfCurrentUser && isCurrentRackEditable
      ),
      this.takeUntilDestroyed()
    ).subscribe(([{
      $event,
      rackedModule
    }]) => {
      this.moduleActionService.openModuleContextMenu(
        rackedModule,
        $event,
        (action, target) => this.runModuleAction(action, target)
      );
    });
  }

  ngAfterViewInit(): void {
    this.updateAutoScale();
    this.cdr.markForCheck();
  }

  override ngOnDestroy(): void {
    this.viewport.ngOnDestroy();
    this.moduleActionService.ngOnDestroy();
    super.ngOnDestroy();
  }

  rackWidthRem(): number {
    this.syncViewportRackData();
    return this.viewport.rackWidthRem();
  }

  effectiveScale(userRequestedSmallerScale: boolean | null | undefined): number {
    this.syncViewportRackData();
    return this.viewport.effectiveScale(userRequestedSmallerScale);
  }

  scaledRackWidthPx(userRequestedSmallerScale: boolean | null | undefined): number {
    this.syncViewportRackData();
    return this.viewport.scaledRackWidthPx(userRequestedSmallerScale);
  }

  scaledRackHeightPx(userRequestedSmallerScale: boolean | null | undefined): number {
    this.syncViewportRackData();
    return this.viewport.scaledRackHeightPx(userRequestedSmallerScale);
  }

  rackSurfaceTransform(userRequestedSmallerScale: boolean | null | undefined): string {
    this.syncViewportRackData();
    return this.viewport.rackSurfaceTransform(userRequestedSmallerScale);
  }

  shouldDisableDropAnimations(userRequestedSmallerScale: boolean | null | undefined): boolean {
    return this.viewport.shouldDisableDropAnimations(userRequestedSmallerScale);
  }

  toggleViewOptions(): void {
    this.viewport.toggleViewOptions();
  }

  rackDescription(isCurrentRackPropertyOfCurrentUser: boolean, isCurrentRackEditable: boolean): string {
    if (!isCurrentRackPropertyOfCurrentUser) {
      return '';
    }

    if (!isCurrentRackEditable) {
      return 'Press Edit to make changes';
    }

    return this.touchInteractionMode
      ? 'Changes saved automatically / Tap a module for actions / Press and hold for more options'
      : 'Changes saved automatically / Right click on modules for more options / Add modules from below';
  }

  openInspectPanel(rackedModule: RackedModule): void {
    this.moduleActionService.openInspectPanel(rackedModule);
  }

  onTouchModuleSelected(rackedModule: RackedModule): void {
    this.selectedTouchModule = this.selectedTouchModule === rackedModule ? null : rackedModule;
    this.cdr.markForCheck();
  }

  clearSelectedTouchModule(): void {
    this.selectedTouchModule = null;
    this.cdr.markForCheck();
  }

  runSelectedTouchAction(action: RackEditorModuleAction): void {
    if (!this.selectedTouchModule) {
      return;
    }

    this.runModuleAction(action, this.selectedTouchModule);
  }

  shouldShowModuleAction(action: RackEditorModuleAction, rackedModule: RackedModule): boolean {
    return this.moduleActionService.shouldShowModuleAction(action, rackedModule);
  }

  isModuleActionDisabled(action: RackEditorModuleAction, rackedModule: RackedModule): boolean {
    return this.moduleActionService.isModuleActionDisabled(action, rackedModule);
  }

  resolveModuleActionPresentation(action: RackEditorModuleAction, rackedModule: RackedModule): RackEditorModuleAction {
    return this.moduleActionService.resolveModuleActionPresentation(action, rackedModule);
  }

  openSelectedTouchModuleMenu(anchor: HTMLElement | null): void {
    if (!this.selectedTouchModule) {
      return;
    }

    this.moduleActionService.openModuleContextMenu(
      this.selectedTouchModule,
      this.moduleActionService.createContextMenuAnchorEvent(anchor),
      (action, target) => this.runModuleAction(action, target)
    );
  }

  openRowOverflowMenu(event: RowOverflowClick): void {
    this.moduleActionService.openRowOverflowMenu(event);
  }

  setAnalysisMode(mode: RackAnalysisMode): void {
    this.layoutAnalysisService.setAnalysisMode(mode);
  }

  setSignalFocusArea(area: SignalFocusArea): void {
    this.layoutAnalysisService.setSignalFocusArea(area);
  }

  setLayoutHoverMode(mode: RackLayoutHoverMode): void {
    this.layoutAnalysisService.setLayoutHoverMode(mode);
  }

  setLayoutScope(scope: RackLayoutScope): void {
    this.layoutAnalysisService.setLayoutScope(scope);
  }

  layoutRowScopeOptions(rowedRackedModules: RackedModule[][] | null | undefined): RackLayoutRowScopeOption[] {
    return this.layoutAnalysisService.layoutRowScopeOptions(rowedRackedModules);
  }

  isLayoutScopeActive(currentScope: RackLayoutScope | null | undefined, targetScope: RackLayoutScope): boolean {
    return this.layoutAnalysisService.isLayoutScopeActive(currentScope, targetScope);
  }

  requestLayoutRemix(): void {
    this.layoutAnalysisService.requestLayoutRemix();
  }

  requestLayoutShuffle(): void {
    this.layoutAnalysisService.requestLayoutShuffle();
  }

  layoutArrangementSummary(rowedRackedModules: RackedModule[][] | null | undefined): string {
    return this.layoutAnalysisService.layoutArrangementSummary(rowedRackedModules);
  }

  layoutValiditySummary(rowedRackedModules: RackedModule[][] | null | undefined): string {
    return this.layoutAnalysisService.layoutValiditySummary(rowedRackedModules);
  }

  layoutRemixUnavailableReason(rowedRackedModules: RackedModule[][] | null | undefined): string | null {
    return this.layoutAnalysisService.layoutRemixUnavailableReason(rowedRackedModules);
  }

  layoutRemixMoveSummary(rowedRackedModules: RackedModule[][] | null | undefined): string {
    return this.layoutAnalysisService.layoutRemixMoveSummary(rowedRackedModules);
  }

  layoutRemixActionLabel(scope: RackLayoutScope | null | undefined): string {
    return this.layoutAnalysisService.layoutRemixActionLabel(scope);
  }

  layoutShuffleActionLabel(scope: RackLayoutScope | null | undefined): string {
    return this.layoutAnalysisService.layoutShuffleActionLabel(scope);
  }

  setShouldShowPanelImages(show: boolean): void {
    this.layoutAnalysisService.setShouldShowPanelImages(show);
  }

  setReducedScale(reduced: boolean): void {
    this.layoutAnalysisService.setReducedScale(reduced);
  }

  private runModuleAction(action: RackEditorModuleAction, rackedModule: RackedModule): void {
    this.moduleActionService.runModuleAction(action, rackedModule);

    if (action.clearsTouchSelection && this.selectedTouchModule === rackedModule) {
      this.clearSelectedTouchModule();
    }
  }

  private updateAutoScale(): void {
    this.viewport.setRackData(this.data);
  }

  private syncViewportRackData(): void {
    this.viewport.setRackHp(this.data?.hp ?? 0);
  }
}
