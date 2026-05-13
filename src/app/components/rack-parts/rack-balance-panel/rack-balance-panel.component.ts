import {
  ChangeDetectionStrategy,
  Component,
  Input
} from '@angular/core';
import { ReplaySubject } from 'rxjs';
import { map } from 'rxjs/operators';
import { RackedModule } from 'src/app/models/module';
import {
  RackBalanceAnalysisResult,
  RackBalanceAxisResult,
  RackBalanceAnalysisService
} from '../rack-balance-analysis.service';
import { EntityStatItem } from '../../shared-atoms/entity-stat-grid/entity-stat-grid.component';
import {
  RadarAxisViewModel,
  RadarPoint
} from './rack-balance-panel.types';

@Component({
  selector: 'app-rack-balance-panel',
  templateUrl: './rack-balance-panel.component.html',
  styleUrls: ['./rack-balance-panel.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class RackBalancePanelComponent {
  readonly radarSize = 248;
  readonly radarCenter = this.radarSize / 2;
  readonly radarRadius = 80;
  readonly radarLabelRadius = 112;
  readonly radarRings = [0.25, 0.5, 0.75, 1];

  private readonly rowedRackedModules$ = new ReplaySubject<RackedModule[][] | null | undefined>(1);
  private forceExpanded = false;
  isExpanded = false;

  readonly analysis$ = this.rowedRackedModules$.pipe(
    map(rowedRackedModules => this.analysisService.analyze(rowedRackedModules))
  );

  @Input() set rowedRackedModules(value: RackedModule[][] | null | undefined) {
    this.rowedRackedModules$.next(value);
  }

  @Input() set alwaysExpanded(value: boolean | '' | null | undefined) {
    this.forceExpanded = value === '' || !!value;
  }

  get alwaysExpanded(): boolean {
    return this.forceExpanded;
  }

  constructor(
    private readonly analysisService: RackBalanceAnalysisService
  ) {}

  confidencePercent(analysis: RackBalanceAnalysisResult): number {
    return Math.round(analysis.confidence * 100);
  }

  hasReliableAnalysis(analysis: RackBalanceAnalysisResult): boolean {
    return !analysis.isEmpty && !analysis.warningMessage;
  }

  isDetailsOpen(): boolean {
    return this.forceExpanded || this.isExpanded;
  }

  toggleExpanded(): void {
    if (this.forceExpanded) {
      return;
    }
    this.isExpanded = !this.isExpanded;
  }

  compactHighlights(analysis: RackBalanceAnalysisResult): RackBalanceAnalysisResult['axes'] {
    return [...analysis.axes]
      .filter(axis => axis.matchedModules > 0)
      .sort((a, b) => b.share - a.share || b.matchedModules - a.matchedModules)
      .slice(0, 2);
  }

  axisDetails(analysis: RackBalanceAnalysisResult): RackBalanceAxisResult[] {
    return [...analysis.axes]
      .filter(axis => axis.matchedModules > 0)
      .sort((a, b) => b.share - a.share || b.matchedModules - a.matchedModules);
  }

  strongestAxis(analysis: RackBalanceAnalysisResult): RackBalanceAxisResult {
    return [...analysis.axes].sort((a, b) => b.share - a.share || b.matchedModules - a.matchedModules)[0];
  }

  weakestAxis(analysis: RackBalanceAnalysisResult): RackBalanceAxisResult {
    return [...analysis.axes].sort((a, b) => a.share - b.share || a.matchedModules - b.matchedModules)[0];
  }

  radarShowcaseStats(analysis: RackBalanceAnalysisResult): EntityStatItem[] {
    const strongestAxis = this.strongestAxis(analysis);
    const weakestAxis = this.weakestAxis(analysis);

    return [
      {
        label: 'Leans toward',
        value: strongestAxis.label,
        icon: strongestAxis.icon,
        size: '11rem'
      },
      {
        label: 'Light on',
        value: weakestAxis.label,
        icon: weakestAxis.icon,
        size: '11rem'
      }
    ];
  }

  axisShareStats(analysis: RackBalanceAnalysisResult): EntityStatItem[] {
    return this.axisDetails(analysis).map(axis => ({
      label: axis.label,
      value: `${ axis.share }%`,
      icon: axis.icon
    }));
  }

  infoTooltip(analysis: RackBalanceAnalysisResult): string {
    const parts = [
      'Advisory only.',
      'This panel reads the current module tags and highlights where the rack appears heavier or lighter.',
      'Weighting is 75% by HP area and 25% by module count.',
      `${ analysis.recognizedModuleCount } tagged modules are shaping this view.`
    ];

    if (analysis.warningMessage) {
      parts.push('Guidance is still early.');
    }

    return parts.join(' ');
  }

  lowDataTitle(analysis: RackBalanceAnalysisResult): string {
    if (analysis.isEmpty) {
      return 'Balance analysis appears once the rack has modules to evaluate';
    }

    return 'Balance analysis is hidden until the tag signal is strong enough';
  }

  lowDataMessage(analysis: RackBalanceAnalysisResult): string {
    if (analysis.isEmpty) {
      return 'Add modules to this rack to unlock the radar view and balance breakdown.';
    }

    if (analysis.recognizedModuleCount === 0) {
      return 'No recognized balance tags were found yet, so the radar stays hidden until more module tags are available.';
    }

    return `Only ${ analysis.recognizedModuleCount } of ${ analysis.totalModules } modules currently have recognized balance tags, so the radar stays hidden until the analysis is more reliable.`;
  }

  radarGridPoints(scale: number): string {
    const ringRadius = this.radarRadius * scale;
    return this.buildPolygonPoints(
      Array.from({length: 5}, (_, index) => this.getRadarPoint(index, 5, ringRadius))
    );
  }

  radarAxes(analysis: RackBalanceAnalysisResult): RadarAxisViewModel[] {
    const strongestShare = Math.max(this.strongestAxis(analysis).share, 1);

    return analysis.axes.map((axis, index, axes) => ({
      axis,
      point: this.getRadarPoint(index, axes.length, this.radarRadius * (axis.share / strongestShare)),
      labelPoint: this.getRadarPoint(index, axes.length, this.radarLabelRadius),
      shortLabel: this.getShortLabel(axis.label)
    }));
  }

  radarPolygonPoints(analysis: RackBalanceAnalysisResult): string {
    return this.buildPolygonPoints(this.radarAxes(analysis).map(axis => axis.point));
  }

  private buildPolygonPoints(points: RadarPoint[]): string {
    return points.map(point => `${ point.x },${ point.y }`).join(' ');
  }

  private getRadarPoint(index: number, total: number, radius: number): RadarPoint {
    const angle = -Math.PI / 2 + (Math.PI * 2 * index) / total;

    return {
      x: this.radarCenter + Math.cos(angle) * radius,
      y: this.radarCenter + Math.sin(angle) * radius,
    };
  }

  private getShortLabel(label: string): string {
    if (label === 'Tone shaping') {
      return 'Tone';
    }

    return label;
  }
}
