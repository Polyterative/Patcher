import { InjectionToken, Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import {
  NavigationEnd,
  NavigationError,
  Router
} from '@angular/router';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';

export const CHUNK_LOAD_RELOAD_QUERY_PARAM = '__patcher_chunk_reload';
export const CHUNK_LOAD_RELOAD_STORAGE_KEY = 'patcher.chunk-load-reload.v1';
export const CHUNK_LOAD_RELOAD_COOLDOWN_MS = 30_000;

export interface ChunkLoadRecoveryWindow {
  readonly location: {
    href: string;
    replace(url: string): void;
  };
  readonly history: {
    readonly state: unknown;
    replaceState(data: unknown, unused: string, url?: string | URL | null): void;
  };
  readonly sessionStorage: Storage;
}

export const CHUNK_LOAD_RECOVERY_WINDOW = new InjectionToken<ChunkLoadRecoveryWindow | null>(
  'CHUNK_LOAD_RECOVERY_WINDOW',
  {
    factory: () => typeof window === 'undefined' ? null : window
  }
);

export function isChunkLoadError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) {
    return false;
  }

  const errorRecord = error as {message?: unknown; name?: unknown};
  const message = typeof errorRecord.message === 'string' ? errorRecord.message : '';
  const name = typeof errorRecord.name === 'string' ? errorRecord.name : '';
  return /ChunkLoadError|Loading (?:CSS )?chunk(?: \d+)? failed|Failed to fetch dynamically imported module|Importing a module script failed/i
    .test(`${ name } ${ message }`);
}

export function addChunkLoadCacheBuster(href: string, now: number): string {
  const url = new URL(href);
  url.searchParams.set(CHUNK_LOAD_RELOAD_QUERY_PARAM, String(now));
  return url.toString();
}

export function removeChunkLoadCacheBuster(href: string): string {
  const url = new URL(href);
  url.searchParams.delete(CHUNK_LOAD_RELOAD_QUERY_PARAM);
  return url.toString();
}

@Injectable({providedIn: 'root'})
export class ChunkLoadRecoveryService {
  private readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly browserWindow = inject(CHUNK_LOAD_RECOVERY_WINDOW);
  private readonly storage = this.getSessionStorage();
  private readonly routerSubscription: Subscription;
  private reloadAttempted = false;

  constructor() {
    this.routerSubscription = this.router.events.pipe(
      filter((event): event is NavigationEnd | NavigationError =>
        event instanceof NavigationEnd || event instanceof NavigationError)
    ).subscribe(event => {
      if (event instanceof NavigationError) {
        this.recoverFromNavigationError(event.error);
        return;
      }

      this.cleanRecoveryQueryParam();
    });
  }

  ngOnDestroy(): void {
    this.routerSubscription.unsubscribe();
  }

  private recoverFromNavigationError(error: unknown): void {
    if (!isPlatformBrowser(this.platformId)
      || !this.browserWindow
      || !isChunkLoadError(error)
      || this.reloadAttempted
      || this.hasRecentReloadAttempt()) {
      return;
    }

    const now = Date.now();
    this.reloadAttempted = true;
    this.recordReloadAttempt(now);
    this.browserWindow.location.replace(
      addChunkLoadCacheBuster(this.browserWindow.location.href, now)
    );
  }

  private hasRecentReloadAttempt(now = Date.now()): boolean {
    if (this.hasRecoveryQueryParam()) {
      return true;
    }

    if (!this.storage) {
      return false;
    }

    try {
      const timestamp = Number(this.storage.getItem(CHUNK_LOAD_RELOAD_STORAGE_KEY));
      return Number.isFinite(timestamp) && now - timestamp < CHUNK_LOAD_RELOAD_COOLDOWN_MS;
    } catch {
      return false;
    }
  }

  private recordReloadAttempt(now: number): void {
    if (!this.storage) {
      return;
    }

    try {
      this.storage.setItem(CHUNK_LOAD_RELOAD_STORAGE_KEY, String(now));
    } catch {
      // The query parameter remains as a loop guard when sessionStorage is unavailable.
    }
  }

  private cleanRecoveryQueryParam(): void {
    if (!this.browserWindow
      || !this.storage
      || !this.hasRecoveryQueryParam()
      || !this.hasRecentReloadAttempt()) {
      return;
    }

    this.browserWindow.history.replaceState(
      this.browserWindow.history.state,
      '',
      removeChunkLoadCacheBuster(this.browserWindow.location.href)
    );
  }

  private hasRecoveryQueryParam(): boolean {
    if (!this.browserWindow) {
      return false;
    }

    try {
      return new URL(this.browserWindow.location.href)
        .searchParams.has(CHUNK_LOAD_RELOAD_QUERY_PARAM);
    } catch {
      return false;
    }
  }

  private getSessionStorage(): Storage | null {
    if (!isPlatformBrowser(this.platformId) || !this.browserWindow) {
      return null;
    }

    try {
      return this.browserWindow.sessionStorage;
    } catch {
      return null;
    }
  }
}
