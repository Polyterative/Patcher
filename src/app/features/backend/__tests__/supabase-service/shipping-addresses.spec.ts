import { firstValueFrom, of } from 'rxjs';
import { SupabaseService } from '../../supabase.service';
import {
  cleanupSupabaseServiceTest,
  setupSupabaseServiceTest,
  TEST_TIMEOUT
} from './test-setup';

const CHAINABLE_METHODS = [
  'select',
  'filter',
  'eq',
  'neq',
  'is',
  'in',
  'range',
  'order',
  'limit',
  'single',
  'maybeSingle',
  'insert',
  'update',
  'delete',
  'upsert'
] as const;

type ChainableMethodName = typeof CHAINABLE_METHODS[number];
type ChainableMock = Record<ChainableMethodName, (...args: unknown[]) => ChainableMock> & {
  then: Promise<unknown>['then'];
};
type SupabaseClientMock = {
  from: (table: string) => ChainableMock;
};

function chainable(resolveValue: unknown = {data: null, error: null}): ChainableMock {
  const mock = {} as ChainableMock;
  for (const method of CHAINABLE_METHODS) {
    mock[method] = () => mock;
  }
  mock.then = (onfulfilled, onrejected) =>
    Promise.resolve(resolveValue).then(onfulfilled, onrejected);
  return mock;
}

const row = {
  city: 'Milan',
  country_code: 'IT',
  created_at: '2026-07-17T09:00:00Z',
  id: 'address-1',
  is_default: true,
  label: 'Home',
  line1: 'Via Roma 1',
  line2: null,
  postal_code: null,
  profileid: 'user-1',
  recipient_name: 'Ada Lovelace',
  region: 'Lombardy',
  updated_at: '2026-07-17T09:05:00Z'
};

describe('SupabaseService - shipping addresses', () => {
  let service: SupabaseService;
  let supabaseClient: SupabaseClientMock;

  beforeEach(() => {
    const setup = setupSupabaseServiceTest();
    service = setup.service;
    supabaseClient = (service as unknown as { supabase: SupabaseClientMock }).supabase;
    spyOn(service.auth, 'getUserSession$').and.returnValue(of({
      created_at: '2026-07-17T09:00:00Z',
      id: 'user-1'
    }));
  });

  afterEach(() => {
    cleanupSupabaseServiceTest();
  });

  it('loads current user addresses with explicit private columns and owner filter', async () => {
    const mock = chainable({data: [row], error: null});
    const selectSpy = spyOn(mock, 'select').and.returnValue(mock);
    const eqSpy = spyOn(mock, 'eq').and.returnValue(mock);
    const orderSpy = spyOn(mock, 'order').and.returnValue(mock);
    spyOn(supabaseClient, 'from').and.returnValue(mock);

    const addresses = await firstValueFrom(service.get.currentUserShippingAddresses());

    expect(selectSpy).toHaveBeenCalledWith('id,profileid,label,recipient_name,line1,line2,city,region,postal_code,country_code,is_default,created_at,updated_at');
    expect(eqSpy).toHaveBeenCalledWith('profileid', 'user-1');
    expect(orderSpy).toHaveBeenCalledWith('is_default', {ascending: false});
    expect(addresses).toEqual([jasmine.objectContaining({
      countryCode: 'IT',
      id: 'address-1',
      isDefault: true,
      postalCode: null,
      recipientName: 'Ada Lovelace'
    })]);
  }, TEST_TIMEOUT);

  it('surfaces Supabase read errors instead of returning an empty address list', (done) => {
    spyOn(supabaseClient, 'from').and.returnValue(chainable({data: null, error: {message: 'RLS denied'}}));

    service.get.currentUserShippingAddresses().subscribe({
      next: () => {
        fail('Expected read error to surface');
        done();
      },
      error: error => {
        expect(error.message).toBe('RLS denied');
        done();
      }
    });
  }, TEST_TIMEOUT);

  it('creates an address for the current user without phone data and busts the address cache', async () => {
    const mock = chainable({data: row, error: null});
    const insertSpy = spyOn(mock, 'insert').and.returnValue(mock);
    const selectSpy = spyOn(mock, 'select').and.returnValue(mock);
    spyOn(supabaseClient, 'from').and.returnValue(mock);
    const bustedKeys: string[] = [];
    const sub = service.cacheResetter$.subscribe(keys => bustedKeys.push(...(keys as string[])));

    const saved = await firstValueFrom(service.add.shippingAddress({
      city: ' Milan ',
      countryCode: ' it ',
      isDefault: true,
      label: ' Home ',
      line1: ' Via Roma 1 ',
      phone: '+39 02 1234',
      postalCode: ' ',
      recipientName: ' Ada Lovelace ',
      region: ' Lombardy '
    }));

    expect(insertSpy).toHaveBeenCalledWith({
      city: 'Milan',
      country_code: 'IT',
      is_default: true,
      label: 'Home',
      line1: 'Via Roma 1',
      line2: null,
      postal_code: null,
      profileid: 'user-1',
      recipient_name: 'Ada Lovelace',
      region: 'Lombardy'
    });
    expect((insertSpy.calls.first().args[0] as Record<string, unknown>)['phone']).toBeUndefined();
    expect(selectSpy).toHaveBeenCalledWith('id,profileid,label,recipient_name,line1,line2,city,region,postal_code,country_code,is_default,created_at,updated_at');
    expect(saved.profileid).toBe('user-1');
    expect(bustedKeys).toContain('shippingAddresses');
    sub.unsubscribe();
  }, TEST_TIMEOUT);

  it('updates an owned address by id without changing ownership', async () => {
    const mock = chainable({data: {...row, label: 'Studio', is_default: false}, error: null});
    const updateSpy = spyOn(mock, 'update').and.returnValue(mock);
    const eqSpy = spyOn(mock, 'eq').and.returnValue(mock);
    spyOn(supabaseClient, 'from').and.returnValue(mock);

    const saved = await firstValueFrom(service.update.shippingAddress('address-1', {
      city: 'London',
      countryCode: 'GB',
      isDefault: false,
      label: 'Studio',
      line1: '1 Compiler Way',
      recipientName: 'Grace Hopper'
    }));

    expect(updateSpy).toHaveBeenCalledWith(jasmine.objectContaining({
      country_code: 'GB',
      is_default: false,
      label: 'Studio'
    }));
    expect((updateSpy.calls.first().args[0] as Record<string, unknown>)['profileid']).toBeUndefined();
    expect(eqSpy).toHaveBeenCalledWith('id', 'address-1');
    expect(eqSpy).toHaveBeenCalledWith('profileid', 'user-1');
    expect(saved.label).toBe('Studio');
  }, TEST_TIMEOUT);

  it('deletes an owned address by id and busts the address cache', async () => {
    const mock = chainable({data: [{id: 'address-1'}], error: null});
    const filterSpy = spyOn(mock, 'filter').and.returnValue(mock);
    const selectSpy = spyOn(mock, 'select').and.returnValue(mock);
    spyOn(supabaseClient, 'from').and.returnValue(mock);
    const bustedKeys: string[] = [];
    const sub = service.cacheResetter$.subscribe(keys => bustedKeys.push(...(keys as string[])));

    await firstValueFrom(service.delete.shippingAddress('address-1'));

    expect(filterSpy).toHaveBeenCalledWith('id', 'eq', 'address-1');
    expect(filterSpy).toHaveBeenCalledWith('profileid', 'eq', 'user-1');
    expect(selectSpy).toHaveBeenCalledWith('id');
    expect(bustedKeys).toContain('shippingAddresses');
    sub.unsubscribe();
  }, TEST_TIMEOUT);

  it('does not bust the address cache when delete returns a Supabase error', (done) => {
    const mock = chainable({data: null, error: {message: 'RLS denied'}});
    spyOn(supabaseClient, 'from').and.returnValue(mock);
    const bustedKeys: string[] = [];
    const sub = service.cacheResetter$.subscribe(keys => bustedKeys.push(...(keys as string[])));

    service.delete.shippingAddress('address-1').subscribe({
      next: () => {
        fail('Expected delete error to surface');
        sub.unsubscribe();
        done();
      },
      error: error => {
        expect(error.message).toBe('RLS denied');
        expect(bustedKeys).not.toContain('shippingAddresses');
        sub.unsubscribe();
        done();
      }
    });
  }, TEST_TIMEOUT);

  it('surfaces invalid address drafts as errors before writes', (done) => {
    spyOn(supabaseClient, 'from');

    service.add.shippingAddress({
      countryCode: 'Italy',
      label: 'Home'
    }).subscribe({
      next: () => {
        fail('Expected invalid address to error');
        done();
      },
      error: error => {
        expect(error.message).toContain('Shipping address is incomplete');
        expect(supabaseClient.from).not.toHaveBeenCalled();
        done();
      }
    });
  }, TEST_TIMEOUT);
});
