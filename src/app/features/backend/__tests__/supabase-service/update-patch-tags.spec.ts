import { SupabaseService } from '../../supabase.service';
import type { CachedEntity } from '../../supabase.cache';
import type { SupabaseTableUpdate } from '../../supabase-db.types';
import {
  cleanupSupabaseServiceTest,
  setupSupabaseServiceTest,
  TEST_TIMEOUT
} from './test-setup';
import {
  authUserFixture,
  chainable,
  getSupabaseClientDouble,
  mockUserSession,
  type QueryChainResult,
  type SupabaseClientDouble,
  type SupabaseQueryChain
} from './supabase-query-test-doubles';


type PatchUpdate = SupabaseTableUpdate<'patches'>;
type PatchTags = Parameters<SupabaseService['update']['patchTags']>[1];
type PatchTagsUpdatePayload = Pick<PatchUpdate, 'tags'> & {
  tags: PatchTags;
};
type PatchTagsUpdateResult = QueryChainResult<PatchTagsUpdatePayload> & {
  data: null;
  error: null;
};

function successfulPatchTagsUpdate(): PatchTagsUpdateResult {
  return {data: null, error: null};
}

describe('SupabaseService - update.patchTags', () => {
  let service: SupabaseService;
  let supabaseClient: SupabaseClientDouble;

  beforeEach(() => {
    const setup = setupSupabaseServiceTest();
    service = setup.service;
    supabaseClient = getSupabaseClientDouble(service);
  });

  afterEach(() => {
    cleanupSupabaseServiceTest();
  });

  it('should call update with the provided tags array', (done) => {
    mockUserSession(service, authUserFixture('user-abc'));

    const mock: SupabaseQueryChain<PatchTagsUpdatePayload> =
      chainable<PatchTagsUpdatePayload>(successfulPatchTagsUpdate());
    const updateSpy: jasmine.Spy<SupabaseQueryChain<PatchTagsUpdatePayload>['update']> =
      spyOn(mock, 'update').and.returnValue(mock);
    spyOn(supabaseClient, 'from').and.returnValue(mock);

    service.update.patchTags(42, ['bass', 'ambient']).subscribe({
      next: () => {
        expect(updateSpy).toHaveBeenCalledWith({
          tags: ['bass', 'ambient']
        } satisfies PatchTagsUpdatePayload);
        done();
      },
      error: (err: unknown) => {
        fail(err);
        done();
      }
    });
  }, TEST_TIMEOUT);

  it('should filter by patchId and authorid', (done) => {
    mockUserSession(service, authUserFixture('user-xyz'));

    const mock: SupabaseQueryChain<PatchTagsUpdatePayload> =
      chainable<PatchTagsUpdatePayload>(successfulPatchTagsUpdate());
    const eqSpy: jasmine.Spy<SupabaseQueryChain<PatchTagsUpdatePayload>['eq']> =
      spyOn(mock, 'eq').and.returnValue(mock);
    spyOn(supabaseClient, 'from').and.returnValue(mock);

    service.update.patchTags(7, ['techno']).subscribe({
      next: () => {
        const calls = eqSpy.calls.allArgs();
        expect(calls).toContain(['id', 7]);
        expect(calls).toContain(['authorid', 'user-xyz']);
        done();
      },
      error: (err: unknown) => {
        fail(err);
        done();
      }
    });
  }, TEST_TIMEOUT);

  it('should bust the patches cache', (done) => {
    mockUserSession(service, authUserFixture('user-abc'));
    spyOn(supabaseClient, 'from').and.returnValue(
      chainable<PatchTagsUpdatePayload>(successfulPatchTagsUpdate())
    );

    const bustedKeys: CachedEntity[] = [];
    service.cacheResetter$.subscribe(keys => bustedKeys.push(...keys));

    service.update.patchTags(1, []).subscribe({
      next: () => {
        expect(bustedKeys).toContain('patches');
        done();
      },
      error: (err: unknown) => {
        fail(err);
        done();
      }
    });
  }, TEST_TIMEOUT);

  it('should throw when user is not authenticated', (done) => {
    mockUserSession(service, null);

    service.update.patchTags(1, ['test']).subscribe({
      next: () => {
        fail('Expected an error but got a value');
        done();
      },
      error: (err: Error) => {
        expect(err.message).toContain('Authentication required');
        done();
      }
    });
  }, TEST_TIMEOUT);
});
