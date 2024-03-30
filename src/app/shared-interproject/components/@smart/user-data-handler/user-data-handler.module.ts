import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FlexLayoutModule } from '@angular/flex-layout';
import { MatLegacyCardModule as MatCardModule } from '@angular/material/legacy-card';
import { MatLegacyProgressBarModule as MatProgressBarModule } from '@angular/material/legacy-progress-bar';
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
    MatProgressBarModule,
    BrandPrimaryButtonModule,
    CleanCardModule
  ],
  exports:      [UserDataHandlerComponent]
})
export class UserDataHandlerModule {}