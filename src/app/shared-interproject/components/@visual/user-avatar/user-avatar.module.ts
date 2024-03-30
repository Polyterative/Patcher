import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FlexLayoutModule } from '@angular/flex-layout';
import { MatCardModule } from "@angular/material/card";
import { BrandPrimaryButtonModule } from '../brand-primary-button/brand-primary-button.module';
import { CleanCardModule } from '../clean-card/clean-card.module';
import { UserAvatarComponent } from './user-avatar.component';
import { MatButtonModule } from "@angular/material/button";


@NgModule({
  declarations: [UserAvatarComponent],
  imports: [
    CommonModule,
    FlexLayoutModule,
    BrandPrimaryButtonModule,
    MatCardModule,
    CleanCardModule,
    MatButtonModule
  ],
  exports:      [UserAvatarComponent]
})
export class UserAvatarModule {}