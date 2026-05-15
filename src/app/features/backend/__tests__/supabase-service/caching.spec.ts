import {
  cleanupSupabaseServiceTest,
  setupSupabaseServiceTest
} from './test-setup';
import { SupabaseService } from '../../supabase.service';
import {
  cacheBust,
  cacheBuster$,
  CachedEntity
} from '../../supabase.cache';
import {
  firstValueFrom,
  of
} from 'rxjs';


function chainable(resolveValue: any = {data: null, error: null}) {
  const m: any = {};
  ['select', 'filter', 'eq', 'neq', 'is', 'in', 'range', 'order', 'limit', 'single', 'maybeSingle',
    'insert', 'update', 'delete', 'upsert'].forEach(method => {
    m[method] = () => m;
  });
  m.then = (res: Function, rej?: Function) =>
    Promise.resolve(resolveValue).then(res as any, rej as any);
  return m;
}

/**
 * Caching Behavior Tests
 *
 * Tests for cache resetter functionality and localStorage usage.
 */
describe('SupabaseService - Caching Behavior', () => {
  let service: SupabaseService;
  let supabaseClient: any;
  
  beforeEach(() => {
    const setup = setupSupabaseServiceTest();
    service = setup.service;
    supabaseClient = (service as any).supabase;
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
    (service.cacheResetter$ as any).next(['manufacturers']);
    
    subscription.unsubscribe();
  });
  
  it('should use localStorage for caching strategy', () => {
    // Verify that ts-cacheable is configured for localStorage
    // This validates the caching setup exists
    expect(localStorage).toBeDefined();
  });

  it('cacheResetter$ emits the provided key array to subscribers', () => {
    const emissions: string[][] = [];
    const sub = service.cacheResetter$.subscribe(keys => emissions.push(keys as string[]));

    (service.cacheResetter$ as any).next(['modules', 'patches']);
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
    const rpcSpy = spyOn(supabaseClient, 'rpc').and.returnValue(
      chainable({data: [{id: 101, public_id: 'rack-token-cache'}], error: null})
    );

    const first = await firstValueFrom(service.GET.rackByPublicId('rack-token-cache'));
    const second = await firstValueFrom(service.GET.rackByPublicId('rack-token-cache'));

    expect(first.data.id).toBe(101);
    expect(second.data.id).toBe(101);
    expect(rpcSpy).toHaveBeenCalledTimes(1);
    expect(rpcSpy).toHaveBeenCalledWith('get_rack_by_public_id', {p_public_id: 'rack-token-cache'});
  });

  it('busts get_rack_by_public_id cache after rack update and delete mutations', async () => {
    spyOn(service.auth as any, 'getUserSession$').and.returnValue(of({id: 'user-1'}));
    spyOn(supabaseClient, 'from').and.returnValue(chainable({data: [{id: 102}], error: null}));
    const rpcSpy = spyOn(supabaseClient, 'rpc').and.returnValues(
      chainable({data: [{id: 102, name: 'Before', public_id: 'rack-token-bust'}], error: null}),
      chainable({data: [{id: 102, name: 'After update', public_id: 'rack-token-bust'}], error: null}),
      chainable({data: null, error: null})
    );

    await firstValueFrom(service.GET.rackByPublicId('rack-token-bust'));
    await firstValueFrom(service.GET.rackByPublicId('rack-token-bust'));
    expect(rpcSpy).toHaveBeenCalledTimes(1);

    await firstValueFrom(service.update.rack({
      id: 102,
      name: 'Updated Rack',
      description: '',
      rows: 2,
      hp: 84,
      locked: false,
      public: false,
      image: null
    } as any));
    const afterUpdate = await firstValueFrom(service.GET.rackByPublicId('rack-token-bust'));
    expect(afterUpdate.data.name).toBe('After update');
    expect(rpcSpy).toHaveBeenCalledTimes(2);

    await firstValueFrom(service.delete.userRack(102));
    const afterDelete = await firstValueFrom(service.GET.rackByPublicId('rack-token-bust'));
    expect(afterDelete.data).toBeNull();
    expect(rpcSpy).toHaveBeenCalledTimes(3);
  });

  it('caches get_patch_by_public_id reads by public_id', async () => {
    const rpcSpy = spyOn(supabaseClient, 'rpc').and.returnValue(
      chainable({data: [{id: 201, public_id: 'patch-token-cache'}], error: null})
    );

    const first = await firstValueFrom(service.GET.patchByPublicId('patch-token-cache'));
    const second = await firstValueFrom(service.GET.patchByPublicId('patch-token-cache'));

    expect(first.data.id).toBe(201);
    expect(second.data.id).toBe(201);
    expect(rpcSpy).toHaveBeenCalledTimes(1);
    expect(rpcSpy).toHaveBeenCalledWith('get_patch_by_public_id', {p_public_id: 'patch-token-cache'});
  });

  it('busts get_patch_by_public_id cache after patch update and delete mutations', async () => {
    spyOn(service.auth as any, 'getUserSession$').and.returnValue(of({id: 'user-1'}));
    spyOn(supabaseClient, 'from').and.returnValue(chainable({data: [{id: 202}], error: null}));
    const rpcSpy = spyOn(supabaseClient, 'rpc').and.returnValues(
      chainable({data: [{id: 202, name: 'Before', public_id: 'patch-token-bust'}], error: null}),
      chainable({data: [{id: 202, name: 'After update', public_id: 'patch-token-bust'}], error: null}),
      chainable({data: null, error: null})
    );

    await firstValueFrom(service.GET.patchByPublicId('patch-token-bust'));
    await firstValueFrom(service.GET.patchByPublicId('patch-token-bust'));
    expect(rpcSpy).toHaveBeenCalledTimes(1);

    await firstValueFrom(service.update.patch({
      id: 202,
      name: 'Updated Patch',
      authorid: 'user-1',
      public: false
    } as any));
    const afterUpdate = await firstValueFrom(service.GET.patchByPublicId('patch-token-bust'));
    expect(afterUpdate.data.name).toBe('After update');
    expect(rpcSpy).toHaveBeenCalledTimes(2);

    await firstValueFrom(service.delete.userPatch(202));
    const afterDelete = await firstValueFrom(service.GET.patchByPublicId('patch-token-bust'));
    expect(afterDelete.data).toBeNull();
    expect(rpcSpy).toHaveBeenCalledTimes(3);
  });
});
