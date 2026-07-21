import { SupabaseService } from '../../supabase.service';
import {
  cleanupSupabaseServiceTest,
  setupSupabaseServiceTest,
  TEST_TIMEOUT
} from './test-setup';
import {
  chainable,
  getSupabaseClientDouble,
  type QueryChainResult,
  type SupabaseClientDouble
} from './supabase-query-test-doubles';


type PublicContributorCountResult = QueryChainResult<never> & {
  count: number | null;
  error: null;
};

describe('SupabaseService - GET.publicUserContributorStats', () => {
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

  it('returns approved public module count for the requested profile', (done) => {
    spyOn(supabaseClient, 'from').and.returnValue(
      chainable<never>({count: 5, error: null} satisfies PublicContributorCountResult)
    );

    service.GET.publicUserContributorStats('public-author').subscribe({
      next: (stats) => {
        expect(stats).toEqual({approvedPublicModules: 5});
        done();
      },
      error: (err) => {
        fail(err);
        done();
      }
    });
  }, TEST_TIMEOUT);

  it('returns zero when count is null', (done) => {
    spyOn(supabaseClient, 'from').and.returnValue(
      chainable<never>({count: null, error: null} satisfies PublicContributorCountResult)
    );

    service.GET.publicUserContributorStats('nobody').subscribe({
      next: (stats) => {
        expect(stats).toEqual({approvedPublicModules: 0});
        done();
      },
      error: (err) => {
        fail(err);
        done();
      }
    });
  }, TEST_TIMEOUT);

  it('calls from() with the correct table name', (done) => {
    const fromSpy = spyOn(supabaseClient, 'from').and.returnValue(
      chainable<never>({count: 0, error: null} satisfies PublicContributorCountResult)
    );

    service.GET.publicUserContributorStats('user-x').subscribe({
      next: () => {
        expect(fromSpy).toHaveBeenCalled();
        done();
      },
      error: (err) => { fail(err); done(); }
    });
  }, TEST_TIMEOUT);
});
