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

describe('SupabaseService - GET.publicUserContributorStats', () => {
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

  it('returns approved public module count for the requested profile', (done) => {
    spyOn(supabaseClient, 'from').and.returnValue(chainable({count: 5, error: null}));

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

  it('filters approved public modules by author visibility and approval state', (done) => {
    const query = chainable({count: 0, error: null});
    const filterSpy = spyOn(query, 'filter').and.returnValue(query);
    spyOn(supabaseClient, 'from').and.returnValue(query);

    service.GET.publicUserContributorStats('public-author').subscribe({
      next: () => {
        expect(filterSpy).toHaveBeenCalledWith('submitter', 'eq', 'public-author');
        expect(filterSpy).toHaveBeenCalledWith('public', 'eq', true);
        expect(filterSpy).toHaveBeenCalledWith('isApproved', 'eq', true);
        expect(filterSpy).toHaveBeenCalledWith('author_profile_gate.public', 'eq', true);
        done();
      },
      error: (err) => {
        fail(err);
        done();
      }
    });
  }, TEST_TIMEOUT);
});
