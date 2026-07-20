import { Injectable } from '@angular/core';
import { RackedModule } from 'src/app/models/module';
import { RackMinimal } from 'src/app/models/rack';
import {
  buildRackFunctionVisual,
  buildRowFunctionBreakdowns,
  buildRowFunctionResidualLabel,
  RackFunctionVisual,
  RowFunctionBreakdown
} from '../../rack-function-visuals.utils';
import {
  computeLayoutAnalysis,
  RackLayoutAnalysisResult,
} from '../../rack-layout-analysis.utils';
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
import {
  RackAnalysisMode,
  RACK_ANALYSIS_MODES,
} from '../../rack-analysis-mode';
import { RackLayoutHoverVisual } from '../../rack-layout-hover-highlight.utils';
import { resolveRowPowerPanelPlacement } from './rack-visual-model.utils';

type RowPowerPanelPlacement = 'above' | 'below';

@Injectable()
export class RackVisualModelRenderService {
  private static readonly rowAnalysisPanelHeightPx = 136;

  readonly commonBlankSizes = [1, 2, 3, 4, 6, 8] as const;
  readonly allBlankSizes = Array.from({length: 20}, (_, index) => index + 1);

  private readonly rackModuleTrackKeys = new WeakMap<RackedModule, number | string>();
  private rowPowerBreakdown: RackPowerRowBreakdown[] = [];
  private rowFunctionBreakdowns = new Map<number, RowFunctionBreakdown>();
  private modulePowerHeatmap = new Map<string, RackPowerHeatmapVisual>();
  private moduleFunctionVisuals = new Map<string, RackFunctionVisual>();
  private hoveredRowIndex: number | null = null;
  private hoveredRowPowerPanelPlacement: RowPowerPanelPlacement = 'above';

  hoveredRackedModule: RackedModule | null = null;
  hoveredModuleElement: HTMLElement | null = null;
  rowHpOverflow: number[] = [];
  layoutAnalysis: RackLayoutAnalysisResult | null = null;

  update(rowedRackedModules: RackedModule[][] | null | undefined, rackData: RackMinimal | null | undefined): void {
    const rows = rowedRackedModules ?? [];
    const capacity = rackData?.hp ?? 0;
    this.rowPowerBreakdown = buildRackPowerBreakdown(rows).rows;
    this.rowHpOverflow = rows.map(row => {
      const used = row.reduce((sum, module) => sum + (module.module?.hp ?? 0), 0);
      return Math.max(0, used - capacity);
    });
    this.rowFunctionBreakdowns = buildRowFunctionBreakdowns(rowedRackedModules);
    this.moduleFunctionVisuals = new Map(
      rows
        .flat()
        .map(module => [this.moduleDomKey(module), buildRackFunctionVisual(module)])
    );
    this.layoutAnalysis = computeLayoutAnalysis(rowedRackedModules, capacity);
    if (this.hoveredRowIndex != null && this.hoveredRowIndex >= this.rowPowerBreakdown.length) {
      this.hoveredRowIndex = null;
    }
    this.updateModulePowerHeatmap(rows);
  }

  moduleDomKey(rackedModule: RackedModule): string {
    return `${ rackedModule.rackingData.id }-${ rackedModule.module.id }-${ rackedModule.rackingData.row }-${ rackedModule.rackingData.column }`;
  }

  rackModuleStableDomKey(rackedModule: RackedModule): string {
    return String(this.rackModuleTrackKey(rackedModule));
  }

  rackModuleTrackKey(rackedModule: RackedModule): number | string {
    const existingKey = this.rackModuleTrackKeys.get(rackedModule);
    if (existingKey != null) {
      return existingKey;
    }

    const key = rackedModule.rackingData.id ?? this.moduleDomKey(rackedModule);
    this.rackModuleTrackKeys.set(rackedModule, key);
    return key;
  }

  rackModulePositionKey(module: RackedModule): string {
    return `${ module.rackingData.row ?? 'none' }:${ module.rackingData.column ?? 'none' }`;
  }

  effectiveHp(rackedModule: RackedModule): number {
    return rackedModule.module.hp;
  }

  setHoveredModule(rackedModule: RackedModule, moduleElement?: EventTarget | null): void {
    this.hoveredRackedModule = rackedModule;
    this.hoveredModuleElement = moduleElement instanceof HTMLElement ? moduleElement : null;
  }

  clearHoveredModule(rackedModule: RackedModule): boolean {
    if (this.hoveredRackedModule !== rackedModule) {
      return false;
    }

    this.hoveredRackedModule = null;
    this.hoveredModuleElement = null;
    return true;
  }

  isHoveredModule(rackedModule: RackedModule): boolean {
    return this.hoveredRackedModule === rackedModule;
  }

  shouldShowModuleHoverStats(rackedModule: RackedModule, analysisMode: RackAnalysisMode): boolean {
    return analysisMode !== RACK_ANALYSIS_MODES.off && this.isHoveredModule(rackedModule);
  }

  isSameHpHighlightedModule(rackedModule: RackedModule, analysisMode: RackAnalysisMode): boolean {
    return this.isSameHpHighlightActive(analysisMode)
      && !this.isHoveredModule(rackedModule)
      && rackedModule.module.hp === this.hoveredRackedModule?.module.hp;
  }

  isSameHpDimmedModule(rackedModule: RackedModule, analysisMode: RackAnalysisMode): boolean {
    return this.isSameHpHighlightActive(analysisMode)
      && rackedModule.module.hp !== this.hoveredRackedModule?.module.hp;
  }

  shouldShowLayoutHpIndicator(analysisMode: RackAnalysisMode, suppressHpIndicators: boolean): boolean {
    return !suppressHpIndicators && analysisMode === RACK_ANALYSIS_MODES.layout;
  }

  hasCompletePowerData(rackedModule: RackedModule): boolean {
    return hasCompletePowerData(rackedModule);
  }

  setHoveredRow(
    rowId: number,
    rowElement: HTMLElement | null | undefined,
    rackViewportElement: HTMLElement | null,
    rowedRackedModules: RackedModule[][] | null | undefined
  ): void {
    this.hoveredRowIndex = rowId;
    this.hoveredRowPowerPanelPlacement = resolveRowPowerPanelPlacement(
      rackViewportElement,
      rowElement ?? null,
      RackVisualModelRenderService.rowAnalysisPanelHeightPx
    );
    this.updateModulePowerHeatmap(rowedRackedModules ?? []);
  }

  clearHoveredRow(rowId: number, rowedRackedModules: RackedModule[][] | null | undefined): boolean {
    if (this.hoveredRowIndex !== rowId) {
      return false;
    }

    this.hoveredRowIndex = null;
    this.updateModulePowerHeatmap(rowedRackedModules ?? []);
    return true;
  }

  rowPowerBreakdownAt(rowId: number): RackPowerRowBreakdown | null {
    return this.rowPowerBreakdown[rowId] ?? null;
  }

  rowHpOverflowAt(rowId: number): number {
    return this.rowHpOverflow[rowId] ?? 0;
  }

  isModuleOverflowing(rowId: number, moduleIndex: number, rowedRackedModules: RackedModule[][] | null | undefined, rackData: RackMinimal | null | undefined): boolean {
    if ((this.rowHpOverflow[rowId] ?? 0) <= 0) return false;
    const row = rowedRackedModules?.[rowId];
    if (!row) return false;
    const capacity = rackData?.hp ?? 0;
    let cumulative = 0;
    for (let i = 0; i < moduleIndex; i++) {
      cumulative += row[i]?.module?.hp ?? 0;
    }
    return cumulative + (row[moduleIndex]?.module?.hp ?? 0) > capacity;
  }

  rowHpTooltip(rowId: number, rowedRackedModules: RackedModule[][] | null | undefined, rackData: RackMinimal | null | undefined): string {
    const capacity = rackData?.hp ?? 0;
    const row = rowedRackedModules?.[rowId] ?? [];
    const used = row.reduce((sum, module) => sum + (module.module?.hp ?? 0), 0);
    const overflow = this.rowHpOverflow[rowId] ?? 0;
    return `Row ${rowId + 1}: ${used} / ${capacity} HP — ${overflow} HP over capacity`;
  }

  totalHpOverflow(): number {
    return this.rowHpOverflow.reduce((sum, value) => sum + value, 0);
  }

  isRowAnalysisPanelVisible(rowId: number, rowedRackedModules: RackedModule[][] | null | undefined): boolean {
    return this.hoveredRowIndex === rowId && ((rowedRackedModules?.[rowId]?.length ?? 0) > 0);
  }

  isRowHovered(rowId: number): boolean {
    return this.hoveredRowIndex === rowId;
  }

  rowRemainingHp(rowId: number, rowedRackedModules: RackedModule[][] | null | undefined, rackData: RackMinimal | null | undefined): number {
    const row = rowedRackedModules?.[rowId] ?? [];
    const used = row.reduce((sum, module) => sum + (module.module?.hp ?? 0), 0);
    return Math.max(0, (rackData?.hp ?? 0) - used);
  }

  shouldShowRowPowerPanel(rowId: number, analysisMode: RackAnalysisMode, rowedRackedModules: RackedModule[][] | null | undefined): boolean {
    return this.shouldShowRowAnalysisPanel(rowId, analysisMode, RACK_ANALYSIS_MODES.power, rowedRackedModules);
  }

  shouldShowRowFunctionPanel(rowId: number, analysisMode: RackAnalysisMode, rowedRackedModules: RackedModule[][] | null | undefined): boolean {
    return this.shouldShowRowAnalysisPanel(rowId, analysisMode, RACK_ANALYSIS_MODES.function, rowedRackedModules);
  }

  shouldShowRowLayoutPanel(rowId: number, analysisMode: RackAnalysisMode, rowedRackedModules: RackedModule[][] | null | undefined): boolean {
    return this.shouldShowRowAnalysisPanel(rowId, analysisMode, RACK_ANALYSIS_MODES.layout, rowedRackedModules);
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

  rowPowerHeaderLabel(rowId: number): string {
    const rowPower = this.rowPowerBreakdown[rowId];

    if (!rowPower || rowPower.moduleCount === 0) {
      return '';
    }

    const qualifiers = [
      rowPower.passiveModuleCount > 0 ? `${ rowPower.passiveModuleCount } passive` : '',
      rowPower.unknownPowerModuleCount > 0 ? `${ rowPower.unknownPowerModuleCount } unknown` : '',
    ].filter(Boolean);

    return qualifiers.length
      ? `${ rowPower.rowPowerHeaderCount } headers · ${ qualifiers.join(' · ') }`
      : `${ rowPower.rowPowerHeaderCount } headers`;
  }

  rowFunctionBreakdownAt(rowId: number): RowFunctionBreakdown | null {
    return this.rowFunctionBreakdowns.get(rowId) ?? null;
  }

  rowFunctionResidualLabel(rowId: number): string {
    return buildRowFunctionResidualLabel(this.rowFunctionBreakdownAt(rowId));
  }

  rowLayoutUsedHp(rowId: number, rackData: RackMinimal | null | undefined): number {
    const overflow = this.layoutAnalysis?.overflowHp[rowId] ?? 0;
    const wasted = this.layoutAnalysis?.wastedHp[rowId] ?? 0;
    const capacity = rackData?.hp ?? 0;
    return capacity + overflow - wasted;
  }

  rowLayoutStatusLabel(rowId: number): string {
    const mixedIssue = this.layoutMixedIssueAt(rowId);
    if (mixedIssue) {
      return `Mixed formats: ${ mixedIssue.standards.map(standard => this.layoutStandardLabel(standard)).join(' + ') }`;
    }

    const overflow = this.layoutAnalysis?.overflowHp[rowId] ?? 0;
    if (overflow > 0) {
      return `${ overflow }HP over capacity`;
    }

    const wasted = this.layoutAnalysis?.wastedHp[rowId] ?? 0;
    return wasted > 0 ? `${ wasted }HP spare` : 'Perfectly filled';
  }

  rowLayoutFooterLabel(rowId: number): string {
    const mixedIssue = this.layoutMixedIssueAt(rowId);
    if (mixedIssue) {
      return `Fix row ${ rowId + 1 } before remixing.`;
    }

    const moves = this.layoutAnalysis?.autoArrangeMoves
      .filter(move => move.fromRow === rowId || move.toRow === rowId)
      .filter(move => move.fromRow !== move.toRow || move.fromColumn !== move.toColumn)
      .length ?? 0;

    return moves > 0
      ? `${ moves } module${ moves === 1 ? '' : 's' } would move in auto-arrange.`
      : 'No cross-row moves suggested for this row.';
  }

  rowLayoutPanelClass(rowId: number): string {
    if (this.layoutMixedIssueAt(rowId)) {
      return 'rowPowerPanel--layoutWarning';
    }

    return (this.layoutAnalysis?.overflowHp[rowId] ?? 0) > 0
      ? 'rowPowerPanel--layoutOverflow'
      : 'rowPowerPanel--layout';
  }

  powerAnalysisVisual(rackedModule: RackedModule): RackPowerHeatmapVisual {
    return this.modulePowerHeatmap.get(rackPowerHeatmapKey(rackedModule)) ?? defaultRackPowerHeatmapVisual();
  }

  functionAnalysisVisual(rackedModule: RackedModule): RackFunctionVisual {
    return this.moduleFunctionVisuals.get(this.moduleDomKey(rackedModule)) ?? buildRackFunctionVisual(rackedModule);
  }

  analysisVisualClass(
    rackedModule: RackedModule,
    analysisMode: RackAnalysisMode,
    layoutAnalysisVisual: RackLayoutHoverVisual | null
  ): string {
    if (analysisMode === RACK_ANALYSIS_MODES.power) {
      return this.powerAnalysisVisual(rackedModule).className;
    }

    if (analysisMode === RACK_ANALYSIS_MODES.function) {
      return this.functionAnalysisVisual(rackedModule).className;
    }

    if (analysisMode === RACK_ANALYSIS_MODES.layout) {
      return layoutAnalysisVisual?.className ?? '';
    }

    return '';
  }

  private updateModulePowerHeatmap(rowedRackedModules: RackedModule[][]): void {
    this.modulePowerHeatmap = buildRackPowerHeatmapVisuals(rowedRackedModules, {
      hoveredRowIndex: this.hoveredRowIndex
    });
  }

  private shouldShowRowAnalysisPanel(
    rowId: number,
    analysisMode: RackAnalysisMode,
    targetMode: RackAnalysisMode,
    rowedRackedModules: RackedModule[][] | null | undefined
  ): boolean {
    return analysisMode === targetMode && this.isRowAnalysisPanelVisible(rowId, rowedRackedModules);
  }

  private isSameHpHighlightActive(analysisMode: RackAnalysisMode): boolean {
    return analysisMode === RACK_ANALYSIS_MODES.layout
      && !!this.hoveredRackedModule;
  }

  private layoutMixedIssueAt(rowId: number) {
    return this.layoutAnalysis?.mixedRowIssues.find(issue => issue.rowIndex === rowId) ?? null;
  }

  private layoutStandardLabel(standard: number): string {
    if (standard === 1) {
      return 'Intellijel 1U';
    }
    if (standard === 2) {
      return 'Pulp Logic 1U';
    }
    return '3U';
  }
}
