import {
  CdkDragEnd,
  CdkDragDrop,
  CdkDragStart,
} from '@angular/cdk/drag-drop';
import {
  AfterViewInit,
  ChangeDetectorRef,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostBinding,
  HostListener,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  SimpleChanges,
  ViewChild
} from '@angular/core';
import { fadeInOnEnterAnimation } from 'angular-animations';
import { Subject } from 'rxjs';
import { RackedModule } from 'src/app/models/module';
import { RackMinimal } from 'src/app/models/rack';
import {
  buildRackPowerBreakdown,
  RackPowerRowBreakdown
} from '../../rack-power-breakdown.utils';
import {
  buildRackPowerHeatmapVisuals,
  defaultRackPowerHeatmapVisual,
  RackPowerHeatmapVisual,
  rackPowerHeatmapKey
} from '../../rack-power-heatmap.utils';
import {
  buildRackFunctionVisual,
  buildRowFunctionBreakdowns,
  buildRowFunctionResidualLabel,
  RackFunctionVisual,
  RowFunctionBreakdown
} from '../../rack-function-visuals.utils';
import { hasCompletePowerData } from '../../rack-power-data.utils';
import { RackDetailDataService } from '../../rack-detail-data.service';
import { ModuleRightClick } from '../rack-editor.component';
import { RackAnalysisMode, RACK_ANALYSIS_MODES } from '../../rack-analysis-mode';
import { prefersTouchInteraction } from 'src/app/shared-interproject/touch-interaction.utils';
import {
  buildSignalModuleAnalysis,
  SignalDestinationConfidence,
  SignalDestinationMatch,
  SignalModuleAnalysis,
  suggestSignalFocusArea,
  SignalTypeFamily
} from '../../rack-signal-analysis.utils';
import { takeUntil } from 'rxjs/operators';

interface SignalOverlayLine {
  key: string;
  path: string;
  family: SignalTypeFamily;
  confidence: SignalDestinationConfidence;
}

type SignalHoverCardPlacement = 'left' | 'right';

interface SignalOverlayFrame {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface ModuleRenderRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
  centerX: number;
  centerY: number;
}


@Component({
  selector: 'app-rack-visual-model',
  templateUrl: './rack-visual-model.component.html',
  styleUrls: ['./rack-visual-model.component.scss'],
  animations: [
    fadeInOnEnterAnimation({
      duration: 225,
      anchor: 'enter',
      animateChildren: 'after'
      // animateChildren: 'before',
    })
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class RackVisualModelComponent implements OnInit, OnChanges, AfterViewInit, OnDestroy {
  readonly analysisModes = RACK_ANALYSIS_MODES;
  private static readonly signalFamilyColors: Record<SignalTypeFamily, string> = {
    audio: '#e2523c',
    pitch: '#7b61ff',
    clock: '#17a36b',
    modulation: '#2f80ed',
    other: '#76889b',
  };
  private static readonly rowAnalysisPanelHeightPx = 136;
  private static readonly dropRevealAnimationDurationMs = 225;
  private static readonly signalHoverCardWidthPx = 224;
  private static readonly signalHoverCardGapPx = 10;
  private static readonly touchContextMenuDelayMs = 550;
  private static readonly touchLongPressMoveTolerancePx = 12;
  readonly touchInteractionMode = prefersTouchInteraction();
  private readonly destroyState$ = new Subject<void>();
  private hoveredRackedModule: RackedModule | null = null;
  private hoveredModuleElement: HTMLElement | null = null;
  private dragImageAnimationSuppressedModule: RackedModule | null = null;
  private dropRevealSuppressedModule: RackedModule | null = null;
  private dropRevealAnimatingModule: RackedModule | null = null;
  private touchLongPressTimerId: number | null = null;
  private touchLongPressModule: RackedModule | null = null;
  private touchLongPressStartPoint: {x: number; y: number} | null = null;
  private touchContextMenuBlockedModule: RackedModule | null = null;
  private hoveredRowIndex: number | null = null;
  private hoveredRowPowerPanelPlacement: 'above' | 'below' = 'above';
  private rowPowerBreakdown: RackPowerRowBreakdown[] = [];
  private rowFunctionBreakdowns = new Map<number, RowFunctionBreakdown>();
  private modulePowerHeatmap = new Map<string, RackPowerHeatmapVisual>();
  private signalAnalysis: SignalModuleAnalysis | null = null;
  private signalDestinationMatches = new Map<string, SignalDestinationMatch>();
  signalHoverCardPlacement: SignalHoverCardPlacement = 'right';
  signalOverlayFrame: SignalOverlayFrame | null = null;
  signalOverlayLines: SignalOverlayLine[] = [];
  @HostBinding('class.rackVisualModel--suppressPostDropReorder') suppressPostDropReorder = false;
  
  @Input() rackData: RackMinimal;
  
  @Input() rowedRackedModules: RackedModule[][];
  @Input() rackViewportElement: HTMLElement | null = null;
  @Input() isCurrentRackPropertyOfCurrentUser: boolean;
  @Input() isCurrentRackEditable: boolean;
  @Input() dragScale = 1;
  
  @Input() rackDetailDataService: RackDetailDataService;
  
  @Input() moduleRightClick$: Subject<ModuleRightClick>;
  
  @ViewChild('screen') screenReference: ElementRef;
  
  
  constructor(
    private readonly hostElementRef: ElementRef<HTMLElement>,
    public dataService: RackDetailDataService,
    private readonly cdr: ChangeDetectorRef,
  ) {
  }
  
  ngOnInit(): void {
    this.updateRowPowerBreakdown();
    this.dataService.analysisMode$
      .pipe(takeUntil(this.destroyState$))
      .subscribe(() => this.updateSignalAnalysisState());
    this.dataService.signalFocusArea$
      .pipe(takeUntil(this.destroyState$))
      .subscribe(() => this.updateSignalAnalysisState());
  }
  
  // on after edit update reference on that a service of the current HMTL element reference
  ngAfterViewInit(): void {
    this.dataService.currentDownloadElementRef$.next({
      screen: this.screenReference
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['rowedRackedModules'] || changes['dragScale']) {
      this.updateRowPowerBreakdown();
    }
  }

  ngOnDestroy(): void {
    this.clearTouchInteractionState();
    this.destroyState$.next();
    this.destroyState$.complete();
  }

  @HostListener('window:resize')
  @HostListener('window:scroll')
  onViewportChanged(): void {
    if (this.hoveredRackedModule && this.isSignalModeActive()) {
      this.refreshSignalPresentation();
    }
  }
  
  isLastRowEmpty(rowedRackedModules: RackedModule[][]): boolean {
    return rowedRackedModules[rowedRackedModules.length - 1].length === 0;
  }

  effectiveHp(rackedModule: RackedModule): number {
    return rackedModule.module.hp;
  }

  setHoveredModule(rackedModule: RackedModule, moduleElement?: EventTarget | null): void {
    this.hoveredRackedModule = rackedModule;
    this.hoveredModuleElement = moduleElement instanceof HTMLElement ? moduleElement : null;
    this.updateSignalAnalysisState();
  }

  clearHoveredModule(rackedModule: RackedModule): void {
    if (this.hoveredRackedModule === rackedModule) {
      this.hoveredRackedModule = null;
      this.hoveredModuleElement = null;
      this.signalAnalysis = null;
      this.signalDestinationMatches.clear();
      this.signalOverlayFrame = null;
      this.signalOverlayLines = [];
      this.cdr.markForCheck();
    }
  }

  isHoveredModule(rackedModule: RackedModule): boolean {
    return this.hoveredRackedModule === rackedModule;
  }

  shouldShowModuleHoverStats(rackedModule: RackedModule, analysisMode: RackAnalysisMode): boolean {
    return analysisMode !== this.analysisModes.off && this.isHoveredModule(rackedModule);
  }

  signalAnalysisAtHover(): SignalModuleAnalysis | null {
    return this.signalAnalysis;
  }

  moduleDomKey(rackedModule: RackedModule): string {
    return `${ rackedModule.rackingData.id }-${ rackedModule.module.id }-${ rackedModule.rackingData.row }-${ rackedModule.rackingData.column }`;
  }

  isSignalSourceModule(rackedModule: RackedModule, analysisMode: RackAnalysisMode): boolean {
    return analysisMode === this.analysisModes.signal && this.isHoveredModule(rackedModule);
  }

  signalDestinationMatchFor(rackedModule: RackedModule, analysisMode: RackAnalysisMode): SignalDestinationMatch | null {
    if (analysisMode !== this.analysisModes.signal || this.isHoveredModule(rackedModule)) {
      return null;
    }

    return this.signalDestinationMatches.get(this.moduleDomKey(rackedModule)) ?? null;
  }

  signalDestinationFamily(rackedModule: RackedModule, analysisMode: RackAnalysisMode): SignalTypeFamily | null {
    return this.signalDestinationMatchFor(rackedModule, analysisMode)?.family ?? null;
  }

  signalDestinationRingColor(rackedModule: RackedModule, analysisMode: RackAnalysisMode): string | null {
    const family = this.signalDestinationFamily(rackedModule, analysisMode);
    return family ? this.withAlpha(RackVisualModelComponent.signalFamilyColors[family], 0.18) : null;
  }

  signalDestinationGlowColor(rackedModule: RackedModule, analysisMode: RackAnalysisMode): string | null {
    const family = this.signalDestinationFamily(rackedModule, analysisMode);
    return family ? this.withAlpha(RackVisualModelComponent.signalFamilyColors[family], 0.08) : null;
  }

  signalDestinationPanelTopColor(rackedModule: RackedModule, analysisMode: RackAnalysisMode): string | null {
    const family = this.signalDestinationFamily(rackedModule, analysisMode);
    return family ? this.withAlpha(RackVisualModelComponent.signalFamilyColors[family], 0.2) : null;
  }

  signalDestinationPanelBottomColor(rackedModule: RackedModule, analysisMode: RackAnalysisMode): string | null {
    const family = this.signalDestinationFamily(rackedModule, analysisMode);
    return family ? this.withAlpha(RackVisualModelComponent.signalFamilyColors[family], 0.34) : null;
  }

  signalDestinationPanelBorderColor(rackedModule: RackedModule, analysisMode: RackAnalysisMode): string | null {
    const family = this.signalDestinationFamily(rackedModule, analysisMode);
    return family ? this.withAlpha(RackVisualModelComponent.signalFamilyColors[family], 0.24) : null;
  }

  isSignalMutedModule(rackedModule: RackedModule, analysisMode: RackAnalysisMode): boolean {
    return analysisMode === this.analysisModes.signal
      && !!this.hoveredRackedModule
      && !this.isHoveredModule(rackedModule)
      && !this.signalDestinationMatches.has(this.moduleDomKey(rackedModule));
  }

  signalLineOpacity(line: SignalOverlayLine): number {
    return line.confidence === 'likely' ? 0.82 : 0.48;
  }

  signalLineStrokeWidth(line: SignalOverlayLine): number {
    return line.confidence === 'likely' ? 3.1 : 2.1;
  }

  signalLineColor(line: SignalOverlayLine): string {
    return RackVisualModelComponent.signalFamilyColors[line.family];
  }

  signalLineShadow(line: SignalOverlayLine): string {
    return `drop-shadow(0 0 0.2rem ${ this.signalLineColor(line) }55)`;
  }

  hasCompletePowerData(rackedModule: RackedModule): boolean {
    return hasCompletePowerData(rackedModule);
  }

  absolutePower(value: number | null | undefined): number {
    return Math.abs(value ?? 0);
  }

  setHoveredRow(rowId: number, rowElement?: HTMLElement | null): void {
    this.hoveredRowIndex = rowId;
    this.hoveredRowPowerPanelPlacement = this.resolveRowPowerPanelPlacement(rowElement ?? null);
    this.updateModulePowerHeatmap();
  }

  clearHoveredRow(rowId: number): void {
    if (this.hoveredRowIndex === rowId) {
      this.hoveredRowIndex = null;
      this.updateModulePowerHeatmap();
    }
  }

  rowPowerBreakdownAt(rowId: number): RackPowerRowBreakdown | null {
    return this.rowPowerBreakdown[rowId] ?? null;
  }

  isRowAnalysisPanelVisible(rowId: number): boolean {
    return this.hoveredRowIndex === rowId && ((this.rowedRackedModules?.[rowId]?.length ?? 0) > 0);
  }

  shouldShowRowPowerPanel(rowId: number, analysisMode: RackAnalysisMode): boolean {
    return this.shouldShowRowAnalysisPanel(rowId, analysisMode, this.analysisModes.power);
  }

  shouldShowRowFunctionPanel(rowId: number, analysisMode: RackAnalysisMode): boolean {
    return this.shouldShowRowAnalysisPanel(rowId, analysisMode, this.analysisModes.function);
  }

  isRowPowerPanelBelow(rowId: number): boolean {
    return this.hoveredRowIndex === rowId && this.hoveredRowPowerPanelPlacement === 'below';
  }

  rowPowerMissingLabel(rowId: number): string {
    const rowPower = this.rowPowerBreakdown[rowId];

    if (!rowPower || rowPower.moduleCount === 0) {
      return '';
    }

    return rowPower.missingPowerDataCount > 0
      ? `${ rowPower.missingPowerDataCount } module${ rowPower.missingPowerDataCount === 1 ? '' : 's' } missing power data`
      : 'All module power data available';
  }

  rowFunctionBreakdownAt(rowId: number): RowFunctionBreakdown | null {
    return this.rowFunctionBreakdowns.get(rowId) ?? null;
  }

  rowFunctionResidualLabel(rowId: number): string {
    return buildRowFunctionResidualLabel(this.rowFunctionBreakdownAt(rowId));
  }

  powerAnalysisVisual(rackedModule: RackedModule): RackPowerHeatmapVisual {
    return this.modulePowerHeatmap.get(rackPowerHeatmapKey(rackedModule)) ?? defaultRackPowerHeatmapVisual();
  }

  functionAnalysisVisual(rackedModule: RackedModule): RackFunctionVisual {
    return buildRackFunctionVisual(rackedModule);
  }

  analysisVisualClass(rackedModule: RackedModule, analysisMode: RackAnalysisMode): string {
    if (analysisMode === this.analysisModes.power) {
      return this.powerAnalysisVisual(rackedModule).className;
    }

    if (analysisMode === this.analysisModes.function) {
      return this.functionAnalysisVisual(rackedModule).className;
    }

    return '';
  }

  isModuleDragDisabled(rackedModule: RackedModule): boolean {
    return !(this.isCurrentRackEditable && this.isCurrentRackPropertyOfCurrentUser)
      || this.touchContextMenuBlockedModule === rackedModule;
  }

  onModulePointerDown(event: PointerEvent, rackedModule: RackedModule): void {
    if (!this.shouldTrackTouchLongPress(event)) {
      return;
    }

    this.clearTouchInteractionState();
    this.touchLongPressModule = rackedModule;
    this.touchLongPressStartPoint = {
      x: event.clientX,
      y: event.clientY
    };
    this.touchLongPressTimerId = window.setTimeout(() => {
      if (this.touchLongPressModule !== rackedModule || !this.touchLongPressStartPoint) {
        return;
      }

      this.touchLongPressTimerId = null;
      this.touchContextMenuBlockedModule = rackedModule;
      this.emitTouchContextMenu(rackedModule, this.touchLongPressStartPoint.x, this.touchLongPressStartPoint.y);
      this.cdr.markForCheck();
    }, RackVisualModelComponent.touchContextMenuDelayMs);
  }

  onModulePointerMove(event: PointerEvent, rackedModule: RackedModule): void {
    if (
      !this.touchInteractionMode
      || event.pointerType !== 'touch'
      || this.touchLongPressModule !== rackedModule
      || !this.touchLongPressStartPoint
    ) {
      return;
    }

    const distanceX = event.clientX - this.touchLongPressStartPoint.x;
    const distanceY = event.clientY - this.touchLongPressStartPoint.y;
    const distanceSquared = (distanceX ** 2) + (distanceY ** 2);

    if (distanceSquared > RackVisualModelComponent.touchLongPressMoveTolerancePx ** 2) {
      this.cancelPendingTouchLongPress(rackedModule);
    }
  }

  onModulePointerUp(rackedModule: RackedModule): void {
    this.clearTouchInteractionState(rackedModule);
  }

  onModulePointerCancel(rackedModule: RackedModule): void {
    this.clearTouchInteractionState(rackedModule);
  }

  onDropListDropped(event: CdkDragDrop<ElementRef>, rowId: number, module: RackedModule): void {
    const shouldAnimateDropReveal = event.previousContainer === event.container;
    this.suppressPostDropReorder = true;
    this.cdr.markForCheck();
    this.rackDetailDataService.rackOrderChange$.next({event, newRow: rowId, module});
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (this.dropRevealSuppressedModule === module) {
          this.dropRevealSuppressedModule = null;
        }
        if (shouldAnimateDropReveal) {
          this.dropRevealAnimatingModule = module;
        }
        if (this.dragImageAnimationSuppressedModule === module) {
          this.dragImageAnimationSuppressedModule = null;
        }
        this.suppressPostDropReorder = false;
        this.cdr.markForCheck();
        if (shouldAnimateDropReveal) {
          window.setTimeout(() => {
            if (this.dropRevealAnimatingModule === module) {
              this.dropRevealAnimatingModule = null;
              this.cdr.markForCheck();
            }
          }, RackVisualModelComponent.dropRevealAnimationDurationMs);
        }
      });
    });
  }

  onDragStarted(_event: CdkDragStart<RackedModule>, module: RackedModule): void {
    this.cancelPendingTouchLongPress(module);
    this.touchContextMenuBlockedModule = null;
    this.dragImageAnimationSuppressedModule = module;
    if (this.dropRevealAnimatingModule === module) {
      this.dropRevealAnimatingModule = null;
    }
    this.cdr.markForCheck();
  }

  onDragReleased(_event: unknown, module: RackedModule): void {
    this.clearTouchInteractionState(module);
    this.dropRevealSuppressedModule = module;
    this.cdr.markForCheck();
  }

  onDragEnded(_event: CdkDragEnd<RackedModule>, module: RackedModule): void {
    this.clearTouchInteractionState(module);
    const shouldClearDragImageSuppression = this.dragImageAnimationSuppressedModule === module;
    const shouldClearDropRevealSuppression = this.dropRevealSuppressedModule === module;

    if (!shouldClearDragImageSuppression && !shouldClearDropRevealSuppression) {
      return;
    }

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (
          shouldClearDropRevealSuppression
          && this.dropRevealSuppressedModule === module
          && !this.suppressPostDropReorder
        ) {
          this.dropRevealSuppressedModule = null;
        }

        if (
          shouldClearDragImageSuppression
          && this.dragImageAnimationSuppressedModule === module
          && !this.suppressPostDropReorder
          && this.dropRevealSuppressedModule !== module
        ) {
          this.dragImageAnimationSuppressedModule = null;
        }

        this.cdr.markForCheck();
      });
    });
  }

  isDragImageAnimationSuppressed(module: RackedModule): boolean {
    return this.dragImageAnimationSuppressedModule === module;
  }

  isDropRevealSuppressed(module: RackedModule): boolean {
    return this.dropRevealSuppressedModule === module;
  }

  isDropRevealAnimating(module: RackedModule): boolean {
    return this.dropRevealAnimatingModule === module;
  }

  private updateRowPowerBreakdown(): void {
    this.rowPowerBreakdown = buildRackPowerBreakdown(this.rowedRackedModules ?? []).rows;
    this.rowFunctionBreakdowns = buildRowFunctionBreakdowns(this.rowedRackedModules);
    if (this.hoveredRowIndex != null && this.hoveredRowIndex >= this.rowPowerBreakdown.length) {
      this.hoveredRowIndex = null;
    }
    this.updateModulePowerHeatmap();
    this.updateSignalAnalysisState();
  }

  private updateModulePowerHeatmap(): void {
    this.modulePowerHeatmap = buildRackPowerHeatmapVisuals(this.rowedRackedModules ?? [], {
      hoveredRowIndex: this.hoveredRowIndex
    });
  }

  private resolveRowPowerPanelPlacement(rowElement: HTMLElement | null): 'above' | 'below' {
    const viewportRect = this.rackViewportElement?.getBoundingClientRect();
    const rowRect = rowElement?.getBoundingClientRect();

    if (!viewportRect || !rowRect) {
      return 'above';
    }

    const availableAbove = rowRect.top - viewportRect.top;
    const availableBelow = viewportRect.bottom - rowRect.bottom;

    if (availableAbove < RackVisualModelComponent.rowAnalysisPanelHeightPx && availableBelow > availableAbove) {
      return 'below';
    }

    if (availableBelow < RackVisualModelComponent.rowAnalysisPanelHeightPx && availableAbove > availableBelow) {
      return 'above';
    }

    return availableAbove >= availableBelow ? 'above' : 'below';
  }

  private shouldShowRowAnalysisPanel(
    rowId: number,
    analysisMode: RackAnalysisMode,
    targetMode: RackAnalysisMode
  ): boolean {
    return analysisMode === targetMode && this.isRowAnalysisPanelVisible(rowId);
  }

  private shouldTrackTouchLongPress(event: PointerEvent): boolean {
    return this.touchInteractionMode
      && event.pointerType === 'touch'
      && this.isCurrentRackEditable
      && this.isCurrentRackPropertyOfCurrentUser;
  }

  private updateSignalAnalysisState(): void {
    if (!this.hoveredRackedModule || !this.isSignalModeActive()) {
      this.signalAnalysis = null;
      this.signalDestinationMatches.clear();
      this.signalHoverCardPlacement = 'right';
      this.signalOverlayFrame = null;
      this.signalOverlayLines = [];
      this.cdr.markForCheck();
      return;
    }

    this.signalAnalysis = buildSignalModuleAnalysis(this.hoveredRackedModule, this.rowedRackedModules, {
      focusArea: this.dataService.signalFocusArea$.value ?? suggestSignalFocusArea(this.hoveredRackedModule),
      maxMatches: 8,
    });
    this.signalDestinationMatches = new Map(
      this.signalAnalysis.destinationMatches
        .map(match => [this.moduleDomKey(match.destination), match])
    );
    this.refreshSignalPresentation();
    this.cdr.markForCheck();
  }

  private refreshSignalPresentation(): void {
    if (!this.hoveredRackedModule || !this.screenReference?.nativeElement) {
      this.signalOverlayFrame = null;
      this.signalOverlayLines = [];
      return;
    }

    this.signalHoverCardPlacement = this.resolveSignalHoverCardPlacement(this.hoveredModuleElement);
    this.signalOverlayLines = this.buildSignalOverlayLines();
  }

  private buildSignalOverlayLines(): SignalOverlayLine[] {
    const hoveredModule = this.hoveredRackedModule;

    if (!hoveredModule || !this.screenReference?.nativeElement) {
      this.signalOverlayFrame = null;
      return [];
    }

    const screenElement = this.screenReference.nativeElement as HTMLElement;
    const hostRect = this.hostElementRef.nativeElement.getBoundingClientRect();
    const screenRect = screenElement.getBoundingClientRect();
    const moduleElements = this.buildRenderedModuleElementMap(screenElement);
    const sourceElement = this.hoveredModuleElement ?? moduleElements.get(this.moduleDomKey(hoveredModule)) ?? null;
    this.signalOverlayFrame = {
      left: screenRect.left - hostRect.left,
      top: screenRect.top - hostRect.top,
      width: screenRect.width,
      height: screenRect.height,
    };
    const sourceRect = this.resolveRenderedModuleRect(sourceElement, screenRect);

    if (!sourceRect) {
      this.signalOverlayFrame = null;
      return [];
    }

    return Array.from(this.signalDestinationMatches.values())
      .map(match => {
        const destinationRect = this.resolveRenderedModuleRect(
          moduleElements.get(this.moduleDomKey(match.destination)) ?? null,
          screenRect
        );
        if (!destinationRect) {
          return null;
        }

        return {
          key: `${ this.moduleDomKey(hoveredModule) }->${ this.moduleDomKey(match.destination) }`,
          path: this.buildCurvedSignalPath(sourceRect, destinationRect),
          family: match.family,
          confidence: match.confidence
        };
      })
      .filter((line): line is SignalOverlayLine => !!line);
  }

  private resolveRenderedModuleRect(candidateElement: HTMLElement | null, screenRect: DOMRect): ModuleRenderRect | null {
    if (!(candidateElement instanceof HTMLElement)) {
      return null;
    }

    const rect = candidateElement.getBoundingClientRect();

    return {
      left: rect.left - screenRect.left,
      top: rect.top - screenRect.top,
      right: rect.right - screenRect.left,
      bottom: rect.bottom - screenRect.top,
      centerX: (rect.left + rect.right) / 2 - screenRect.left,
      centerY: (rect.top + rect.bottom) / 2 - screenRect.top,
    };
  }

  private buildCurvedSignalPath(sourceRect: ModuleRenderRect, destinationRect: ModuleRenderRect): string {
    const startX = destinationRect.centerX >= sourceRect.centerX ? sourceRect.right : sourceRect.left;
    const endX = destinationRect.centerX >= sourceRect.centerX ? destinationRect.left : destinationRect.right;
    const startY = sourceRect.centerY;
    const endY = destinationRect.centerY;
    const horizontalDirection = destinationRect.centerX >= sourceRect.centerX ? 1 : -1;
    const horizontalDistance = Math.abs(endX - startX);
    const controlOffset = Math.max(28, Math.min(96, horizontalDistance * 0.45));
    const controlPoint1X = startX + (controlOffset * horizontalDirection);
    const controlPoint2X = endX - (controlOffset * horizontalDirection);

    return `M ${ startX } ${ startY } C ${ controlPoint1X } ${ startY }, ${ controlPoint2X } ${ endY }, ${ endX } ${ endY }`;
  }

  private resolveSignalHoverCardPlacement(moduleElement?: HTMLElement | null): SignalHoverCardPlacement {
    const candidateElement = moduleElement
      ?? (this.hoveredRackedModule
        ? (this.screenReference?.nativeElement?.querySelector?.(`[data-rack-module-key="${ this.moduleDomKey(this.hoveredRackedModule) }"]`) as HTMLElement | null)
        : null);
    const viewportRect = this.rackViewportElement?.getBoundingClientRect();

    if (!(candidateElement instanceof HTMLElement) || !viewportRect) {
      return 'right';
    }

    const moduleRect = candidateElement.getBoundingClientRect();
    const availableRight = viewportRect.right - moduleRect.right;
    const availableLeft = moduleRect.left - viewportRect.left;
    const requiredWidth = RackVisualModelComponent.signalHoverCardWidthPx + RackVisualModelComponent.signalHoverCardGapPx;

    if (availableRight < requiredWidth && availableLeft > availableRight) {
      return 'left';
    }

    if (availableLeft >= requiredWidth && availableLeft > availableRight) {
      return 'left';
    }

    return 'right';
  }

  private buildRenderedModuleElementMap(screenElement: HTMLElement): Map<string, HTMLElement> {
    return new Map(
      Array.from(screenElement.querySelectorAll<HTMLElement>('[data-rack-module-key]'))
        .map(element => [element.dataset['rackModuleKey'], element] as const)
        .filter((entry): entry is [string, HTMLElement] => !!entry[0])
    );
  }

  signalOverlayViewBox(): string | null {
    if (!this.signalOverlayFrame) {
      return null;
    }

    return `0 0 ${ this.signalOverlayFrame.width } ${ this.signalOverlayFrame.height }`;
  }

  private withAlpha(hexColor: string, alpha: number): string {
    const normalizedHex = hexColor.replace('#', '');
    const expandedHex = normalizedHex.length === 3
      ? normalizedHex.split('').map(char => `${ char }${ char }`).join('')
      : normalizedHex;
    const red = Number.parseInt(expandedHex.slice(0, 2), 16);
    const green = Number.parseInt(expandedHex.slice(2, 4), 16);
    const blue = Number.parseInt(expandedHex.slice(4, 6), 16);

    return `rgba(${ red }, ${ green }, ${ blue }, ${ alpha })`;
  }

  private isSignalModeActive(): boolean {
    return this.dataService.analysisMode$.value === this.analysisModes.signal;
  }

  private emitTouchContextMenu(rackedModule: RackedModule, clientX: number, clientY: number): void {
    this.moduleRightClick$.next({
      $event: new MouseEvent('contextmenu', {
        bubbles: true,
        cancelable: true,
        clientX,
        clientY
      }),
      rackedModule
    });
  }

  private cancelPendingTouchLongPress(rackedModule?: RackedModule): void {
    if (rackedModule && this.touchLongPressModule !== rackedModule) {
      return;
    }

    if (this.touchLongPressTimerId != null) {
      clearTimeout(this.touchLongPressTimerId);
      this.touchLongPressTimerId = null;
    }

    if (!rackedModule || this.touchLongPressModule === rackedModule) {
      this.touchLongPressModule = null;
      this.touchLongPressStartPoint = null;
    }
  }

  private clearTouchInteractionState(rackedModule?: RackedModule): void {
    this.cancelPendingTouchLongPress(rackedModule);

    if (!rackedModule || this.touchContextMenuBlockedModule === rackedModule) {
      this.touchContextMenuBlockedModule = null;
    }
  }
}
