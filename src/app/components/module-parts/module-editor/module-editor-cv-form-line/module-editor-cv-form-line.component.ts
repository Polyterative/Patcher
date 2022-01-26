import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output
}                    from '@angular/core';
import { FormTypes } from '../../../../shared-interproject/components/@smart/mat-form-entity/form-element-models';
import { FormCV }    from '../module-editor.component';

@Component({
  selector:        'app-module-editor-cv-form-line',
  templateUrl:     './module-editor-cv-form-line.component.html',
  styleUrls:       ['./module-editor-cv-form-line.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ModuleEditorCvFormLineComponent implements OnInit {
  
  @Input() item: FormCV;
  
  @Output() removeRequest$ = new EventEmitter<void>();
  
  types = FormTypes;
  
  ngOnInit(): void {
    // perform checks on this.item and console errors if needed
    if (!this.item) {
      console.error('ModuleEditorCvFormLineComponent: item is undefined');
    }
  
  }
  
}
