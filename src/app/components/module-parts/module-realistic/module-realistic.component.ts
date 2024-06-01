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
  selector:        'app-module-realistic',
  templateUrl:     './module-realistic.component.html',
  styleUrls:       ['./module-realistic.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ModuleRealisticComponent implements OnInit {
  @Input() data: MinimalModule;
  
  @Input() showPanelImages: boolean = false;
  
  constructor(
    public rackDetailDataService: RackDetailDataService,
    public moduleDetailDataService: ModuleDetailDataService
  ) { }
  
  ngOnInit(): void {
    
  }
  
  calculateTextSize(data: MinimalModule) {
    const nameLength = data.name.length;
    const hp = data.hp;
    const standardId = data.standard.id;
    
    return (1 / (nameLength / 12) * (hp / 14)) + (standardId === 0 ? 0.5 : -1);
  }
}