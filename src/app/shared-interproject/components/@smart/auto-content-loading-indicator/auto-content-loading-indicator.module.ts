import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FlexLayoutModule } from '@angular/flex-layout';
import { MatLegacyCardModule as MatCardModule } from '@angular/material/legacy-card';
import { MatLegacyProgressBarModule as MatProgressBarModule } from '@angular/material/legacy-progress-bar';
import { LottieContainerModule } from '../lottie-container/lottie-container.module';
import { AutoContentLoadingIndicatorComponent } from './auto-content-loading-indicator/auto-content-loading-indicator.component';


@NgModule({
  declarations: [
    AutoContentLoadingIndicatorComponent
  ],
  imports:      [
    CommonModule,
    MatProgressBarModule,
    MatCardModule,
    FlexLayoutModule,
    LottieContainerModule
  ],
  exports:      [
    AutoContentLoadingIndicatorComponent
  ]
})
export class AutoContentLoadingIndicatorModule {}