import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  OnInit,
  Output
}             from '@angular/core';
import { CV } from '../../../../models/cv';

@Component({
  selector:        'app-module-editor-adder-line',
  templateUrl:     './module-editor-adder-line.component.html',
  styleUrls:       ['./module-editor-adder-line.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ModuleEditorAdderLineComponent implements OnInit {
  
  @Output() add$ = new EventEmitter<CV>();
  
  ngOnInit(): void {
  }
  
}
