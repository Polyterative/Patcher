import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import {
  ActivatedRoute,
  convertToParamMap
} from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import {
  BehaviorSubject,
  of,
  ReplaySubject
} from 'rxjs';
import { UserManagementService } from 'src/app/features/backbone/login/user-management.service';
import { buildMarketplaceDetailViewModel } from 'src/app/features/marketplace/marketplace-view-models';
import {
  createMarketplaceListing,
  createMarketplaceMedia,
  createMarketplaceModule
} from 'src/app/features/marketplace/marketplace-test-helpers.spec';
import {
  MarketplaceDetailDataService,
  MarketplaceDetailViewState
} from './marketplace-detail-data.service';
import { MarketplaceDetailComponent } from './marketplace-detail.component';

describe('MarketplaceDetailComponent', () => {
  let fixture: ComponentFixture<MarketplaceDetailComponent>;
  let detailState$: BehaviorSubject<MarketplaceDetailViewState>;
  let loadListing$: ReplaySubject<string>;

  beforeEach(() => {
    const listing = createMarketplaceListing({
      media: [
        createMarketplaceMedia({id: 'media-1', url: 'https://images.patcher.xyz/one.webp'}),
        createMarketplaceMedia({id: 'media-2', url: 'https://images.patcher.xyz/two.webp'})
      ]
    });
    detailState$ = new BehaviorSubject<MarketplaceDetailViewState>({
      error: null,
      listing: buildMarketplaceDetailViewModel(listing, new Date('2026-07-17T12:00:00.000Z')),
      loading: false,
      notFound: false
    });
    loadListing$ = new ReplaySubject<string>(1);

    TestBed.configureTestingModule({
      imports: [
        MarketplaceDetailComponent,
        MatButtonModule,
        MatIconModule,
        NoopAnimationsModule,
        RouterTestingModule
      ],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of(convertToParamMap({publicId: 'maths-public'})),
            snapshot: {data: {}}
          }
        },
        {
          provide: UserManagementService,
          useValue: {loggedUser$: of(undefined)}
        }
      ]
    });
    TestBed.overrideComponent(MarketplaceDetailComponent, {
      set: {
        providers: [{
          provide: MarketplaceDetailDataService,
          useValue: {
            loadListing$,
            vm$: detailState$.asObservable()
          }
        }]
      }
    });
    fixture = TestBed.createComponent(MarketplaceDetailComponent);
    fixture.detectChanges();
  });

  it('loads the route public id and renders accessible gallery controls', (done) => {
    loadListing$.subscribe(publicId => {
      expect(publicId).toBe('maths-public');
      const host = fixture.nativeElement as HTMLElement;
      const thumbs = host.querySelectorAll<HTMLButtonElement>('.marketplace-detail__thumb');

      expect(host.querySelector('lib-hero-content-card.marketplaceBG')).not.toBeNull();
      expect(host.querySelector('.marketplace-detail__grid')).not.toBeNull();
      expect(host.textContent).toContain('Marketplace listing');
      expect(thumbs.length).toBe(2);
      expect(thumbs[0].getAttribute('aria-label')).toContain('Show image 1');
      expect(thumbs[0].getAttribute('aria-pressed')).toBe('true');
      expect(host.querySelector<HTMLAnchorElement>('[data-testid="marketplace-detail-module-link"]')?.getAttribute('href'))
        .toBe('/modules/details/101');
      done();
    });
  });

  it('changes selected media from keyboard and exposes login CTA with returnUrl', () => {
    const host = fixture.nativeElement as HTMLElement;
    const secondThumb = host.querySelectorAll<HTMLButtonElement>('.marketplace-detail__thumb')[1];

    secondThumb.dispatchEvent(new KeyboardEvent('keydown', {key: 'Enter'}));
    fixture.detectChanges();

    expect(secondThumb.getAttribute('aria-pressed')).toBe('true');
    const cta = host.querySelector<HTMLAnchorElement>('[data-testid="marketplace-login-cta"]');
    expect(cta?.getAttribute('href')).toContain('/auth/login');
    expect(cta?.textContent).toContain('Log in to contact seller');
  });

  it('uses the module faceplate fallback when detail media is empty', () => {
    detailState$.next({
      error: null,
      listing: buildMarketplaceDetailViewModel(createMarketplaceListing({media: []}), new Date('2026-07-17T12:00:00.000Z')),
      loading: false,
      notFound: false
    });
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('[data-testid="marketplace-detail-module-image"]')).not.toBeNull();
    expect(host.querySelector('app-module-part-image')).not.toBeNull();
    expect(host.querySelector('.marketplace-detail__placeholder')).toBeNull();
  });

  it('hides optional prose sections and private-module action when copy or public module is missing', () => {
    detailState$.next({
      error: null,
      listing: buildMarketplaceDetailViewModel(createMarketplaceListing({
        description: ' ',
        media: [],
        module: createMarketplaceModule({panels: [], public: false}),
        shippingNotes: ''
      }), new Date('2026-07-17T12:00:00.000Z')),
      loading: false,
      notFound: false
    });
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('.marketplace-detail__placeholder')).not.toBeNull();
    expect(host.querySelector('[data-testid="marketplace-detail-module-link"]')).toBeNull();
    expect(host.textContent).not.toContain('Description');
    expect(host.textContent).not.toContain('No description provided.');
    expect(host.textContent).not.toContain('Shipping notes');
    expect(host.textContent).not.toContain('Seller has not added extra shipping notes.');
  });

  it('renders unavailable state without stale listing fields when detail VM is not found', () => {
    spyOn(console, 'warn');
    detailState$.next({
      error: null,
      listing: null,
      loading: false,
      notFound: true
    });
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('[data-testid="marketplace-detail-not-found"]')).not.toBeNull();
    expect(host.querySelector('.marketplace-detail__grid')).toBeNull();
    expect(host.textContent).not.toContain('Maths');
    expect(host.textContent).not.toContain('Clean public listing.');
  });
});
