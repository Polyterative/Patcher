import {
  Inject,
  Injectable,
  PLATFORM_ID
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export interface AppViewportSnapshot {
  width: number;
  height: number;
  offsetTop: number;
  offsetLeft: number;
  keyboardInsetBottom: number;
}

@Injectable({
  providedIn: 'root'
})
export class AppViewportService {
  private initialized = false;
  private readonly isBrowser: boolean;
  private readonly cleanupCallbacks: Array<() => void> = [];

  constructor(@Inject(PLATFORM_ID) platformId: object) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  initialize(): void {
    if (!this.isBrowser || this.initialized) {
      return;
    }

    this.initialized = true;
    this.applyViewportSnapshot();

    const handleViewportChange = () => this.applyViewportSnapshot();
    this.registerListener(window, 'resize', handleViewportChange);
    this.registerListener(window, 'orientationchange', handleViewportChange);
    this.registerListener(document, 'visibilitychange', handleViewportChange);

    if (window.visualViewport) {
      this.registerListener(window.visualViewport, 'resize', handleViewportChange);
      this.registerListener(window.visualViewport, 'scroll', handleViewportChange);
    }
  }

  currentViewport(): AppViewportSnapshot {
    if (!this.isBrowser) {
      return {
        width: 0,
        height: 0,
        offsetTop: 0,
        offsetLeft: 0,
        keyboardInsetBottom: 0
      };
    }

    const visualViewport = window.visualViewport;
    const width = visualViewport?.width ?? window.innerWidth;
    const height = visualViewport?.height ?? window.innerHeight;
    const offsetTop = visualViewport?.offsetTop ?? 0;
    const offsetLeft = visualViewport?.offsetLeft ?? 0;
    const keyboardInsetBottom = Math.max(0, window.innerHeight - (height + offsetTop));

    return {
      width,
      height,
      offsetTop,
      offsetLeft,
      keyboardInsetBottom
    };
  }

  private applyViewportSnapshot(): void {
    if (!this.isBrowser) {
      return;
    }

    const snapshot = this.currentViewport();
    const rootStyle = document.documentElement.style;
    const floatingBottomOffset = snapshot.keyboardInsetBottom > 0
      ? snapshot.keyboardInsetBottom + 12
      : 0;

    rootStyle.setProperty('--app-viewport-width', `${ snapshot.width }px`);
    rootStyle.setProperty('--app-viewport-height', `${ snapshot.height }px`);
    rootStyle.setProperty('--app-viewport-offset-top', `${ snapshot.offsetTop }px`);
    rootStyle.setProperty('--app-viewport-offset-left', `${ snapshot.offsetLeft }px`);
    rootStyle.setProperty('--app-keyboard-inset-bottom', `${ snapshot.keyboardInsetBottom }px`);
    rootStyle.setProperty('--app-floating-bottom-offset', `${ floatingBottomOffset }px`);
  }

  private registerListener(
    target: EventTarget,
    type: string,
    listener: EventListenerOrEventListenerObject
  ): void {
    target.addEventListener(type, listener, {passive: true});
    this.cleanupCallbacks.push(() => target.removeEventListener(type, listener));
  }
}
