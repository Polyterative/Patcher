import { of } from 'rxjs';
import {
  cleanupSupabaseServiceTest,
  setupSupabaseServiceTest,
  TEST_TIMEOUT
} from './test-setup';


function chainable(resolveValue: any = {data: null, error: null}) {
  const m: any = {};
  ['select', 'filter', 'eq', 'neq', 'is', 'in', 'range', 'order', 'limit', 'single',
    'insert', 'update', 'delete', 'upsert'].forEach(method => {
    m[method] = () => m;
  });
  m.then = (res: Function, rej?: Function) =>
    Promise.resolve(resolveValue).then(res as any, rej as any);
  return m;
}

describe('SupabaseService - update.patchTags', () => {
  let service: any;
  let supabaseClient: any;

  beforeEach(() => {
    const setup = setupSupabaseServiceTest();
    service = setup.service;
    supabaseClient = (service as any).supabase;
  });

  afterEach(() => {
    cleanupSupabaseServiceTest();
  });

  it('should call update with the provided tags array', (done) => {
    const mockUser = {id: 'user-abc'};
    spyOn(service.auth as any, 'getUserSession$').and.returnValue(of(mockUser));

    const mock = chainable({data: null, error: null});
    const updateSpy = spyOn(mock, 'update').and.returnValue(mock);
    spyOn(supabaseClient, 'from').and.returnValue(mock);

    service.update.patchTags(42, ['bass', 'ambient']).subscribe({
      next: () => {
        const payload = updateSpy.calls.first().args[0] as any;
        expect(payload.tags).toEqual(['bass', 'ambient']);
        done();
      },
      error: (err: any) => {
        fail(err);
        done();
      }
    });
  }, TEST_TIMEOUT);

  it('should filter by patchId and authorid', (done) => {
    const mockUser = {id: 'user-xyz'};
    spyOn(service.auth as any, 'getUserSession$').and.returnValue(of(mockUser));

    const mock = chainable({data: null, error: null});
    const eqSpy = spyOn(mock, 'eq').and.returnValue(mock);
    spyOn(supabaseClient, 'from').and.returnValue(mock);

    service.update.patchTags(7, ['techno']).subscribe({
      next: () => {
        const calls = eqSpy.calls.allArgs();
        expect(calls).toContain(['id', 7]);
        expect(calls).toContain(['authorid', 'user-xyz']);
        done();
      },
      error: (err: any) => {
        fail(err);
        done();
      }
    });
  }, TEST_TIMEOUT);

  it('should bust the patches cache', (done) => {
    const mockUser = {id: 'user-abc'};
    spyOn(service.auth as any, 'getUserSession$').and.returnValue(of(mockUser));
    spyOn(supabaseClient, 'from').and.returnValue(chainable({data: null, error: null}));

    const bustedKeys: any[] = [];
    service.cacheResetter$.subscribe((keys: any[]) => bustedKeys.push(...keys));

    service.update.patchTags(1, []).subscribe({
      next: () => {
        expect(bustedKeys).toContain('patches');
        done();
      },
      error: (err: any) => {
        fail(err);
        done();
      }
    });
  }, TEST_TIMEOUT);

  it('should throw when user is not authenticated', (done) => {
    spyOn(service.auth as any, 'getUserSession$').and.returnValue(of(null));

    service.update.patchTags(1, ['test']).subscribe({
      next: () => {
        fail('Expected an error but got a value');
        done();
      },
      error: (err: any) => {
        expect(err.message).toContain('Authentication required');
        done();
      }
    });
  }, TEST_TIMEOUT);
});
