import { Component }              from '@angular/core';
import { UserDataHandlerService } from './user-data-handler.service';

/**
 *  SMART COMPONENT
 */
@Component({
  selector:        'lib-user-data-handler',
  templateUrl:     './user-data-handler.component.html',
  styleUrls:       ['./user-data-handler.component.scss']
})
export class UserDataHandlerComponent {

  constructor(public service: UserDataHandlerService) {
  }

}
