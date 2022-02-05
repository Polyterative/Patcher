import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit
}                                  from '@angular/core';
import { MinimalModule }           from '../../../../models/module';
import { ModuleMinimalViewConfig } from '../module-minimal.component';

@Component({
  selector:        'app-module-part-description',
  templateUrl:     './module-part-description.component.html',
  styleUrls:       ['./module-part-description.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ModulePartDescriptionComponent implements OnInit {
  
  @Input() data: MinimalModule;
  @Input() viewConfig: ModuleMinimalViewConfig;
  
  constructor() { }
  
  ngOnInit(): void {
  }
  
}
