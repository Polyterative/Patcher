import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { LottieCacheModule, LottieModule } from 'ngx-lottie';
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
    LottieModule.forRoot({player: playerFactory}),
    LottieCacheModule.forRoot()
  ],
  exports:      [
    LottieContainerComponent
  ]
})
export class LottieContainerModule {}
