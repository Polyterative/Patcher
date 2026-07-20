import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output
} from '@angular/core';
import {
  defaultModuleMinimalViewConfig,
  ModuleMinimalViewConfig
} from 'src/app/components/module-parts/module-minimal/module-minimal.component';
import { getModulePanelAspectRatio } from 'src/app/components/module-parts/get-module-height-for-standard.pipe';
import {
  ModuleRecentMarketPrice,
  ModuleSparsePriceHistorySummary
} from 'src/app/features/backend/supabase-queries';
import { DbModule } from 'src/app/models/module';
import { type CoolToggleResult } from 'src/app/components/shared-atoms/cool-button/cool-button-data.service';


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
  @Input() showCoolAction = false;
  @Input() priceSummary: ModuleRecentMarketPrice | null | undefined = undefined;
  @Input() priceHistorySummary: ModuleSparsePriceHistorySummary | null | undefined = undefined;
  @Output() coolToggled = new EventEmitter<CoolToggleResult>();

  get shouldUsePortraitDetailSplit(): boolean {
    return this.preferPortraitDetailSplit
      && getModulePanelAspectRatio(this.data) <= ModuleCompositeComponent.portraitPanelSplitThreshold;
  }
  
  constructor() {}
  
  ngOnInit(): void {
  }
  
}
