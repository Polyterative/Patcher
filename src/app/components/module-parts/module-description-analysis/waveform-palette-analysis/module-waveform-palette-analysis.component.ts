import {
  ChangeDetectionStrategy,
  Component,
  Input
} from '@angular/core';
import {
  extractWaveformFeatures,
  WaveformFeature
} from './module-waveform-palette-analysis.utils';

@Component({
  selector: 'app-module-waveform-palette-analysis',
  templateUrl: './module-waveform-palette-analysis.component.html',
  styleUrls: ['./module-waveform-palette-analysis.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true
})
export class ModuleWaveformPaletteAnalysisComponent {
  waveforms: WaveformFeature[] = [];

  @Input() set description(value: string | null | undefined) {
    this.waveforms = extractWaveformFeatures(value);
  }
}
