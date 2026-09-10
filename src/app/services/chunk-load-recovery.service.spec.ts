import { TestBed } from '@angular/core/testing';
import {
  NavigationEnd,
  NavigationError,
  Router
} from '@angular/router';
import { Subject } from 'rxjs';
import {
  CHUNK_LOAD_RECOVERY_WINDOW,
  CHUNK_LOAD_RECOVERY_PATH_PREFIX,
  CHUNK_LOAD_RELOAD_QUERY_PARAM,
  CHUNK_LOAD_RELOAD_TARGET_QUERY_PARAM,
  CHUNK_LOAD_RELOAD_STORAGE_KEY,
  ChunkLoadRecoveryService,
  ChunkLoadRecoveryWindow,
  reportChunkLoadError,
  removeChunkLoadCacheBuster,
  resolveChunkLoadRecoveryTarget
} from './chunk-load-recovery.service';

describe('ChunkLoadRecoveryService', () => {
  let routerEvents$: Subject<NavigationEnd | NavigationError>;
  let browserWindow: ChunkLoadRecoveryWindow;
  let service: ChunkLoadRecoveryService;

  beforeEach(() => {
    sessionStorage.removeItem(CHUNK_LOAD_RELOAD_STORAGE_KEY);
    routerEvents$ = new Subject<NavigationEnd | NavigationError>();
    browserWindow = {
      location: {
        href: 'https://patcher.xyz/modules?sort=name#results',
        replace: jasmine.createSpy('replace')
      },
      history: {
        state: {navigationId: 1},
        replaceState: jasmine.createSpy('replaceState')
      },
      sessionStorage
    };

    TestBed.configureTestingModule({
      providers: [
        ChunkLoadRecoveryService,
        {
          provide: Router,
          useValue: {events: routerEvents$}
        },
        {
          provide: CHUNK_LOAD_RECOVERY_WINDOW,
          useValue: browserWindow
        }
      ]
    });
    service = TestBed.inject(ChunkLoadRecoveryService);
  });

  afterEach(() => {
    service.ngOnDestroy();
    sessionStorage.removeItem(CHUNK_LOAD_RELOAD_STORAGE_KEY);
  });

  it('reloads once with a cache-busted URL for a dynamic-import navigation error', () => {
    browserWindow.location.href = 'https://patcher.xyz/home';
    routerEvents$.next(new NavigationError(
      1,
      '/modules/browser',
      new TypeError('Failed to fetch dynamically imported module: https://patcher.xyz/chunk-old.js'),
      null
    ));

    const replace = browserWindow.location.replace as jasmine.Spy;
    expect(replace).toHaveBeenCalledTimes(1);
    const reloadedUrl = new URL(replace.calls.first().args[0] as string);
    expect(reloadedUrl.pathname).toMatch(new RegExp(`^${ CHUNK_LOAD_RECOVERY_PATH_PREFIX }\\d+$`));
    expect(reloadedUrl.searchParams.get(CHUNK_LOAD_RELOAD_QUERY_PARAM)).toMatch(/^\d+$/);
    expect(reloadedUrl.searchParams.get(CHUNK_LOAD_RELOAD_TARGET_QUERY_PARAM))
      .toBe('/modules/browser');
    expect(sessionStorage.getItem(CHUNK_LOAD_RELOAD_STORAGE_KEY)).toMatch(/^\d+$/);

    routerEvents$.next(new NavigationError(
      2,
      '/modules',
      new Error('Loading chunk 42 failed'),
      null
    ));
    expect(replace).toHaveBeenCalledTimes(1);
  });

  it('recovers direct dynamic-import reports outside router navigation', () => {
    expect(reportChunkLoadError(new TypeError(
      'Failed to fetch dynamically imported module: https://patcher.xyz/chunk-old.js'
    ))).toBeTrue();

    expect(browserWindow.location.replace as jasmine.Spy).toHaveBeenCalledTimes(1);
  });

  it('does not reload for ordinary navigation failures', () => {
    routerEvents$.next(new NavigationError(
      1,
      '/modules',
      new TypeError('Failed to fetch /api/modules'),
      null
    ));

    expect(browserWindow.location.replace as jasmine.Spy).not.toHaveBeenCalled();
  });

  it('does not loop when the cache-busted URL is loaded again', () => {
    browserWindow.location.href =
      `https://patcher.xyz/modules?sort=name&__patcher_chunk_reload=${Date.now()}#results`;

    routerEvents$.next(new NavigationError(
      1,
      '/modules',
      new Error('Loading chunk 42 failed'),
      null
    ));

    expect(browserWindow.location.replace as jasmine.Spy).not.toHaveBeenCalled();
  });

  it('loads a fresh shell through a path-based recovery URL and restores the intended route before boot', () => {
    browserWindow.location.href = 'https://patcher.xyz/';

    routerEvents$.next(new NavigationError(
      1,
      '/modules/browser?sort=name#results',
      new Error('Loading chunk 42 failed'),
      null
    ));

    const recoveryUrl = (browserWindow.location.replace as jasmine.Spy).calls.first().args[0] as string;
    expect(resolveChunkLoadRecoveryTarget(recoveryUrl)).toBe('/modules/browser?sort=name#results');

    browserWindow.location.href = recoveryUrl;
    service.ngOnDestroy();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        ChunkLoadRecoveryService,
        {
          provide: Router,
          useValue: {events: routerEvents$}
        },
        {
          provide: CHUNK_LOAD_RECOVERY_WINDOW,
          useValue: browserWindow
        }
      ]
    });
    service = TestBed.inject(ChunkLoadRecoveryService);

    expect(browserWindow.history.replaceState as jasmine.Spy).toHaveBeenCalledWith(
      {navigationId: 1},
      '',
      '/modules/browser?sort=name#results'
    );
  });

  it('does not carry an older query-only recovery marker into the restored route', () => {
    browserWindow.location.href =
      'https://patcher.xyz/modules?sort=name&__patcher_chunk_reload=1234#results';

    routerEvents$.next(new NavigationError(
      1,
      browserWindow.location.href,
      new Error('Loading chunk 42 failed'),
      null
    ));

    const recoveryUrl = (browserWindow.location.replace as jasmine.Spy).calls.first().args[0] as string;
    expect(resolveChunkLoadRecoveryTarget(recoveryUrl)).toBe('/modules?sort=name#results');
    expect(removeChunkLoadCacheBuster(recoveryUrl)).not.toContain(CHUNK_LOAD_RELOAD_TARGET_QUERY_PARAM);
  });

  it('rejects recovery targets that are not same-origin application paths', () => {
    expect(resolveChunkLoadRecoveryTarget(
      'https://patcher.xyz/__patcher_chunk_recovery/123?__patcher_chunk_reload=123&__patcher_chunk_target=javascript%3Aalert(1)'
    )).toBeUndefined();
    expect(resolveChunkLoadRecoveryTarget(
      'https://patcher.xyz/__patcher_chunk_recovery/123?__patcher_chunk_reload=123&__patcher_chunk_target=https%3A%2F%2Fevil.example%2F'
    )).toBeUndefined();
    expect(resolveChunkLoadRecoveryTarget(
      'https://patcher.xyz/__patcher_chunk_recovery/123?__patcher_chunk_reload=123&__patcher_chunk_target=%2F%2Fevil.example%2F'
    )).toBeUndefined();
  });

  it('keeps a recovery marker in the restored route when session storage is unavailable', () => {
    browserWindow.location.href = 'https://patcher.xyz/';
    routerEvents$.next(new NavigationError(
      1,
      '/modules/browser?sort=name#results',
      new Error('Loading chunk 42 failed'),
      null
    ));
    const recoveryUrl = (browserWindow.location.replace as jasmine.Spy).calls.first().args[0] as string;
    const recoveryTimestamp = new URL(recoveryUrl).searchParams.get(CHUNK_LOAD_RELOAD_QUERY_PARAM);

    service.ngOnDestroy();
    TestBed.resetTestingModule();
    Object.defineProperty(browserWindow, 'sessionStorage', {
      configurable: true,
      get: () => {
        throw new Error('sessionStorage unavailable');
      }
    });
    browserWindow.location.href = recoveryUrl;
    TestBed.configureTestingModule({
      providers: [
        ChunkLoadRecoveryService,
        {
          provide: Router,
          useValue: {events: routerEvents$}
        },
        {
          provide: CHUNK_LOAD_RECOVERY_WINDOW,
          useValue: browserWindow
        }
      ]
    });
    service = TestBed.inject(ChunkLoadRecoveryService);

    const normalizedUrl =
      `/modules/browser?sort=name&${ CHUNK_LOAD_RELOAD_QUERY_PARAM }=${ recoveryTimestamp }#results`;
    expect(browserWindow.history.replaceState as jasmine.Spy).toHaveBeenCalledWith(
      {navigationId: 1},
      '',
      normalizedUrl
    );

    browserWindow.location.href = `https://patcher.xyz${ normalizedUrl }`;
    routerEvents$.next(new NavigationError(
      2,
      normalizedUrl,
      new Error('Loading chunk 42 failed'),
      null
    ));
    expect(browserWindow.location.replace as jasmine.Spy).toHaveBeenCalledTimes(1);
  });

  it('removes the recovery query after a successful navigation when the attempt is persisted', () => {
    routerEvents$.next(new NavigationError(
      1,
      '/modules?sort=name#results',
      new Error('Loading chunk 42 failed'),
      null
    ));
    const reloadedUrl = (browserWindow.location.replace as jasmine.Spy).calls.first().args[0] as string;
    browserWindow.location.href = reloadedUrl;

    routerEvents$.next(new NavigationEnd(2, reloadedUrl, reloadedUrl));

    expect(browserWindow.history.replaceState as jasmine.Spy).toHaveBeenCalledWith(
      {navigationId: 1},
      '',
      '/modules?sort=name#results'
    );
  });

  it('cleans a persisted recovery query when initialized after navigation', () => {
    sessionStorage.setItem(CHUNK_LOAD_RELOAD_STORAGE_KEY, String(Date.now()));
    browserWindow.location.href =
      'https://patcher.xyz/modules?__patcher_chunk_reload=1234#results';

    service.ngOnDestroy();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        ChunkLoadRecoveryService,
        {
          provide: Router,
          useValue: {events: routerEvents$, navigated: true}
        },
        {
          provide: CHUNK_LOAD_RECOVERY_WINDOW,
          useValue: browserWindow
        }
      ]
    });
    service = TestBed.inject(ChunkLoadRecoveryService);

    expect(browserWindow.history.replaceState as jasmine.Spy).toHaveBeenCalledWith(
      {navigationId: 1},
      '',
      'https://patcher.xyz/modules#results'
    );
  });

  it('allows a stale recovery query to expire instead of blocking future retries', () => {
    browserWindow.location.href =
      'https://patcher.xyz/modules?__patcher_chunk_reload=0#results';

    routerEvents$.next(new NavigationError(
      1,
      '/modules',
      new Error('Loading chunk 42 failed'),
      null
    ));

    expect(browserWindow.location.replace as jasmine.Spy).toHaveBeenCalledTimes(1);
  });

  it('treats a malformed recovery query as a loop guard', () => {
    browserWindow.location.href =
      'https://patcher.xyz/modules?__patcher_chunk_reload=not-a-timestamp';

    routerEvents$.next(new NavigationError(
      1,
      '/modules',
      new Error('Loading chunk 42 failed'),
      null
    ));

    expect(browserWindow.location.replace as jasmine.Spy).not.toHaveBeenCalled();
  });
});
