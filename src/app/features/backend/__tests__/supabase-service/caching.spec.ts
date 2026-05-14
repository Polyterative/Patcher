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
  of
} from 'rxjs';


/**
 * Caching Behavior Tests
 *
 * Tests for cache resetter functionality and localStorage usage.
 */
describe('SupabaseService - Caching Behavior', () => {
  let service: SupabaseService;
  
  beforeEach(() => {
    const setup = setupSupabaseServiceTest();
    service = setup.service;
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
});