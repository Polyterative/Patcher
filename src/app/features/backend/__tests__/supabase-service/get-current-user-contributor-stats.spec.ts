import { of } from 'rxjs';
import { SupabaseService } from '../../supabase.service';
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

describe('SupabaseService - GET.currentUserContributorStats', () => {
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

  it('returns aggregated contributor counts for the current user', (done) => {
    spyOn(service.auth as any, 'getUserSession$').and.returnValue(of({id: 'contributor-1'}));
    spyOn(supabaseClient, 'from').and.returnValues(
      chainable({count: 7, error: null}),
      chainable({count: 4, error: null}),
      chainable({count: 12, error: null}),
      chainable({count: 3, error: null})
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
    spyOn(service.auth as any, 'getUserSession$').and.returnValue(of({id: 'contributor-2'}));

    const submittedQuery = chainable({count: 0, error: null});
    const approvedQuery = chainable({count: 0, error: null});
    const commentsQuery = chainable({count: 0, error: null});
    const flagsQuery = chainable({count: 0, error: null});

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
    spyOn(service.auth as any, 'getUserSession$').and.returnValue(of(null));
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
