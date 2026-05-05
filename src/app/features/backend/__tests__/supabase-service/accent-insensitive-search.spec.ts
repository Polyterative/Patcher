import { SupabaseService } from '../../supabase.service';
import {
  cleanupSupabaseServiceTest,
  setupSupabaseServiceTest,
  TEST_TIMEOUT
} from './test-setup';

function chainableQuery(resolveValue: any = {data: [], count: 0, error: null}) {
  const mock: any = {};
  ['select', 'filter', 'eq', 'neq', 'is', 'in', 'range', 'order', 'limit', 'single',
    'insert', 'update', 'delete', 'upsert', 'ilike'].forEach(method => {
    mock[method] = () => mock;
  });
  mock.then = (resolve: Function, reject?: Function) =>
    Promise.resolve(resolveValue).then(resolve as any, reject as any);
  return mock;
}

describe('SupabaseService - accent-insensitive search', () => {
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

  it('matches accented patch names from an unaccented search query', (done) => {
    spyOn(supabaseClient, 'from').and.returnValue(chainableQuery({
      data: [
        {id: 1, name: 'Lùbadh Jam', author_profile_gate: {public: true}},
        {id: 2, name: 'Mimeophon Jam', author_profile_gate: {public: true}}
      ],
      count: 2,
      error: null
    }));

    (service as any).queries.getPatches(0, 10, 'lubadh').subscribe({
      next: (result: any) => {
        expect(result.count).toBe(1);
        expect(result.data[0].name).toBe('Lùbadh Jam');
        done();
      },
      error: done.fail
    });
  }, TEST_TIMEOUT);

  it('matches accented rack names from an unaccented search query', (done) => {
    spyOn(supabaseClient, 'from').and.returnValue(chainableQuery({
      data: [
        {id: 1, name: 'Lùbadh Case', author_profile_gate: {public: true}},
        {id: 2, name: 'Performance Case', author_profile_gate: {public: true}}
      ],
      count: 2,
      error: null
    }));

    (service as any).queries.getRacksMinimal(0, 10, 'lubadh').subscribe({
      next: (result: any) => {
        expect(result.count).toBe(1);
        expect(result.data[0].name).toBe('Lùbadh Case');
        done();
      },
      error: done.fail
    });
  }, TEST_TIMEOUT);

  it('matches accented manufacturer names from an unaccented search query', (done) => {
    const queries = (service as any).queries;
    spyOn(supabaseClient, 'from').and.returnValue(chainableQuery({
      data: [
        {id: 1, name: 'Instruō'},
        {id: 2, name: 'Make Noise'}
      ],
      count: 2,
      error: null
    }));
    spyOn(queries as any, 'fetchAllModuleActivityRowsForManufacturers')
      .and.returnValue(Promise.resolve({data: [], error: null}));

    queries.getManufacturersPaginated(0, 10, 'instruo').subscribe({
      next: (result: any) => {
        expect(result.count).toBe(1);
        expect(result.data[0].name).toBe('Instruō');
        done();
      },
      error: done.fail
    });
  }, TEST_TIMEOUT);
});
