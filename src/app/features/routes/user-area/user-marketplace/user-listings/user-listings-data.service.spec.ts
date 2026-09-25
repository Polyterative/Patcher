import { MatSnackBar } from '@angular/material/snack-bar';
import {
  of,
  ReplaySubject,
  throwError
} from 'rxjs';
import { UserManagementService } from 'src/app/features/backbone/login/user-management.service';
import { SupabaseService } from 'src/app/features/backend/supabase.service';
import { RichUserModel } from 'src/app/features/backend/supabase.types';
import {
  MarketplaceListing,
  MarketplaceListingDraft,
  MarketplaceListingMedia
} from 'src/app/features/marketplace/marketplace-listing.utils';
import { MinimalModule } from 'src/app/models/module';
import { UserListingsDataService } from './user-listings-data.service';

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
    description: 'Module',
    hp: 8,
    id: 101,
    manufacturer: {id: 7, name: 'Make Noise', logo: null},
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

function createMedia(overrides: Partial<MarketplaceListingMedia> = {}): MarketplaceListingMedia {
  return {
    createdAt: '2026-07-17T08:00:00.000Z',
    id: 'media-1',
    kind: 'image',
    listingId: 'listing-1',
    mimeType: 'image/jpeg',
    position: 0,
    storagePath: 'seller-1/listing-1/image.jpg',
    url: 'https://images.patcher.xyz/seller-1/listing-1/image.jpg',
    ...overrides
  };
}

function createListing(overrides: Partial<MarketplaceListing> = {}): MarketplaceListing {
  return {
    askingPriceAmountMinor: 12000,
    askingPriceCurrency: 'EUR',
    condition: 'good',
    createdAt: '2026-07-17T08:00:00.000Z',
    description: 'Patched twice.',
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
    seller: {
      avatarUrl: null,
      id: 'seller-1',
      public: true,
      username: 'seller'
    },
    sellerProfileId: 'seller-1',
    shippingNotes: 'No batteries.',
    shippingOptions: ['Domestic shipping'],
    shipsFromCountry: 'DE',
    status: 'draft',
    titleOverride: 'Maths for sale',
    updatedAt: '2026-07-17T08:00:00.000Z',
    ...overrides
  };
}

function createDraft(): MarketplaceListingDraft {
  return {
    askingPrice: '120',
    askingPriceCurrency: 'EUR',
    condition: 'good',
    moduleId: '101',
    openToOffers: true,
    sellerProfileId: 'seller-1',
    shippingOptions: ['Domestic shipping'],
    shipsFromCountry: 'DE',
    status: 'draft'
  };
}

function snackBarMock(): MatSnackBar {
  return {
    open: jasmine.createSpy('open')
  } as unknown as MatSnackBar;
}

function userServiceMock(): UserManagementService {
  const profile$ = new ReplaySubject<RichUserModel | undefined>(1);
  profile$.next(createProfile());
  return {
    loggedUserFullProfile$: profile$.asObservable()
  } as unknown as UserManagementService;
}

function backendMock(options: {
  addResult?: MarketplaceListing;
  listings?: MarketplaceListing[];
  mediaRecordFails?: boolean;
  mediaUploadFails?: boolean;
  modules?: MinimalModule[];
  updateResult?: MarketplaceListing;
} = {}): SupabaseService {
  const saved = options.addResult ?? createListing({id: 'created-listing'});
  const listings = options.listings ?? [createListing()];

  return {
    GET: {
      currentUserModules: jasmine.createSpy('currentUserModules').and.returnValue(of(options.modules ?? [
        createModule({id: 101, possessionKind: 'SELLS'}),
        createModule({id: 202, name: 'Wanted module', possessionKind: 'WANTS'})
      ]))
    },
    add: {
      marketplaceListing: jasmine.createSpy('marketplaceListing').and.returnValue(of(saved)),
      marketplaceListingMedia: jasmine.createSpy('marketplaceListingMedia').and.returnValue(options.mediaRecordFails
        ? throwError(() => new Error('media record failed'))
        : of(createMedia())
      )
    },
    delete: {
      marketplaceListingMedia: jasmine.createSpy('marketplaceListingMedia').and.returnValue(of(undefined))
    },
    get: {
      currentUserMarketplaceListings: jasmine.createSpy('currentUserMarketplaceListings').and.returnValue(of(listings))
    },
    storage: {
      deleteMarketplaceListingImage: jasmine.createSpy('deleteMarketplaceListingImage').and.returnValue(of(null)),
      uploadMarketplaceListingImage: jasmine.createSpy('uploadMarketplaceListingImage').and.returnValue(options.mediaUploadFails
        ? throwError(() => new Error('upload failed'))
        : of('seller-1/created-listing/front.jpg')
      )
    },
    update: {
      marketplaceListing: jasmine.createSpy('marketplaceListing').and.returnValue(of(options.updateResult ?? createListing())),
      marketplaceListingMediaOrder: jasmine.createSpy('marketplaceListingMediaOrder').and.returnValue(of([createMedia()]))
    }
  } as unknown as SupabaseService;
}

describe('UserListingsDataService', () => {
  it('loads only SELLS modules with seller-owned marketplace listings', () => {
    const backend = backendMock();
    const service = new UserListingsDataService(backend, userServiceMock(), snackBarMock());

    service.load$.next();

    expect(backend.GET.currentUserModules).toHaveBeenCalledOnceWith(false);
    expect(backend.get.currentUserMarketplaceListings).toHaveBeenCalled();
    expect(service.snapshot.eligibleModules.map(module => module.id)).toEqual([101]);
    expect(service.snapshot.listings.length).toBe(1);
    expect(service.snapshot.sellerProfileId).toBe('seller-1');
    service.ngOnDestroy();
  });

  it('handles empty listings and modules when the profile is unavailable', () => {
    const backend = backendMock({listings: [], modules: []});
    const userService = {
      loggedUserFullProfile$: of(undefined)
    } as unknown as UserManagementService;
    const service = new UserListingsDataService(backend, userService, snackBarMock());

    service.load$.next();

    expect(service.snapshot.listings).toEqual([]);
    expect(service.snapshot.eligibleModules).toEqual([]);
    expect(service.snapshot.sellerProfileId).toBeNull();
    expect(service.snapshot.loading).toBeFalse();
    service.ngOnDestroy();
  });

  it('preserves loaded listings and reports a subsequent load error', () => {
    const listing = createListing();
    const backend = backendMock({listings: [listing]});
    const service = new UserListingsDataService(backend, userServiceMock(), snackBarMock());
    service.load$.next();

    (backend.get.currentUserMarketplaceListings as jasmine.Spy).and.returnValue(
      throwError(() => new Error('listing read failed'))
    );
    service.load$.next();

    expect(service.snapshot.listings).toEqual([listing]);
    expect(service.snapshot.listError).toBe('listing read failed');
    expect(service.snapshot.loading).toBeFalse();
    service.ngOnDestroy();
  });

  it('clears busy state and exposes an error when creating a listing fails', () => {
    const backend = backendMock();
    (backend.add.marketplaceListing as jasmine.Spy).and.returnValue(
      throwError(() => new Error('create failed'))
    );
    const service = new UserListingsDataService(backend, userServiceMock(), snackBarMock());

    service.save$.next({draft: createDraft()});

    expect(service.snapshot.busy).toBeFalse();
    expect(service.snapshot.busyLabel).toBeNull();
    expect(service.snapshot.mutationError).toBe('create failed');
    expect(service.snapshot.listings).toEqual([]);
    service.ngOnDestroy();
  });

  it('updates an existing listing and reports the refreshed listing as saved', () => {
    const media = createMedia();
    const existing = createListing({media: [media]});
    const updated = createListing({description: 'Updated description', media: [media]});
    const backend = backendMock({listings: [existing], updateResult: updated});
    const service = new UserListingsDataService(backend, userServiceMock(), snackBarMock());
    const saveSucceeded = jasmine.createSpy('saveSucceeded');
    service.saveSucceeded$.subscribe(saveSucceeded);
    service.load$.next();
    (backend.get.currentUserMarketplaceListings as jasmine.Spy).and.returnValue(of([updated]));

    service.save$.next({id: existing.id, draft: createDraft()});

    expect(backend.update.marketplaceListing).toHaveBeenCalledOnceWith(existing.id, createDraft());
    expect(service.snapshot.listings).toEqual([updated]);
    expect(saveSucceeded).toHaveBeenCalledWith({
      failedFiles: [],
      listing: updated,
      partialError: null
    });
    expect(service.snapshot.mutationError).toBeNull();
    service.ngOnDestroy();
  });

  it('preserves the saved draft and reports partial success when image upload fails', () => {
    spyOn(console, 'error');
    const saved = createListing({id: 'created-listing', status: 'draft'});
    const backend = backendMock({
      addResult: saved,
      listings: [saved],
      mediaUploadFails: true
    });
    const service = new UserListingsDataService(backend, userServiceMock(), snackBarMock());
    const saveSucceeded = jasmine.createSpy('saveSucceeded');
    service.saveSucceeded$.subscribe(saveSucceeded);

    service.save$.next({
      draft: {
        askingPrice: '120',
        askingPriceCurrency: 'EUR',
        condition: 'good',
        moduleId: '101',
        openToOffers: true,
        sellerProfileId: 'seller-1',
        shippingOptions: ['Domestic shipping'],
        shipsFromCountry: 'DE',
        status: 'draft'
      },
      files: [new File(['front'], 'front.jpg', {type: 'image/jpeg'})]
    });

    expect(backend.add.marketplaceListing).toHaveBeenCalled();
    expect(backend.storage.uploadMarketplaceListingImage).toHaveBeenCalled();
    expect(service.snapshot.listings).toEqual([saved]);
    expect(service.snapshot.statusMessage).toContain('Listing saved, but 1 image could not be uploaded.');
    expect(saveSucceeded).toHaveBeenCalledWith({
      failedFiles: [jasmine.any(File)],
      listing: saved,
      partialError: service.snapshot.statusMessage
    });
    service.ngOnDestroy();
  });

  it('removes an uploaded image when its media record cannot be created', () => {
    spyOn(console, 'error');
    const saved = createListing({id: 'created-listing', status: 'draft'});
    const backend = backendMock({
      addResult: saved,
      listings: [saved],
      mediaRecordFails: true
    });
    const service = new UserListingsDataService(backend, userServiceMock(), snackBarMock());

    service.save$.next({
      draft: {
        askingPrice: '120',
        askingPriceCurrency: 'EUR',
        condition: 'good',
        moduleId: '101',
        openToOffers: true,
        sellerProfileId: 'seller-1',
        shippingOptions: ['Domestic shipping'],
        shipsFromCountry: 'DE',
        status: 'draft'
      },
      files: [new File(['front'], 'front.jpg', {type: 'image/jpeg'})]
    });

    expect(backend.storage.deleteMarketplaceListingImage)
      .toHaveBeenCalledOnceWith('seller-1/created-listing/front.jpg');
    expect(service.snapshot.statusMessage).toContain('Listing saved, but 1 image could not be uploaded.');
    service.ngOnDestroy();
  });

  it('returns only failed files for a safe partial-upload retry', () => {
    spyOn(console, 'error');
    const saved = createListing({id: 'created-listing', status: 'draft'});
    const backend = backendMock({
      addResult: saved,
      listings: [saved]
    });
    const uploadSpy = backend.storage.uploadMarketplaceListingImage as jasmine.Spy;
    uploadSpy.and.callFake((_listingId: string, file: File) => file.name === 'back.jpg'
      ? throwError(() => new Error('upload failed'))
      : of(`seller-1/created-listing/${file.name}`)
    );
    const service = new UserListingsDataService(backend, userServiceMock(), snackBarMock());
    const saveSucceeded = jasmine.createSpy('saveSucceeded');
    service.saveSucceeded$.subscribe(saveSucceeded);
    const front = new File(['front'], 'front.jpg', {type: 'image/jpeg'});
    const back = new File(['back'], 'back.jpg', {type: 'image/jpeg'});

    service.save$.next({
      draft: {
        askingPrice: '120',
        askingPriceCurrency: 'EUR',
        condition: 'good',
        moduleId: '101',
        openToOffers: true,
        sellerProfileId: 'seller-1',
        shippingOptions: ['Domestic shipping'],
        shipsFromCountry: 'DE',
        status: 'draft'
      },
      files: [front, back]
    });

    expect(saveSucceeded).toHaveBeenCalledWith({
      failedFiles: [back],
      listing: jasmine.objectContaining({id: saved.id}),
      partialError: 'Listing saved, but 1 image could not be uploaded.'
    });
    service.ngOnDestroy();
  });

  it('closes a listing without changing collection state', () => {
    const openListing = createListing({status: 'active'});
    const closedListing = createListing({status: 'closed_sold'});
    const backend = backendMock({
      listings: [closedListing],
      updateResult: closedListing
    });
    const service = new UserListingsDataService(backend, userServiceMock(), snackBarMock());

    service.lifecycle$.next({listing: openListing, status: 'closed_sold'});

    expect(backend.update.marketplaceListing).toHaveBeenCalledWith('listing-1', jasmine.objectContaining({
      status: 'closed_sold',
      moduleId: '101'
    }));
    expect(service.snapshot.statusMessage).toBe('Listing closed as sold. Collection unchanged — remove For Sale from your collection if you no longer have it.');
    service.ngOnDestroy();
  });

  it('clears busy state and reports an error when a lifecycle update fails', () => {
    const listing = createListing({status: 'draft'});
    const backend = backendMock();
    (backend.update.marketplaceListing as jasmine.Spy).and.returnValue(
      throwError(() => new Error('status update failed'))
    );
    const service = new UserListingsDataService(backend, userServiceMock(), snackBarMock());

    service.lifecycle$.next({listing, status: 'active'});

    expect(service.snapshot.busy).toBeFalse();
    expect(service.snapshot.busyLabel).toBeNull();
    expect(service.snapshot.mutationError).toBe('status update failed');
    expect(service.snapshot.statusMessage).toBeNull();
    service.ngOnDestroy();
  });

  it('deletes listing media and adopts the refreshed listing', () => {
    const media = createMedia();
    const listing = createListing({media: [media]});
    const refreshed = createListing({description: 'Refreshed listing', media: []});
    const backend = backendMock();
    (backend.get.currentUserMarketplaceListings as jasmine.Spy).and.returnValue(of([refreshed]));
    const service = new UserListingsDataService(backend, userServiceMock(), snackBarMock());

    service.mediaDelete$.next({listing, media});

    expect(backend.delete.marketplaceListingMedia).toHaveBeenCalledOnceWith(media.id);
    expect(service.snapshot.listings).toEqual([refreshed]);
    expect(service.snapshot.busy).toBeFalse();
    expect(service.snapshot.mutationError).toBeNull();
    service.ngOnDestroy();
  });

  it('retains current listings and reports an error when media deletion fails', () => {
    const listing = createListing();
    const media = createMedia();
    const backend = backendMock({listings: [listing]});
    (backend.delete.marketplaceListingMedia as jasmine.Spy).and.returnValue(
      throwError(() => new Error('image delete failed'))
    );
    const service = new UserListingsDataService(backend, userServiceMock(), snackBarMock());
    service.load$.next();

    service.mediaDelete$.next({listing: createListing({media: [media]}), media});

    expect(service.snapshot.listings).toEqual([listing]);
    expect(service.snapshot.busy).toBeFalse();
    expect(service.snapshot.mutationError).toBe('image delete failed');
    service.ngOnDestroy();
  });

  it('does not call the reorder API when a media move is beyond the list boundary', () => {
    const first = createMedia({id: 'media-first', position: 0});
    const second = createMedia({id: 'media-second', position: 1});
    const listing = createListing({media: [first, second]});
    const backend = backendMock();
    const service = new UserListingsDataService(backend, userServiceMock(), snackBarMock());

    service.mediaMove$.next({listing, media: first, direction: -1});

    expect(backend.update.marketplaceListingMediaOrder).not.toHaveBeenCalled();
    expect(service.snapshot.busy).toBeFalse();
    service.ngOnDestroy();
  });

  it('persists a valid media reorder using position order', () => {
    const first = createMedia({id: 'media-first', position: 0});
    const second = createMedia({id: 'media-second', position: 1});
    const listing = createListing({media: [first, second]});
    const reordered = createListing({media: [
      {...second, position: 0},
      {...first, position: 1}
    ]});
    const backend = backendMock();
    (backend.get.currentUserMarketplaceListings as jasmine.Spy).and.returnValue(of([reordered]));
    const service = new UserListingsDataService(backend, userServiceMock(), snackBarMock());

    service.mediaMove$.next({listing, media: first, direction: 1});

    expect(backend.update.marketplaceListingMediaOrder).toHaveBeenCalledOnceWith(
      listing.id,
      ['media-second', 'media-first']
    );
    expect(service.snapshot.listings).toEqual([reordered]);
    expect(service.snapshot.busy).toBeFalse();
    service.ngOnDestroy();
  });
});
