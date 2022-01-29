import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit
}                                from '@angular/core';
import { RackMinimal }           from '../../models/rack';
import { RackMinimalViewConfig } from '../rack-parts/rack-minimal/rack-minimal.component';

@Component({
  selector:        'app-rack-micro',
  templateUrl:     './rack-micro.component.html',
  styleUrls:       ['./rack-micro.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RackMicroComponent implements OnInit {
  
  @Input() data: RackMinimal;
  
  @Input() viewConfig: RackMinimalViewConfig;
  
  constructor() { }
  
  ngOnInit(): void {
  }
  
}
