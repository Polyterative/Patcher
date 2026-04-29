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

interface RadarPoint {
  x: number;
  y: number;
}

interface RadarAxisViewModel {
  axis: RackBalanceAxisResult;
  point: RadarPoint;
  labelPoint: RadarPoint;
  shortLabel: string;
}

@Component({
  selector: 'app-rack-balance-panel',
  templateUrl: './rack-balance-panel.component.html',
  styleUrls: ['./rack-balance-panel.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class RackBalancePanelComponent {
  readonly radarSize = 220;
  readonly radarCenter = this.radarSize / 2;
  readonly radarRadius = 72;
  readonly radarLabelRadius = 98;
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

  strongestAxis(analysis: RackBalanceAnalysisResult): RackBalanceAxisResult {
    return [...analysis.axes].sort((a, b) => b.share - a.share || b.matchedModules - a.matchedModules)[0];
  }

  weakestAxis(analysis: RackBalanceAnalysisResult): RackBalanceAxisResult {
    return [...analysis.axes].sort((a, b) => a.share - b.share || a.matchedModules - b.matchedModules)[0];
  }

  radarGridPoints(scale: number): string {
    const ringRadius = this.radarRadius * scale;
    return this.buildPolygonPoints(
      Array.from({length: 5}, (_, index) => this.getRadarPoint(index, 5, ringRadius))
    );
  }

  radarAxes(analysis: RackBalanceAnalysisResult): RadarAxisViewModel[] {
    return analysis.axes.map((axis, index, axes) => ({
      axis,
      point: this.getRadarPoint(index, axes.length, this.radarRadius * (axis.share / 100)),
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
