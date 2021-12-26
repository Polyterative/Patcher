import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit
}                        from '@angular/core';
import { MinimalModule } from '../../../../models/models';

@Component({
  selector:        'app-module-part-name',
  templateUrl:     './module-part-name.component.html',
  styleUrls:       ['./module-part-name.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ModulePartNameComponent implements OnInit {
  
  @Input() data: MinimalModule;
  
  constructor() { }
  
  ngOnInit(): void {
  }
  
}
