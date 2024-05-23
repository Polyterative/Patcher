import { CommonModule }             from '@angular/common';
import { NgModule }                 from '@angular/core';
import { LottieContainerComponent } from './lottie-container.component';
import {
  LottieComponent,
  provideLottieOptions
}                                   from "ngx-lottie";


@NgModule({
  declarations: [
    LottieContainerComponent
  ],
  imports:   [
    CommonModule,
    LottieComponent,
  ],
  providers: [
    provideLottieOptions({
      player: () => import( 'lottie-web'),
    }),
  ],
  exports:      [
    LottieContainerComponent
  ]
})
export class LottieContainerModule {}