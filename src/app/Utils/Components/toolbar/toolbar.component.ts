import {
  ChangeDetectionStrategy,
  Component
}                         from '@angular/core';
import { ToolbarService } from 'src/app/Utils/Components/toolbar/toolbar.service';
import { RoutingService } from '../../../Services/routing.service';

@Component({
  selector:        'app-toolbar',
  templateUrl:     './toolbar.component.html',
  styleUrls:       ['./toolbar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ToolbarComponent {
  
  constructor(public data: ToolbarService, private routing: RoutingService) {
  }
  
}
