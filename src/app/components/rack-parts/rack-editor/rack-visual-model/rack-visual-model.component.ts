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
  SimpleChanges,
  OnChanges,
  OnInit,
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
import { hasCompletePowerData } from '../../rack-power-data.utils';
import { RackDetailDataService } from '../../rack-detail-data.service';
import { ModuleRightClick } from '../rack-editor.component';


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
export class RackVisualModelComponent implements OnInit, OnChanges, AfterViewInit {
  private static readonly rowPowerPanelHeightPx = 112;
  private static readonly dropRevealAnimationDurationMs = 225;
  private hoveredRackedModule: RackedModule | null = null;
  private dragImageAnimationSuppressedModule: RackedModule | null = null;
  private dropRevealSuppressedModule: RackedModule | null = null;
  private dropRevealAnimatingModule: RackedModule | null = null;
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

  shouldShowModuleHoverStats(rackedModule: RackedModule, powerAnalysisMode: boolean): boolean {
    return powerAnalysisMode && this.isHoveredModule(rackedModule);
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

  isRowPowerPanelVisible(rowId: number): boolean {
    return this.hoveredRowIndex === rowId && (this.rowPowerBreakdown[rowId]?.moduleCount ?? 0) > 0;
  }

  shouldShowRowPowerPanel(rowId: number, powerAnalysisMode: boolean): boolean {
    return powerAnalysisMode && this.isRowPowerPanelVisible(rowId);
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

  powerAnalysisVisual(rackedModule: RackedModule): RackPowerHeatmapVisual {
    return this.modulePowerHeatmap.get(rackPowerHeatmapKey(rackedModule)) ?? defaultRackPowerHeatmapVisual();
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
    this.dragImageAnimationSuppressedModule = module;
    if (this.dropRevealAnimatingModule === module) {
      this.dropRevealAnimatingModule = null;
    }
    this.cdr.markForCheck();
  }

  onDragReleased(_event: unknown, module: RackedModule): void {
    this.dropRevealSuppressedModule = module;
    this.cdr.markForCheck();
  }

  onDragEnded(_event: CdkDragEnd<RackedModule>, module: RackedModule): void {
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

    if (availableAbove < RackVisualModelComponent.rowPowerPanelHeightPx && availableBelow > availableAbove) {
      return 'below';
    }

    if (availableBelow < RackVisualModelComponent.rowPowerPanelHeightPx && availableAbove > availableBelow) {
      return 'above';
    }

    return availableAbove >= availableBelow ? 'above' : 'below';
  }
}
