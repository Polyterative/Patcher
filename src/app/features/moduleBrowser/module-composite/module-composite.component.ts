import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit
}                   from '@angular/core';
import { DbModule } from '../../../models/models';

@Component({
  selector:        'app-module-composite',
  templateUrl:     './module-composite.component.html',
  styleUrls:       ['./module-composite.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ModuleCompositeComponent implements OnInit {
  @Input() data: DbModule;
  
  constructor() {}
  
  ngOnInit(): void {
  }
  
}
