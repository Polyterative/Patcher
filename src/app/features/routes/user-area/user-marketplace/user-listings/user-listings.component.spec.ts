import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import {
  of,
  ReplaySubject
} from 'rxjs';
import { UserManagementService } from 'src/app/features/backbone/login/user-management.service';
import { SupabaseService } from 'src/app/features/backend/supabase.service';
import { RichUserModel } from 'src/app/features/backend/supabase.types';
import { MarketplaceListing } from 'src/app/features/marketplace/marketplace-listing.utils';
import { UserAreaModule } from 'src/app/features/routes/user-area/user-area.module';
import { MinimalModule } from 'src/app/models/module';
import { UserListingsComponent } from './user-listings.component';

interface NgModuleDefLike {
  imports?: unknown[];
}

function createProfile(): RichUserModel {
  return {
    created_at: '2026-07-17T08:00:00.000Z',
    email: 'seller@example.com',
    id: 'seller-1',
    updated_at: '2026-07-17T08:00:00.000Z',
    username: 'seller'
  };
}

function createModule(overrides: Partial<MinimalModule> = {}): MinimalModule {
  return {
    created: '2026-07-17T08:00:00.000Z',
    description: 'Function generator',
    hp: 20,
    id: 101,
    manufacturer: {id: 7, name: 'Make Noise'},
    manufacturerId: 7,
    name: 'Maths',
    panels: [],
    possessionKind: 'SELLS',
    public: true,
    standard: 0,
    tags: [],
    updated: '2026-07-17T08:00:00.000Z',
    ...overrides
  } as MinimalModule;
}

function createListing(overrides: Partial<MarketplaceListing> = {}): MarketplaceListing {
  return {
    askingPriceAmountMinor: 12000,
    askingPriceCurrency: 'EUR',
    condition: 'good',
    createdAt: '2026-07-17T08:00:00.000Z',
    description: null,
    externalLink: null,
    id: 'listing-1',
    media: [],
    module: {
      hp: 20,
      id: 101,
      manufacturer: {id: 7, logo: null, name: 'Make Noise'},
      name: 'Maths',
      panels: [{
        color: 0,
        description: 'Black panel',
        filename: 'maths-black.webp',
        id: 1,
        moduleid: 101
      }],
      public: true,
      standard: {id: 0, name: '3U Doepfer'}
    },
    moduleId: 101,
    openToOffers: true,
    publicId: 'public-listing-1',
    seller: null,
    sellerProfileId: 'seller-1',
    shippingNotes: null,
    shippingOptions: ['Domestic shipping'],
    shipsFromCountry: 'DE',
    status: 'draft',
    titleOverride: null,
    updatedAt: '2026-07-17T08:00:00.000Z',
    ...overrides
  };
}

function userServiceMock(): UserManagementService {
  const profile$ = new ReplaySubject<RichUserModel | undefined>(1);
  profile$.next(createProfile());
  return {
    loggedUserFullProfile$: profile$.asObservable()
  } as unknown as UserManagementService;
}

function snackBarMock(): MatSnackBar {
  return {
    open: jasmine.createSpy('open')
  } as unknown as MatSnackBar;
}

function backendMock(options: {
  listings?: MarketplaceListing[];
  marketPrices?: Array<{moduleId: number; displayPrice: string; storeCount: number; tooltip: string}>;
  modules?: MinimalModule[];
} = {}): SupabaseService {
  const listings = options.listings ?? [];
  return {
    GET: {
      currentUserModules: jasmine.createSpy('currentUserModules').and.returnValue(of(options.modules ?? [createModule()])),
      recentModuleMarketPrices: jasmine.createSpy('recentModuleMarketPrices').and.returnValue(of(options.marketPrices ?? []))
    },
    add: {
      marketplaceListing: jasmine.createSpy('marketplaceListing').and.returnValue(of(createListing({id: 'created-listing'}))),
      marketplaceListingMedia: jasmine.createSpy('marketplaceListingMedia').and.returnValue(of({}))
    },
    delete: {
      marketplaceListingMedia: jasmine.createSpy('marketplaceListingMedia').and.returnValue(of(undefined))
    },
    get: {
      currentUserMarketplaceListings: jasmine.createSpy('currentUserMarketplaceListings').and.returnValue(of(listings))
    },
    storage: {
      deleteMarketplaceListingImage: jasmine.createSpy('deleteMarketplaceListingImage').and.returnValue(of(null)),
      uploadMarketplaceListingImage: jasmine.createSpy('uploadMarketplaceListingImage').and.returnValue(of('seller-1/created-listing/front.jpg'))
    },
    update: {
      marketplaceListing: jasmine.createSpy('marketplaceListing').and.returnValue(of(createListing())),
      marketplaceListingMediaOrder: jasmine.createSpy('marketplaceListingMediaOrder').and.returnValue(of([]))
    }
  } as unknown as SupabaseService;
}

function moduleDef(moduleType: unknown): NgModuleDefLike {
  return (moduleType as {ɵmod: NgModuleDefLike}).ɵmod;
}

describe('UserListingsComponent', () => {
  let fixture: ComponentFixture<UserListingsComponent>;
  let backend: SupabaseService;

  function build(options: {
    listings?: MarketplaceListing[];
    marketPrices?: Array<{moduleId: number; displayPrice: string; storeCount: number; tooltip: string}>;
    modules?: MinimalModule[];
  } = {}): UserListingsComponent {
    backend = backendMock(options);
    TestBed.configureTestingModule({
      imports: [UserListingsComponent, NoopAnimationsModule],
      providers: [
        {provide: SupabaseService, useValue: backend},
        {provide: UserManagementService, useValue: userServiceMock()},
        {provide: MatSnackBar, useValue: snackBarMock()}
      ]
    });
    fixture = TestBed.createComponent(UserListingsComponent);
    fixture.detectChanges();
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('renders a private My listings section with eligible SELLS modules', () => {
    build({modules: [createModule(), createModule({id: 202, name: 'Wishlist only', possessionKind: 'WANTS'})]});

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('My listings');
    expect(text).toContain('Only visible in your account area.');
    expect(text).toContain('Maths');
    expect(text).not.toContain('Wishlist only');
    expect((fixture.nativeElement as HTMLElement).querySelector('[data-testid="user-listing-create"]')).not.toBeNull();
  });

  it('renders status filters as material toggle options with stable test ids', () => {
    build({modules: [createModule()]});

    const host = fixture.nativeElement as HTMLElement;
    const filterGroup = host.querySelector('mat-button-toggle-group.module-collection-filter');

    expect(filterGroup).not.toBeNull();
    for (const value of ['all', 'active', 'reserved', 'draft', 'paused', 'expired', 'closed']) {
      expect(host.querySelector(`[data-testid="user-listings-filter-${value}"]`)).not.toBeNull();
    }
  });

  it('filters reserved and expired listings separately from active and closed listings', () => {
    const component = build({listings: [
      createListing({id: 'active-listing', status: 'active', titleOverride: 'Active listing'}),
      createListing({id: 'reserved-listing', status: 'reserved', titleOverride: 'Reserved listing'}),
      createListing({id: 'expired-listing', status: 'expired', titleOverride: 'Expired listing'}),
      createListing({id: 'sold-listing', status: 'closed_sold', titleOverride: 'Sold listing'})
    ]});
    const host = fixture.nativeElement as HTMLElement;

    component.setFilter('reserved');
    fixture.detectChanges();
    expect(host.querySelectorAll('[data-testid="user-listing-row"]').length).toBe(1);
    expect(host.textContent).toContain('Reserved listing');
    expect(host.textContent).not.toContain('Active listing');

    component.setFilter('expired');
    fixture.detectChanges();
    expect(host.querySelectorAll('[data-testid="user-listing-row"]').length).toBe(1);
    expect(host.textContent).toContain('Expired listing');

    component.setFilter('closed');
    fixture.detectChanges();
    expect(host.querySelectorAll('[data-testid="user-listing-row"]').length).toBe(1);
    expect(host.textContent).toContain('Sold listing');
    expect(host.textContent).not.toContain('Expired listing');
  });

  it('wires seller reservation actions to the existing listing lifecycle update', () => {
    const listing = createListing({id: 'reserve-me', status: 'active'});
    build({listings: [listing]});
    const host = fixture.nativeElement as HTMLElement;

    host.querySelector<HTMLButtonElement>('[data-testid="user-listing-reserve"]')?.click();
    expect(backend.update.marketplaceListing).toHaveBeenCalledWith('reserve-me', jasmine.objectContaining({status: 'reserved'}));
  });

  it('returns reserved seller listings to active through the existing lifecycle update', () => {
    build({listings: [createListing({id: 'reserved-listing', status: 'reserved'})]});
    const host = fixture.nativeElement as HTMLElement;

    host.querySelector<HTMLButtonElement>('[data-testid="user-listing-release-reservation"]')?.click();
    expect(backend.update.marketplaceListing).toHaveBeenCalledWith('reserved-listing', jasmine.objectContaining({status: 'active'}));
  });

  it('relists expired seller listings to active through the existing lifecycle update', () => {
    build({listings: [createListing({id: 'expired-listing', status: 'expired'})]});
    const host = fixture.nativeElement as HTMLElement;

    expect(host.querySelector('[data-testid="user-listing-relist"]')).not.toBeNull();
    host.querySelector<HTMLButtonElement>('[data-testid="user-listing-relist"]')?.click();
    expect(backend.update.marketplaceListing).toHaveBeenCalledWith('expired-listing', jasmine.objectContaining({status: 'active'}));
  });

  it('hides the relist action on non-expired seller listings', () => {
    const component = build({listings: [createListing({id: 'active-listing', status: 'active'})]});
    const host = fixture.nativeElement as HTMLElement;

    expect(host.querySelector('[data-testid="user-listing-relist"]')).toBeNull();
    expect(component.canRelist(createListing({status: 'active'}))).toBeFalse();
    expect(component.canRelist(createListing({status: 'expired'}))).toBeTrue();
  });

  it('enables relist only for expired listings across every lifecycle status', () => {
    const component = build({listings: []});

    for (const status of ['draft', 'active', 'reserved', 'paused', 'closed_sold', 'closed_unsold'] as const) {
      expect(component.canRelist(createListing({status}))).withContext(`relist hidden for ${status}`).toBeFalse();
    }
    expect(component.canRelist(createListing({status: 'expired'}))).toBeTrue();
  });

  it('gates publish, pause, reserve, release, and close actions by lifecycle status', () => {
    const component = build({listings: []});

    expect(component.canPublish(createListing({status: 'draft'}))).toBeTrue();
    expect(component.canPublish(createListing({status: 'paused'}))).toBeTrue();
    expect(component.canPublish(createListing({status: 'active'}))).toBeFalse();
    expect(component.canPublish(createListing({status: 'expired'}))).toBeFalse();

    expect(component.canPause(createListing({status: 'active'}))).toBeTrue();
    expect(component.canPause(createListing({status: 'reserved'}))).toBeTrue();
    expect(component.canPause(createListing({status: 'draft'}))).toBeFalse();
    expect(component.canPause(createListing({status: 'expired'}))).toBeFalse();

    expect(component.canReserve(createListing({status: 'active'}))).toBeTrue();
    expect(component.canReserve(createListing({status: 'reserved'}))).toBeFalse();
    expect(component.canReserve(createListing({status: 'draft'}))).toBeFalse();

    expect(component.canReleaseReservation(createListing({status: 'reserved'}))).toBeTrue();
    expect(component.canReleaseReservation(createListing({status: 'active'}))).toBeFalse();

    expect(component.canClose(createListing({status: 'active'}))).toBeTrue();
    expect(component.canClose(createListing({status: 'expired'}))).toBeTrue();
    expect(component.canClose(createListing({status: 'closed_sold'}))).toBeFalse();
    expect(component.canClose(createListing({status: 'closed_unsold'}))).toBeFalse();
  });

  it('filters paused and draft listings separately from the closed aggregate', () => {
    const component = build({listings: [
      createListing({id: 'draft-listing', status: 'draft', titleOverride: 'Draft listing'}),
      createListing({id: 'paused-listing', status: 'paused', titleOverride: 'Paused listing'}),
      createListing({id: 'sold-listing', status: 'closed_sold', titleOverride: 'Sold listing'}),
      createListing({id: 'unsold-listing', status: 'closed_unsold', titleOverride: 'Unsold listing'})
    ]});
    const host = fixture.nativeElement as HTMLElement;

    component.setFilter('draft');
    fixture.detectChanges();
    expect(host.querySelectorAll('[data-testid="user-listing-row"]').length).toBe(1);
    expect(host.textContent).toContain('Draft listing');

    component.setFilter('paused');
    fixture.detectChanges();
    expect(host.querySelectorAll('[data-testid="user-listing-row"]').length).toBe(1);
    expect(host.textContent).toContain('Paused listing');

    component.setFilter('closed');
    fixture.detectChanges();
    expect(host.querySelectorAll('[data-testid="user-listing-row"]').length).toBe(2);
    expect(host.textContent).toContain('Sold listing');
    expect(host.textContent).toContain('Unsold listing');
  });

  it('renders the listing editor with shared form entities and material checkboxes', () => {
    const component = build({modules: [createModule()]});
    component.openCreate(createModule());
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    for (const testId of [
      'user-listing-condition',
      'user-listing-price',
      'user-listing-currency',
      'user-listing-ships-from',
      'user-listing-shipping-notes',
      'user-listing-title',
      'user-listing-description',
      'user-listing-link'
    ]) {
      expect(host.querySelector(`lib-mat-form-entity[data-testid="${testId}"]`)).not.toBeNull();
    }
    expect(host.querySelector('mat-checkbox[data-testid="user-listing-open-offers"]')).not.toBeNull();
    expect(host.querySelector('fieldset mat-checkbox')).not.toBeNull();

    const openToOffersInput = host.querySelector<HTMLInputElement>(
      'mat-checkbox[data-testid="user-listing-open-offers"] input[type="checkbox"]'
    );
    expect(openToOffersInput).not.toBeNull();
    openToOffersInput?.click();
    fixture.detectChanges();
    expect(component.form.controls.openToOffers.value).toBeFalse();

    const euShippingInput = host.querySelector<HTMLInputElement>(
      'mat-checkbox[data-testid="user-listing-shipping-euShipping"] input[type="checkbox"]'
    );
    expect(euShippingInput).not.toBeNull();
    euShippingInput?.click();
    fixture.detectChanges();
    expect(component.form.controls.shippingOptions.controls.euShipping.value).toBeTrue();
  });

  it('shows price guidance under the price field when Price Hub has data', () => {
    const component = build({modules: [createModule()], marketPrices: [{
      displayPrice: '~€1,199',
      moduleId: 101,
      storeCount: 4,
      tooltip: 'Estimated recent market price: ~€1,199 from 4 stores.'
    }]});
    component.openCreate(createModule());
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('[data-testid="user-listing-price-guidance"]')?.textContent)
      .toContain('Price guidance: ~€1,199 new across 4 stores.');
  });

  it('hides price guidance without Price Hub data', () => {
    const component = build({modules: [createModule()]});
    component.openCreate(createModule());
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('[data-testid="user-listing-price-guidance"]')).toBeNull();
  });

  it('creates and publishes an inline listing from a For Sale module', () => {
    const component = build({modules: [createModule()]});
    component.openCreate(createModule());
    component.form.setValue({
      askingPrice: '120',
      askingPriceCurrency: 'EUR',
      condition: 'good',
      description: 'Clean module.',
      externalLink: 'https://example.com/listing',
      openToOffers: true,
      shipsFromCountry: 'DE',
      shippingNotes: 'Ships insured.',
      titleOverride: 'Maths seller copy',
      shippingOptions: {
        domesticShipping: true,
        euShipping: true,
        internationalShipping: false,
        localPickup: false
      }
    });

    component.save('active');

    expect(backend.add.marketplaceListing).toHaveBeenCalledOnceWith(jasmine.objectContaining({
      askingPrice: '120',
      askingPriceCurrency: 'EUR',
      moduleId: '101',
      sellerProfileId: 'seller-1',
      shippingNotes: 'Ships insured.',
      shippingOptions: ['Domestic shipping', 'EU shipping'],
      status: 'active'
    }));
  });

  it('saves shared select option ids without changing draft payload values', () => {
    const component = build({modules: [createModule()]});
    component.openCreate(createModule());
    component.form.setValue({
      askingPrice: '120',
      askingPriceCurrency: {id: 'EUR', name: 'EUR'},
      condition: {id: 'good', name: 'Good'},
      description: '',
      externalLink: '',
      openToOffers: true,
      shipsFromCountry: 'DE',
      shippingNotes: '',
      titleOverride: 'Maths',
      shippingOptions: {
        domesticShipping: true,
        euShipping: false,
        internationalShipping: false,
        localPickup: false
      }
    });

    component.save('draft');

    expect(backend.add.marketplaceListing).toHaveBeenCalledOnceWith(jasmine.objectContaining({
      askingPriceCurrency: 'EUR',
      condition: 'good',
      status: 'draft'
    }));
  });

  it('shows one-open-listing warning and hides duplicate create action for listed modules', () => {
    build({
      listings: [createListing({status: 'active'})],
      modules: [createModule({id: 101})]
    });
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    expect(host.textContent).toContain('One open listing per module.');
    expect(host.querySelector('[data-testid="user-listing-create"]')).toBeNull();
  });

  it('labels a first-time eligible module as not listed yet', () => {
    const component = build({modules: [createModule({id: 101})]});
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    expect(host.textContent).toContain('not listed yet');
    expect(host.textContent).not.toContain('Previously listed');
    expect(component.eligibleSubtitle(createModule({id: 101}), [])).toBe(
      'For sale in your collection — not listed yet.'
    );
    expect(component.eligibleCtaLabel(createModule({id: 101}), [])).toBe('Create listing');
  });

  it('labels an eligible module with closed sold history as previously listed with cleanup guidance', () => {
    const component = build({
      listings: [createListing({status: 'closed_sold', moduleId: 101})],
      modules: [createModule({id: 101})]
    });
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    expect(host.textContent).toContain('previously listed');
    expect(host.textContent).not.toContain('not listed yet');
    expect(host.querySelector('[data-testid="user-listing-create"]')?.textContent).toContain('Create new listing');
    expect(host.querySelector('[data-testid="user-listing-relist-note"]')).not.toBeNull();
    expect(host.querySelector('[data-testid="user-listing-sold-note"]')?.textContent).toContain('remove For Sale');
    expect(component.hasClosedSoldListingForModule([createListing({status: 'closed_sold', moduleId: 101})], 101)).toBeTrue();
    expect(component.hasClosedSoldListingForModule([createListing({status: 'active', moduleId: 101})], 101)).toBeFalse();
  });

  it('is wired into the private user-area module', () => {
    expect(moduleDef(UserAreaModule).imports).toContain(UserListingsComponent);
  });
});
