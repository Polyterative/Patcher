import {
  ChangeDetectionStrategy,
  Component,
  Input
} from '@angular/core';
import { ModuleClockDivisionAnalysisComponent } from '../clock-division-analysis/module-clock-division-analysis.component';
import { ModuleFrequencyAnalysisComponent } from '../frequency-analysis/module-frequency-analysis.component';
import { ModuleTimeRateAnalysisComponent } from '../time-rate-analysis/module-time-rate-analysis.component';
import { ModuleUtilityOperationsAnalysisComponent } from '../utility-operations-analysis/module-utility-operations-analysis.component';
import { ModuleVoltageAnalysisComponent } from '../voltage-analysis/module-voltage-analysis.component';
import { ModuleWaveformPaletteAnalysisComponent } from '../waveform-palette-analysis/module-waveform-palette-analysis.component';

@Component({
  selector: 'app-module-description-analysis-suite',
  templateUrl: './module-description-analysis-suite.component.html',
  styleUrls: ['./module-description-analysis-suite.component.scss'],
  imports: [
    ModuleFrequencyAnalysisComponent,
    ModuleVoltageAnalysisComponent,
    ModuleTimeRateAnalysisComponent,
    ModuleClockDivisionAnalysisComponent,
    ModuleWaveformPaletteAnalysisComponent,
    ModuleUtilityOperationsAnalysisComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true
})
export class ModuleDescriptionAnalysisSuiteComponent {
  @Input() description: string | null | undefined;
  @Input() showDescriptionAnalysis = false;
  @Input() showFrequencyAnalysis = false;

  get showFrequencyWidget(): boolean {
    return this.showDescriptionAnalysis || this.showFrequencyAnalysis;
  }
}
