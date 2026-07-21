import {
  cleanupSupabaseServiceTest,
  setupSupabaseServiceTest
} from './test-setup';
import {
  authUserFixture,
  chainable,
  getSupabaseClientDouble,
  mockUserSession
} from './supabase-query-test-doubles';
import type {
  QueryListRowsResult,
  SupabaseClientDouble,
  SupabaseQueryChain
} from './supabase-query-test-doubles';
import { SupabaseService } from '../../supabase.service';
import {
  cacheBust,
  cacheBuster$,
  LEGACY_TS_CACHEABLE_STORAGE_KEY,
  removeLegacyTsCacheableStorage,
  type CachedEntity
} from '../../supabase.cache';
import {
  firstValueFrom,
  of
} from 'rxjs';
import {
  GlobalCacheConfig,
  InMemoryStorageStrategy
} from 'ts-cacheable';
import type { SupabaseFunctionReturns } from '../../supabase-db.types';
import type { RackMinimal } from 'src/app/models/rack';
import type { Patch } from 'src/app/models/patch';


type RackPublicIdRow = Pick<SupabaseFunctionReturns<'get_rack_by_public_id'>[number], 'id' | 'name' | 'public_id'>;
type PatchPublicIdRow = Pick<SupabaseFunctionReturns<'get_patch_by_public_id'>[number], 'id' | 'name' | 'public_id'>;
type PublicIdRow = RackPublicIdRow | PatchPublicIdRow;

interface CachingSupabaseClientDouble extends SupabaseClientDouble {
  rpc(functionName: string, args: {p_public_id: string}): SupabaseQueryChain<PublicIdRow>;
}

function getCachingSupabaseClientDouble(service: SupabaseService): CachingSupabaseClientDouble {
  const client = getSupabaseClientDouble(service);
  if (!hasRpc(client)) {
    throw new Error('Supabase caching test setup did not expose rpc().');
  }

  return client;
}

function hasRpc(client: SupabaseClientDouble): client is CachingSupabaseClientDouble {
  return 'rpc' in client && typeof client.rpc === 'function';
}

/**
 * Caching Behavior Tests
 *
 * Tests for cache resetter functionality and in-memory cache behavior.
 */
describe('SupabaseService - Caching Behavior', () => {
  let service: SupabaseService;
  let supabaseClient: CachingSupabaseClientDouble;
  
  beforeEach(() => {
    const setup = setupSupabaseServiceTest();
    service = setup.service;
    supabaseClient = getCachingSupabaseClientDouble(service);
  });
  
  afterEach(() => {
    cleanupSupabaseServiceTest();
  });
  
  it('should expose cache resetter stream', () => {
    expect(service.cacheResetter$).toBeDefined();
    
    let emissionReceived = false;
    const subscription = service.cacheResetter$.subscribe((_data) => {
      emissionReceived = true;
    });
    
    // Trigger a cache bust operation if available
    service.cacheResetter$.next(['manufacturers']);
    
    subscription.unsubscribe();
    expect(emissionReceived).toBeTrue();
  });
  
  it('uses page-lifetime in-memory cache storage', () => {
    expect(GlobalCacheConfig.storageStrategy).toBe(InMemoryStorageStrategy);
  });

  it('removes only the legacy ts-cacheable localStorage blob', () => {
    localStorage.setItem(LEGACY_TS_CACHEABLE_STORAGE_KEY, '{"old":true}');
    localStorage.setItem('sb-auth-token', 'preserved');
    localStorage.setItem('patcher-discovery-tip', 'preserved');

    removeLegacyTsCacheableStorage(localStorage);

    expect(localStorage.getItem(LEGACY_TS_CACHEABLE_STORAGE_KEY)).toBeNull();
    expect(localStorage.getItem('sb-auth-token')).toBe('preserved');
    expect(localStorage.getItem('patcher-discovery-tip')).toBe('preserved');
  });

  it('does not swallow unexpected legacy cache cleanup failures', () => {
    const unexpected = new Error('unexpected removeItem failure');
    const storage: Pick<Storage, 'removeItem'> = {
      removeItem: () => {
        throw unexpected;
      }
    };

    expect(() => removeLegacyTsCacheableStorage(storage)).toThrow(unexpected);
  });

  it('ignores SecurityError during legacy cache cleanup', () => {
    const storage: Pick<Storage, 'removeItem'> = {
      removeItem: () => {
        throw new DOMException('localStorage unavailable', 'SecurityError');
      }
    };

    expect(() => removeLegacyTsCacheableStorage(storage)).not.toThrow();
  });

  it('cacheResetter$ emits the provided key array to subscribers', () => {
    const emissions: CachedEntity[][] = [];
    const sub = service.cacheResetter$.subscribe(keys => emissions.push(keys));

    service.cacheResetter$.next(['modules', 'patches']);
    sub.unsubscribe();

    expect(emissions.length).toBe(1);
    expect(emissions[0]).toEqual(['modules', 'patches']);
  });

  it('cacheBust operator fires cacheBuster$ with the provided keys when source emits', (done) => {
    const bustedKeys: CachedEntity[][] = [];
    const sub = cacheBuster$.subscribe(keys => bustedKeys.push(keys));

    of('value').pipe(
      cacheBust<string>(['rackWithId', 'racksMinimal'])
    ).subscribe({
      complete: () => {
        expect(bustedKeys.length).toBe(1);
        expect(bustedKeys[0]).toContain('rackWithId');
        expect(bustedKeys[0]).toContain('racksMinimal');
        sub.unsubscribe();
        done();
      }
    });
  });

  it('CachedEntity type covers expected rack-related keys', () => {
    // Compile-time validation: if CachedEntity type changes, these assignments will fail
    const rackKey: CachedEntity = 'rackWithId';
    const racksMinimalKey: CachedEntity = 'racksMinimal';
    expect(rackKey).toBe('rackWithId');
    expect(racksMinimalKey).toBe('racksMinimal');
  });

  it('caches get_rack_by_public_id reads by public_id', async () => {
    const setItemSpy = spyOn(Storage.prototype, 'setItem').and.callThrough();
    const rackRows: RackPublicIdRow[] = [{id: 101, name: 'Cached rack', public_id: 'rack-token-cache'}];
    const rpcSpy = spyOn(supabaseClient, 'rpc').and.returnValue(
      chainable<RackPublicIdRow>({data: rackRows, error: null} satisfies QueryListRowsResult<RackPublicIdRow>)
    );

    const first = await firstValueFrom(service.GET.rackByPublicId('rack-token-cache'));
    const second = await firstValueFrom(service.GET.rackByPublicId('rack-token-cache'));

    expect(first.data.id).toBe(101);
    expect(second.data.id).toBe(101);
    expect(rpcSpy).toHaveBeenCalledTimes(1);
    expect(rpcSpy).toHaveBeenCalledWith('get_rack_by_public_id', {p_public_id: 'rack-token-cache'});
    expect(setItemSpy.calls.allArgs().filter(([key]) => key === LEGACY_TS_CACHEABLE_STORAGE_KEY)).toEqual([]);
  });

  it('busts get_rack_by_public_id cache after rack update and delete mutations', async () => {
    mockUserSession(service, authUserFixture('user-1'));
    spyOn(supabaseClient, 'from').and.returnValue(
      chainable<{id: number}>({data: [{id: 102}], error: null} satisfies QueryListRowsResult<{id: number}>)
    );
    const rpcSpy = spyOn(supabaseClient, 'rpc').and.returnValues(
      chainable<RackPublicIdRow>({
        data: [{id: 102, name: 'Before', public_id: 'rack-token-bust'}],
        error: null
      } satisfies QueryListRowsResult<RackPublicIdRow>),
      chainable<RackPublicIdRow>({
        data: [{id: 102, name: 'After update', public_id: 'rack-token-bust'}],
        error: null
      } satisfies QueryListRowsResult<RackPublicIdRow>),
      chainable<RackPublicIdRow>({data: null, error: null} satisfies QueryListRowsResult<RackPublicIdRow>)
    );
    const rackUpdate: RackMinimal = {
      author: {id: 'user-1', username: 'user-1'},
      created: '2026-07-21T00:00:00Z',
      description: '',
      hp: 84,
      id: 102,
      locked: false,
      name: 'Updated Rack',
      public: false,
      rows: 2,
      updated: '2026-07-21T00:00:00Z'
    };

    await firstValueFrom(service.GET.rackByPublicId('rack-token-bust'));
    await firstValueFrom(service.GET.rackByPublicId('rack-token-bust'));
    expect(rpcSpy).toHaveBeenCalledTimes(1);

    await firstValueFrom(service.update.rack(rackUpdate));
    const afterUpdate = await firstValueFrom(service.GET.rackByPublicId('rack-token-bust'));
    expect(afterUpdate.data.name).toBe('After update');
    expect(rpcSpy).toHaveBeenCalledTimes(2);

    await firstValueFrom(service.delete.userRack(102));
    const afterDelete = await firstValueFrom(service.GET.rackByPublicId('rack-token-bust'));
    expect(afterDelete.data).toBeNull();
    expect(rpcSpy).toHaveBeenCalledTimes(3);
  });

  it('caches get_patch_by_public_id reads by public_id', async () => {
    const patchRows: PatchPublicIdRow[] = [{id: 201, name: 'Cached patch', public_id: 'patch-token-cache'}];
    const rpcSpy = spyOn(supabaseClient, 'rpc').and.returnValue(
      chainable<PatchPublicIdRow>({data: patchRows, error: null} satisfies QueryListRowsResult<PatchPublicIdRow>)
    );

    const first = await firstValueFrom(service.GET.patchByPublicId('patch-token-cache'));
    const second = await firstValueFrom(service.GET.patchByPublicId('patch-token-cache'));

    expect(first.data.id).toBe(201);
    expect(second.data.id).toBe(201);
    expect(rpcSpy).toHaveBeenCalledTimes(1);
    expect(rpcSpy).toHaveBeenCalledWith('get_patch_by_public_id', {p_public_id: 'patch-token-cache'});
  });

  it('busts get_patch_by_public_id cache after patch update and delete mutations', async () => {
    mockUserSession(service, authUserFixture('user-1'));
    spyOn(supabaseClient, 'from').and.returnValue(
      chainable<{id: number}>({data: [{id: 202}], error: null} satisfies QueryListRowsResult<{id: number}>)
    );
    const rpcSpy = spyOn(supabaseClient, 'rpc').and.returnValues(
      chainable<PatchPublicIdRow>({
        data: [{id: 202, name: 'Before', public_id: 'patch-token-bust'}],
        error: null
      } satisfies QueryListRowsResult<PatchPublicIdRow>),
      chainable<PatchPublicIdRow>({
        data: [{id: 202, name: 'After update', public_id: 'patch-token-bust'}],
        error: null
      } satisfies QueryListRowsResult<PatchPublicIdRow>),
      chainable<PatchPublicIdRow>({data: null, error: null} satisfies QueryListRowsResult<PatchPublicIdRow>)
    );
    const patchUpdate: Patch = {
      id: 202,
      name: 'Updated Patch',
      author: {id: 'user-1', username: 'user-1'},
      created: '2026-07-21T00:00:00Z',
      updated: '2026-07-21T00:00:00Z',
      public: false
    };

    await firstValueFrom(service.GET.patchByPublicId('patch-token-bust'));
    await firstValueFrom(service.GET.patchByPublicId('patch-token-bust'));
    expect(rpcSpy).toHaveBeenCalledTimes(1);

    await firstValueFrom(service.update.patch(patchUpdate));
    const afterUpdate = await firstValueFrom(service.GET.patchByPublicId('patch-token-bust'));
    expect(afterUpdate.data.name).toBe('After update');
    expect(rpcSpy).toHaveBeenCalledTimes(2);

    await firstValueFrom(service.delete.userPatch(202));
    const afterDelete = await firstValueFrom(service.GET.patchByPublicId('patch-token-bust'));
    expect(afterDelete.data).toBeNull();
    expect(rpcSpy).toHaveBeenCalledTimes(3);
  });
});
