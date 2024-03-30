import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FlexLayoutModule } from '@angular/flex-layout';
import { MatLegacyButtonModule as MatButtonModule } from '@angular/material/legacy-button';
import { MatLegacyCardModule as MatCardModule } from '@angular/material/legacy-card';
import { BrandPrimaryButtonModule } from '../brand-primary-button/brand-primary-button.module';
import { CleanCardModule } from '../clean-card/clean-card.module';
import { UserAvatarComponent } from './user-avatar.component';


@NgModule({
  declarations: [UserAvatarComponent],
  imports:      [
    CommonModule,
    FlexLayoutModule,
    BrandPrimaryButtonModule,
    MatCardModule,
    MatButtonModule,
    CleanCardModule
  ],
  exports:      [UserAvatarComponent]
})
export class UserAvatarModule {}