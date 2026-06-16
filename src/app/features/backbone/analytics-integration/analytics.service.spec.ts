import { TestBed } from '@angular/core/testing';
import { Router, NavigationEnd } from '@angular/router';
import { NgZone } from '@angular/core';
import { Subject } from 'rxjs';
import { environment } from 'src/environments/environment';
import { AnalyticsService } from './analytics.service';
import {
  POSTHOG_CLIENT_LOADER,
  PostHogClient
} from './posthog-loader';

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let routerEvents$: Subject<NavigationEnd>;
  let originalProduction: boolean;

  beforeEach(() => {
    originalProduction = environment.production;
    routerEvents$ = new Subject<NavigationEnd>();
    TestBed.configureTestingModule({
      providers: [
        AnalyticsService,
        {
          provide: Router,
          useValue: {
            events: routerEvents$.asObservable(),
            url:    '/current-patch'
          }
        },
        {
          provide: NgZone,
          useValue: {
            runOutsideAngular: (fn: () => void) => fn()
          }
        }
      ]
    });
    service = TestBed.inject(AnalyticsService);
  });

  afterEach(() => {
    environment.production = originalProduction;
    TestBed.resetTestingModule();
  });

  it('should create', () => {
    expect(service).toBeTruthy();
  });

  describe('in non-production environment', () => {
    it('capture() does not throw and returns without calling posthog', () => {
      // In test environment, production === false, so capture() must be a no-op.
      expect(() => service.capture('test.event', { foo: 'bar' })).not.toThrow();
    });

    it('identify() does not throw with a valid user', () => {
      expect(() => service.identify({ id: 'user-1', email: 'a@b.com', username: 'alice' })).not.toThrow();
    });

    it('identify() does not throw with null', () => {
      expect(() => service.identify(null)).not.toThrow();
    });

    it('reset() does not throw', () => {
      expect(() => service.reset()).not.toThrow();
    });

    it('capture() with undefined props does not throw', () => {
      expect(() => service.capture('test.event')).not.toThrow();
    });
  });

  describe('in production environment', () => {
    let deferredPostHog: {
      promise: Promise<PostHogClient | null>;
      resolve: (posthog: PostHogClient | null) => void;
    };
    let posthog: jasmine.SpyObj<PostHogClient>;

    beforeEach(() => {
      TestBed.resetTestingModule();
      environment.production = true;
      routerEvents$ = new Subject<NavigationEnd>();
      deferredPostHog = createDeferred<PostHogClient | null>();
      posthog = jasmine.createSpyObj<PostHogClient>('posthog', ['capture', 'identify', 'register', 'reset']);

      TestBed.configureTestingModule({
        providers: [
          AnalyticsService,
          {
            provide: Router,
            useValue: {
              events: routerEvents$.asObservable(),
              url:    '/current-patch'
            }
          },
          {
            provide: NgZone,
            useValue: {
              runOutsideAngular: (fn: () => void) => fn()
            }
          },
          {
            provide:  POSTHOG_CLIENT_LOADER,
            useValue: () => deferredPostHog.promise
          }
        ]
      });
      service = TestBed.inject(AnalyticsService);
    });

    it('defers the initial pageview and early events until PostHog is initialized', async () => {
      service.identify({ id: 'user-1', email: 'a@b.com', username: 'alice' });
      service.capture('patch.viewed', { patch_id: 'patch-1' });

      expect(posthog.capture).not.toHaveBeenCalled();
      expect(posthog.identify).not.toHaveBeenCalled();

      deferredPostHog.resolve(posthog);
      await flushPromises();

      expect(posthog.capture).toHaveBeenCalledWith('$pageview', {
        $current_url: window.location.origin + '/current-patch'
      });
      expect(posthog.identify).toHaveBeenCalledWith('user-1', {
        email:    'a@b.com',
        username: 'alice'
      });
      expect(posthog.capture).toHaveBeenCalledWith('patch.viewed', { patch_id: 'patch-1' });
    });

    it('captures later route pageviews after initialization', async () => {
      deferredPostHog.resolve(posthog);
      await flushPromises();
      posthog.capture.calls.reset();

      routerEvents$.next(new NavigationEnd(1, '/old', '/new'));
      await flushPromises();

      expect(posthog.capture).toHaveBeenCalledOnceWith('$pageview', {
        $current_url: window.location.origin + '/new'
      });
    });
  });
});

function createDeferred<T>(): {
  promise: Promise<T>;
  resolve: (value: T) => void;
} {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(res => {
    resolve = res;
  });

  return { promise, resolve };
}

async function flushPromises(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}
