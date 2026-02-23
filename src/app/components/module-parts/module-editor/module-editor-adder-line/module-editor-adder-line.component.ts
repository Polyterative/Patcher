import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Output
} from '@angular/core';
import { CV } from 'src/app/models/cv';

interface CvPreset {
  label: string;
  min?: number;
  max?: number;
}


@Component({
  selector: 'app-module-editor-adder-line',
  templateUrl: './module-editor-adder-line.component.html',
  styleUrls: ['./module-editor-adder-line.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class ModuleEditorAdderLineComponent {
  
  @Output() add$ = new EventEmitter<CV>();

  readonly presets: CvPreset[] = [
    {label: 'Blank'},
    {label: '0 to +5V', min: 0, max: 5},
    {label: '0 to +8V', min: 0, max: 8},
    {label: '-5 to +5V', min: -5, max: 5},
    {label: '-10 to +10V', min: -10, max: 10},
    {label: '-12 to +12V', min: -12, max: 12}
  ];

  addPreset(preset: CvPreset): void {
    this.add$.next({
      name: '',
      id: 0,
      min: preset.min,
      max: preset.max,
      isApproved: false
    });
  }
  
}
