import { CommonModule }             from '@angular/common';
import { NgModule }                 from '@angular/core';
import { LottieModule }             from 'ngx-lottie';
import { LottieContainerComponent } from './lottie-container.component';

// Note we need a separate function as it's required
// by the AOT compiler.
export function playerFactory() {
  return import(/* webpackChunkName: 'lottie-web' */ 'lottie-web');
}

@NgModule({
  declarations: [
    LottieContainerComponent
  ],
  imports:      [
    CommonModule,
    LottieModule.forRoot({player: playerFactory})
  ],
  exports:      [
    LottieContainerComponent
  ]
})
export class LottieContainerModule {}
