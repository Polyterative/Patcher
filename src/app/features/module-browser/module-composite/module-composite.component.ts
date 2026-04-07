import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit
} from '@angular/core';
import {
  defaultModuleMinimalViewConfig,
  ModuleMinimalViewConfig
} from 'src/app/components/module-parts/module-minimal/module-minimal.component';
import { DbModule } from 'src/app/models/module';


@Component({
  selector: 'app-module-composite',
  templateUrl: './module-composite.component.html',
  styleUrls: ['./module-composite.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class ModuleCompositeComponent implements OnInit {
  @Input() data: DbModule;
  @Input() viewConfig: ModuleMinimalViewConfig = defaultModuleMinimalViewConfig;
  /** Passed through for instance-aware CV clicks in patch editing */
  @Input() instanceId: number | undefined;
  /** Passed through to render instance label in the module title (e.g. "(2)") */
  @Input() nameSuffix: string | undefined;
  @Input() preferredPanelColor: number | null = null;
  
  constructor() {}
  
  ngOnInit(): void {
  }
  
}