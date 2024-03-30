import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FlexLayoutModule } from '@angular/flex-layout';
import { MatCardModule } from "@angular/material/card";
import { MatLegacyProgressBarModule as MatProgressBarModule } from '@angular/material/legacy-progress-bar';
import { LottieContainerModule } from '../lottie-container/lottie-container.module';
import { AutoUpdateLoadingIndicatorComponent } from './auto-update-loading-indicator/auto-update-loading-indicator.component';


@NgModule({
  declarations: [
    AutoUpdateLoadingIndicatorComponent
  ],
  imports:      [
    CommonModule,
    MatProgressBarModule,
    MatCardModule,
    FlexLayoutModule,
    LottieContainerModule
  ],
  exports:      [
    AutoUpdateLoadingIndicatorComponent
  ]
})
export class AutoUpdateLoadingIndicatorModule {}