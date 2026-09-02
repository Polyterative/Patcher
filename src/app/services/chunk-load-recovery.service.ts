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

type ChunkLoadErrorHandler = (error: unknown) => void;

let activeChunkLoadErrorHandler: ChunkLoadErrorHandler | undefined;

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

export function reportChunkLoadError(error: unknown): boolean {
  if (!isChunkLoadError(error)) {
    return false;
  }

  activeChunkLoadErrorHandler?.(error);
  return true;
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
  private readonly chunkLoadErrorHandler: ChunkLoadErrorHandler;
  private reloadAttempted = false;

  constructor() {
    this.chunkLoadErrorHandler = error => this.recoverFromChunkLoadError(error);
    activeChunkLoadErrorHandler = this.chunkLoadErrorHandler;
    this.routerSubscription = new Subscription();
    this.routerSubscription.add(this.router.events.pipe(
      filter((event): event is NavigationEnd | NavigationError =>
        event instanceof NavigationEnd || event instanceof NavigationError)
    ).subscribe(event => {
      if (event instanceof NavigationError) {
        this.recoverFromChunkLoadError(event.error, event.url);
        return;
      }

      this.cleanRecoveryQueryParam();
    }));
    if (this.router.navigated) {
      this.cleanRecoveryQueryParam();
    }
  }

  ngOnDestroy(): void {
    if (activeChunkLoadErrorHandler === this.chunkLoadErrorHandler) {
      activeChunkLoadErrorHandler = undefined;
    }
    this.routerSubscription.unsubscribe();
  }

  private recoverFromChunkLoadError(error: unknown, targetUrl?: string): void {
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
      addChunkLoadCacheBuster(this.resolveReloadUrl(targetUrl), now)
    );
  }

  private hasRecentReloadAttempt(now = Date.now()): boolean {
    const queryTimestamp = this.getRecoveryQueryTimestamp();
    if (queryTimestamp === null) {
      return true;
    }
    if (queryTimestamp !== undefined) {
      return now - queryTimestamp < CHUNK_LOAD_RELOAD_COOLDOWN_MS;
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
    const queryTimestamp = this.getRecoveryQueryTimestamp();
    if (!this.browserWindow || queryTimestamp === undefined) {
      return;
    }

    if (this.storage) {
      try {
        if (this.storage.getItem(CHUNK_LOAD_RELOAD_STORAGE_KEY)) {
          this.replaceUrlWithoutRecoveryQuery();
        }
        return;
      } catch {
        // Fall through to the timestamp guard when sessionStorage is unavailable.
      }
    }

    if (queryTimestamp !== null
      && Date.now() - queryTimestamp < CHUNK_LOAD_RELOAD_COOLDOWN_MS) {
      return;
    }

    this.replaceUrlWithoutRecoveryQuery();
  }

  private replaceUrlWithoutRecoveryQuery(): void {
    this.browserWindow.history.replaceState(
      this.browserWindow.history.state,
      '',
      removeChunkLoadCacheBuster(this.browserWindow.location.href)
    );
  }

  private getRecoveryQueryTimestamp(): number | null | undefined {
    if (!this.browserWindow) {
      return undefined;
    }

    try {
      const value = new URL(this.browserWindow.location.href)
        .searchParams.get(CHUNK_LOAD_RELOAD_QUERY_PARAM);
      if (value === null) {
        return undefined;
      }

      const timestamp = Number(value);
      return Number.isFinite(timestamp) ? timestamp : null;
    } catch {
      return null;
    }
  }

  private resolveReloadUrl(targetUrl?: string): string {
    if (!this.browserWindow || !targetUrl) {
      return this.browserWindow?.location.href ?? '';
    }

    try {
      return new URL(targetUrl, this.browserWindow.location.href).toString();
    } catch {
      return this.browserWindow.location.href;
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
