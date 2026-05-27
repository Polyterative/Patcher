import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FlexLayoutModule } from '@angular/flex-layout';
import { MatCardModule } from "@angular/material/card";
import { BrandPrimaryButtonComponent } from '../../@visual/brand-primary-button/brand-primary-button.component';
import { CleanCardComponent } from '../../@visual/clean-card/clean-card.component';
import { UserAvatarComponent } from '../../@visual/user-avatar/user-avatar.component';
import { UserDataHandlerComponent } from './user-data-handler.component';


@NgModule({
  declarations: [UserDataHandlerComponent],
  imports:      [
    CommonModule,
    UserAvatarComponent,
    FlexLayoutModule,
    MatCardModule,
    BrandPrimaryButtonComponent,
    CleanCardComponent
  ],
  exports:      [UserDataHandlerComponent]
})
export class UserDataHandlerModule {}