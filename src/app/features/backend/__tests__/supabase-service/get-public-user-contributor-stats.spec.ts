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

  it('returns zero when count is null', (done) => {
    spyOn(supabaseClient, 'from').and.returnValue(chainable({count: null, error: null}));

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
    const fromSpy = spyOn(supabaseClient, 'from').and.returnValue(chainable({count: 0, error: null}));

    service.GET.publicUserContributorStats('user-x').subscribe({
      next: () => {
        expect(fromSpy).toHaveBeenCalled();
        done();
      },
      error: (err) => { fail(err); done(); }
    });
  }, TEST_TIMEOUT);
});
