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
  SupabaseQueryChain,
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

  function stubCounts(counts: {profiles: number | null; modules: number | null}) {
    const chains = {
      profiles: chainable<never>({count: counts.profiles, error: null} satisfies PublicContributorCountResult),
      modules: chainable<never>({count: counts.modules, error: null} satisfies PublicContributorCountResult)
    };
    const fromSpy = spyOn(supabaseClient, 'from').and.callFake(
      (table: string): SupabaseQueryChain<never> => table === 'profiles' ? chains.profiles : chains.modules
    );
    return {chains, fromSpy};
  }

  it('returns approved public module count for the requested profile', (done) => {
    stubCounts({profiles: 1, modules: 5});

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
    stubCounts({profiles: 1, modules: null});

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

  // Regression: modules has no FK to profiles, so embedding the authorid-based
  // public author gate on modules returned PGRST200 (HTTP 400) for every profile page.
  it('never embeds the authorid-based public author gate on modules', (done) => {
    const {chains} = stubCounts({profiles: 1, modules: 3});
    const modulesSelectSpy = spyOn(chains.modules, 'select').and.callThrough();
    const modulesFilterSpy = spyOn(chains.modules, 'filter').and.callThrough();

    service.GET.publicUserContributorStats('public-author').subscribe({
      next: () => {
        const selectedColumns = modulesSelectSpy.calls.mostRecent().args[0];
        expect(selectedColumns).not.toContain('authorid');
        expect(selectedColumns).not.toContain('author_profile_gate');
        expect(modulesFilterSpy).not.toHaveBeenCalledWith('author_profile_gate.public', 'eq', true);
        expect(modulesFilterSpy).toHaveBeenCalledWith('submitter', 'eq', 'public-author');
        expect(modulesFilterSpy).toHaveBeenCalledWith('public', 'eq', true);
        expect(modulesFilterSpy).toHaveBeenCalledWith('isApproved', 'eq', true);
        done();
      },
      error: (err) => { fail(err); done(); }
    });
  }, TEST_TIMEOUT);

  it('gates on the profile being public before counting modules', (done) => {
    const {chains, fromSpy} = stubCounts({profiles: 1, modules: 2});
    const profilesFilterSpy = spyOn(chains.profiles, 'filter').and.callThrough();

    service.GET.publicUserContributorStats('public-author').subscribe({
      next: () => {
        expect(fromSpy.calls.allArgs().map(([table]) => table)).toEqual(['profiles', 'modules']);
        expect(profilesFilterSpy).toHaveBeenCalledWith('id', 'eq', 'public-author');
        expect(profilesFilterSpy).toHaveBeenCalledWith('public', 'eq', true);
        done();
      },
      error: (err) => { fail(err); done(); }
    });
  }, TEST_TIMEOUT);

  it('returns zero without querying modules when the profile is private or missing', (done) => {
    const {fromSpy} = stubCounts({profiles: 0, modules: 9});

    service.GET.publicUserContributorStats('private-author').subscribe({
      next: (stats) => {
        expect(stats).toEqual({approvedPublicModules: 0});
        expect(fromSpy.calls.allArgs().map(([table]) => table)).toEqual(['profiles']);
        done();
      },
      error: (err) => { fail(err); done(); }
    });
  }, TEST_TIMEOUT);
});
