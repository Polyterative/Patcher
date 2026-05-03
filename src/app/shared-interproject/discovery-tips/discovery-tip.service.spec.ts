import { NavigationEnd } from '@angular/router';
import { ReplaySubject, Subject } from 'rxjs';
import {
  DISCOVERY_TIP_STORAGE_KEY,
  DiscoveryTipService
} from './discovery-tip.service';


describe('DiscoveryTipService', () => {
  let routerEvents$: Subject<any>;
  let loggedUser$: ReplaySubject<any>;
  let loggedUserFullProfile$: ReplaySubject<any>;

  function build(viewerId = 'user-123') {
    routerEvents$ = new Subject<any>();
    loggedUser$ = new ReplaySubject<any>(1);
    loggedUserFullProfile$ = new ReplaySubject<any>(1);

    loggedUser$.next({
      id: viewerId,
      email: `${ viewerId }@example.com`
    });
    loggedUserFullProfile$.next({
      id: viewerId,
      username: viewerId
    });

    return new DiscoveryTipService(
      {
        url: '/user/area',
        events: routerEvents$.asObservable()
      } as any,
      {
        loggedUser$: loggedUser$.asObservable(),
        loggedUserFullProfile$: loggedUserFullProfile$.asObservable()
      } as any,
      'browser' as any
    );
  }

  beforeEach(() => {
    jasmine.clock().install();
    localStorage.clear();
  });

  afterEach(() => {
    jasmine.clock().uninstall();
    localStorage.clear();
  });

  it('does not surface the modules tip before the user-area data is loaded', () => {
    const service = build();
    const anchor = document.createElement('button');
    let activeTip: any = null;

    service.activeTip$.subscribe((value) => {
      activeTip = value;
    });

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

    expect(activeTip).toBeNull();
  });

  it('persists learned state and does not repeat the same tip for the same viewer', () => {
    const firstService = build();
    const firstAnchor = document.createElement('button');

    firstService.registerAnchor('user-area-modules-add', firstAnchor);
    firstService.updateUserAreaSnapshot({
      modulesLoaded: true,
      racksLoaded: true,
      patchesLoaded: true,
      modulesCount: 0,
      racksCount: 0,
      patchesCount: 0,
      totalCount: 0,
      hasSearchQuery: false
    });
    firstService.recordAction('user-area.modules.add-clicked');
    jasmine.clock().tick(10);
    firstService.ngOnDestroy();

    const secondService = build();
    const secondAnchor = document.createElement('button');
    let secondActiveTip: any = null;

    secondService.activeTip$.subscribe((value) => {
      secondActiveTip = value;
    });

    secondService.registerAnchor('user-area-modules-add', secondAnchor);
    secondService.updateUserAreaSnapshot({
      modulesLoaded: true,
      racksLoaded: true,
      patchesLoaded: true,
      modulesCount: 0,
      racksCount: 0,
      patchesCount: 0,
      totalCount: 0,
      hasSearchQuery: false
    });
    jasmine.clock().tick(1300);

    expect(secondActiveTip).toBeNull();

    const storage = JSON.parse(localStorage.getItem(DISCOVERY_TIP_STORAGE_KEY) ?? '{}');
    expect(storage.viewers['user-123']['user-area-modules-add'].learnedAt).toBeDefined();
  });

  it('partitions tip state per viewer key in localStorage', () => {
    const firstService = build('user-a');
    const firstAnchor = document.createElement('button');

    firstService.registerAnchor('user-area-modules-add', firstAnchor);
    firstService.updateUserAreaSnapshot({
      modulesLoaded: true,
      racksLoaded: true,
      patchesLoaded: true,
      modulesCount: 0,
      racksCount: 0,
      patchesCount: 0,
      totalCount: 0,
      hasSearchQuery: false
    });
    jasmine.clock().tick(1300);
    firstService.acknowledgeActiveTip();
    firstService.ngOnDestroy();

    const secondService = build('user-b');
    const secondAnchor = document.createElement('button');
    let activeTip: any = null;

    secondService.activeTip$.subscribe((value) => {
      activeTip = value;
    });

    secondService.registerAnchor('user-area-modules-add', secondAnchor);
    secondService.updateUserAreaSnapshot({
      modulesLoaded: true,
      racksLoaded: true,
      patchesLoaded: true,
      modulesCount: 0,
      racksCount: 0,
      patchesCount: 0,
      totalCount: 0,
      hasSearchQuery: false
    });
    jasmine.clock().tick(1300);

    expect(activeTip?.definition.id).toBe('user-area-modules-add');
  });

  it('marks matching tips as learned when their completion action fires', () => {
    const service = build();
    const anchor = document.createElement('button');
    let activeTip: any = null;

    service.activeTip$.subscribe((value) => {
      activeTip = value;
    });

    service.registerAnchor('user-area-modules-add', anchor);
    service.updateUserAreaSnapshot({
      modulesLoaded: true,
      racksLoaded: true,
      patchesLoaded: true,
      modulesCount: 0,
      racksCount: 0,
      patchesCount: 0,
      totalCount: 0,
      hasSearchQuery: false
    });

    service.recordAction('user-area.modules.add-clicked');
    jasmine.clock().tick(10);

    expect(activeTip).toBeNull();

    const storage = JSON.parse(localStorage.getItem(DISCOVERY_TIP_STORAGE_KEY) ?? '{}');
    expect(storage.viewers['user-123']['user-area-modules-add'].learnedAt).toBeDefined();
  });

  it('pauses all tips for the current viewer when the global pause is applied', () => {
    const service = build();
    const anchor = document.createElement('button');
    let activeTip: any = null;

    service.activeTip$.subscribe((value) => {
      activeTip = value;
    });

    service.registerAnchor('user-area-modules-add', anchor);
    service.updateUserAreaSnapshot({
      modulesLoaded: true,
      racksLoaded: true,
      patchesLoaded: true,
      modulesCount: 0,
      racksCount: 0,
      patchesCount: 0,
      totalCount: 0,
      hasSearchQuery: false
    });
    jasmine.clock().tick(1300);

    service.pauseAllTips(1000 * 60 * 60);
    jasmine.clock().tick(10);

    expect(activeTip).toBeNull();

    const storage = JSON.parse(localStorage.getItem(DISCOVERY_TIP_STORAGE_KEY) ?? '{}');
    expect(storage.viewers['user-123']['__global_pause__'].snoozedUntil).toBeDefined();
  });

  it('does not auto-advance to the next eligible tip while the current tip is still active', () => {
    const service = build('user-auto-advance');
    const modulesAddAnchor = document.createElement('button');
    const profileAnchor = document.createElement('section');
    let activeTip: any = null;

    service.activeTip$.subscribe((value) => {
      activeTip = value;
    });

    service.registerAnchor('user-area-modules-add', modulesAddAnchor);
    service.updateUserAreaSnapshot({
      modulesLoaded: true,
      racksLoaded: true,
      patchesLoaded: true,
      modulesCount: 0,
      racksCount: 0,
      patchesCount: 0,
      totalCount: 0,
      hasSearchQuery: false
    });

    jasmine.clock().tick(1300);
    const firstTipId = activeTip?.definition.id;
    expect(firstTipId).toBe('user-area-modules-add');

    service.registerAnchor('user-area-profile-card', profileAnchor);

    jasmine.clock().tick(3000);
    expect(activeTip?.definition.id).toBe(firstTipId);
  });

  it('does not surface tips while the global pause is still active', () => {
    const firstService = build();
    const firstAnchor = document.createElement('button');

    firstService.registerAnchor('user-area-modules-add', firstAnchor);
    firstService.updateUserAreaSnapshot({
      modulesLoaded: true,
      racksLoaded: true,
      patchesLoaded: true,
      modulesCount: 0,
      racksCount: 0,
      patchesCount: 0,
      totalCount: 0,
      hasSearchQuery: false
    });
    jasmine.clock().tick(1300);
    firstService.pauseAllTips(1000 * 60 * 60);
    firstService.ngOnDestroy();

    const secondService = build();
    const secondAnchor = document.createElement('button');
    let activeTip: any = null;

    secondService.activeTip$.subscribe((value) => {
      activeTip = value;
    });

    secondService.registerAnchor('user-area-modules-add', secondAnchor);
    secondService.updateUserAreaSnapshot({
      modulesLoaded: true,
      racksLoaded: true,
      patchesLoaded: true,
      modulesCount: 0,
      racksCount: 0,
      patchesCount: 0,
      totalCount: 0,
      hasSearchQuery: false
    });
    jasmine.clock().tick(1300);

    expect(activeTip).toBeNull();
  });

  it('cancels queued tips when navigation changes before the delay completes', () => {
    const service = build('user-route-change');
    const anchor = document.createElement('button');
    let activeTip: any = null;

    service.activeTip$.subscribe((value) => {
      activeTip = value;
    });

    service.registerAnchor('user-area-modules-add', anchor);
    service.updateUserAreaSnapshot({
      modulesLoaded: true,
      racksLoaded: true,
      patchesLoaded: true,
      modulesCount: 0,
      racksCount: 0,
      patchesCount: 0,
      totalCount: 0,
      hasSearchQuery: false
    });

    jasmine.clock().tick(600);
    routerEvents$.next(new NavigationEnd(1, '/user/area', '/user/profile'));
    jasmine.clock().tick(1000);

    expect(activeTip).toBeNull();
  });
});
