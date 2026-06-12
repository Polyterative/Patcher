import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit
} from '@angular/core';
import { Observable } from 'rxjs';
import { RackMinimal } from '../../models/rack';
import {
  defaultRackMinimalViewConfig,
  RackMinimalViewConfig
} from '../rack-parts/rack-minimal/rack-minimal.component';
import { RackListModule } from '../rack-list/rack-list.module';


@Component({
    selector: 'app-module-racks',
    templateUrl: './module-racks.component.html',
    styleUrls: ['./module-racks.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [RackListModule]
})
export class ModuleRacksComponent implements OnInit {
  @Input() data$: Observable<RackMinimal[]>;
  @Input() itemInitialDelay = 0;
  viewConfig: RackMinimalViewConfig = {
    ...defaultRackMinimalViewConfig,
    hideButtons: true
  };
  
  constructor() { }
  
  ngOnInit(): void {
  }
  
}