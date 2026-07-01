import {
  ChangeDetectionStrategy,
  Component,
  Input
} from '@angular/core';
import {
  extractUtilityOperationFeatures,
  UtilityOperationFeature
} from './module-utility-operations-analysis.utils';

@Component({
  selector: 'app-module-utility-operations-analysis',
  templateUrl: './module-utility-operations-analysis.component.html',
  styleUrls: ['./module-utility-operations-analysis.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true
})
export class ModuleUtilityOperationsAnalysisComponent {
  operations: UtilityOperationFeature[] = [];

  @Input() set description(value: string | null | undefined) {
    this.operations = extractUtilityOperationFeatures(value);
  }
}
