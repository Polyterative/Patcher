import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FlexLayoutModule } from '@angular/flex-layout';
import { MatCardModule } from "@angular/material/card";
import { BrandPrimaryButtonModule } from '../../@visual/brand-primary-button/brand-primary-button.module';
import { CleanCardModule } from '../../@visual/clean-card/clean-card.module';
import { UserAvatarModule } from '../../@visual/user-avatar/user-avatar.module';
import { UserDataHandlerComponent } from './user-data-handler.component';


@NgModule({
  declarations: [UserDataHandlerComponent],
  imports:      [
    CommonModule,
    UserAvatarModule,
    FlexLayoutModule,
    MatCardModule,
    BrandPrimaryButtonModule,
    CleanCardModule
  ],
  exports:      [UserDataHandlerComponent]
})
export class UserDataHandlerModule {}