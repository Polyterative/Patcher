import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FlexLayoutModule } from '@angular/flex-layout';
import { MatCardModule } from "@angular/material/card";
import { BrandPrimaryButtonComponent } from '../brand-primary-button/brand-primary-button.component';
import { CleanCardComponent } from '../clean-card/clean-card.component';
import { UserAvatarComponent } from './user-avatar.component';


@NgModule({
  declarations: [UserAvatarComponent],
  imports: [
    CommonModule,
    FlexLayoutModule,
    BrandPrimaryButtonComponent,
    MatCardModule,
    CleanCardComponent,
  ],
  exports:      [UserAvatarComponent]
})
export class UserAvatarModule {}