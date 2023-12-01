import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { LoginGoogleComponent } from './login-google.component';

@NgModule({
  declarations: [
    LoginGoogleComponent
  ],
  imports:      [
    CommonModule
  ],
  exports:      [
    LoginGoogleComponent
  ]
})
export class LoginGoogleModule {}
