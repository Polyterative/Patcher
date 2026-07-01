import {
  ChangeDetectionStrategy,
  Component,
  Input
} from '@angular/core';
import {
  ClockDivisionFeature,
  extractClockDivisionFeatures
} from './module-clock-division-analysis.utils';

interface ClockDivisionFeatureView extends ClockDivisionFeature {
  offset: number;
}

@Component({
  selector: 'app-module-clock-division-analysis',
  templateUrl: './module-clock-division-analysis.component.html',
  styleUrls: ['./module-clock-division-analysis.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true
})
export class ModuleClockDivisionAnalysisComponent {
  featureViews: ClockDivisionFeatureView[] = [];

  @Input() set description(value: string | null | undefined) {
    this.featureViews = extractClockDivisionFeatures(value).map(feature => ({
      ...feature,
      offset: this.toOffset(feature.ratio)
    }));
  }

  private toOffset(ratio: number): number {
    if (ratio === 1) {
      return 50;
    }

    const normalized = Math.log2(Math.max(0.0625, Math.min(16, ratio)));

    return 50 + (normalized * 12.5);
  }
}
