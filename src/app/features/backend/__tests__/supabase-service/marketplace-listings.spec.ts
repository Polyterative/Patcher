import { firstValueFrom, of } from 'rxjs';
import { SupabaseService } from '../../supabase.service';
import {
  cleanupSupabaseServiceTest,
  setupSupabaseServiceTest,
  TEST_TIMEOUT
} from './test-setup';
import { DbPaths } from '../../DatabaseStrings';
import { MARKETPLACE_LISTING_COLUMNS } from '../../supabase-marketplace-listings';

const CHAINABLE_METHODS = [
  'select', 'filter', 'eq', 'neq', 'is', 'in', 'range', 'order', 'limit',
  'single', 'maybeSingle', 'insert', 'update', 'delete', 'upsert'
] as const;
type ChainableMethodName = typeof CHAINABLE_METHODS[number];
type ChainableMock = Record<ChainableMethodName, jasmine.Spy<(...args: unknown[]) => ChainableMock>> & {
  then: Promise<unknown>['then'];
};
type SupabaseClientMock = {
  from: (table: string) => ChainableMock;
  rpc: (name: string, args: Record<string, unknown>) => ChainableMock;
};

const currentUserId = '11111111-1111-1111-1111-111111111111';
const listingId = '22222222-2222-2222-2222-222222222222';
const mediaId = '33333333-3333-3333-3333-333333333333';
const storagePath = `${ currentUserId }/${ listingId }/front_20260717150522492.webp`;

function chainable(resolveValue: unknown = {data: null, error: null}): ChainableMock {
  const mock = {} as ChainableMock;
  for (const method of CHAINABLE_METHODS) {
    mock[method] = jasmine.createSpy(method).and.returnValue(mock);
  }
  mock.then = (onfulfilled, onrejected) =>
    Promise.resolve(resolveValue).then(onfulfilled, onrejected);
  return mock;
}

const listingRow = {
  asking_price_amount_minor: 123450,
  asking_price_currency: 'EUR',
  condition: 'excellent',
  created_at: '2026-07-17T12:00:00Z',
  description: 'Recently serviced.',
  expires_at: null,
  external_link: null,
  id: listingId,
  media: [{
    created_at: '2026-07-17T12:01:00Z',
    id: mediaId,
    kind: 'image',
    listing_id: listingId,
    mime_type: 'image/webp',
    position: 0,
    storage_path: storagePath,
    url: `https://images.patcher.xyz/marketplace-listings/${ storagePath }`
  }],
  module: {
    hp: 20,
    id: 42,
    manufacturer: {id: 7, logo: null, name: 'Make Noise'},
    name: 'Maths',
    panels: [{
      color: 0,
      description: 'Black panel',
      filename: 'maths-black.webp',
      id: 9,
      moduleid: 42
    }],
    public: true,
    standard: {id: 0, name: '3U Doepfer'}
  },
  moduleid: 42,
  open_to_offers: true,
  public_id: 'listing-public-1',
  seller: {
    avatar_url: null,
    id: currentUserId,
    public: true,
    username: 'seller',
    website: null
  },
  seller_profileid: currentUserId,
  shipping_notes: 'Ships within the EU.',
  shipping_options: ['EU', 'Pickup'],
  ships_from_country: 'DE',
  status: 'active',
  title_override: 'Maths',
  updated_at: '2026-07-17T12:05:00Z'
};

describe('SupabaseService - marketplace listings backend', () => {
  let service: SupabaseService;
  let supabaseClient: SupabaseClientMock;

  beforeEach(() => {
    const setup = setupSupabaseServiceTest();
    service = setup.service;
    supabaseClient = (service as unknown as {supabase: SupabaseClientMock}).supabase;
    spyOn(service.auth, 'getUserSession$').and.returnValue(of({
      created_at: '2026-07-17T12:00:00Z',
      id: currentUserId
    }));
  });

  afterEach(cleanupSupabaseServiceTest);

  it('loads active public-safe listings with explicit non-PII columns', async () => {
    const mock = chainable({data: [listingRow], error: null});
    spyOn(supabaseClient, 'from').and.returnValue(mock);

    const listings = await firstValueFrom(service.GET.activeMarketplaceListings(0, 4));

    expect(supabaseClient.from).toHaveBeenCalledWith(DbPaths.marketplace_listings);
    expect(mock.select).toHaveBeenCalledWith(jasmine.stringContaining('seller:profiles'));
    expect(mock.select).toHaveBeenCalledWith(jasmine.stringContaining('panels:module_panels!module_panels_moduleid_fkey(id,moduleid,color,description,filename)'));
    expect(mock.select).toHaveBeenCalledWith(jasmine.stringContaining('standard:standards!modules_standard_fkey(id,name)'));
    expect(mock.select).not.toHaveBeenCalledWith(jasmine.stringContaining('email'));
    expect(mock.in).toHaveBeenCalledWith('status', ['active', 'reserved']);
    expect(mock.range).toHaveBeenCalledWith(0, 4);
    expect(listings[0]).toEqual(jasmine.objectContaining({
      id: listingId,
      moduleId: 42,
      module: jasmine.objectContaining({
        hp: 20,
        panels: [jasmine.objectContaining({filename: 'maths-black.webp'})],
        standard: jasmine.objectContaining({name: '3U Doepfer'})
      }),
      sellerProfileId: currentUserId
    }));
  }, TEST_TIMEOUT);

  it('loads active public-safe listings for a single public seller profile', async () => {
    const mock = chainable({data: [listingRow], error: null});
    spyOn(supabaseClient, 'from').and.returnValue(mock);

    await firstValueFrom(service.GET.activeMarketplaceListingsBySellerProfileId(currentUserId));

    expect(supabaseClient.from).toHaveBeenCalledWith(DbPaths.marketplace_listings);
    expect(mock.select).toHaveBeenCalledWith(jasmine.stringContaining('seller:profiles'));
    expect(mock.select).not.toHaveBeenCalledWith(jasmine.stringContaining('email'));
    expect(mock.select).not.toHaveBeenCalledWith(jasmine.stringContaining('address'));
    expect(mock.eq).toHaveBeenCalledWith('seller_profileid', currentUserId);
    expect(mock.in).toHaveBeenCalledWith('status', ['active', 'reserved']);
    expect(mock.range).not.toHaveBeenCalled();
  }, TEST_TIMEOUT);

  it('loads current user listings through an owner filter', async () => {
    const mock = chainable({data: [listingRow], error: null});
    spyOn(supabaseClient, 'from').and.returnValue(mock);

    await firstValueFrom(service.get.currentUserMarketplaceListings());

    expect(mock.eq).toHaveBeenCalledWith('seller_profileid', currentUserId);
  }, TEST_TIMEOUT);

  it('creates listings for the authenticated seller and busts listing caches', async () => {
    const mock = chainable({data: listingRow, error: null});
    spyOn(supabaseClient, 'from').and.returnValue(mock);
    const bustedKeys: string[] = [];
    const sub = service.cacheResetter$.subscribe(keys => bustedKeys.push(...(keys as string[])));

    await firstValueFrom(service.add.marketplaceListing({
      askingPrice: '1234.50',
      askingPriceCurrency: 'eur',
      condition: 'excellent',
      moduleId: '42',
      sellerProfileId: 'attacker',
      shippingOptions: ['EU', 'Pickup'],
      shipsFromCountry: 'de',
      status: 'active'
    }));

    expect(mock.insert).toHaveBeenCalledWith(jasmine.objectContaining({
      asking_price_amount_minor: 123450,
      seller_profileid: currentUserId
    }));
    expect(mock.select).toHaveBeenCalledWith(MARKETPLACE_LISTING_COLUMNS);
    expect(bustedKeys).toEqual(jasmine.arrayContaining([
      'marketplaceListings',
      'marketplaceListingWithId',
      'currentUserMarketplaceListings'
    ]));
    sub.unsubscribe();
  }, TEST_TIMEOUT);

  it('updates only owned listings without changing seller ownership', async () => {
    const mock = chainable({data: listingRow, error: null});
    spyOn(supabaseClient, 'from').and.returnValue(mock);

    await firstValueFrom(service.update.marketplaceListing(listingId, {
      askingPrice: '1200',
      askingPriceCurrency: 'EUR',
      condition: 'good',
      moduleId: '42',
      shipsFromCountry: 'DE',
      status: 'paused'
    }));

    expect((mock.update.calls.first().args[0] as Record<string, unknown>)['seller_profileid']).toBeUndefined();
    expect(mock.eq).toHaveBeenCalledWith('id', listingId);
    expect(mock.eq).toHaveBeenCalledWith('seller_profileid', currentUserId);
  }, TEST_TIMEOUT);

  it('creates image media after checking the eight image cap', async () => {
    const countMock = chainable({data: null, count: 7, error: null});
    const insertMock = chainable({data: listingRow.media[0], error: null});
    spyOn(supabaseClient, 'from').and.returnValues(countMock, insertMock);

    const media = await firstValueFrom(service.add.marketplaceListingMedia(listingId, {
      filename: 'Front.WebP',
      mimeType: 'image/webp',
      position: 0,
      storagePath
    }));

    expect(countMock.select).toHaveBeenCalledWith('id', {count: 'exact', head: true});
    expect(insertMock.insert).toHaveBeenCalledWith(jasmine.objectContaining({
      listing_id: listingId,
      storage_path: storagePath
    }));
    expect(media.storagePath).toBe(storagePath);
  }, TEST_TIMEOUT);

  it('reorders listing media through the atomic RPC', async () => {
    const rpcMock = chainable({data: listingRow.media, error: null});
    spyOn(supabaseClient, 'rpc').and.returnValue(rpcMock);

    await firstValueFrom(service.update.marketplaceListingMediaOrder(listingId, [mediaId]));

    expect(supabaseClient.rpc).toHaveBeenCalledWith('reorder_listing_media', {
      p_listing_id: listingId,
      p_media_ids: [mediaId]
    });
  }, TEST_TIMEOUT);

  it('rejects duplicate media ids before the reorder RPC', (done) => {
    spyOn(supabaseClient, 'rpc');

    service.update.marketplaceListingMediaOrder(listingId, [mediaId, mediaId]).subscribe({
      next: () => fail('Expected duplicate media error'),
      error: error => {
        expect(error.message).toContain('duplicate ids');
        expect(supabaseClient.rpc).not.toHaveBeenCalled();
        done();
      }
    });
  }, TEST_TIMEOUT);

  it('deletes owned listings and media only after removing storage objects', async () => {
    const listingSelect = chainable({
      data: {id: listingId, media: [{storage_path: storagePath}]},
      error: null
    });
    const listingDelete = chainable({data: [{id: listingId}], error: null});
    const mediaSelect = chainable({data: {id: mediaId, storage_path: storagePath}, error: null});
    const mediaDelete = chainable({data: [{id: mediaId}], error: null});
    const deleteImageSpy = spyOn(service.storage, 'deleteMarketplaceListingImage').and.returnValue(of(null));
    spyOn(supabaseClient, 'from').and.returnValues(listingSelect, listingDelete, mediaSelect, mediaDelete);

    await firstValueFrom(service.delete.marketplaceListing(listingId));
    await firstValueFrom(service.delete.marketplaceListingMedia(mediaId));

    expect(deleteImageSpy).toHaveBeenCalledTimes(2);
    expect(listingDelete.eq).toHaveBeenCalledWith('seller_profileid', currentUserId);
    expect(mediaDelete.eq).toHaveBeenCalledWith('id', mediaId);
  }, TEST_TIMEOUT);
});
