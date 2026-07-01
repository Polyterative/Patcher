import {
  ChangeDetectionStrategy,
  Component,
  Input
} from '@angular/core';
import {
  extractFrequencyBands,
  FrequencyBand
} from './module-frequency-analysis.utils';

interface FrequencyBandView extends FrequencyBand {
  x: number;
  width: number;
  centerX: number;
  isPoint: boolean;
  displayValue: string;
}

@Component({
  selector: 'app-module-frequency-analysis',
  templateUrl: './module-frequency-analysis.component.html',
  styleUrls: ['./module-frequency-analysis.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true
})
export class ModuleFrequencyAnalysisComponent {
  private static readonly minHz = 20;
  private static readonly maxHz = 20000;
  private static readonly chartStart = 18;
  private static readonly chartWidth = 284;
  readonly plotTop = 14;
  readonly plotBottom = 64;
  readonly dataTop = 20;
  readonly dataBottom = 56;
  readonly rangeY = 38;
  private _description: string | null | undefined;

  readonly scaleTicks = [
    {label: '20 Hz', value: 20},
    {label: '200 Hz', value: 200},
    {label: '2 kHz', value: 2000},
    {label: '20 kHz', value: 20000}
  ];
  readonly minorGridValues = [
    30, 40, 50, 60, 70, 80, 90, 100,
    300, 400, 500, 600, 700, 800, 900, 1000,
    3000, 4000, 5000, 6000, 7000, 8000, 9000, 10000
  ];

  bandViews: FrequencyBandView[] = [];

  @Input() set description(value: string | null | undefined) {
    this._description = value;
    this.bandViews = extractFrequencyBands(value ?? '').map(band => this.toBandView(band));
  }

  get description(): string | null | undefined {
    return this._description;
  }

  tickX(value: number): number {
    return this.frequencyX(value);
  }

  private toBandView(band: FrequencyBand): FrequencyBandView {
    const x = this.frequencyX(band.lowHz);
    const highX = this.frequencyX(band.highHz);
    const centerX = this.frequencyX(band.centerHz ?? Math.sqrt(band.lowHz * band.highHz));
    const isPoint = band.centerHz !== undefined;

    return {
      ...band,
      x,
      width: Math.max(2, highX - x),
      centerX,
      isPoint,
      displayValue: isPoint
        ? this.formatFrequency(band.centerHz ?? band.lowHz)
        : `${ this.formatFrequency(band.lowHz) } – ${ this.formatFrequency(band.highHz) }`
    };
  }

  private frequencyX(value: number): number {
    const min = Math.log10(ModuleFrequencyAnalysisComponent.minHz);
    const max = Math.log10(ModuleFrequencyAnalysisComponent.maxHz);
    const normalized = (Math.log10(value) - min) / (max - min);

    return ModuleFrequencyAnalysisComponent.chartStart + (normalized * ModuleFrequencyAnalysisComponent.chartWidth);
  }

  private formatFrequency(value: number): string {
    if (value >= 1000) {
      return `${ Number.parseFloat((value / 1000).toFixed(1)) } kHz`;
    }

    return `${ Math.round(value) } Hz`;
  }
}
