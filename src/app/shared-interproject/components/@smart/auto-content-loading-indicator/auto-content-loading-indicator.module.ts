import { CommonModule }                         from '@angular/common';
import { NgModule }                             from '@angular/core';
import { FlexLayoutModule }                     from '@angular/flex-layout';
import { MatCardModule }                        from '@angular/material/card';
import { MatProgressBarModule }                 from '@angular/material/progress-bar';
import { AutoContentLoadingIndicatorComponent } from './auto-content-loading-indicator/auto-content-loading-indicator.component';


@NgModule({
  declarations: [
    AutoContentLoadingIndicatorComponent
  ],
  imports:      [
    CommonModule,
    MatProgressBarModule,
    MatCardModule,
    FlexLayoutModule
  ],
  exports:      [
    AutoContentLoadingIndicatorComponent
  ]
})
export class AutoContentLoadingIndicatorModule {}
