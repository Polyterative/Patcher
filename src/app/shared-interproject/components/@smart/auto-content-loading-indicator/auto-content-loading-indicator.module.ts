import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FlexLayoutModule } from '@angular/flex-layout';
import { MatCardModule } from "@angular/material/card";
import { LottieContainerModule } from '../lottie-container/lottie-container.module';
import { AutoContentLoadingIndicatorComponent } from './auto-content-loading-indicator/auto-content-loading-indicator.component';


@NgModule({
  declarations: [
    AutoContentLoadingIndicatorComponent
  ],
  imports:      [
    CommonModule,
    MatCardModule,
    FlexLayoutModule,
    LottieContainerModule
  ],
  exports:      [
    AutoContentLoadingIndicatorComponent
  ]
})
export class AutoContentLoadingIndicatorModule {}