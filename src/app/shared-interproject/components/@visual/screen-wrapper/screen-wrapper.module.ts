import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ScreenWrapperComponent } from './screen-wrapper.component';

@NgModule({
  declarations: [
    ScreenWrapperComponent
  ],
  exports:      [
    ScreenWrapperComponent
  ],
  imports:      [
    CommonModule
  ]
})
export class ScreenWrapperModule { }
