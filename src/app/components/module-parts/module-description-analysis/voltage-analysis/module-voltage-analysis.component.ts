import {
  ChangeDetectionStrategy,
  Component,
  Input
} from '@angular/core';
import {
  extractVoltageFeatures,
  formatVoltage,
  VoltageFeature,
  voltagePosition
} from './module-voltage-analysis.utils';

interface VoltageFeatureView extends VoltageFeature {
  start: number;
  width: number;
  marker: number;
  displayValue: string;
}

@Component({
  selector: 'app-module-voltage-analysis',
  templateUrl: './module-voltage-analysis.component.html',
  styleUrls: ['./module-voltage-analysis.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true
})
export class ModuleVoltageAnalysisComponent {
  readonly ticks = [-10, -5, 0, 5, 10];
  featureViews: VoltageFeatureView[] = [];

  @Input() set description(value: string | null | undefined) {
    this.featureViews = extractVoltageFeatures(value).map(feature => this.toFeatureView(feature));
  }

  tickPosition(value: number): number {
    return voltagePosition(value);
  }

  private toFeatureView(feature: VoltageFeature): VoltageFeatureView {
    const start = voltagePosition(feature.lowV);
    const end = voltagePosition(feature.highV);
    const isRange = feature.lowV !== feature.highV;

    return {
      ...feature,
      start: Math.min(start, end),
      width: Math.max(1.5, Math.abs(end - start)),
      marker: voltagePosition(feature.lowV),
      displayValue: isRange
        ? `${ formatVoltage(feature.lowV) } – ${ formatVoltage(feature.highV) }`
        : formatVoltage(feature.lowV)
    };
  }
}
