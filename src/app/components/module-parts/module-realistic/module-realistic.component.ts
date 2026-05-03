import {
  ChangeDetectionStrategy,
  Component,
  HostBinding,
  Input,
  OnInit
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
export class ModuleRealisticComponent implements OnInit {
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
  
  constructor(
    public rackDetailDataService: RackDetailDataService,
    public moduleDetailDataService: ModuleDetailDataService
  ) { }
  
  ngOnInit(): void {
    
  }
  
  buildPanelTooltip(data: any, selectedPanelId: number | null): string {
    const base = `${ data.name } (${ data.manufacturer.name }, ${ data.standard.name })`;
    if (!data.panels || data.panels.length <= 1) return base;
    const active = data.panels.find((p: any) => p.id === (selectedPanelId ?? data.panels[0]?.id));
    const label = active?.description?.trim() || derivePanelLabel(active?.filename ?? '', null, 0);
    return `${ base } · panel: ${ label }`;
  }


  calculateTextSize(data: MinimalModule) {
    const nameLength = data.name.length;
    const hp = data.hp;
    const standardId = data.standard.id;
    
    return (1 / (nameLength / 12) * (hp / 14)) + (standardId === 0 ? 0.5 : -1);
  }

  shouldRenderPanelImageSurface(): boolean {
    return this.showPanelImages;
  }

  shouldRenderTextSurface(): boolean {
    return !this.showPanelImages;
  }

  isAnalysisModeActive(): boolean {
    return this.analysisMode !== this.analysisModes.off;
  }

  isPowerAnalysisMode(): boolean {
    return this.analysisMode === this.analysisModes.power;
  }

  isFunctionAnalysisMode(): boolean {
    return this.analysisMode === this.analysisModes.function;
  }
}
