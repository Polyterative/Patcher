import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { BrandPrimaryButtonComponent } from '../../@visual/brand-primary-button/brand-primary-button.component';
import { CleanCardComponent } from '../../@visual/clean-card/clean-card.component';
import { UserAvatarComponent } from '../../@visual/user-avatar/user-avatar.component';
import { UserDataHandlerService } from './user-data-handler.service';


/**
 *  SMART COMPONENT
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'lib-user-data-handler',
  templateUrl: './user-data-handler.component.html',
  styleUrls: ['./user-data-handler.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    UserAvatarComponent,
    MatCardModule,
    BrandPrimaryButtonComponent,
    CleanCardComponent
  ]
})
export class UserDataHandlerComponent {

  constructor(public userDataHandlerService: UserDataHandlerService) {
  }

}