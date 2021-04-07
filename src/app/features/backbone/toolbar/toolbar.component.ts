import {
    ChangeDetectionStrategy,
    Component
}                         from '@angular/core';
import { Router }         from '@angular/router';
import { ToolbarService } from './toolbar.service';

@Component({
  selector:        'app-toolbar',
  templateUrl:     './toolbar.component.html',
  styleUrls:       ['./toolbar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush

})
export class ToolbarComponent {

  constructor(public service: ToolbarService, public router: Router) {
  }

}
