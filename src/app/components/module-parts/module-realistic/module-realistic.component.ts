import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit
} from '@angular/core';
import { MinimalModule } from 'src/app/models/module';
import { RackDetailDataService } from '../../rack-parts/rack-detail-data.service';
import { ModuleDetailDataService } from '../module-detail-data.service';


@Component({
  selector: 'app-module-realistic',
  templateUrl: './module-realistic.component.html',
  styleUrls: ['./module-realistic.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class ModuleRealisticComponent implements OnInit {
  @Input() data: MinimalModule;
  @Input() showPanelImages: boolean = false;
  @Input() selectedPanelId: number | null = null;
  
  constructor(
    public rackDetailDataService: RackDetailDataService,
    public moduleDetailDataService: ModuleDetailDataService
  ) { }
  
  ngOnInit(): void {
    
  }
  
  buildPanelTooltip(data: any, selectedPanelId: number | null): string {
    const base = `${ data.name } (${ data.manufacturer.name }, ${ data.standard.name }, ${ data.hp }HP)`;
    if (!data.panels || data.panels.length <= 1) return base;
    const active = data.panels.find((p: any) => p.id === (selectedPanelId ?? data.panels[0]?.id));
    const label = active?.description?.trim() || this.derivePanelLabelFromFilename(active?.filename ?? '', 0);
    return `${ base } · ${ data.panels.length } panel variants · showing: ${ label }`;
  }

  private derivePanelLabelFromFilename(filename: string, index: number): string {
    const base = filename.replace(/\.[^.]+$/, '');
    const segments = base.split(/[-_]/);
    const keywords = ['dark', 'light', 'black', 'white', 'silver', 'gold', 'red', 'blue', 'green', 'alt', 'v2', 'mk2', 'mk1'];
    for (let i = segments.length - 1; i >= 0; i--) {
      if (keywords.includes(segments[i].toLowerCase())) {
        return segments[i].charAt(0).toUpperCase() + segments[i].slice(1).toLowerCase();
      }
    }
    return 'Panel ' + (index + 1);
  }

  calculateTextSize(data: MinimalModule) {
    const nameLength = data.name.length;
    const hp = data.hp;
    const standardId = data.standard.id;
    
    return (1 / (nameLength / 12) * (hp / 14)) + (standardId === 0 ? 0.5 : -1);
  }
}