import { DOCUMENT } from '@angular/common';
import {
  NgZone,
  PLATFORM_ID
} from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { environment } from 'src/environments/environment';
import { SupabaseService } from '../../backend/supabase.service';
import { ViewTrackingService } from './view-tracking.service';

interface FakeDocument {
  visibilityState: 'visible' | 'hidden';
  referrer: string;
  location: { hostname: string };
  listeners: Record<string, () => void>;
  addEventListener: (name: string, fn: () => void) => void;
  removeEventListener: () => void;
  defaultView: {
    navigator: { webdriver: boolean; userAgent: string };
    listeners: Record<string, () => void>;
    addEventListener: (name: string, fn: () => void) => void;
    removeEventListener: () => void;
  };
}

function fakeDocument(overrides: { referrer?: string; webdriver?: boolean; userAgent?: string } = {}): FakeDocument {
  const doc: FakeDocument = {
    visibilityState:     'visible',
    referrer:            overrides.referrer ?? '',
    location:            { hostname: 'patcher.xyz' },
    listeners:           {},
    addEventListener:    (name, fn) => { doc.listeners[name] = fn; },
    removeEventListener: () => {},
    defaultView:         {
      navigator:           { webdriver: overrides.webdriver ?? false, userAgent: overrides.userAgent ?? 'Mozilla/5.0 Firefox/140' },
      listeners:           {},
      addEventListener:    (name, fn) => { doc.defaultView.listeners[name] = fn; },
      removeEventListener: () => {}
    }
  };
  return doc;
}

describe('ViewTrackingService', () => {
  let track: jasmine.Spy;
  let doc: FakeDocument;
  let originalProduction: boolean;
  let originalFlag: boolean;

  function create(platform = 'browser', document = fakeDocument()): ViewTrackingService {
    doc = document;
    TestBed.configureTestingModule({
      providers: [
        { provide: PLATFORM_ID, useValue: platform },
        { provide: DOCUMENT, useValue: doc },
        { provide: NgZone, useValue: { runOutsideAngular: (fn: () => void) => fn() } },
        { provide: SupabaseService, useValue: { views: { track } } }
      ]
    });
    return TestBed.inject(ViewTrackingService);
  }

  beforeEach(() => {
    originalProduction = environment.production;
    originalFlag = environment.features.viewTrackingEnabled;
    environment.production = true;
    environment.features.viewTrackingEnabled = true;
    track = jasmine.createSpy('track').and.resolveTo('ok');
    localStorage.removeItem('patcher.view-visitor');
    jasmine.clock().install();
  });

  afterEach(() => {
    TestBed.inject(ViewTrackingService).ngOnDestroy();
    jasmine.clock().uninstall();
    environment.production = originalProduction;
    environment.features.viewTrackingEnabled = originalFlag;
    TestBed.resetTestingModule();
  });

  it('batches views and sends them on the 10 s timer', () => {
    const service = create();
    service.trackPage('/modules/details/:id');
    service.trackEntity('module', 42);

    expect(track).not.toHaveBeenCalled();
    jasmine.clock().tick(10_000);

    expect(track).toHaveBeenCalledOnceWith(jasmine.any(String), [
      { t: 9, r: 'modules/details/:id', s: 0 },
      { t: 1, id: 42, s: 0 }
    ], false);
  });

  it('flushes with keepalive on pagehide', () => {
    const service = create();
    service.trackEntity('rack', 7);
    doc.defaultView.listeners['pagehide']();

    expect(track).toHaveBeenCalledOnceWith(jasmine.any(String), [{ t: 2, id: 7, s: 0 }], true);
  });

  it('marks the landing source once, then internal navigation', () => {
    const service = create(undefined, fakeDocument({ referrer: 'https://www.google.com/search?q=maths' }));
    service.trackPage('modules/details/:id');
    service.trackEntity('module', 1);
    service.trackPage('racks/details/:id');
    service.trackEntity('rack', 2);
    jasmine.clock().tick(10_000);

    expect(track.calls.mostRecent().args[1]).toEqual([
      { t: 9, r: 'modules/details/:id', s: 2 },
      { t: 1, id: 1, s: 2 },
      { t: 9, r: 'racks/details/:id', s: 1 },
      { t: 2, id: 2, s: 1 }
    ]);
  });

  it('holds views from a hidden tab until it becomes visible', () => {
    const service = create();
    doc.visibilityState = 'hidden';
    service.trackEntity('patch', 3);
    jasmine.clock().tick(10_000);
    expect(track).not.toHaveBeenCalled();

    doc.visibilityState = 'visible';
    doc.listeners['visibilitychange']();
    jasmine.clock().tick(10_000);
    expect(track).toHaveBeenCalledOnceWith(jasmine.any(String), [{ t: 3, id: 3, s: 0 }], false);
  });

  it('ignores invalid ids and maps an empty route to home', () => {
    const service = create();
    service.trackEntity('module', 'abc');
    service.trackEntity('module', -1);
    service.trackPage('');
    jasmine.clock().tick(10_000);

    expect(track).toHaveBeenCalledOnceWith(jasmine.any(String), [{ t: 9, r: 'home', s: 0 }], false);
  });

  it('keeps the same visitor id within a day', () => {
    const service = create();
    service.trackEntity('module', 1);
    jasmine.clock().tick(10_000);
    service.trackEntity('module', 2);
    jasmine.clock().tick(10_000);

    expect(track.calls.argsFor(0)[0]).toBe(track.calls.argsFor(1)[0]);
  });

  it('stops sending for the session when the RPC is missing (kill switch)', async () => {
    track.and.resolveTo('missing');
    const service = create();
    service.trackEntity('module', 1);
    jasmine.clock().tick(10_000);
    await Promise.resolve();
    await Promise.resolve();

    service.trackEntity('module', 2);
    jasmine.clock().tick(10_000);
    expect(track).toHaveBeenCalledTimes(1);
  });

  it('does nothing during SSR', () => {
    const service = create('server');
    service.trackEntity('module', 1);
    jasmine.clock().tick(10_000);
    expect(track).not.toHaveBeenCalled();
  });

  it('does nothing for automated browsers and bots', () => {
    let service = create(undefined, fakeDocument({ webdriver: true }));
    service.trackEntity('module', 1);
    jasmine.clock().tick(10_000);
    service.ngOnDestroy();
    TestBed.resetTestingModule();

    service = create(undefined, fakeDocument({ userAgent: 'Mozilla/5.0 (compatible; Googlebot/2.1)' }));
    service.trackEntity('module', 1);
    jasmine.clock().tick(10_000);
    expect(track).not.toHaveBeenCalled();
  });

  it('does nothing when the feature flag is off', () => {
    environment.features.viewTrackingEnabled = false;
    const service = create();
    service.trackEntity('module', 1);
    jasmine.clock().tick(10_000);
    expect(track).not.toHaveBeenCalled();
  });
});
