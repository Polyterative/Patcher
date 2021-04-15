import { CommonModule }        from '@angular/common';
import { NgModule }            from '@angular/core';
import { SignupPageComponent } from './signup-page.component';


@NgModule({
  declarations: [
    SignupPageComponent
  ],
  imports:      [
    CommonModule
  ],
  exports:      [
    SignupPageComponent
  ]
})
export class SignupModule {}
