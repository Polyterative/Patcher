import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit
}                     from '@angular/core';
import { Observable } from 'rxjs';
import {
  DbModule,
  RackMinimal
}                     from '../../../../models/models';

@Component({
  selector:        'app-rack-details-remaining-indicator',
  templateUrl:     './rack-details-remaining-indicator.component.html',
  styleUrls:       ['./rack-details-remaining-indicator.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RackDetailsRemainingIndicatorComponent implements OnInit {
  
  @Input() data: RackMinimal;
  
  @Input() rackModules$: Observable<DbModule[]>;
  
  constructor() { }
  
  ngOnInit(): void {
  }
  
}
