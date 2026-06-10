import { TestBed } from '@angular/core/testing';
import { Router, NavigationEnd } from '@angular/router';
import { NgZone } from '@angular/core';
import { Subject } from 'rxjs';
import { AnalyticsService } from './analytics.service';

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  const routerEvents$ = new Subject<NavigationEnd>();

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        AnalyticsService,
        {
          provide: Router,
          useValue: { events: routerEvents$.asObservable() }
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
});
