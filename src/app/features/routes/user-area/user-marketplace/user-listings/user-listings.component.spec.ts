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
    expiresAt: null,
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
  modules?: MinimalModule[];
} = {}): SupabaseService {
  const listings = options.listings ?? [];
  return {
    GET: {
      currentUserModules: jasmine.createSpy('currentUserModules').and.returnValue(of(options.modules ?? [createModule()]))
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
    for (const value of ['all', 'active', 'draft', 'paused', 'closed']) {
      expect(host.querySelector(`[data-testid="user-listings-filter-${value}"]`)).not.toBeNull();
    }
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
    expect(host.textContent).toContain('One active/open listing per seller/module.');
    expect(host.querySelector('[data-testid="user-listing-create"]')).toBeNull();
  });

  it('is wired into the private user-area module', () => {
    expect(moduleDef(UserAreaModule).imports).toContain(UserListingsComponent);
  });
});
