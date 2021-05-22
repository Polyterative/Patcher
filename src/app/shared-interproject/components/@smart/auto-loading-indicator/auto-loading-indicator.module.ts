import { CommonModule }                  from '@angular/common';
import { NgModule }                      from '@angular/core';
import { FlexLayoutModule }              from '@angular/flex-layout';
import { MatCardModule }                 from '@angular/material/card';
import { MatProgressBarModule }          from '@angular/material/progress-bar';
import { AutoLoadingIndicatorComponent } from './auto-loading-indicator/auto-loading-indicator.component';


@NgModule({
  declarations: [
    AutoLoadingIndicatorComponent
  ],
  imports:      [
    CommonModule,
    MatProgressBarModule,
    MatCardModule,
    FlexLayoutModule
  ],
  exports:      [
    AutoLoadingIndicatorComponent
  ]
})
export class AutoLoadingIndicatorModule {}
