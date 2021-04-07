import { CommonModule }           from '@angular/common';
import { NgModule }               from '@angular/core';
import { FlexLayoutModule }       from '@angular/flex-layout';
import { ScreenWrapperComponent } from './screen-wrapper.component';


@NgModule({
  declarations: [
    ScreenWrapperComponent
  ],
  exports:      [
    ScreenWrapperComponent
  ],
  imports:      [
    CommonModule,
    FlexLayoutModule
  ]
})
export class ScreenWrapperModule { }
