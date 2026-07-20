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
import { MarketplaceBrowserDataService } from './marketplace-browser-data.service';

describe('MarketplaceBrowserDataService', () => {
  let service: MarketplaceBrowserDataService;
  let backend: jasmine.SpyObj<SupabaseService>;
  let activeMarketplaceListings: jasmine.Spy;

  beforeEach(() => {
    activeMarketplaceListings = jasmine.createSpy('activeMarketplaceListings');
    backend = {
      GET: {
        activeMarketplaceListings
      }
    } as unknown as jasmine.SpyObj<SupabaseService>;

    TestBed.configureTestingModule({
      providers: [
        MarketplaceBrowserDataService,
        {provide: SupabaseService, useValue: backend},
        {provide: MatSnackBar, useValue: {open: jasmine.createSpy('open')}}
      ]
    });
    service = TestBed.inject(MarketplaceBrowserDataService);
  });

  it('loads the first public listing page through the existing backend read', async () => {
    activeMarketplaceListings.and.returnValue(of([createMarketplaceListing()]));

    service.load$.next();
    const vm = await firstValueFrom(service.vm$.pipe(take(1)));

    expect(activeMarketplaceListings).toHaveBeenCalledWith(0, 23);
    expect(vm.listings[0].publicId).toBe('maths-public');
    expect(vm.hasMore).toBeFalse();
  });

  it('loads subsequent pages when the existing API returns a full page', async () => {
    const page = Array.from({length: 24}, (_, index) => createMarketplaceListing({
      id: `listing-${ index }`,
      publicId: `listing-${ index }`
    }));
    activeMarketplaceListings.and.returnValues(of(page), of([
      createMarketplaceListing({id: 'listing-24', publicId: 'listing-24'})
    ]));

    service.load$.next();
    service.loadMore$.next();
    const vm = await firstValueFrom(service.vm$.pipe(take(1)));

    expect(activeMarketplaceListings).toHaveBeenCalledWith(24, 47);
    expect(vm.totalLoaded).toBe(25);
  });

  it('applies local filters without another backend call', async () => {
    activeMarketplaceListings.and.returnValue(of([
      createMarketplaceListing(),
      createMarketplaceListing({
        id: 'listing-2',
        module: createMarketplaceModule({
          hp: 12,
          id: 202,
          manufacturer: {id: 8, logo: null, name: 'Mutable Instruments'},
          name: 'Plaits',
          panels: [{
            color: 1,
            description: 'Silver panel',
            filename: 'plaits-silver.webp',
            id: 2,
            moduleid: 202
          }],
          public: true
        }),
        publicId: 'plaits-public'
      })
    ]));

    service.load$.next();
    service.setFilter$.next({key: 'manufacturer', value: 'Make Noise'});
    const vm = await firstValueFrom(service.vm$.pipe(take(1)));

    expect(vm.listings.map(listing => listing.publicId)).toEqual(['maths-public']);
    expect(activeMarketplaceListings).toHaveBeenCalledTimes(1);
  });

  it('requires a selected currency before applying price filters or price sort', async () => {
    activeMarketplaceListings.and.returnValue(of([
      createMarketplaceListing({
        askingPriceAmountMinor: 120000,
        askingPriceCurrency: 'EUR',
        id: 'listing-eur',
        publicId: 'eur-listing',
        updatedAt: '2026-07-17T10:00:00.000Z'
      }),
      createMarketplaceListing({
        askingPriceAmountMinor: 10000,
        askingPriceCurrency: 'USD',
        id: 'listing-usd',
        publicId: 'usd-listing',
        updatedAt: '2026-07-16T10:00:00.000Z'
      })
    ]));

    service.load$.next();
    service.setFilter$.next({key: 'minPrice', value: '1000'});
    service.setSort$.next('price-low');
    const mixedCurrencyVm = await firstValueFrom(service.vm$.pipe(take(1)));
    service.setFilter$.next({key: 'currency', value: 'EUR'});
    service.setFilter$.next({key: 'minPrice', value: '1000'});
    service.setSort$.next('price-low');
    const eurVm = await firstValueFrom(service.vm$.pipe(take(1)));

    expect(mixedCurrencyVm.priceControlsDisabled).toBeTrue();
    expect(mixedCurrencyVm.priceFilterHint).toContain('Select a currency');
    expect(mixedCurrencyVm.filters.minPrice).toBe('');
    expect(mixedCurrencyVm.sort).toBe('newest');
    expect(mixedCurrencyVm.listings.map(listing => listing.publicId)).toEqual(['eur-listing', 'usd-listing']);
    expect(eurVm.priceControlsDisabled).toBeFalse();
    expect(eurVm.activeChips.map(chip => chip.label)).toEqual(['Currency: EUR', 'Min EUR 1000']);
    expect(eurVm.listings.map(listing => listing.publicId)).toEqual(['eur-listing']);
  });

  it('surfaces load errors', async () => {
    activeMarketplaceListings.and.returnValue(throwError(() => new Error('network down')));

    service.load$.next();
    const vm = await firstValueFrom(service.vm$.pipe(take(1)));

    expect(vm.error).toBe('network down');
    expect(vm.loading).toBeFalse();
  });
});
