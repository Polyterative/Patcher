import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit
}                        from '@angular/core';
import { MinimalModule } from '../../../models/models';

@Component({
  selector:        'app-module-realistic',
  templateUrl:     './module-realistic.component.html',
  styleUrls:       ['./module-realistic.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ModuleRealisticComponent implements OnInit {
  @Input() data: MinimalModule;
  
  constructor() { }
  
  ngOnInit(): void {
  }
  
}
