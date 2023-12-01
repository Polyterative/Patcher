import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { WidthLimiterComponent } from 'src/app/shared-interproject/components/@visual/width-limiter/width-limiter.component';

@NgModule({
  declarations: [
    WidthLimiterComponent
  ],
  imports:      [
    CommonModule
  ],
  exports:      [
    WidthLimiterComponent
  ]
})
export class WidthLimiterModule {}
