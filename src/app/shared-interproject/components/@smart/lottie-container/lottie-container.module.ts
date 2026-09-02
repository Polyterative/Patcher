import { NgModule }                 from '@angular/core';
import { LottieContainerComponent } from './lottie-container.component';
import { provideLottieOptions }     from "ngx-lottie";
import { reportChunkLoadError }     from 'src/app/services/chunk-load-recovery.service';

const loadLottiePlayer = () => import('lottie-web/build/player/esm/lottie_svg.min.js')
  .catch(error => {
    reportChunkLoadError(error);
    throw error;
  });

@NgModule({
  imports: [LottieContainerComponent],
  providers: [
    provideLottieOptions({
      player: loadLottiePlayer,
    }),
  ],
  exports: [LottieContainerComponent]
})
export class LottieContainerModule {}
