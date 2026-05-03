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
import { buildRackFunctionVisual, RackFunctionVisual } from '../../rack-function-visuals.utils';
import { hasCompletePowerData } from '../../rack-power-data.utils';
import { RackDetailDataService } from '../../rack-detail-data.service';
import { ModuleRightClick } from '../rack-editor.component';
import { RackAnalysisMode, RACK_ANALYSIS_MODES } from '../../rack-analysis-mode';
import { prefersTouchInteraction } from 'src/app/shared-interproject/touch-interaction.utils';

interface RowFunctionRoleBreakdown {
  label: string;
  className: string;
  moduleCount: number;
  hp: number;
}

interface RowFunctionBreakdown {
  moduleCount: number;
  roles: RowFunctionRoleBreakdown[];
  residualCount: number;
  residualHp: number;
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
  private static readonly rowAnalysisPanelHeightPx = 136;
  private static readonly dropRevealAnimationDurationMs = 225;
  private static readonly touchContextMenuDelayMs = 550;
  private static readonly touchLongPressMoveTolerancePx = 12;
  readonly touchInteractionMode = prefersTouchInteraction();
  private hoveredRackedModule: RackedModule | null = null;
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
  private modulePowerHeatmap = new Map<string, RackPowerHeatmapVisual>();
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
    public dataService: RackDetailDataService,
    private readonly cdr: ChangeDetectorRef,
  ) {
  }
  
  ngOnInit(): void {
    this.updateRowPowerBreakdown();
  }
  
  // on after edit update reference on that a service of the current HMTL element reference
  ngAfterViewInit(): void {
    this.dataService.currentDownloadElementRef$.next({
      screen: this.screenReference
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['rowedRackedModules']) {
      this.updateRowPowerBreakdown();
    }
  }

  ngOnDestroy(): void {
    this.clearTouchInteractionState();
  }
  
  isLastRowEmpty(rowedRackedModules: RackedModule[][]) {
    return rowedRackedModules[rowedRackedModules.length - 1].length === 0;
  }

  effectiveHp(rackedModule: RackedModule): number {
    return rackedModule.module.hp;
  }

  setHoveredModule(rackedModule: RackedModule): void {
    this.hoveredRackedModule = rackedModule;
  }

  clearHoveredModule(rackedModule: RackedModule): void {
    if (this.hoveredRackedModule === rackedModule) {
      this.hoveredRackedModule = null;
    }
  }

  isHoveredModule(rackedModule: RackedModule): boolean {
    return this.hoveredRackedModule === rackedModule;
  }

  shouldShowModuleHoverStats(rackedModule: RackedModule, analysisMode: RackAnalysisMode): boolean {
    return analysisMode !== this.analysisModes.off && this.isHoveredModule(rackedModule);
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
    return analysisMode === this.analysisModes.power && this.isRowAnalysisPanelVisible(rowId);
  }

  shouldShowRowFunctionPanel(rowId: number, analysisMode: RackAnalysisMode): boolean {
    return analysisMode === this.analysisModes.function && this.isRowAnalysisPanelVisible(rowId);
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
    const rowModules = this.rowedRackedModules?.[rowId] ?? [];

    if (rowModules.length === 0) {
      return null;
    }

    const roleMap = new Map<string, RowFunctionRoleBreakdown>();
    let residualCount = 0;
    let residualHp = 0;

    for (const rackedModule of rowModules) {
      const functionVisual = this.functionAnalysisVisual(rackedModule);
      const hp = this.effectiveHp(rackedModule);

      if (!this.isTrackedFunctionRole(functionVisual.className)) {
        residualCount += 1;
        residualHp += hp;
        continue;
      }

      const current = roleMap.get(functionVisual.roleLabel) ?? {
        label: functionVisual.roleLabel,
        className: functionVisual.className,
        moduleCount: 0,
        hp: 0
      };

      current.moduleCount += 1;
      current.hp += hp;
      roleMap.set(functionVisual.roleLabel, current);
    }

    return {
      moduleCount: rowModules.length,
      roles: [...roleMap.values()].sort((a, b) => b.hp - a.hp || b.moduleCount - a.moduleCount || a.label.localeCompare(b.label)),
      residualCount,
      residualHp
    };
  }

  rowFunctionResidualLabel(rowId: number): string {
    const rowFunction = this.rowFunctionBreakdownAt(rowId);
    if (!rowFunction) {
      return '';
    }

    if (rowFunction.roles.length === 0) {
      return rowFunction.residualCount > 0
        ? `${ rowFunction.residualCount } module${ rowFunction.residualCount === 1 ? '' : 's' } blank or unclassified in this row`
        : 'No tracked function roles recognized in this row yet.';
    }

    return rowFunction.residualCount > 0
      ? `${ rowFunction.residualCount } module${ rowFunction.residualCount === 1 ? '' : 's' } blank or unclassified (${ rowFunction.residualHp }HP)`
      : 'All modules in this row map to tracked function roles.';
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
    if (this.hoveredRowIndex != null && this.hoveredRowIndex >= this.rowPowerBreakdown.length) {
      this.hoveredRowIndex = null;
    }
    this.updateModulePowerHeatmap();
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

  private isTrackedFunctionRole(className: string): boolean {
    return className === 'functionAnalysisModule--voices'
      || className === 'functionAnalysisModule--modulation'
      || className === 'functionAnalysisModule--utilities'
      || className === 'functionAnalysisModule--timing'
      || className === 'functionAnalysisModule--tone';
  }

  private shouldTrackTouchLongPress(event: PointerEvent): boolean {
    return this.touchInteractionMode
      && event.pointerType === 'touch'
      && this.isCurrentRackEditable
      && this.isCurrentRackPropertyOfCurrentUser;
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
