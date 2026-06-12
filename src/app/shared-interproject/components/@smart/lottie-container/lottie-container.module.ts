import { NgModule }                 from '@angular/core';
import { LottieContainerComponent } from './lottie-container.component';
import { provideLottieOptions }     from "ngx-lottie";

@NgModule({
  imports: [LottieContainerComponent],
  providers: [
    provideLottieOptions({
      player: () => import('lottie-web/build/player/esm/lottie_svg.min.js'),
    }),
  ],
  exports: [LottieContainerComponent]
})
export class LottieContainerModule {}
