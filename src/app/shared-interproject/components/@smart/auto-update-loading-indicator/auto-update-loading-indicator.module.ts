import { CommonModule }                        from '@angular/common';
import { NgModule }                            from '@angular/core';
import { FlexLayoutModule }                    from '@angular/flex-layout';
import { MatCardModule }                       from '@angular/material/card';
import { MatProgressBarModule }                from '@angular/material/progress-bar';
import { AutoUpdateLoadingIndicatorComponent } from './auto-update-loading-indicator/auto-update-loading-indicator.component';


@NgModule({
  declarations: [
    AutoUpdateLoadingIndicatorComponent
  ],
  imports:      [
    CommonModule,
    MatProgressBarModule,
    MatCardModule,
    FlexLayoutModule
  ],
  exports:      [
    AutoUpdateLoadingIndicatorComponent
  ]
})
export class AutoUpdateLoadingIndicatorModule {}
