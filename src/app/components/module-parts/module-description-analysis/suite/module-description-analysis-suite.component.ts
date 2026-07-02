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
import { extractUtilityOperationFeatures } from '../utility-operations-analysis/module-utility-operations-analysis.utils';
import { extractWaveformFeatures } from '../waveform-palette-analysis/module-waveform-palette-analysis.utils';

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
  private _description: string | null | undefined;
  descriptionSignalMetadataVisible = false;

  @Input() set description(value: string | null | undefined) {
    this._description = value;
    this.descriptionSignalMetadataVisible = extractWaveformFeatures(value).length > 0 || extractUtilityOperationFeatures(value).length > 1;
  }

  get description(): string | null | undefined {
    return this._description;
  }

  @Input() showDescriptionAnalysis = false;
  @Input() showFrequencyAnalysis = false;

  get showFrequencyWidget(): boolean {
    return this.showDescriptionAnalysis || this.showFrequencyAnalysis;
  }
}
