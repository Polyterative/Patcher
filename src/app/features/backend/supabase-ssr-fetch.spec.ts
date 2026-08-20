import {
  fakeAsync,
  flush,
  tick
} from '@angular/core/testing';
import { PendingTasks, ɵPendingTasksInternal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  NavigationCancel,
  NavigationEnd,
  NavigationError,
  NavigationSkipped,
  NavigationSkippedCode,
  Router
} from '@angular/router';
import { Subject } from 'rxjs';
import {
  bindSsrDetailLoadGuard,
  createSsrBootstrapGuard,
  createSsrPendingTasksFetch,
  releaseSsrBootstrapGuardOnNavigationSettled,
  suppressPrematureServerPendingTasksDestroy
} from './supabase-ssr-fetch';

describe('createSsrBootstrapGuard', () => {
  let pendingTasks: PendingTasks;
  let internalPendingTasks: ɵPendingTasksInternal;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    pendingTasks = TestBed.inject(PendingTasks);
    internalPendingTasks = TestBed.inject(ɵPendingTasksInternal);
  });

  it('keeps the app unstable immediately after construction', fakeAsync(() => {
    const guard = createSsrBootstrapGuard(pendingTasks);
    expect(internalPendingTasks.hasPendingTasks).toBeTrue();
    guard.release();
    flush();
  }));

  it('stays unstable until release() is called', fakeAsync(() => {
    const guard = createSsrBootstrapGuard(pendingTasks);
    expect(internalPendingTasks.hasPendingTasks).toBeTrue();

    guard.release();
    // The change-detection scheduler briefly re-registers its own pending task to run
    // one more CD pass after ours clears — flush that before asserting stability.
    flush();
    expect(internalPendingTasks.hasPendingTasks).toBeFalse();
  }));

  it('is safe to release more than once', fakeAsync(() => {
    const guard = createSsrBootstrapGuard(pendingTasks);
    guard.release();
    expect(() => guard.release()).not.toThrow();
    flush();
    expect(internalPendingTasks.hasPendingTasks).toBeFalse();
  }));
});

describe('releaseSsrBootstrapGuardOnNavigationSettled', () => {
  let events: Subject<unknown>;
  let router: Router;
  let guard: { release: jasmine.Spy };

  beforeEach(() => {
    events = new Subject<unknown>();
    router = {events} as unknown as Router;
    guard = {release: jasmine.createSpy('release')};
  });

  it('does NOT release synchronously on NavigationEnd — it waits one tick', fakeAsync(() => {
    releaseSsrBootstrapGuardOnNavigationSettled(guard, router, 2000);

    events.next(new NavigationEnd(1, '/modules/details/1', '/modules/details/1'));
    expect(guard.release).not.toHaveBeenCalled();

    flush();
  }));

  it('releases one tick after NavigationEnd fires', fakeAsync(() => {
    releaseSsrBootstrapGuardOnNavigationSettled(guard, router, 2000);

    events.next(new NavigationEnd(1, '/modules/details/1', '/modules/details/1'));
    tick();

    expect(guard.release).toHaveBeenCalledTimes(1);
  }));

  it('releases one tick after NavigationCancel', fakeAsync(() => {
    releaseSsrBootstrapGuardOnNavigationSettled(guard, router, 2000);

    events.next(new NavigationCancel(1, '/modules/details/1', 'guard rejected'));
    tick();

    expect(guard.release).toHaveBeenCalledTimes(1);
  }));

  it('releases one tick after NavigationError', fakeAsync(() => {
    releaseSsrBootstrapGuardOnNavigationSettled(guard, router, 2000);

    events.next(new NavigationError(1, '/modules/details/1', new Error('boom'), null));
    tick();

    expect(guard.release).toHaveBeenCalledTimes(1);
  }));

  it('releases one tick after NavigationSkipped', fakeAsync(() => {
    releaseSsrBootstrapGuardOnNavigationSettled(guard, router, 2000);

    events.next(new NavigationSkipped(
      1,
      '/modules/details/1',
      '/modules/details/1',
      NavigationSkippedCode.IgnoredSameUrlNavigation
    ));
    tick();

    expect(guard.release).toHaveBeenCalledTimes(1);
  }));

  it('ignores non-terminal router events (e.g. NavigationStart)', fakeAsync(() => {
    releaseSsrBootstrapGuardOnNavigationSettled(guard, router, 2000);

    events.next({type: 'NavigationStart'});
    tick();

    expect(guard.release).not.toHaveBeenCalled();
    flush();
  }));

  it('only reacts to the first terminal event (SSR renders exactly one navigation per request)', fakeAsync(() => {
    releaseSsrBootstrapGuardOnNavigationSettled(guard, router, 2000);

    events.next(new NavigationEnd(1, '/a', '/a'));
    events.next(new NavigationEnd(2, '/b', '/b'));
    tick();

    expect(guard.release).toHaveBeenCalledTimes(1);
  }));

  it('falls back to the safety timeout if navigation never settles', fakeAsync(() => {
    releaseSsrBootstrapGuardOnNavigationSettled(guard, router, 2000);

    tick(1999);
    expect(guard.release).not.toHaveBeenCalled();

    tick(1);
    expect(guard.release).toHaveBeenCalledTimes(1);
  }));

  it('does not double-release if navigation settles right as the safety timeout also elapses', fakeAsync(() => {
    releaseSsrBootstrapGuardOnNavigationSettled(guard, router, 2000);

    events.next(new NavigationEnd(1, '/modules/details/1', '/modules/details/1'));
    tick(2000);

    expect(guard.release).toHaveBeenCalledTimes(1);
  }));

  it('integrates with a real PendingTasks guard: releases on the navigation-settled path, not the safety timeout', fakeAsync(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    const pendingTasks = TestBed.inject(PendingTasks);
    const internalPendingTasks = TestBed.inject(ɵPendingTasksInternal);

    const realGuard = createSsrBootstrapGuard(pendingTasks);
    expect(internalPendingTasks.hasPendingTasks).toBeTrue();

    releaseSsrBootstrapGuardOnNavigationSettled(realGuard, router, 2000);
    events.next(new NavigationEnd(1, '/modules/details/1', '/modules/details/1'));
    // Still unstable immediately after NavigationEnd — mirrors the real bug this
    // mechanism exists to close (see the doc comment on
    // releaseSsrBootstrapGuardOnNavigationSettled): ngOnInit and its Supabase fetch
    // trigger run as further queued work *after* NavigationEnd, not before it.
    expect(internalPendingTasks.hasPendingTasks).toBeTrue();

    tick();
    flush();

    expect(internalPendingTasks.hasPendingTasks).toBeFalse();
  }));
});

describe('bindSsrDetailLoadGuard', () => {
  let startSignal$: Subject<void>;
  let completionSignal$: Subject<void>;
  let pendingTasks: PendingTasks;
  let internalPendingTasks: ɵPendingTasksInternal;

  beforeEach(() => {
    startSignal$ = new Subject<void>();
    completionSignal$ = new Subject<void>();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    pendingTasks = TestBed.inject(PendingTasks);
    internalPendingTasks = TestBed.inject(ɵPendingTasksInternal);
  });

  it('does not open a guard until startSignal$ actually emits', () => {
    bindSsrDetailLoadGuard(pendingTasks, startSignal$, completionSignal$, 2000);

    expect(internalPendingTasks.hasPendingTasks).toBeFalse();
  });

  it('opens a guard as soon as startSignal$ emits, and releases it once completionSignal$ next emits', fakeAsync(() => {
    bindSsrDetailLoadGuard(pendingTasks, startSignal$, completionSignal$, 2000);

    startSignal$.next();
    expect(internalPendingTasks.hasPendingTasks).toBeTrue();

    completionSignal$.next();
    flush();
    expect(internalPendingTasks.hasPendingTasks).toBeFalse();
  }));

  it('falls back to the safety timeout if completionSignal$ never emits', fakeAsync(() => {
    bindSsrDetailLoadGuard(pendingTasks, startSignal$, completionSignal$, 2000);
    startSignal$.next();

    tick(1999);
    expect(internalPendingTasks.hasPendingTasks).toBeTrue();

    tick(1);
    flush();
    expect(internalPendingTasks.hasPendingTasks).toBeFalse();
  }));

  it('opens a fresh guard for a second cycle after the first one has already settled', fakeAsync(() => {
    bindSsrDetailLoadGuard(pendingTasks, startSignal$, completionSignal$, 2000);

    startSignal$.next();
    completionSignal$.next();
    flush();
    expect(internalPendingTasks.hasPendingTasks).toBeFalse();

    startSignal$.next();
    expect(internalPendingTasks.hasPendingTasks)
      .withContext('a later, independent lookup cycle must open its own guard')
      .toBeTrue();

    completionSignal$.next();
    flush();
    expect(internalPendingTasks.hasPendingTasks).toBeFalse();
  }));

  it('does not throw or leak if a second cycle starts before the first one has settled', fakeAsync(() => {
    bindSsrDetailLoadGuard(pendingTasks, startSignal$, completionSignal$, 2000);

    startSignal$.next();
    expect(() => startSignal$.next()).not.toThrow();
    expect(internalPendingTasks.hasPendingTasks).toBeTrue();

    // One completion event resolves both cycles' independent take(1) subscriptions —
    // guard.release() is idempotent, so this settles cleanly rather than double-firing.
    completionSignal$.next();
    flush();
    expect(internalPendingTasks.hasPendingTasks).toBeFalse();
  }));
});

describe('createSsrPendingTasksFetch', () => {
  let pendingTasks: PendingTasks;
  let originalFetch: typeof fetch;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    pendingTasks = TestBed.inject(PendingTasks);
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('resolves with the underlying fetch response on success', async () => {
    const response = new Response('{"ok":true}', {status: 200});
    globalThis.fetch = jasmine.createSpy('fetch').and.resolveTo(response);

    const ssrFetch = createSsrPendingTasksFetch(pendingTasks);
    const result = await ssrFetch('https://example.com/api');

    expect(result).toBe(response);
    expect(globalThis.fetch).toHaveBeenCalledWith('https://example.com/api', undefined);
  });

  it('passes through the request init options', async () => {
    const response = new Response(null, {status: 204});
    globalThis.fetch = jasmine.createSpy('fetch').and.resolveTo(response);
    const init: RequestInit = {method: 'POST', headers: {'x-test': '1'}};

    const ssrFetch = createSsrPendingTasksFetch(pendingTasks);
    await ssrFetch('https://example.com/api', init);

    expect(globalThis.fetch).toHaveBeenCalledWith('https://example.com/api', init);
  });

  it('rejects with the underlying error on failure', async () => {
    const networkError = new Error('network down');
    globalThis.fetch = jasmine.createSpy('fetch').and.rejectWith(networkError);

    const ssrFetch = createSsrPendingTasksFetch(pendingTasks);

    await expectAsync(ssrFetch('https://example.com/api')).toBeRejectedWith(networkError);
  });

  it('routes the request through PendingTasks.run so SSR waits for it to settle', async () => {
    const response = new Response(null, {status: 200});
    globalThis.fetch = jasmine.createSpy('fetch').and.resolveTo(response);
    spyOn(pendingTasks, 'run').and.callThrough();

    const ssrFetch = createSsrPendingTasksFetch(pendingTasks);
    await ssrFetch('https://example.com/api');

    expect(pendingTasks.run).toHaveBeenCalledTimes(1);
    expect(pendingTasks.run).toHaveBeenCalledWith(jasmine.any(Function));
  });

  it('keeps the app unstable until every in-flight call settles', async () => {
    const internalPendingTasks = TestBed.inject(ɵPendingTasksInternal);
    let resolveFirst!: (response: Response) => void;
    let resolveSecond!: (response: Response) => void;
    globalThis.fetch = jasmine.createSpy('fetch').and.callFake((input: RequestInfo | URL) => {
      return new Promise<Response>(resolve => {
        if (String(input).includes('first')) {
          resolveFirst = resolve;
        } else {
          resolveSecond = resolve;
        }
      });
    });

    const ssrFetch = createSsrPendingTasksFetch(pendingTasks);
    const firstDone = ssrFetch('https://example.com/first');
    const secondDone = ssrFetch('https://example.com/second');

    // Both calls are in flight — the app must be unstable.
    expect(internalPendingTasks.hasPendingTasks).toBeTrue();

    resolveFirst(new Response(null, {status: 200}));
    await firstDone;
    // The second call is still pending — the app must still be unstable.
    expect(internalPendingTasks.hasPendingTasks).toBeTrue();

    resolveSecond(new Response(null, {status: 200}));
    await secondDone;
    // PendingTasks.run()'s cleanup runs a few ticks after our own promise resolves
    // (fn's promise -> .catch() -> .finally()) — flush the queue before asserting.
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(internalPendingTasks.hasPendingTasks).toBeFalse();
  });
});

describe('suppressPrematureServerPendingTasksDestroy', () => {
  it('makes ngOnDestroy() a no-op so a caller cannot wipe pending tasks early', () => {
    TestBed.configureTestingModule({});
    const internalPendingTasks = TestBed.inject(ɵPendingTasksInternal);
    const taskId = internalPendingTasks.add();
    expect(internalPendingTasks.hasPendingTasks).toBeTrue();

    suppressPrematureServerPendingTasksDestroy(internalPendingTasks);
    internalPendingTasks.ngOnDestroy();

    // The real task tracking must be untouched — only the destroy hook is neutralized.
    expect(internalPendingTasks.hasPendingTasks).toBeTrue();
    expect(internalPendingTasks.has(taskId)).toBeTrue();
  });
});
