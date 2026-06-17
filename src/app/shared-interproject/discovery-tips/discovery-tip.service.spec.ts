import { NavigationEnd, Router } from '@angular/router';
import { ReplaySubject, Subject } from 'rxjs';
import { UserManagementService } from 'src/app/features/backbone/login/user-management.service';
import {
  DEFAULT_TIP_SPACING_MS,
  LEGACY_DISCOVERY_TIP_STORAGE_KEY
} from './discovery-tip.constants';
import { DiscoveryTipActive, DiscoveryTipDefinition, DiscoveryTipUserAreaSnapshot } from './discovery-tip.models';
import { discoveryTipRegistry } from './discovery-tip.registry';
import {
  DISCOVERY_TIP_STORAGE_KEY,
  DiscoveryTipService
} from './discovery-tip.service';


describe('DiscoveryTipService', () => {
  const now = new Date('2026-06-17T15:00:00.000Z');
  let routerEvents$: Subject<NavigationEnd>;
  let loggedUser$: ReplaySubject<{id: string; email: string}>;
  let loggedUserFullProfile$: ReplaySubject<{id: string; username: string}>;
  let createdServices: DiscoveryTipService[];
  let registryLength: number;

  function emptyWorkspaceSnapshot(): DiscoveryTipUserAreaSnapshot {
    return {
      modulesLoaded: true,
      racksLoaded: true,
      patchesLoaded: true,
      manualsLoaded: true,
      commentsLoaded: true,
      modulesCount: 0,
      racksCount: 0,
      patchesCount: 0,
      manualsCount: 0,
      commentsCount: 0,
      totalCount: 0,
      hasSearchQuery: false
    };
  }

  function build(viewerId = 'user-123') {
    routerEvents$ = new Subject<NavigationEnd>();
    loggedUser$ = new ReplaySubject<{id: string; email: string}>(1);
    loggedUserFullProfile$ = new ReplaySubject<{id: string; username: string}>(1);

    loggedUser$.next({
      id: viewerId,
      email: `${ viewerId }@example.com`
    });
    loggedUserFullProfile$.next({
      id: viewerId,
      username: viewerId
    });

    const service = new DiscoveryTipService(
      {
        url: '/user/area',
        events: routerEvents$.asObservable()
      } as Router,
      {
        loggedUser$: loggedUser$.asObservable(),
        loggedUserFullProfile$: loggedUserFullProfile$.asObservable()
      } as UserManagementService,
      'browser' as unknown as object
    );
    createdServices.push(service);
    return service;
  }

  function subscribeActiveTip(service: DiscoveryTipService): {current: DiscoveryTipActive | null} {
    const activeTip = {current: null as DiscoveryTipActive | null};
    service.activeTip$.subscribe((value) => {
      activeTip.current = value;
    });
    return activeTip;
  }

  function seedViewerState(
    viewerId: string,
    viewerState: {
      onboardingAt: string;
      lastTipShownAt?: string;
      lastShownTipId?: string;
      tips?: Record<string, unknown>;
    }
  ): void {
    localStorage.setItem(DISCOVERY_TIP_STORAGE_KEY, JSON.stringify({
      schemaVersion: 2,
      viewers: {
        [viewerId]: {
          ...viewerState,
          tips: viewerState.tips ?? {}
        }
      }
    }));
  }

  function storage() {
    return JSON.parse(localStorage.getItem(DISCOVERY_TIP_STORAGE_KEY) ?? '{}') as {
      schemaVersion?: number;
      viewers?: Record<string, {
        onboardingAt: string;
        lastTipShownAt?: string;
        lastShownTipId?: string;
        tips: Record<string, {
          version: number;
          shownCount: number;
          lastShownAt?: string;
          snoozedUntil?: string;
          learnedAt?: string;
        }>;
      }>;
    };
  }

  beforeEach(() => {
    createdServices = [];
    registryLength = discoveryTipRegistry.length;
    jasmine.clock().install();
    jasmine.clock().mockDate(now);
    localStorage.clear();
  });

  afterEach(() => {
    createdServices.forEach((service) => service.ngOnDestroy());
    discoveryTipRegistry.splice(registryLength);
    jasmine.clock().uninstall();
    localStorage.clear();
  });

  it('does not surface the modules tip before the user-area data is loaded', () => {
    const service = build();
    const anchor = document.createElement('button');
    const activeTip = subscribeActiveTip(service);

    service.registerAnchor('user-area-modules-add', anchor);
    service.updateUserAreaSnapshot({
      modulesLoaded: false,
      racksLoaded: false,
      patchesLoaded: false,
      modulesCount: 0,
      racksCount: 0,
      patchesCount: 0,
      totalCount: 0,
      hasSearchQuery: false
    });

    jasmine.clock().tick(1300);

    expect(activeTip.current).toBeNull();
  });

  it('persists learned state and does not repeat the same tip for the same viewer', () => {
    const firstService = build();
    const firstAnchor = document.createElement('button');

    firstService.registerAnchor('user-area-modules-add', firstAnchor);
    firstService.updateUserAreaSnapshot(emptyWorkspaceSnapshot());
    firstService.recordAction('user-area.modules.add-clicked');
    jasmine.clock().tick(10);
    firstService.ngOnDestroy();

    const secondService = build();
    const secondAnchor = document.createElement('button');
    const activeTip = subscribeActiveTip(secondService);

    secondService.registerAnchor('user-area-modules-add', secondAnchor);
    secondService.updateUserAreaSnapshot(emptyWorkspaceSnapshot());
    jasmine.clock().tick(1300);

    expect(activeTip.current).toBeNull();
    expect(storage().viewers?.['user-123'].tips['user-area-modules-add'].learnedAt).toBeDefined();
  });

  it('partitions tip state per viewer key in localStorage', () => {
    const firstService = build('user-a');
    const firstAnchor = document.createElement('button');

    firstService.registerAnchor('user-area-modules-add', firstAnchor);
    firstService.updateUserAreaSnapshot(emptyWorkspaceSnapshot());
    jasmine.clock().tick(1300);
    firstService.acknowledgeActiveTip();
    firstService.ngOnDestroy();

    const secondService = build('user-b');
    const secondAnchor = document.createElement('button');
    const activeTip = subscribeActiveTip(secondService);

    secondService.registerAnchor('user-area-modules-add', secondAnchor);
    secondService.updateUserAreaSnapshot(emptyWorkspaceSnapshot());
    jasmine.clock().tick(1300);

    expect(activeTip.current?.definition.id).toBe('user-area-modules-add');
  });

  it('marks matching tips as learned when their completion action fires', () => {
    const service = build();
    const anchor = document.createElement('button');
    const activeTip = subscribeActiveTip(service);

    service.registerAnchor('user-area-modules-add', anchor);
    service.updateUserAreaSnapshot(emptyWorkspaceSnapshot());
    service.recordAction('user-area.modules.add-clicked');
    jasmine.clock().tick(10);

    expect(activeTip.current).toBeNull();
    expect(storage().viewers?.['user-123'].tips['user-area-modules-add'].learnedAt).toBeDefined();
  });

  it('pauses all tips for the current viewer when the global pause is applied', () => {
    const service = build();
    const anchor = document.createElement('button');
    const activeTip = subscribeActiveTip(service);

    service.registerAnchor('user-area-modules-add', anchor);
    service.updateUserAreaSnapshot(emptyWorkspaceSnapshot());
    jasmine.clock().tick(1300);

    service.pauseAllTips(1000 * 60 * 60);
    jasmine.clock().tick(10);

    expect(activeTip.current).toBeNull();
    expect(storage().viewers?.['user-123'].tips['__global_pause__'].snoozedUntil).toBeDefined();
  });

  it('does not auto-advance to the next eligible tip while the current tip is still active', () => {
    const service = build('user-auto-advance');
    const modulesAddAnchor = document.createElement('button');
    const profileAnchor = document.createElement('section');
    const activeTip = subscribeActiveTip(service);

    service.registerAnchor('user-area-modules-add', modulesAddAnchor);
    service.updateUserAreaSnapshot(emptyWorkspaceSnapshot());

    jasmine.clock().tick(1300);
    const firstTipId = activeTip.current?.definition.id;
    expect(firstTipId).toBe('user-area-modules-add');

    service.registerAnchor('user-area-profile-card', profileAnchor);

    jasmine.clock().tick(3000);
    expect(activeTip.current?.definition.id).toBe(firstTipId);
  });

  it('does not chain another automatic tip after Later in the same visit', () => {
    const service = build('user-later-chain');
    const profileAnchor = document.createElement('section');
    const modulesAddAnchor = document.createElement('button');
    const activeTip = subscribeActiveTip(service);

    service.registerAnchor('user-area-profile-card', profileAnchor);
    service.registerAnchor('user-area-modules-add', modulesAddAnchor);
    service.updateUserAreaSnapshot(emptyWorkspaceSnapshot());
    jasmine.clock().tick(1300);

    expect(activeTip.current?.definition.id).toBe('user-area-profile-private');
    service.snoozeActiveTip();
    jasmine.clock().tick(3000);

    expect(activeTip.current).toBeNull();
  });

  it('does not chain another automatic tip after Got it in the same visit', () => {
    const service = build('user-ack-chain');
    const profileAnchor = document.createElement('section');
    const modulesAddAnchor = document.createElement('button');
    const activeTip = subscribeActiveTip(service);

    service.registerAnchor('user-area-profile-card', profileAnchor);
    service.registerAnchor('user-area-modules-add', modulesAddAnchor);
    service.updateUserAreaSnapshot(emptyWorkspaceSnapshot());
    jasmine.clock().tick(1300);

    expect(activeTip.current?.definition.id).toBe('user-area-profile-private');
    service.acknowledgeActiveTip();
    jasmine.clock().tick(3000);

    expect(activeTip.current).toBeNull();
  });

  it('stores the viewer-level last shown timestamp only when an automatic tip activates', () => {
    const service = build('user-activation-state');
    const anchor = document.createElement('button');

    service.registerAnchor('user-area-modules-add', anchor);
    service.updateUserAreaSnapshot(emptyWorkspaceSnapshot());
    jasmine.clock().tick(600);

    expect(storage().viewers?.['user-activation-state'].lastTipShownAt).toBeUndefined();

    jasmine.clock().tick(700);

    const viewerState = storage().viewers?.['user-activation-state'];
    expect(viewerState?.lastTipShownAt).toBe(new Date(now.getTime() + 1200).toISOString());
    expect(viewerState?.lastShownTipId).toBe('user-area-modules-add');
  });

  it('does not consume the one-tip visit guard when a queued tip loses its anchor', () => {
    const service = build('user-anchor-missing');
    const anchor = document.createElement('button');
    const activeTip = subscribeActiveTip(service);

    service.registerAnchor('user-area-modules-add', anchor);
    service.updateUserAreaSnapshot(emptyWorkspaceSnapshot());
    jasmine.clock().tick(600);
    service.unregisterAnchor('user-area-modules-add', anchor);
    jasmine.clock().tick(700);

    expect(activeTip.current).toBeNull();
    expect(storage().viewers?.['user-anchor-missing'].lastTipShownAt).toBeUndefined();

    service.registerAnchor('user-area-modules-add', document.createElement('button'));
    jasmine.clock().tick(1300);

    expect(activeTip.current?.definition.id).toBe('user-area-modules-add');
  });

  it('respects the automatic tip cooldown across service instances', () => {
    seedViewerState('user-cooldown', {
      onboardingAt: '1970-01-01T00:00:00.000Z',
      lastTipShownAt: now.toISOString()
    });
    const service = build('user-cooldown');
    const activeTip = subscribeActiveTip(service);

    service.registerAnchor('user-area-modules-add', document.createElement('button'));
    service.updateUserAreaSnapshot(emptyWorkspaceSnapshot());
    jasmine.clock().tick(1300);

    expect(activeTip.current).toBeNull();
  });

  it('allows automatic tips after the cooldown window has elapsed', () => {
    seedViewerState('user-cooldown-expired', {
      onboardingAt: '1970-01-01T00:00:00.000Z',
      lastTipShownAt: new Date(now.getTime() - DEFAULT_TIP_SPACING_MS - 1).toISOString()
    });
    const service = build('user-cooldown-expired');
    const activeTip = subscribeActiveTip(service);

    service.registerAnchor('user-area-modules-add', document.createElement('button'));
    service.updateUserAreaSnapshot(emptyWorkspaceSnapshot());
    jasmine.clock().tick(1300);

    expect(activeTip.current?.definition.id).toBe('user-area-modules-add');
  });

  it('migrates legacy v1 storage into viewer-level v2 storage without losing tip state', () => {
    localStorage.setItem(LEGACY_DISCOVERY_TIP_STORAGE_KEY, JSON.stringify({
      viewers: {
        'legacy-user': {
          'user-area-modules-add': {
            version: 1,
            shownCount: 1,
            lastShownAt: '2026-06-16T10:00:00.000Z',
            snoozedUntil: '2026-06-20T10:00:00.000Z'
          }
        }
      }
    }));

    build('legacy-user');

    const migratedViewer = storage().viewers?.['legacy-user'];
    const migratedTip = migratedViewer?.tips['user-area-modules-add'];
    expect(storage().schemaVersion).toBe(2);
    expect(migratedViewer?.onboardingAt).toBe(now.toISOString());
    expect(migratedTip?.shownCount).toBe(1);
    expect(migratedTip?.snoozedUntil).toBe('2026-06-20T10:00:00.000Z');
    expect(migratedTip?.learnedAt).toBe(now.toISOString());
  });

  it('grandfathers registry tips introduced before the viewer onboarding baseline', () => {
    seedViewerState('user-grandfathered', {
      onboardingAt: '2026-06-17T12:00:00.000Z'
    });
    const service = build('user-grandfathered');
    const activeTip = subscribeActiveTip(service);

    service.registerAnchor('user-area-modules-add', document.createElement('button'));
    service.updateUserAreaSnapshot(emptyWorkspaceSnapshot());
    jasmine.clock().tick(1300);

    expect(activeTip.current).toBeNull();
    expect(storage().viewers?.['user-grandfathered'].tips['user-area-modules-add'].learnedAt)
      .toBe('2026-06-17T12:00:00.000Z');
  });

  it('allows a registry tip introduced after the viewer onboarding baseline', () => {
    const newTip: DiscoveryTipDefinition = {
      id: 'user-area-new-after-baseline',
      version: 1,
      introducedAt: '2026-06-18T00:00:00.000Z',
      anchorId: 'user-area-new-after-baseline',
      title: 'New tip',
      body: 'This tip was introduced after onboarding.',
      routePrefixes: ['/user/area'],
      priority: 1,
      audience: 'signed-in',
      displayDelayMs: 50,
      maxShowCount: 1,
      isEligible: () => true
    };
    discoveryTipRegistry.push(newTip);
    seedViewerState('user-new-tip', {
      onboardingAt: '2026-06-17T12:00:00.000Z'
    });
    const service = build('user-new-tip');
    const activeTip = subscribeActiveTip(service);

    service.registerAnchor('user-area-new-after-baseline', document.createElement('button'));
    service.updateUserAreaSnapshot(emptyWorkspaceSnapshot());
    jasmine.clock().tick(60);

    expect(activeTip.current?.definition.id).toBe('user-area-new-after-baseline');
  });

  it('starts and advances the guided user-area tour through registered anchors', () => {
    const service = build('user-guided');
    const profileAnchor = document.createElement('section');
    const modulesAnchor = document.createElement('button');
    const activeTip = subscribeActiveTip(service);

    service.registerAnchor('user-area-profile-card', profileAnchor);
    service.registerAnchor('user-area-modules-add', modulesAnchor);

    service.startUserAreaTour();

    expect(activeTip.current?.definition.id).toBe('user-area-profile-private');
    expect(activeTip.current?.guidedStepIndex).toBe(1);
    expect(activeTip.current?.guidedStepTotal).toBeGreaterThan(1);

    service.acknowledgeActiveTip();

    expect(activeTip.current?.definition.id).toBe('user-area-modules-add');
    expect(activeTip.current?.guidedStepIndex).toBe(2);
  });

  it('guided tours bypass automatic cooldown and grandfathered learned state', () => {
    seedViewerState('user-guided-bypass', {
      onboardingAt: '2026-06-17T12:00:00.000Z',
      lastTipShownAt: now.toISOString()
    });
    const service = build('user-guided-bypass');
    const activeTip = subscribeActiveTip(service);

    service.registerAnchor('user-area-profile-card', document.createElement('section'));
    service.registerAnchor('user-area-modules-add', document.createElement('button'));
    service.startUserAreaTour();

    expect(activeTip.current?.definition.id).toBe('user-area-profile-private');
    expect(activeTip.current?.guidedStepIndex).toBe(1);
  });

  it('does not surface tips while the global pause is still active', () => {
    const firstService = build();
    const firstAnchor = document.createElement('button');

    firstService.registerAnchor('user-area-modules-add', firstAnchor);
    firstService.updateUserAreaSnapshot(emptyWorkspaceSnapshot());
    jasmine.clock().tick(1300);
    firstService.pauseAllTips(1000 * 60 * 60);
    firstService.ngOnDestroy();

    const secondService = build();
    const secondAnchor = document.createElement('button');
    const activeTip = subscribeActiveTip(secondService);

    secondService.registerAnchor('user-area-modules-add', secondAnchor);
    secondService.updateUserAreaSnapshot(emptyWorkspaceSnapshot());
    jasmine.clock().tick(1300);

    expect(activeTip.current).toBeNull();
  });

  it('cancels queued tips when navigation changes before the delay completes', () => {
    const service = build('user-route-change');
    const anchor = document.createElement('button');
    const activeTip = subscribeActiveTip(service);

    service.registerAnchor('user-area-modules-add', anchor);
    service.updateUserAreaSnapshot(emptyWorkspaceSnapshot());

    jasmine.clock().tick(600);
    routerEvents$.next(new NavigationEnd(1, '/user/area', '/user/profile'));
    jasmine.clock().tick(1000);

    expect(activeTip.current).toBeNull();
  });

  it('acknowledgeActiveTip does nothing when activeTip is null', () => {
    const service = build('user-ack-null');
    expect(() => service.acknowledgeActiveTip()).not.toThrow();
  });

  it('snoozeActiveTip does nothing when activeTip is null', () => {
    const service = build('user-snooze-null');
    expect(() => service.snoozeActiveTip()).not.toThrow();
  });
});
