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


@Component({
  selector:        'app-module-racks',
  templateUrl:     './module-racks.component.html',
  styleUrls:       ['./module-racks.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ModuleRacksComponent implements OnInit {
  @Input()
  readonly data$: Observable<RackMinimal[]>;
  viewConfig: RackMinimalViewConfig = {
    ...defaultRackMinimalViewConfig,
    hideButtons: true
  };
  
  constructor() { }
  
  ngOnInit(): void {
  }
  
}
