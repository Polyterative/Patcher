import {
  ChangeDetectionStrategy,
  Component,
  HostBinding,
  Input,
} from '@angular/core';
import { MinimalModule } from 'src/app/models/module';
import { RackDetailDataService } from '../../rack-parts/rack-detail-data.service';
import { getModuleHeightForStandard } from '../get-module-height-for-standard.pipe';
import { ModuleDetailDataService } from '../module-detail-data.service';
import { derivePanelLabel } from '../panel.constants';
import { RackAnalysisMode, RACK_ANALYSIS_MODES } from '../../rack-parts/rack-analysis-mode';
import { prefersTouchInteraction } from 'src/app/shared-interproject/touch-interaction.utils';


@Component({
  selector: 'app-module-realistic',
  templateUrl: './module-realistic.component.html',
  styleUrls: ['./module-realistic.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class ModuleRealisticComponent {
  readonly analysisModes = RACK_ANALYSIS_MODES;
  readonly touchInteractionMode = prefersTouchInteraction();
  @Input() data: MinimalModule;
  @Input() showPanelImages: boolean = false;
  @Input() selectedPanelId: number | null = null;
  @Input() analysisMode: RackAnalysisMode = RACK_ANALYSIS_MODES.off;
  @Input() analysisClass = '';
  @Input() disablePanelImageEnterAnimation = false;

  @HostBinding('style.width.rem')
  get hostWidthRem(): number {
    return this.data?.hp ?? 0;
  }

  @HostBinding('style.height.rem')
  get hostHeightRem(): number {
    return getModuleHeightForStandard(this.data?.standard);
  }

  get renderPanelImageSurface(): boolean {
    return this.showPanelImages;
  }

  get renderTextSurface(): boolean {
    return !this.showPanelImages;
  }

  get analysisModeActive(): boolean {
    return this.analysisMode !== this.analysisModes.off;
  }

  get powerAnalysisMode(): boolean {
    return this.analysisMode === this.analysisModes.power;
  }

  get functionAnalysisMode(): boolean {
    return this.analysisMode === this.analysisModes.function;
  }

  get signalAnalysisMode(): boolean {
    return this.analysisMode === this.analysisModes.signal;
  }
  
  constructor(
    public rackDetailDataService: RackDetailDataService,
    public moduleDetailDataService: ModuleDetailDataService
  ) { }
  
  buildPanelTooltip(data: MinimalModule, selectedPanelId: number | null): string {
    const base = `${ data.name } (${ data.manufacturer.name }, ${ data.standard.name })`;
    if (!data.panels || data.panels.length <= 1) return base;

    const active = this.resolveActivePanel(data, selectedPanelId);
    const label = active?.description?.trim() || derivePanelLabel(active?.filename ?? '', null, 0);
    return `${ base } · panel: ${ label }`;
  }


  calculateTextSize(data: MinimalModule): number {
    const nameLength = data.name.length;
    const hp = data.hp;
    const standardId = data.standard.id;
    
    return (1 / (nameLength / 12) * (hp / 14)) + (standardId === 0 ? 0.5 : -1);
  }

  private resolveActivePanel(
    data: MinimalModule,
    selectedPanelId: number | null
  ): MinimalModule['panels'][number] | undefined {
    return data.panels?.find(panel => panel.id === (selectedPanelId ?? data.panels?.[0]?.id));
  }
}
