import { CommonModule }             from '@angular/common';
import { NgModule }                 from '@angular/core';
import { FlexLayoutModule }         from '@angular/flex-layout';
import { MatButtonModule }          from '@angular/material/button';
import { MatCardModule }            from '@angular/material/card';
import { BrandPrimaryButtonModule } from '../brand-primary-button/brand-primary-button.module';
import { CleanCardModule }          from '../clean-card/clean-card.module';
import { UserAvatarComponent }      from './user-avatar.component';


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
