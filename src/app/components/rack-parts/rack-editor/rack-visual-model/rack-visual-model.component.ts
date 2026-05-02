import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Input,
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
  RackPowerHeatmapVisual,
  rackPowerHeatmapKey
} from '../../rack-power-heatmap.utils';
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
  private hoveredRackedModule: RackedModule | null = null;
  private hoveredRowId: number | null = null;
  private hoveredRowPowerPanelPlacement: 'above' | 'below' = 'above';
  private rowPowerBreakdown: RackPowerRowBreakdown[] = [];
  private modulePowerHeatmap = new Map<string, RackPowerHeatmapVisual>();
  
  @Input() rackData: RackMinimal;
  
  @Input() rowedRackedModules: RackedModule[][];
  @Input() rackViewportElement: HTMLElement | null = null;
  @Input() isCurrentRackPropertyOfCurrentUser: boolean;
  @Input() isCurrentRackEditable: boolean;
  
  @Input() rackDetailDataService: RackDetailDataService;
  
  @Input() moduleRightClick$: Subject<ModuleRightClick>;
  
  @ViewChild('screen') screenReference: ElementRef;
  
  
  constructor(
    public dataService: RackDetailDataService,
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

  ngOnChanges(): void {
    this.updateRowPowerBreakdown();
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

  hasCompletePowerData(rackedModule: RackedModule): boolean {
    return [rackedModule.module.powerPos12, rackedModule.module.powerNeg12, rackedModule.module.powerPos5]
      .every(value => value != null);
  }

  absolutePower(value: number | null | undefined): number {
    return Math.abs(value ?? 0);
  }

  setHoveredRow(rowId: number, rowElement?: HTMLElement | null): void {
    this.hoveredRowId = rowId;
    this.hoveredRowPowerPanelPlacement = this.resolveRowPowerPanelPlacement(rowElement ?? null);
    this.updateModulePowerHeatmap();
  }

  clearHoveredRow(rowId: number): void {
    if (this.hoveredRowId === rowId) {
      this.hoveredRowId = null;
      this.updateModulePowerHeatmap();
    }
  }

  rowPowerBreakdownAt(rowId: number): RackPowerRowBreakdown | null {
    return this.rowPowerBreakdown[rowId] ?? null;
  }

  isRowPowerPanelVisible(rowId: number): boolean {
    return this.hoveredRowId === rowId && (this.rowPowerBreakdown[rowId]?.moduleCount ?? 0) > 0;
  }

  shouldShowRowPowerPanel(rowId: number, powerAnalysisMode: boolean): boolean {
    return powerAnalysisMode && this.isRowPowerPanelVisible(rowId);
  }

  isRowPowerPanelBelow(rowId: number): boolean {
    return this.hoveredRowId === rowId && this.hoveredRowPowerPanelPlacement === 'below';
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
    return this.modulePowerHeatmap.get(rackPowerHeatmapKey(rackedModule)) ?? {
      className: 'powerAnalysisModule--shadow',
      totalLabel: '0mA total',
      railsLabel: '+12 0 mA · -12 0 mA · +5 0 mA'
    };
  }

  private updateRowPowerBreakdown(): void {
    this.rowPowerBreakdown = buildRackPowerBreakdown(this.rowedRackedModules ?? []).rows;
    this.updateModulePowerHeatmap();
  }

  private updateModulePowerHeatmap(): void {
    this.modulePowerHeatmap = buildRackPowerHeatmapVisuals(this.rowedRackedModules ?? [], {
      hoveredRowId: this.hoveredRowId
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
