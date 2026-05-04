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
import { getModulePanelAspectRatio } from 'src/app/components/module-parts/get-module-height-for-standard.pipe';
import { DbModule } from 'src/app/models/module';


@Component({
  selector: 'app-module-composite',
  templateUrl: './module-composite.component.html',
  styleUrls: ['./module-composite.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class ModuleCompositeComponent implements OnInit {
  private static readonly portraitPanelSplitThreshold = 0.78;
  @Input() data: DbModule;
  @Input() viewConfig: ModuleMinimalViewConfig = defaultModuleMinimalViewConfig;
  /** Passed through for instance-aware CV clicks in patch editing */
  @Input() instanceId: number | undefined;
  /** Passed through to render instance label in the module title (e.g. "(2)") */
  @Input() nameSuffix: string | undefined;
  @Input() preferredPanelColor: number | null = null;
  @Input() preferPortraitDetailSplit = false;

  get shouldUsePortraitDetailSplit(): boolean {
    return this.preferPortraitDetailSplit
      && getModulePanelAspectRatio(this.data) <= ModuleCompositeComponent.portraitPanelSplitThreshold;
  }
  
  constructor() {}
  
  ngOnInit(): void {
  }
  
}
