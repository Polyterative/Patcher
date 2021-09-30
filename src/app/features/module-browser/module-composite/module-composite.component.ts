import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit
}                   from '@angular/core';
import {
  defaultModuleMinimalViewConfig,
  ModuleMinimalViewConfig
}                   from '../../../components/module-parts/module-minimal/module-minimal.component';
import { DbModule } from '../../../models/module';

@Component({
  selector:        'app-module-composite',
  templateUrl:     './module-composite.component.html',
  styleUrls:       ['./module-composite.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ModuleCompositeComponent implements OnInit {
  @Input() data: DbModule;
  @Input() viewConfig: ModuleMinimalViewConfig = defaultModuleMinimalViewConfig;
  
  constructor() {}
  
  ngOnInit(): void {
  }
  
}
