import { Injectable } from '@angular/core';
import { domToJpeg } from 'modern-screenshot';
import {
  defer,
  from,
  of
} from 'rxjs';
import {
  delay,
  finalize,
  switchMap
} from 'rxjs/operators';
import { RACK_ANALYSIS_MODES } from './rack-analysis-mode';
import { RackDetailDataContext } from './rack-detail-data.service.types';

@Injectable()
export class RackDetailImageOperationsService {
  private static readonly imageCaptureOverlayResetDelayMs = 360;

  generateRackJpegWithoutAnalysisOverlays$(
    context: RackDetailDataContext,
    el: HTMLElement,
    generateRackJpeg: (element: HTMLElement) => ReturnType<RackDetailImageOperationsService['generateRackJpeg$']>
  ) {
    return defer(() => {
      const previousAnalysisMode = context.analysisMode$.value ?? RACK_ANALYSIS_MODES.off;
      context.analysisMode$.next(RACK_ANALYSIS_MODES.off);
      context.isRackImageCaptureInProgress$.next(true);

      return of(undefined).pipe(
        delay(RackDetailImageOperationsService.imageCaptureOverlayResetDelayMs),
        switchMap(() => generateRackJpeg(el)),
        finalize(() => {
          context.isRackImageCaptureInProgress$.next(false);
          if (context.analysisMode$.value === RACK_ANALYSIS_MODES.off) {
            context.analysisMode$.next(previousAnalysisMode);
          }
        })
      );
    });
  }

  generateRackJpeg$(el: HTMLElement) {
    return from(domToJpeg(el, {
      quality: 0.9,
      backgroundColor: '#ffffff',
      width: el.scrollWidth,
      height: el.scrollHeight,
    }));
  }
}
