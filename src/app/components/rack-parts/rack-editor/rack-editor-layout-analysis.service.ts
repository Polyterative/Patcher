import { Injectable } from '@angular/core';
import { AnalyticsService } from 'src/app/features/backbone/analytics-integration/analytics.service';
import { RackedModule } from 'src/app/models/module';
import {
  RackAnalysisMode,
  RackLayoutHoverMode
} from '../rack-analysis-mode';
import {
  computeLayoutAnalysis,
  RackArrangementCount,
  RackLayoutAnalysisResult,
  RackLayoutScope
} from '../rack-layout-analysis.utils';
import { SignalFocusArea } from '../rack-signal-analysis.utils';
import { RackDetailDataService } from '../rack-detail-data.service';

export interface RackLayoutRowScopeOption {
  scope: Extract<RackLayoutScope, {rowIndex: number}>;
  label: string;
}

@Injectable()
export class RackEditorLayoutAnalysisService {
  constructor(
    private readonly dataService: RackDetailDataService,
    private readonly analytics: AnalyticsService
  ) {}

  setAnalysisMode(mode: RackAnalysisMode): void {
    this.dataService.analysisMode$.next(mode);
    this.analytics.capture('rack.analysis_mode_changed', {
      rack_id: this.dataService.singleRackData$.value?.id,
      mode
    });
  }

  setSignalFocusArea(area: SignalFocusArea): void {
    this.dataService.signalFocusArea$.next(area);
    this.analytics.capture('rack.signal_focus_changed', {
      rack_id: this.dataService.singleRackData$.value?.id,
      area
    });
  }

  setLayoutHoverMode(mode: RackLayoutHoverMode): void {
    this.dataService.layoutHoverMode$.next(mode);
    this.analytics.capture('rack.layout_hover_mode_changed', {
      rack_id: this.dataService.singleRackData$.value?.id,
      mode
    });
  }

  setLayoutScope(scope: RackLayoutScope): void {
    this.dataService.layoutScope$.next(scope);
    this.analytics.capture('rack.layout_scope_changed', {
      rack_id: this.dataService.singleRackData$.value?.id,
      scope
    });
  }

  layoutRowScopeOptions(rowedRackedModules: RackedModule[][] | null | undefined): RackLayoutRowScopeOption[] {
    return (rowedRackedModules ?? [])
      .map((_, rowIndex) => ({
        scope: {rowIndex},
        label: `Row ${ rowIndex + 1 }`
      }));
  }

  isLayoutScopeActive(currentScope: RackLayoutScope | null | undefined, targetScope: RackLayoutScope): boolean {
    if (typeof currentScope === 'object' && typeof targetScope === 'object') {
      return currentScope?.rowIndex === targetScope.rowIndex;
    }
    return currentScope === targetScope;
  }

  requestLayoutRemix(): void {
    this.dataService.requestLayoutRemix$.next();
  }

  requestLayoutShuffle(): void {
    this.dataService.requestLayoutShuffle$.next();
  }

  layoutArrangementSummary(rowedRackedModules: RackedModule[][] | null | undefined): string {
    const analysis = this.computeLayoutAnalysis(rowedRackedModules);
    if (!analysis) {
      return 'Add modules to estimate valid arrangements.';
    }

    if (analysis.arrangementCount.kind === 'impossible') {
      return 'No valid arrangement fits the current row set.';
    }

    if (analysis.arrangementCount.kind === 'sampled') {
      return `~${ this.formatArrangementCount(analysis.arrangementCount.value) } sampled valid arrangements (estimate).`;
    }

    if (analysis.arrangementCount.kind === 'capped') {
      const prefix = analysis.arrangementCount.source === 'exact' ? '' : '~';
      const qualifier = analysis.arrangementCount.source === 'exact'
        ? 'exact valid arrangements (capped display)'
        : 'sampled valid arrangements (order-of-magnitude estimate)';
      return `${ prefix }${ this.formatArrangementMagnitude(analysis.arrangementCount) } ${ qualifier }.`;
    }

    return `${ this.formatArrangementCount(analysis.arrangementCount.value) } valid arrangement${ analysis.arrangementCount.value === 1 ? '' : 's' } fit the current rows.`;
  }

  layoutValiditySummary(rowedRackedModules: RackedModule[][] | null | undefined): string {
    const analysis = this.computeLayoutAnalysis(rowedRackedModules);
    if (!analysis) {
      return 'Layout validity appears after modules are placed.';
    }

    if (analysis.mixedRowIssues.length > 0) {
      const rows = analysis.mixedRowIssues.map(issue => issue.rowIndex + 1).join(', ');
      return `Mixed-format row${ analysis.mixedRowIssues.length === 1 ? '' : 's' } ${ rows } block Remix.`;
    }

    const overflowHp = analysis.overflowHp.reduce((sum, hp) => sum + hp, 0);
    if (overflowHp > 0) {
      return `${ overflowHp }HP over capacity across the current rows.`;
    }

    const spareHp = analysis.wastedHp.reduce((sum, hp) => sum + hp, 0);
    return `Valid layout with ${ spareHp }HP spare across the current rows.`;
  }

  layoutRemixUnavailableReason(rowedRackedModules: RackedModule[][] | null | undefined): string | null {
    const analysis = this.computeLayoutAnalysis(rowedRackedModules);
    if (!analysis) {
      return 'Add modules before remixing the layout.';
    }

    if (analysis.mixedRowIssues.length > 0) {
      return 'Fix mixed-format rows before remixing.';
    }

    return null;
  }

  layoutRemixMoveSummary(rowedRackedModules: RackedModule[][] | null | undefined): string {
    const analysis = this.computeLayoutAnalysis(rowedRackedModules);
    if (!analysis || analysis.mixedRowIssues.length > 0) {
      return '';
    }

    const rackRows = this.dataService.singleRackData$.value?.rows ?? rowedRackedModules?.length ?? 0;
    const needsAnotherRow = analysis.autoArrangeMoves.some(move => move.toRow < 0 || move.toRow >= rackRows);
    if (needsAnotherRow) {
      return 'Remix needs another row for this scope.';
    }

    const movedCount = analysis.autoArrangeMoves.filter(move =>
      move.fromRow !== move.toRow || move.fromColumn !== move.toColumn
    ).length;
    if (movedCount === 0) {
      return 'Current scope is already tightly arranged.';
    }

    return `Remix would move ${ movedCount } module${ movedCount === 1 ? '' : 's' }.`;
  }

  layoutRemixActionLabel(scope: RackLayoutScope | null | undefined): string {
    if (!scope) {
      return 'Remix layout';
    }
    if (scope === '3u') {
      return 'Remix 3U';
    }
    if (scope === '1u') {
      return 'Remix 1U';
    }
    if (typeof scope === 'object') {
      return `Remix Row ${ scope.rowIndex + 1 }`;
    }
    return 'Remix layout';
  }

  layoutShuffleActionLabel(scope: RackLayoutScope | null | undefined): string {
    if (scope === '3u') {
      return 'Shuffle 3U';
    }
    if (scope === '1u') {
      return 'Shuffle 1U';
    }
    if (scope && typeof scope === 'object') {
      return `Shuffle Row ${ scope.rowIndex + 1 }`;
    }
    return 'Shuffle';
  }

  setShouldShowPanelImages(show: boolean): void {
    this.dataService.shouldShowPanelImages$.next(show);
    this.analytics.capture('rack.panel_images_toggled', {
      rack_id: this.dataService.singleRackData$.value?.id,
      visible: show
    });
  }

  setReducedScale(reduced: boolean): void {
    this.dataService.userRequestedSmallerScale$.next(reduced);
    this.analytics.capture('rack.scale_toggled', {
      rack_id: this.dataService.singleRackData$.value?.id,
      reduced
    });
  }

  private computeLayoutAnalysis(rowedRackedModules: RackedModule[][] | null | undefined): RackLayoutAnalysisResult | null {
    if (!rowedRackedModules?.length) {
      return null;
    }

    const rackHp = this.dataService.singleRackData$.value?.hp;
    if (!rackHp) {
      return null;
    }

    return computeLayoutAnalysis(rowedRackedModules, rackHp, this.dataService.layoutScope$.value);
  }

  private formatArrangementCount(count: number): string {
    if (!Number.isFinite(count) || count < 0) {
      return '0';
    }
    return Math.round(count).toLocaleString();
  }

  private formatArrangementMagnitude(count: Extract<RackArrangementCount, { kind: 'capped' }>): string {
    return `10^${ Math.max(0, count.orderOfMagnitude) }+`;
  }
}
