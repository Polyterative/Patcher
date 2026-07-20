import {
  CdkDragDrop,
  CdkDragEnd,
  CdkDragStart,
} from '@angular/cdk/drag-drop';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  HostBinding,
  HostListener,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  SimpleChanges,
  ViewChild
} from '@angular/core';
import { animate, animateChild, keyframes, query, style, transition, trigger } from '@angular/animations';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { RackedModule } from 'src/app/models/module';
import { RackMinimal } from 'src/app/models/rack';
import { RackDetailDataService } from '../../rack-detail-data.service';
import {
  RackAnalysisMode,
  RACK_ANALYSIS_MODES,
  RACK_LAYOUT_HOVER_MODES
} from '../../rack-analysis-mode';
import { RackPowerRowBreakdown } from '../../rack-power-breakdown.utils';
import { RackPowerHeatmapVisual } from '../../rack-power-heatmap.utils';
import { RackFunctionVisual, RowFunctionBreakdown } from '../../rack-function-visuals.utils';
import { RackLayoutAnalysisResult } from '../../rack-layout-analysis.utils';
import { RackLayoutHoverVisual } from '../../rack-layout-hover-highlight.utils';
import {
  SignalDestinationMatch,
  SignalModuleAnalysis,
  SignalTypeFamily
} from '../../rack-signal-analysis.utils';
import {
  ModuleRightClick,
  RowOverflowClick,
} from '../rack-editor.types';
import {
  RackRowMoveMotion,
  SignalHoverCardPlacement,
  SignalOverlayFrame,
  SignalOverlayLine,
} from './rack-visual-model.types';
import { RackVisualModelInteractionService } from './rack-visual-model-interaction.service';
import { RackVisualModelLayoutService } from './rack-visual-model-layout.service';
import { RackVisualModelRenderService } from './rack-visual-model-render.service';
import { RackVisualModelSignalService } from './rack-visual-model-signal.service';

@Component({
  selector: 'app-rack-visual-model',
  templateUrl: './rack-visual-model.component.html',
  styleUrls: ['./rack-visual-model.component.scss'],
  providers: [
    RackVisualModelInteractionService,
    RackVisualModelLayoutService,
    RackVisualModelRenderService,
    RackVisualModelSignalService,
  ],
  animations: [
    trigger('enter', [
      transition(':enter', [
        style({opacity: 0}),
        animate('225ms {{ delay }}ms ease', style({opacity: 1})),
        query('@*', animateChild(), { optional: true })
      ], { params: { delay: 0 } })
    ]),
    trigger('leave', [
      transition(':leave', [
        animate('180ms cubic-bezier(0.4, 0, 1, 1)', style({
          opacity: 0,
          transform: 'scale(0.92)'
        }))
      ])
    ]),
    trigger('overflowBorder', [
      transition(':enter', [
        animate('750ms ease-out', keyframes([
          style({ opacity: 0,    offset: 0 }),
          style({ opacity: 1,    offset: 0.20 }),
          style({ opacity: 0.05, offset: 0.38 }),
          style({ opacity: 1,    offset: 0.58 }),
          style({ opacity: 0.05, offset: 0.74 }),
          style({ opacity: 1,    offset: 1 }),
        ]))
      ]),
      transition(':leave', [
        animate('1000ms ease', style({ opacity: 0 }))
      ])
    ])
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class RackVisualModelComponent implements OnInit, OnChanges, AfterViewInit, OnDestroy {
  readonly analysisModes = RACK_ANALYSIS_MODES;
  private readonly destroyState$ = new Subject<void>();

  @HostBinding('class.rackVisualModel--suppressPostDropReorder') suppressPostDropReorder = false;

  @Input() rackData: RackMinimal;
  @Input() rowedRackedModules: RackedModule[][];
  @Input() rackViewportElement: HTMLElement | null = null;
  @Input() isCurrentRackPropertyOfCurrentUser: boolean;
  @Input() isCurrentRackEditable: boolean;
  @Input() suppressHpIndicators = false;
  @Input() selectedTouchModule: RackedModule | null = null;
  @Input() touchPrimaryActionsEnabled = false;
  @Input() dragScale = 1;
  @Input() rackDetailDataService: RackDetailDataService;
  @Input() moduleRightClick$: Subject<ModuleRightClick>;

  @Output() touchModuleSelected = new EventEmitter<RackedModule>();
  @Output() rowOverflowClick = new EventEmitter<RowOverflowClick>();

  @ViewChild('screen') screenReference: ElementRef<HTMLElement>;

  get rowHpOverflow(): number[] {
    return this.render.rowHpOverflow;
  }

  get commonBlankSizes(): readonly number[] {
    return this.render.commonBlankSizes;
  }

  get allBlankSizes(): number[] {
    return this.render.allBlankSizes;
  }

  get touchInteractionMode(): boolean {
    return this.interactions.touchInteractionMode;
  }

  set touchInteractionMode(value: boolean) {
    this.interactions.touchInteractionMode = value;
  }

  get rowMoveMotion$() {
    return this.layout.rowMoveMotion$;
  }

  get layoutAnalysis(): RackLayoutAnalysisResult | null {
    return this.render.layoutAnalysis;
  }

  get signalHoverCardPlacement(): SignalHoverCardPlacement {
    return this.signal.signalHoverCardPlacement;
  }

  get signalOverlayFrame(): SignalOverlayFrame | null {
    return this.signal.signalOverlayFrame;
  }

  get signalOverlayLines(): SignalOverlayLine[] {
    return this.signal.signalOverlayLines;
  }

  constructor(
    private readonly hostElementRef: ElementRef<HTMLElement>,
    public dataService: RackDetailDataService,
    private readonly cdr: ChangeDetectorRef,
    private readonly interactions: RackVisualModelInteractionService,
    private readonly layout: RackVisualModelLayoutService,
    private readonly render: RackVisualModelRenderService,
    private readonly signal: RackVisualModelSignalService,
  ) {
  }

  ngOnInit(): void {
    this.updateVisualState();
    this.dataService.analysisMode$
      .pipe(takeUntil(this.destroyState$))
      .subscribe(() => this.syncAnalysisPresentation());
    this.dataService.signalFocusArea$
      .pipe(takeUntil(this.destroyState$))
      .subscribe(() => this.updateSignalAnalysisState());
    this.dataService.layoutHoverMode$
      .pipe(takeUntil(this.destroyState$))
      .subscribe(() => this.updateLayoutHoverState());
    this.activeRackDetailDataService().requestMoveRow$
      .pipe(takeUntil(this.destroyState$))
      .subscribe(move => this.layout.startRowMoveAnimation(
        move,
        this.rackData?.rows ?? this.rowedRackedModules?.length ?? 0,
        () => this.cdr.markForCheck()
      ));
    this.activeRackDetailDataService().requestRackedModuleReplaceWithBlank$
      .pipe(takeUntil(this.destroyState$))
      .subscribe(module => this.layout.suppressEnterDelayForPosition(
        this.render.rackModulePositionKey(module),
        () => this.cdr.markForCheck()
      ));
  }

  // on after edit update reference on that a service of the current HMTL element reference
  ngAfterViewInit(): void {
    this.dataService.currentDownloadElementRef$.next({
      screen: this.screenReference
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['rowedRackedModules'] && !changes['rowedRackedModules'].firstChange) {
      this.layout.prepareLayoutMoveAnimation({
        previousRows: changes['rowedRackedModules'].previousValue,
        nextRows: changes['rowedRackedModules'].currentValue,
        screenElement: this.screenReference?.nativeElement,
        dragScale: this.dragScale,
        suppressPostDropReorder: this.suppressPostDropReorder,
        keyForModule: module => this.render.rackModuleStableDomKey(module),
        markForCheck: () => this.cdr.markForCheck(),
      });
    }
    if (changes['rowedRackedModules'] || changes['dragScale'] || changes['rackData']) {
      this.updateVisualState();
    }
  }

  ngOnDestroy(): void {
    this.layout.destroy();
    this.interactions.clearTouchInteractionState();
    this.signal.clear();
    this.destroyState$.next();
    this.destroyState$.complete();
  }

  @HostListener('window:resize')
  @HostListener('window:scroll')
  onViewportChanged(): void {
    if (this.render.hoveredRackedModule && this.isSignalModeActive()) {
      this.signal.refreshSignalPresentation(this.signalPresentationParams());
    }
  }

  isLastRowEmpty(rowedRackedModules: RackedModule[][]): boolean { return rowedRackedModules[rowedRackedModules.length - 1].length === 0; }
  effectiveHp(rackedModule: RackedModule): number { return this.render.effectiveHp(rackedModule); }

  setHoveredModule(rackedModule: RackedModule, moduleElement?: EventTarget | null): void {
    this.render.setHoveredModule(rackedModule, moduleElement);
    this.syncAnalysisPresentation();
  }

  clearHoveredModule(rackedModule: RackedModule): void {
    if (this.render.clearHoveredModule(rackedModule)) {
      this.layout.clearLayoutHoverState();
      this.signal.clear(() => this.cdr.markForCheck());
    }
  }

  isHoveredModule(rackedModule: RackedModule): boolean { return this.render.isHoveredModule(rackedModule); }
  isTouchSelectedModule(rackedModule: RackedModule): boolean { return this.selectedTouchModule === rackedModule; }
  shouldShowModuleHoverStats(rackedModule: RackedModule, analysisMode: RackAnalysisMode): boolean { return this.render.shouldShowModuleHoverStats(rackedModule, analysisMode); }
  isSameHpHighlightedModule(rackedModule: RackedModule, analysisMode: RackAnalysisMode): boolean { return this.render.isSameHpHighlightedModule(rackedModule, analysisMode); }
  isSameHpDimmedModule(rackedModule: RackedModule, analysisMode: RackAnalysisMode): boolean { return this.render.isSameHpDimmedModule(rackedModule, analysisMode); }
  shouldShowLayoutHpIndicator(analysisMode: RackAnalysisMode): boolean { return this.render.shouldShowLayoutHpIndicator(analysisMode, this.suppressHpIndicators); }
  signalAnalysisAtHover(): SignalModuleAnalysis | null { return this.signal.signalAnalysisAtHover(); }
  moduleDomKey(rackedModule: RackedModule): string { return this.render.moduleDomKey(rackedModule); }
  rackModuleStableDomKey(rackedModule: RackedModule): string { return this.render.rackModuleStableDomKey(rackedModule); }
  rackModuleTrackKey(rackedModule: RackedModule): number | string { return this.render.rackModuleTrackKey(rackedModule); }
  enterAnimationDelay(rackedModule: RackedModule, index: number): number { return this.layout.enterAnimationDelay(this.render.rackModulePositionKey(rackedModule), index); }

  isSignalSourceModule(rackedModule: RackedModule, analysisMode: RackAnalysisMode): boolean {
    return this.signal.isSignalSourceModule(
      rackedModule,
      analysisMode === this.analysisModes.signal,
      this.render.isHoveredModule(rackedModule)
    );
  }

  signalDestinationMatchFor(rackedModule: RackedModule, analysisMode: RackAnalysisMode): SignalDestinationMatch | null {
    return this.signal.signalDestinationMatchFor(
      rackedModule,
      analysisMode === this.analysisModes.signal,
      this.render.isHoveredModule(rackedModule),
      this.render.moduleDomKey(rackedModule)
    );
  }

  signalDestinationFamily(rackedModule: RackedModule, analysisMode: RackAnalysisMode): SignalTypeFamily | null {
    return this.signal.signalDestinationFamily(
      rackedModule,
      analysisMode === this.analysisModes.signal,
      this.render.isHoveredModule(rackedModule),
      this.render.moduleDomKey(rackedModule)
    );
  }

  signalDestinationRingColor(rackedModule: RackedModule, analysisMode: RackAnalysisMode): string | null { return this.signal.signalDestinationRingColor(this.signalDestinationFamily(rackedModule, analysisMode)); }
  signalDestinationGlowColor(rackedModule: RackedModule, analysisMode: RackAnalysisMode): string | null { return this.signal.signalDestinationGlowColor(this.signalDestinationFamily(rackedModule, analysisMode)); }
  signalDestinationPanelTopColor(rackedModule: RackedModule, analysisMode: RackAnalysisMode): string | null { return this.signal.signalDestinationPanelTopColor(this.signalDestinationFamily(rackedModule, analysisMode)); }
  signalDestinationPanelBottomColor(rackedModule: RackedModule, analysisMode: RackAnalysisMode): string | null { return this.signal.signalDestinationPanelBottomColor(this.signalDestinationFamily(rackedModule, analysisMode)); }
  signalDestinationPanelBorderColor(rackedModule: RackedModule, analysisMode: RackAnalysisMode): string | null { return this.signal.signalDestinationPanelBorderColor(this.signalDestinationFamily(rackedModule, analysisMode)); }

  isSignalMutedModule(rackedModule: RackedModule, analysisMode: RackAnalysisMode): boolean {
    return this.signal.isSignalMutedModule(
      rackedModule,
      analysisMode === this.analysisModes.signal,
      this.render.hoveredRackedModule,
      this.render.isHoveredModule(rackedModule),
      this.render.moduleDomKey(rackedModule)
    );
  }

  layoutAnalysisVisual(rackedModule: RackedModule): RackLayoutHoverVisual | null { return this.layout.layoutAnalysisVisual(this.render.moduleDomKey(rackedModule)); }
  signalLineOpacity(line: SignalOverlayLine): number { return this.signal.signalLineOpacity(line); }
  signalLineStrokeWidth(line: SignalOverlayLine): number { return this.signal.signalLineStrokeWidth(line); }
  signalLineColor(line: SignalOverlayLine): string { return this.signal.signalLineColor(line); }
  signalLineShadow(line: SignalOverlayLine): string { return this.signal.signalLineShadow(line); }
  hasCompletePowerData(rackedModule: RackedModule): boolean { return this.render.hasCompletePowerData(rackedModule); }
  absolutePower(value: number | null | undefined): number { return Math.abs(value ?? 0); }
  setHoveredRow(rowId: number, rowElement?: HTMLElement | null): void { this.render.setHoveredRow(rowId, rowElement, this.rackViewportElement, this.rowedRackedModules); }
  clearHoveredRow(rowId: number): void { this.render.clearHoveredRow(rowId, this.rowedRackedModules); }
  rowPowerBreakdownAt(rowId: number): RackPowerRowBreakdown | null { return this.render.rowPowerBreakdownAt(rowId); }
  rowHpOverflowAt(rowId: number): number { return this.render.rowHpOverflowAt(rowId); }
  isModuleOverflowing(rowId: number, moduleIndex: number): boolean { return this.render.isModuleOverflowing(rowId, moduleIndex, this.rowedRackedModules, this.rackData); }
  rowHpTooltip(rowId: number): string { return this.render.rowHpTooltip(rowId, this.rowedRackedModules, this.rackData); }

  get totalHpOverflow(): number {
    return this.render.totalHpOverflow();
  }

  isRowAnalysisPanelVisible(rowId: number): boolean { return this.render.isRowAnalysisPanelVisible(rowId, this.rowedRackedModules); }
  isRowHovered(rowId: number): boolean { return this.render.isRowHovered(rowId); }
  rowRemainingHp(rowId: number): number { return this.render.rowRemainingHp(rowId, this.rowedRackedModules, this.rackData); }
  shouldShowRowPowerPanel(rowId: number, analysisMode: RackAnalysisMode): boolean { return this.render.shouldShowRowPowerPanel(rowId, analysisMode, this.rowedRackedModules); }
  shouldShowRowFunctionPanel(rowId: number, analysisMode: RackAnalysisMode): boolean { return this.render.shouldShowRowFunctionPanel(rowId, analysisMode, this.rowedRackedModules); }
  shouldShowRowLayoutPanel(rowId: number, analysisMode: RackAnalysisMode): boolean { return this.render.shouldShowRowLayoutPanel(rowId, analysisMode, this.rowedRackedModules); }
  isRowPowerPanelBelow(rowId: number): boolean { return this.render.isRowPowerPanelBelow(rowId); }
  rowPowerMissingLabel(rowId: number): string { return this.render.rowPowerMissingLabel(rowId); }
  rowPowerHeaderLabel(rowId: number): string { return this.render.rowPowerHeaderLabel(rowId); }
  rowFunctionBreakdownAt(rowId: number): RowFunctionBreakdown | null { return this.render.rowFunctionBreakdownAt(rowId); }
  rowFunctionResidualLabel(rowId: number): string { return this.render.rowFunctionResidualLabel(rowId); }
  rowLayoutUsedHp(rowId: number): number { return this.render.rowLayoutUsedHp(rowId, this.rackData); }
  rowLayoutStatusLabel(rowId: number): string { return this.render.rowLayoutStatusLabel(rowId); }
  rowLayoutFooterLabel(rowId: number): string { return this.render.rowLayoutFooterLabel(rowId); }
  rowLayoutPanelClass(rowId: number): string { return this.render.rowLayoutPanelClass(rowId); }
  powerAnalysisVisual(rackedModule: RackedModule): RackPowerHeatmapVisual { return this.render.powerAnalysisVisual(rackedModule); }
  functionAnalysisVisual(rackedModule: RackedModule): RackFunctionVisual { return this.render.functionAnalysisVisual(rackedModule); }
  analysisVisualClass(rackedModule: RackedModule, analysisMode: RackAnalysisMode): string { return this.render.analysisVisualClass(rackedModule, analysisMode, this.layoutAnalysisVisual(rackedModule)); }

  isModuleDragDisabled(rackedModule: RackedModule): boolean { return this.interactions.isModuleDragDisabled(rackedModule, this.isCurrentRackEditable, this.isCurrentRackPropertyOfCurrentUser); }

  openRowOverflow(event: MouseEvent, rowId: number): void {
    event.preventDefault();
    event.stopPropagation();
    this.rowOverflowClick.emit({
      $event: event,
      rowId,
      totalRows: this.rackData?.rows ?? 0,
      rowModuleCount: this.rowedRackedModules?.[rowId]?.length ?? 0,
    });
  }

  onModulePointerDown(event: PointerEvent, rackedModule: RackedModule): void {
    this.interactions.onModulePointerDown(
      event,
      rackedModule,
      this.isCurrentRackEditable,
      this.isCurrentRackPropertyOfCurrentUser,
      this.moduleRightClick$,
      () => this.cdr.markForCheck()
    );
  }

  onModulePointerMove(event: PointerEvent, rackedModule: RackedModule): void { this.interactions.onModulePointerMove(event, rackedModule); }

  onModulePointerUp(eventOrModule: PointerEvent | RackedModule, maybeRackedModule?: RackedModule): void {
    this.interactions.onModulePointerUp(
      eventOrModule,
      maybeRackedModule,
      this.touchPrimaryActionsEnabled,
      module => this.touchModuleSelected.emit(module)
    );
  }

  onModulePointerCancel(rackedModule: RackedModule): void { this.interactions.onModulePointerCancel(rackedModule); }

  onDropListDropped(event: CdkDragDrop<ElementRef>, rowId: number, module: RackedModule): void {
    this.interactions.onDropListDropped(
      event,
      rowId,
      module,
      this.rackDetailDataService,
      () => this.layout.suppressLayoutMoveAnimationForManualDrop(),
      value => this.suppressPostDropReorder = value,
      () => this.cdr.markForCheck()
    );
  }

  onDragStarted(event: CdkDragStart<RackedModule>, module: RackedModule): void { this.interactions.onDragStarted(event, module, () => this.cdr.markForCheck()); }
  onDragReleased(event: unknown, module: RackedModule): void { this.interactions.onDragReleased(event, module, () => this.cdr.markForCheck()); }

  onDragEnded(event: CdkDragEnd<RackedModule>, module: RackedModule): void {
    this.interactions.onDragEnded(
      event,
      module,
      () => this.suppressPostDropReorder,
      () => this.cdr.markForCheck()
    );
  }

  isDragImageAnimationSuppressed(module: RackedModule): boolean { return this.interactions.isDragImageAnimationSuppressed(module); }
  isDropRevealSuppressed(module: RackedModule): boolean { return this.interactions.isDropRevealSuppressed(module); }
  isDropRevealAnimating(module: RackedModule): boolean { return this.interactions.isDropRevealAnimating(module); }
  isRowMovingUp(rowId: number, motion: RackRowMoveMotion | null): boolean { return this.layout.isRowMovingUp(rowId, motion); }
  isRowMovingDown(rowId: number, motion: RackRowMoveMotion | null): boolean { return this.layout.isRowMovingDown(rowId, motion); }
  isModuleLayoutMoveAnimating(module: RackedModule): boolean { return this.layout.isModuleLayoutMoveAnimating(this.render.rackModuleStableDomKey(module)); }
  isModuleAnimationSuppressed(module: RackedModule): boolean { return this.isDragImageAnimationSuppressed(module) || this.isModuleLayoutMoveAnimating(module); }
  isEnterDelaySuppressed(module: RackedModule): boolean { return this.layout.isEnterDelaySuppressed(this.render.rackModulePositionKey(module)); }
  areLayoutMoveAngularAnimationsDisabled(): boolean { return this.layout.areLayoutMoveAngularAnimationsDisabled(); }
  signalOverlayViewBox(): string | null { return this.signal.signalOverlayViewBox(); }

  private updateVisualState(): void { this.render.update(this.rowedRackedModules, this.rackData); this.syncAnalysisPresentation(); }
  private syncAnalysisPresentation(): void { this.updateLayoutHoverState(); this.updateSignalAnalysisState(); }

  private updateLayoutHoverState(): void {
    this.layout.updateLayoutHoverState({
      rowedRackedModules: this.rowedRackedModules,
      hoveredRackedModule: this.render.hoveredRackedModule,
      isLayoutModeActive: this.isLayoutModeActive(),
      isLayoutCombinationHoverModeActive: this.isLayoutCombinationHoverModeActive(),
      moduleDomKey: module => this.render.moduleDomKey(module),
      markForCheck: () => this.cdr.markForCheck(),
    });
  }

  private updateSignalAnalysisState(): void {
    this.signal.updateSignalAnalysisState({
      ...this.signalPresentationParams(),
      focusArea: this.dataService.signalFocusArea$.value,
      isSignalModeActive: this.isSignalModeActive(),
      markForCheck: () => this.cdr.markForCheck(),
    });
  }

  private signalPresentationParams() {
    return {
      hoveredRackedModule: this.render.hoveredRackedModule,
      hoveredModuleElement: this.render.hoveredModuleElement,
      rowedRackedModules: this.rowedRackedModules,
      screenElement: this.screenReference?.nativeElement,
      hostElement: this.hostElementRef.nativeElement,
      rackViewportElement: this.rackViewportElement,
      moduleDomKey: (module: RackedModule) => this.render.moduleDomKey(module),
    };
  }

  private isLayoutModeActive(): boolean { return this.dataService.analysisMode$.value === this.analysisModes.layout; }
  private isLayoutCombinationHoverModeActive(): boolean { return this.dataService.layoutHoverMode$.value === RACK_LAYOUT_HOVER_MODES.combinations; }
  private isSignalModeActive(): boolean { return this.dataService.analysisMode$.value === this.analysisModes.signal; }
  private activeRackDetailDataService(): RackDetailDataService { return this.rackDetailDataService ?? this.dataService; }
}
