import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  firstValueFrom,
  of,
  throwError
} from 'rxjs';
import { take } from 'rxjs/operators';
import { SupabaseService } from 'src/app/features/backend/supabase.service';
import {
  createMarketplaceListing,
  createMarketplaceModule
} from 'src/app/features/marketplace/marketplace-test-helpers.spec';
import { MarketplaceDetailDataService } from './marketplace-detail-data.service';

describe('MarketplaceDetailDataService', () => {
  let service: MarketplaceDetailDataService;
  let backend: jasmine.SpyObj<SupabaseService>;
  let marketplaceListingByPublicId: jasmine.Spy;

  beforeEach(() => {
    marketplaceListingByPublicId = jasmine.createSpy('marketplaceListingByPublicId');
    backend = {
      GET: {
        marketplaceListingByPublicId
      }
    } as unknown as jasmine.SpyObj<SupabaseService>;

    TestBed.configureTestingModule({
      providers: [
        MarketplaceDetailDataService,
        {provide: SupabaseService, useValue: backend},
        {provide: MatSnackBar, useValue: {open: jasmine.createSpy('open')}}
      ]
    });
    service = TestBed.inject(MarketplaceDetailDataService);
  });

  it('loads a public listing by public id through the existing backend read', async () => {
    marketplaceListingByPublicId.and.returnValue(of(createMarketplaceListing()));

    service.loadListing$.next('maths-public');
    const vm = await firstValueFrom(service.vm$.pipe(take(1)));

    expect(marketplaceListingByPublicId).toHaveBeenCalledWith('maths-public');
    expect(vm.listing?.publicId).toBe('maths-public');
    expect(vm.notFound).toBeFalse();
  });

  it('keeps reserved public rows visible because the public browse query includes reserved listings', async () => {
    marketplaceListingByPublicId.and.returnValue(of(createMarketplaceListing({
      publicId: 'reserved-public',
      status: 'reserved'
    })));

    service.loadListing$.next('reserved-public');
    const vm = await firstValueFrom(service.vm$.pipe(take(1)));

    expect(vm.listing?.publicId).toBe('reserved-public');
    expect(vm.listing?.statusLabel).toBe('Reserved');
    expect(vm.notFound).toBeFalse();
  });

  it('does not build a detail view model for non-active rows returned by the backend', async () => {
    const pausedListing = createMarketplaceListing({
      description: 'private paused copy',
      publicId: 'paused-public',
      status: 'paused',
      titleOverride: 'Paused private listing'
    });
    marketplaceListingByPublicId.and.returnValue(of(pausedListing));

    service.loadListing$.next('paused-public');
    const pausedVm = await firstValueFrom(service.vm$.pipe(take(1)));

    expect(pausedVm).toEqual(jasmine.objectContaining({listing: null, notFound: true}));
    expect(JSON.stringify(pausedVm)).not.toContain('Paused private listing');
    expect(JSON.stringify(pausedVm)).not.toContain('private paused copy');
  });

  it('keeps active listings visible when their canonical module is private', async () => {
    const privateModuleListing = createMarketplaceListing({
      module: createMarketplaceModule({public: false}),
      publicId: 'private-module'
    });
    marketplaceListingByPublicId.and.returnValue(of(privateModuleListing));

    service.loadListing$.next('private-module');
    const vm = await firstValueFrom(service.vm$.pipe(take(1)));

    expect(vm.listing?.publicId).toBe('private-module');
    expect(vm.notFound).toBeFalse();
  });

  it('treats listings without a public seller as not found without building detail fields', async () => {
    const privateSellerListing = createMarketplaceListing({
      publicId: 'private-seller',
      seller: {
        avatarUrl: null,
        id: 'seller-1',
        public: false,
        username: 'seller',
        website: null
      }
    });
    marketplaceListingByPublicId.and.returnValue(of(privateSellerListing));

    service.loadListing$.next('private-seller');
    const privateSellerVm = await firstValueFrom(service.vm$.pipe(take(1)));

    expect(privateSellerVm).toEqual(jasmine.objectContaining({listing: null, notFound: true}));
  });

  it('surfaces not-found and error states', async () => {
    marketplaceListingByPublicId.and.returnValues(
      of(null),
      throwError(() => new Error('detail failed'))
    );

    service.loadListing$.next('missing');
    const notFound = await firstValueFrom(service.vm$.pipe(take(1)));
    service.loadListing$.next('broken');
    const failed = await firstValueFrom(service.vm$.pipe(take(1)));

    expect(notFound.notFound).toBeTrue();
    expect(failed.error).toBe('detail failed');
  });
});
