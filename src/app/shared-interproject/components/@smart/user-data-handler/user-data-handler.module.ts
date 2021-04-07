import { CommonModule }             from '@angular/common';
import { NgModule }                 from '@angular/core';
import { FlexLayoutModule }         from '@angular/flex-layout';
import { MatCardModule }            from '@angular/material/card';
import { MatProgressBarModule }     from '@angular/material/progress-bar';
import { UserAvatarModule }         from '../../@visual/user-avatar/user-avatar.module';
import { UserDataHandlerComponent } from './user-data-handler.component';

@NgModule({
  declarations: [UserDataHandlerComponent],
  imports:      [
    CommonModule,
    UserAvatarModule,
    FlexLayoutModule,
    MatCardModule,
    MatProgressBarModule
  ],
  exports:      [UserDataHandlerComponent]
})
export class UserDataHandlerModule {}
