import { TestBed } from '@angular/core/testing';
import {
  NavigationEnd,
  NavigationError,
  Router
} from '@angular/router';
import { Subject } from 'rxjs';
import {
  CHUNK_LOAD_RECOVERY_WINDOW,
  CHUNK_LOAD_RELOAD_QUERY_PARAM,
  CHUNK_LOAD_RELOAD_STORAGE_KEY,
  ChunkLoadRecoveryService,
  ChunkLoadRecoveryWindow
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
    routerEvents$.next(new NavigationError(
      1,
      '/modules',
      new TypeError('Failed to fetch dynamically imported module: https://patcher.xyz/chunk-old.js'),
      null
    ));

    const replace = browserWindow.location.replace as jasmine.Spy;
    expect(replace).toHaveBeenCalledTimes(1);
    const reloadedUrl = new URL(replace.calls.first().args[0] as string);
    expect(reloadedUrl.pathname).toBe('/modules');
    expect(reloadedUrl.searchParams.get('sort')).toBe('name');
    expect(reloadedUrl.searchParams.get(CHUNK_LOAD_RELOAD_QUERY_PARAM)).toMatch(/^\d+$/);
    expect(sessionStorage.getItem(CHUNK_LOAD_RELOAD_STORAGE_KEY)).toMatch(/^\d+$/);

    routerEvents$.next(new NavigationError(
      2,
      '/modules',
      new Error('Loading chunk 42 failed'),
      null
    ));
    expect(replace).toHaveBeenCalledTimes(1);
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
      'https://patcher.xyz/modules?sort=name&__patcher_chunk_reload=1234#results';

    routerEvents$.next(new NavigationError(
      1,
      '/modules',
      new Error('Loading chunk 42 failed'),
      null
    ));

    expect(browserWindow.location.replace as jasmine.Spy).not.toHaveBeenCalled();
  });

  it('removes the recovery query after a successful navigation when the attempt is persisted', () => {
    routerEvents$.next(new NavigationError(
      1,
      '/modules',
      new Error('Loading chunk 42 failed'),
      null
    ));
    const reloadedUrl = (browserWindow.location.replace as jasmine.Spy).calls.first().args[0] as string;
    browserWindow.location.href = reloadedUrl;

    routerEvents$.next(new NavigationEnd(2, reloadedUrl, reloadedUrl));

    expect(browserWindow.history.replaceState as jasmine.Spy).toHaveBeenCalledWith(
      {navigationId: 1},
      '',
      'https://patcher.xyz/modules?sort=name#results'
    );
  });
});
