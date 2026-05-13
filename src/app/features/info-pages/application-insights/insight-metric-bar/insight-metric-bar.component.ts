import {
  ChangeDetectionStrategy,
  Component,
  Input
} from '@angular/core';
import { MetricTone } from '../../../backbone/home/application-statistics.models';


@Component({
  selector: 'app-insight-metric-bar',
  templateUrl: './insight-metric-bar.component.html',
  styleUrls: ['./insight-metric-bar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class InsightMetricBarComponent {
  @Input() label: string = '';
  @Input() valueLabel: string = '';
  @Input() detail: string = '';
  @Input() widthPercent: number = 0;
  @Input() tone: MetricTone = 'brand';
}
