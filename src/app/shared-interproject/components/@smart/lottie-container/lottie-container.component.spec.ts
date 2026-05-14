import { LottieContainerComponent } from './lottie-container.component';
import { PLATFORM_ID } from '@angular/core';

// Angular platform tokens are strings under the hood at runtime
const BROWSER_PLATFORM = 'browser' as unknown as object;
const SERVER_PLATFORM = 'server' as unknown as object;

function makeComp(platformId: object = BROWSER_PLATFORM): LottieContainerComponent {
  return new LottieContainerComponent(platformId);
}

describe('LottieContainerComponent', () => {
  describe('isBrowser', () => {
    it('is true when platformId is "browser"', () => {
      expect(makeComp(BROWSER_PLATFORM).isBrowser).toBeTrue();
    });

    it('is false when platformId is "server"', () => {
      expect(makeComp(SERVER_PLATFORM).isBrowser).toBeFalse();
    });
  });

  describe('default inputs', () => {
    it('styles defaults to maxWidth and margin', () => {
      const comp = makeComp();
      expect(comp.styles.maxWidth).toBe('31.25rem');
      expect(comp.styles.margin).toBe('0 auto');
    });

    it('options starts as undefined', () => {
      expect(makeComp().options).toBeUndefined();
    });
  });

  describe('ngOnInit', () => {
    it('does not throw', () => {
      expect(() => makeComp().ngOnInit()).not.toThrow();
    });
  });

  describe('input override', () => {
    it('accepts custom styles', () => {
      const comp = makeComp();
      comp.styles = { maxWidth: '100%' };
      expect(comp.styles.maxWidth).toBe('100%');
    });
  });
});
