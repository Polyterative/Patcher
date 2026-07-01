import {
  ChangeDetectionStrategy,
  Component,
  Input
} from '@angular/core';
import {
  extractTimeRateFeatures,
  TimeRateFeature
} from './module-time-rate-analysis.utils';

@Component({
  selector: 'app-module-time-rate-analysis',
  templateUrl: './module-time-rate-analysis.component.html',
  styleUrls: ['./module-time-rate-analysis.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true
})
export class ModuleTimeRateAnalysisComponent {
  features: TimeRateFeature[] = [];

  @Input() set description(value: string | null | undefined) {
    this.features = extractTimeRateFeatures(value);
  }
}
