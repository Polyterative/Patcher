import { ChangeDetectionStrategy, Component, Input, OnInit } from '@angular/core';
import { DbModule } from 'src/app/models/module';
import { RackMinimal } from 'src/app/models/rack';

@Component({
  selector:        'app-rack-details-remaining-indicator',
  templateUrl:     './rack-details-remaining-indicator.component.html',
  styleUrls:       ['./rack-details-remaining-indicator.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RackDetailsRemainingIndicatorComponent implements OnInit {
  
  @Input() data: RackMinimal;
  
  @Input() rowModules: DbModule[];
  
  constructor() { }
  
  ngOnInit(): void {
  }
  
}
