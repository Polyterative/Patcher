import { SupabaseService } from '../../supabase.service';
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
  type SupabaseClientDouble
} from './supabase-query-test-doubles';


type CountRowsResult = QueryChainResult<never> & {
  count: number;
  error: null;
};

describe('SupabaseService - GET.currentUserContributorStats', () => {
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

  it('returns aggregated contributor counts for the current user', (done) => {
    mockUserSession(service, authUserFixture('contributor-1'));
    spyOn(supabaseClient, 'from').and.returnValues(
      chainable<never>({count: 7, error: null} satisfies CountRowsResult),
      chainable<never>({count: 4, error: null} satisfies CountRowsResult),
      chainable<never>({count: 12, error: null} satisfies CountRowsResult),
      chainable<never>({count: 3, error: null} satisfies CountRowsResult)
    );

    service.GET.currentUserContributorStats().subscribe({
      next: (stats) => {
        expect(stats).toEqual({
          modulesSubmitted: 7,
          approvedModules: 4,
          pendingModules: 3,
          commentsPosted: 12,
          moduleFlagsSubmitted: 3
        });
        done();
      },
      error: (err) => {
        fail(err);
        done();
      }
    });
  }, TEST_TIMEOUT);

  it('filters each count query by the current user', (done) => {
    mockUserSession(service, authUserFixture('contributor-2'));

    const submittedQuery = chainable<never>({count: 0, error: null} satisfies CountRowsResult);
    const approvedQuery = chainable<never>({count: 0, error: null} satisfies CountRowsResult);
    const commentsQuery = chainable<never>({count: 0, error: null} satisfies CountRowsResult);
    const flagsQuery = chainable<never>({count: 0, error: null} satisfies CountRowsResult);

    const submittedFilterSpy = spyOn(submittedQuery, 'filter').and.returnValue(submittedQuery);
    const approvedFilterSpy = spyOn(approvedQuery, 'filter').and.returnValue(approvedQuery);
    const commentsFilterSpy = spyOn(commentsQuery, 'filter').and.returnValue(commentsQuery);
    const flagsFilterSpy = spyOn(flagsQuery, 'filter').and.returnValue(flagsQuery);

    spyOn(supabaseClient, 'from').and.returnValues(
      submittedQuery,
      approvedQuery,
      commentsQuery,
      flagsQuery
    );

    service.GET.currentUserContributorStats().subscribe({
      next: () => {
        expect(submittedFilterSpy).toHaveBeenCalledWith('submitter', 'eq', 'contributor-2');
        expect(approvedFilterSpy).toHaveBeenCalledWith('submitter', 'eq', 'contributor-2');
        expect(approvedFilterSpy).toHaveBeenCalledWith('isApproved', 'eq', true);
        expect(commentsFilterSpy).toHaveBeenCalledWith('authorId', 'eq', 'contributor-2');
        expect(flagsFilterSpy).toHaveBeenCalledWith('user_id', 'eq', 'contributor-2');
        done();
      },
      error: (err) => {
        fail(err);
        done();
      }
    });
  }, TEST_TIMEOUT);

  it('returns zeroed stats when there is no signed-in user', (done) => {
    mockUserSession(service, null);
    const fromSpy = spyOn(supabaseClient, 'from');

    service.GET.currentUserContributorStats().subscribe({
      next: (stats) => {
        expect(fromSpy).not.toHaveBeenCalled();
        expect(stats).toEqual({
          modulesSubmitted: 0,
          approvedModules: 0,
          pendingModules: 0,
          commentsPosted: 0,
          moduleFlagsSubmitted: 0
        });
        done();
      },
      error: (err) => {
        fail(err);
        done();
      }
    });
  }, TEST_TIMEOUT);
});
