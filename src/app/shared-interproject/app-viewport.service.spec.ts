import { AppViewportService } from './app-viewport.service';


describe('AppViewportService', () => {
  let originalVisualViewport: VisualViewport | undefined;
  const px = (value: number) => `${ value }${ 'px' }`;

  beforeEach(() => {
    originalVisualViewport = window.visualViewport;
  });

  afterEach(() => {
    if (originalVisualViewport) {
      Object.defineProperty(window, 'visualViewport', {
        configurable: true,
        value: originalVisualViewport
      });
    } else {
      Object.defineProperty(window, 'visualViewport', {
        configurable: true,
        value: undefined
      });
    }
    document.documentElement.removeAttribute('style');
  });

  it('reads dynamic and stable heights from the visual viewport when available', () => {
    spyOnProperty(window, 'innerHeight', 'get').and.returnValue(900);
    spyOnProperty(window, 'innerWidth', 'get').and.returnValue(1280);
    Object.defineProperty(window, 'visualViewport', {
      configurable: true,
      value: {
        width: 820,
        height: 640,
        offsetTop: 36,
        offsetLeft: 12
      }
    });

    const service = new AppViewportService('browser' as unknown as object);
    const snapshot = service.currentViewport();

    expect(snapshot.width).toBe(820);
    expect(snapshot.height).toBe(640);
    expect(snapshot.stableHeight).toBe(900);
    expect(snapshot.offsetTop).toBe(36);
    expect(snapshot.offsetLeft).toBe(12);
    expect(snapshot.keyboardInsetBottom).toBe(224);
  });

  it('applies the viewport CSS variables including stable and dynamic heights', () => {
    spyOnProperty(window, 'innerHeight', 'get').and.returnValue(900);
    spyOnProperty(window, 'innerWidth', 'get').and.returnValue(1280);
    Object.defineProperty(window, 'visualViewport', {
      configurable: true,
      value: {
        width: 820,
        height: 640,
        offsetTop: 36,
        offsetLeft: 12,
        addEventListener: () => undefined,
        removeEventListener: () => undefined
      }
    });

    const service = new AppViewportService('browser' as unknown as object);
    service.initialize();

    const rootStyle = document.documentElement.style;
    expect(rootStyle.getPropertyValue('--app-viewport-width')).toBe(px(820));
    expect(rootStyle.getPropertyValue('--app-viewport-height')).toBe(px(640));
    expect(rootStyle.getPropertyValue('--app-viewport-dynamic-height')).toBe(px(640));
    expect(rootStyle.getPropertyValue('--app-viewport-stable-height')).toBe(px(900));
    expect(rootStyle.getPropertyValue('--app-keyboard-inset-bottom')).toBe(px(224));
    expect(rootStyle.getPropertyValue('--app-floating-bottom-offset')).toBe(px(236));
  });
});
