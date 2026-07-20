import { NO_ERRORS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { BehaviorSubject, of, ReplaySubject } from 'rxjs';
import { SeoAndUtilsService } from 'src/app/features/backbone/seo-and-utils.service';
import { UserManagementService } from 'src/app/features/backbone/login/user-management.service';
import { UrlCreatorService } from 'src/app/features/backend/url-creator.service';
import { MarketplaceListingCardComponent } from 'src/app/features/marketplace/marketplace-listing-card/marketplace-listing-card.component';
import {
  buildMarketplaceCardViewModel,
  type MarketplaceListingCardViewModel
} from 'src/app/features/marketplace/marketplace-view-models';
import { createMarketplaceListing } from 'src/app/features/marketplace/marketplace-test-helpers.spec';
import { Patch } from 'src/app/models/patch';
import { Rack } from 'src/app/models/rack';
import { PublicProfileComponent } from './public-profile.component';
import { PublicProfileDataService } from './public-profile-data.service';

describe('PublicProfileComponent', () => {
  let createdComponents: PublicProfileComponent[];

  function build() {
    const dataService = {
      loadProfile$: new ReplaySubject<string>(1),
      racksCount$: new BehaviorSubject<number>(0),
      patchesCount$: new BehaviorSubject<number>(0),
      contributorStats$: new BehaviorSubject<any>(undefined),
      profile$: new BehaviorSubject<any>(null),
      routeState$: new BehaviorSubject<any>('loading'),
      rackData$: new BehaviorSubject<Rack[]>([]),
      patchesData$: new BehaviorSubject<Patch[]>([]),
      marketplaceEnabled: true,
      marketplaceListings$: new BehaviorSubject<MarketplaceListingCardViewModel[] | undefined>(undefined),
      marketplaceListingsLoading$: new BehaviorSubject<boolean>(false),
      marketplaceListingsError$: new BehaviorSubject<string | null>(null),
      retryMarketplaceListings$: new ReplaySubject<void>(1),
      loadMoreRacks$: new ReplaySubject<void>(1),
      loadMorePatches$: new ReplaySubject<void>(1),
    };
    const userService = {
      loggedUser$: new BehaviorSubject<any>(null),
      loggedUserFullProfile$: new BehaviorSubject<any>(null),
      updateProfileVisibility$: jasmine.createSpy().and.returnValue(of(void 0)),
    };
    const seoAndUtilsService = {
      updateSeo: jasmine.createSpy(),
    };
    const urlCreatorService = {
      copyLinkToClipboard: jasmine.createSpy(),
    };
    const route = {
      params: of({username: 'viewer'}),
    };
    const component = new PublicProfileComponent(
      dataService as any,
      userService as any,
      route as any,
      seoAndUtilsService as any,
      urlCreatorService as any,
    );
    createdComponents.push(component);

    return {
      component,
      dataService,
      userService,
      seoAndUtilsService,
      urlCreatorService,
    };
  }

  beforeEach(() => {
    createdComponents = [];
  });

  afterEach(() => {
    createdComponents.forEach((component) => component.ngOnDestroy());
  });

  it('reloads the profile after making it public', () => {
    const { component, dataService, userService } = build();
    const loadProfileSpy = spyOn(dataService.loadProfile$, 'next').and.callThrough();

    component.makeProfilePublic('viewer');

    expect(userService.updateProfileVisibility$).toHaveBeenCalledWith(true);
    expect(loadProfileSpy).toHaveBeenCalledWith('viewer');
  });

  it('maps approved public modules into contributor stats', (done) => {
    const { component, dataService } = build();

    dataService.contributorStats$.next({approvedPublicModules: 4});

    component.contributorStats$.subscribe((stats) => {
      expect(stats).toEqual([
        {name: 'Approved public modules', value: 4, icon: 'check_circle'},
      ]);
      done();
    });
  });

  it('uses profile section icons for public stats', (done) => {
    const { component, dataService } = build();

    dataService.racksCount$.next(2);
    dataService.patchesCount$.next(3);

    component.publicStats$.subscribe((stats) => {
      expect(stats).toEqual([
        {name: 'Racks', value: 2, icon: 'view_stream'},
        {name: 'Patches', value: 3, icon: 'settings_input_composite'},
      ]);
      done();
    });
  });

  it('detects own profile when logged user id matches profile id', (done) => {
    const { component, dataService, userService } = build();

    dataService.profile$.next({id: 'u1', username: 'viewer'} as any);
    userService.loggedUserFullProfile$.next({id: 'u1'} as any);

    component.isOwnProfile$.subscribe((isOwn) => {
      expect(isOwn).toBeTrue();
      done();
    });
  });

  it('returns false for isOwnProfile when ids differ', (done) => {
    const { component, dataService, userService } = build();

    dataService.profile$.next({id: 'u1', username: 'viewer'} as any);
    userService.loggedUserFullProfile$.next({id: 'u2'} as any);

    component.isOwnProfile$.subscribe((isOwn) => {
      expect(isOwn).toBeFalse();
      done();
    });
  });

  it('profilePath returns the /u/ prefixed route', () => {
    const { component } = build();
    expect(component.profilePath('viewer')).toBe('/u/viewer');
  });

  it('view configs have hideButtons true', () => {
    const { component } = build();
    expect(component.patchViewConfig.hideButtons).toBeTrue();
    expect(component.rackViewConfig.hideButtons).toBeTrue();
  });

  it('loads profile for the username in the route params on construction', () => {
    const { dataService } = build();
    let emittedUsername: string | undefined;
    dataService.loadProfile$.subscribe((v) => emittedUsername = v);
    expect(emittedUsername).toBe('viewer');
  });

  it('copies profile link via urlCreatorService', () => {
    const { component, urlCreatorService } = build();
    component.copyProfileLink('testuser');
    expect(urlCreatorService.copyLinkToClipboard).toHaveBeenCalledWith('/u/testuser');
  });

  it('contributor stats is null when no stats loaded', (done) => {
    const { component } = build();
    component.contributorStats$.subscribe((stats) => {
      expect(stats).toBeNull();
      done();
    });
  });

  describe('SEO states', () => {
    it('emits full SEO metadata when routeState$ is ready', () => {
      const { dataService, seoAndUtilsService } = build();
      dataService.profile$.next({
        id: 'u1', username: 'testuser', avatarUrl: 'https://cdn.example.com/avatar.jpg'
      } as any);
      dataService.routeState$.next('ready');
      dataService.racksCount$.next(3);
      dataService.patchesCount$.next(2);

      expect(seoAndUtilsService.updateSeo).toHaveBeenCalledWith(
        jasmine.objectContaining({
          title: 'testuser - Public profile',
          description: jasmine.stringContaining('testuser'),
          image: 'https://cdn.example.com/avatar.jpg',
        }),
        'testuser — Public profile'
      );
    });

    it('SEO description includes rack and patch counts when both are positive', () => {
      const { dataService, seoAndUtilsService } = build();
      dataService.profile$.next({id: 'u1', username: 'alice', avatarUrl: undefined} as any);
      dataService.routeState$.next('ready');
      dataService.racksCount$.next(5);
      dataService.patchesCount$.next(1);

      const callArgs = (seoAndUtilsService.updateSeo as jasmine.Spy).calls.mostRecent().args[0];
      expect(callArgs.description).toContain('5 public racks');
      expect(callArgs.description).toContain('1 public patch.');
    });

    it('emits noindex SEO for private profiles', () => {
      const { dataService, seoAndUtilsService } = build();
      dataService.routeState$.next('private');

      expect(seoAndUtilsService.updateSeo).toHaveBeenCalledWith(
        jasmine.objectContaining({noindex: true, title: 'Private profile'}),
        'Private profile'
      );
    });

    it('emits noindex SEO for incomplete profiles', () => {
      const { dataService, seoAndUtilsService } = build();
      dataService.routeState$.next('incomplete');

      expect(seoAndUtilsService.updateSeo).toHaveBeenCalledWith(
        jasmine.objectContaining({noindex: true, title: 'Profile unavailable'}),
        'Profile unavailable'
      );
    });

    it('emits noindex SEO for not-found profiles', () => {
      const { dataService, seoAndUtilsService } = build();
      dataService.routeState$.next('not-found');

      expect(seoAndUtilsService.updateSeo).toHaveBeenCalledWith(
        jasmine.objectContaining({noindex: true, title: 'Profile not found'}),
        'Profile not found'
      );
    });

    it('emits noindex SEO for error state', () => {
      const { dataService, seoAndUtilsService } = build();
      dataService.routeState$.next('error');

      expect(seoAndUtilsService.updateSeo).toHaveBeenCalledWith(
        jasmine.objectContaining({noindex: true, title: 'Profile not found'}),
        'Profile not found'
      );
    });

    it('emits default noindex SEO for loading state', () => {
      const { seoAndUtilsService } = build();

      expect(seoAndUtilsService.updateSeo).toHaveBeenCalledWith(
        jasmine.objectContaining({noindex: true, title: 'Public profile'}),
        'Public profile'
      );
    });
  });

  describe('For sale rendering', () => {
    function render(overrides: Partial<ReturnType<typeof build>['dataService']> = {}) {
      const setup = build();
      const dataService = {
        ...setup.dataService,
        ...overrides,
      };

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        declarations: [PublicProfileComponent],
        imports: [
          CommonModule,
          MarketplaceListingCardComponent,
          MatIconModule,
          RouterTestingModule,
        ],
        providers: [
          {provide: ActivatedRoute, useValue: {params: of({username: 'seller'})}},
          {provide: PublicProfileDataService, useValue: dataService},
          {provide: UserManagementService, useValue: setup.userService},
          {provide: SeoAndUtilsService, useValue: setup.seoAndUtilsService},
          {provide: UrlCreatorService, useValue: setup.urlCreatorService},
        ],
        schemas: [NO_ERRORS_SCHEMA],
      });
      TestBed.overrideComponent(PublicProfileComponent, {
        set: {
          providers: [
            {provide: PublicProfileDataService, useValue: dataService},
          ],
        },
      });

      const fixture: ComponentFixture<PublicProfileComponent> = TestBed.createComponent(PublicProfileComponent);
      fixture.detectChanges();

      return {
        dataService,
        fixture,
      };
    }

    it('shows an honest loading section while seller listings are in flight', () => {
      const {dataService, fixture} = render();
      dataService.profile$.next({id: 'u1', username: 'seller', public: true});
      dataService.routeState$.next('ready');
      dataService.marketplaceListingsLoading$.next(true);
      fixture.detectChanges();

      const host = fixture.nativeElement as HTMLElement;
      expect(host.querySelector('[data-testid="public-profile-marketplace-section"]')).not.toBeNull();
      expect(host.querySelector('[data-testid="public-profile-marketplace-loading"]')?.textContent).toContain('Loading listings');
    });

    it('suppresses the For sale section after a successful empty listing response', () => {
      const {dataService, fixture} = render();
      dataService.profile$.next({id: 'u1', username: 'seller', public: true});
      dataService.routeState$.next('ready');
      dataService.marketplaceListings$.next([]);
      dataService.marketplaceListingsLoading$.next(false);
      dataService.marketplaceListingsError$.next(null);
      fixture.detectChanges();

      expect((fixture.nativeElement as HTMLElement).querySelector('[data-testid="public-profile-marketplace-section"]')).toBeNull();
    });

    it('renders inline error and retry without relying on a snackbar-only failure path', () => {
      const {dataService, fixture} = render();
      const retrySpy = spyOn(dataService.retryMarketplaceListings$, 'next').and.callThrough();
      dataService.profile$.next({id: 'u1', username: 'seller', public: true});
      dataService.routeState$.next('ready');
      dataService.marketplaceListingsError$.next('Marketplace listings could not be loaded.');
      fixture.detectChanges();

      const host = fixture.nativeElement as HTMLElement;
      const retryButton = host.querySelector<HTMLButtonElement>('[data-testid="public-profile-marketplace-error"] button');
      expect(host.querySelector('[data-testid="public-profile-marketplace-error"]')?.textContent).toContain('Marketplace listings could not be loaded.');

      retryButton?.click();
      expect(retrySpy).toHaveBeenCalled();
    });

    it('renders shared full-card links to marketplace listing detail pages', () => {
      const {dataService, fixture} = render();
      dataService.profile$.next({id: 'u1', username: 'seller', public: true});
      dataService.routeState$.next('ready');
      dataService.marketplaceListings$.next([
        buildMarketplaceCardViewModel(createMarketplaceListing()),
      ]);
      fixture.detectChanges();

      const host = fixture.nativeElement as HTMLElement;
      const link = host.querySelector<HTMLAnchorElement>('[data-testid="marketplace-card"]');
      expect(host.querySelector('[data-testid="public-profile-marketplace-grid"]')).not.toBeNull();
      expect(link?.getAttribute('href')).toBe('/marketplace/maths-public');
    });

    it('hides listing section state completely when the marketplace flag is disabled', () => {
      const {dataService, fixture} = render({marketplaceEnabled: false});
      dataService.profile$.next({id: 'u1', username: 'seller', public: true});
      dataService.routeState$.next('ready');
      dataService.marketplaceListingsLoading$.next(true);
      dataService.marketplaceListingsError$.next('Marketplace listings could not be loaded.');
      dataService.marketplaceListings$.next([
        buildMarketplaceCardViewModel(createMarketplaceListing()),
      ]);
      fixture.detectChanges();

      expect((fixture.nativeElement as HTMLElement).querySelector('[data-testid="public-profile-marketplace-section"]')).toBeNull();
    });
  });
});
