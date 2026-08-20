import { PendingTasks, ɵPendingTasksInternal } from '@angular/core';
import {
  NavigationCancel,
  NavigationEnd,
  NavigationError,
  NavigationSkipped,
  Router
} from '@angular/router';
import { merge, Observable, Subscription, timer } from 'rxjs';
import { filter, switchMap, take } from 'rxjs/operators';

/**
 * Keeps SSR "unstable" (via one placeholder pending task) from the moment the
 * Supabase client is constructed until `releaseSsrBootstrapGuardOnNavigationSettled`
 * releases it.
 *
 * Why this exists: for a route served through a lazy-loaded feature module
 * (`loadChildren`), Angular's Router clears its own "navigating" pending task at
 * almost exactly the moment it activates the route's component — and
 * `ApplicationRef.whenStable()` resolves on the FIRST "stable" reading it observes,
 * even though the newly-activated component's `ngOnInit` (and the Supabase fetches it
 * triggers) can add new pending tasks moments later. Because `whenStable()` is a
 * first-value-wins promise, that later work never "un-resolves" it — SSR ends up
 * serializing the page before Supabase data has arrived. Holding this placeholder task
 * open across that specific gap prevents `whenStable()` from ever observing that
 * premature "stable" reading in the first place.
 */
export function createSsrBootstrapGuard(pendingTasks: PendingTasks): { release: () => void } {
  let released = false;
  const removeTask = pendingTasks.add();

  const release = (): void => {
    if (released) return;
    released = true;
    removeTask();
  };

  return {release};
}

/**
 * Releases an SSR guard (see `createSsrBootstrapGuard`) as soon as `signal$` next
 * emits, or after `safetyTimeoutMs` elapses — whichever happens first.
 *
 * Shared plumbing behind both `releaseSsrBootstrapGuardOnNavigationSettled` (release
 * on navigation settling) and `bindSsrDetailLoadGuard` (release on a route's detail
 * data actually finishing loading) — see their doc comments for what each is guarding
 * against. Bounding every guard with a safety timeout, regardless of which signal
 * releases it, means a broken/hanging case can never block SSR forever — it degrades
 * to "render after `safetyTimeoutMs`", not "hang".
 */
export function releaseSsrGuardOnSignal(
  guard: { release: () => void },
  signal$: Observable<unknown>,
  safetyTimeoutMs = 2000
): Subscription {
  return merge(signal$.pipe(take(1)), timer(safetyTimeoutMs))
    .pipe(take(1))
    .subscribe(() => guard.release());
}

/**
 * Releases an SSR bootstrap guard (see `createSsrBootstrapGuard`) as soon as the
 * current navigation has fully settled — reactively, instead of guessing a fixed
 * delay from the moment the Supabase client was constructed.
 *
 * Why this exists, and why it's built this way:
 * `NavigationEnd` (or a Cancel/Error/Skipped outcome) fires once the Router commits
 * to a navigation result, but — confirmed by tracing real requests — it fires
 * *before* the newly-activated component's `ngOnInit` runs, not after. Angular
 * schedules that activation work as further queued micro/macrotasks, so there is a
 * real (and route-dependent, e.g. proportional to how much of that route's lazy
 * chunk still needs loading) gap between the two — not a fixed one, so no constant
 * delay from construction time is ever exactly right.
 *
 * `NgZone.onStable` looks like the idiomatic Angular signal for "queued work has now
 * drained", but empirically it doesn't apply here: tracing real SSR requests showed
 * `NgZone.isStable` staying `true` for the whole render — the Router's navigation
 * pipeline and the component tree it activates never register as zone-tracked
 * macro/microtasks in this `renderModule()`-based SSR path, so `onStable` never
 * fires again after bootstrap. What *does* reliably work (confirmed the same way) is
 * waiting one JS event-loop tick after the terminal navigation event: everything that
 * makes up the "queued work" above — `ngOnInit`'s synchronous `subscribe` chain, down
 * to Supabase-js's `PostgrestBuilder.then()` triggering the real `fetch()` — runs as
 * microtask-scheduled work that fully drains before the next tick, regardless of
 * whether zone.js is tracking any of it. RxJS's `timer(0)` expresses that tick as a
 * proper Observable (schedulable, unsubscribable, composable with `switchMap`) rather
 * than a bare `setTimeout` callback.
 *
 * `router.events` is a plain Observable (`EventEmitter` extends `Subject`), so the
 * whole thing composes as one reactive pipeline: wait for the first terminal
 * navigation event, `switchMap` into that one-tick `timer(0)`, and release on
 * whichever fires first between that and a bounded `timer()` fallback for the case a
 * navigation never settles at all.
 */
export function releaseSsrBootstrapGuardOnNavigationSettled(
  guard: { release: () => void },
  router: Router,
  safetyTimeoutMs = 2000
): void {
  const navigationSettled$ = router.events.pipe(
    filter((event): event is NavigationEnd | NavigationCancel | NavigationError | NavigationSkipped =>
      event instanceof NavigationEnd
      || event instanceof NavigationCancel
      || event instanceof NavigationError
      || event instanceof NavigationSkipped
    ),
    take(1),
    switchMap(() => timer(0))
  );

  releaseSsrGuardOnSignal(guard, navigationSettled$, safetyTimeoutMs);
}

/**
 * Opens a fresh SSR guard (see `createSsrBootstrapGuard`) every time `startSignal$`
 * emits, and releases that specific guard once `completionSignal$` next emits after
 * that (or a safety timeout elapses) — see `releaseSsrGuardOnSignal`.
 *
 * Why this exists: `createSsrPendingTasksFetch` keeps SSR "unstable" while a single
 * Supabase `fetch` is literally in flight, but it cannot cover the gap *between* two
 * chained fetches (e.g. a rack/patch loading its own row, then — from inside that
 * first fetch's own `.subscribe()` callback — triggering a second fetch for its
 * modules/connections). Confirmed by tracing real requests: Supabase-js's internal
 * promise chain (building the request, awaiting the response body, resolving the
 * thenable) takes several real microtask/macrotask hops between "first fetch's
 * `PendingTasks` entry removed" and "second fetch's `PendingTasks` entry added" —
 * long enough, some fraction of the time, for `ApplicationRef.whenStable()` to catch
 * a transient "zero pending tasks" reading in between and resolve early. Because
 * `whenStable()` is first-value-wins (the same mechanism behind the original
 * bootstrap-guard bug), that later, real second fetch never un-resolves it — SSR
 * serializes the page with only the first fetch's data, which is why this manifested
 * as an intermittent (not "always broken") wrong page title.
 *
 * Holding one placeholder task open across the *entire* known chain — from the
 * moment a lookup starts to the moment its data is fully settled (found-and-loaded,
 * or definitively not-found) — closes every gap in between regardless of how many
 * microtask hops any individual step takes, without needing to know or reason about
 * that timing precisely.
 */
export function bindSsrDetailLoadGuard(
  pendingTasks: PendingTasks,
  startSignal$: Observable<unknown>,
  completionSignal$: Observable<unknown>,
  safetyTimeoutMs = 2000
): Subscription {
  return startSignal$.subscribe(() => {
    const guard = createSsrBootstrapGuard(pendingTasks);
    releaseSsrGuardOnSignal(guard, completionSignal$, safetyTimeoutMs);
  });
}

/**
 * Wraps the global `fetch` so every Supabase network call (PostgREST, Auth, Storage)
 * registers as an Angular pending task while it is in flight.
 *
 * Why this exists: Supabase-js talks to the backend via raw `fetch`, which Angular's
 * stability tracking does not observe on its own. Without this, the SSR render
 * (`CommonEngine`) considers the app "stable" and serializes the DOM before data loaded
 * via Supabase has arrived — crawlers (and `curl`) then see the "Loading content"
 * skeleton instead of real data, even though real browsers look fine after client-side
 * hydration fills it in.
 *
 * Wrapping calls in `PendingTasks.run()` keeps the app "unstable" until the fetch
 * settles, so SSR waits for the real data before rendering. Only use this on the
 * server — it is unnecessary (and adds no value) once the app is running in a browser.
 * Pair with `createSsrBootstrapGuard` — that guard covers the gap before the first
 * Supabase call starts; this wrapper covers every call from then on, including chained
 * follow-up calls triggered once the first batch of data resolves.
 */
export function createSsrPendingTasksFetch(pendingTasks: PendingTasks): typeof fetch {
  return (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    return new Promise<Response>((resolve, reject) => {
      pendingTasks.run(async () => {
        try {
          resolve(await fetch(input, init));
        } catch (error) {
          reject(error);
        }
      });
    });
  };
}

/** Minimal shape of `ɵPendingTasksInternal` this file needs. */
interface PendingTasksInternalLike {
  ngOnDestroy(): void;
}

/**
 * Neutralizes the shared root `PendingTasksInternal`'s `ngOnDestroy` for the rest of
 * this render, as extra defense-in-depth alongside `createSsrBootstrapGuard`.
 *
 * Why this exists: when SSR renders a route served through a lazy-loaded feature
 * module, Angular's Router internals call `ngOnDestroy()` on the shared root
 * `PendingTasksInternal` singleton partway through bootstrap — apparently while
 * tearing down a transient injector used to resolve the lazy route — even though the
 * app's actual root injector isn't being destroyed yet. That `ngOnDestroy()` wipes
 * every in-flight pending task and permanently marks the tracker "destroyed". This
 * doesn't fully explain SSR serializing stale data on its own (see
 * `releaseSsrBootstrapGuardOnNavigationSettled`'s doc comment for the primary cause),
 * but it can still discard in-flight Supabase tasks if it fires after they're
 * registered, so it's worth suppressing regardless.
 *
 * `renderModule()` creates a brand new platform (and therefore a brand new
 * `PendingTasksInternal`) per request, so suppressing this one instance's cleanup is
 * safe: the whole per-request object graph is discarded once that request's
 * `renderModule()` call finishes and tears down its platform anyway.
 */
export function suppressPrematureServerPendingTasksDestroy(pendingTasksInternal: ɵPendingTasksInternal): void {
  (pendingTasksInternal as unknown as PendingTasksInternalLike).ngOnDestroy = () => {
    // Intentionally a no-op — see the doc comment above.
  };
}
