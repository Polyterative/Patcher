import type { PostgrestError } from '@supabase/supabase-js';
import { SupabaseService } from '../../supabase.service';
import type { SupabaseTableRow } from '../../supabase-db.types';
import {
  cleanupSupabaseServiceTest,
  setupSupabaseServiceTest,
  TEST_TIMEOUT
} from './test-setup';
import {
  chainable,
  getSupabaseClientDouble,
  type QueryChainResult,
  type QueryCountRowsResult,
  type QueryListRowsResult,
  type SupabaseClientDouble,
  type SupabaseQueryChain
} from './supabase-query-test-doubles';


type PatchSearchRow = Pick<SupabaseTableRow<'patches'>, 'id' | 'name'> & {
  author_profile_gate: { public: boolean };
};

type RackSearchRow = Pick<SupabaseTableRow<'racks'>, 'id' | 'name'> & {
  author_profile_gate: { public: boolean };
};

type ManufacturerSearchRow = Pick<SupabaseTableRow<'manufacturers'>, 'id' | 'name'>;

type ModuleSearchRow = Pick<SupabaseTableRow<'modules'>, 'description' | 'id' | 'name'>;

type ModuleDetailRow = ModuleSearchRow & {
  manufacturer: { name: string };
  panels: readonly unknown[];
  tags: readonly unknown[];
};

type SearchObservableResult<Row> = {
  data: Row[] | null;
  count: number | null;
  error?: PostgrestError | null;
};

type ModuleRowsFetchResult = QueryListRowsResult<ModuleSearchRow> | {
  data: ModuleSearchRow[];
  error: PostgrestError;
};

type ModuleActivityRowsResult = {
  data: { manufacturerId: number; updated: string }[];
  error: PostgrestError | null;
};

type ModuleFetchRowsBuilder = (query: SupabaseQueryChain<ModuleSearchRow>) => SupabaseQueryChain<ModuleSearchRow>;

interface AccentSearchQueriesDouble {
  fetchAllRows(table: string, buildQuery: ModuleFetchRowsBuilder): Promise<ModuleRowsFetchResult>;
  fetchAllModuleActivityRowsForManufacturers(
    manufacturerIds: number[],
    orderDirection?: 'asc' | 'desc'
  ): Promise<ModuleActivityRowsResult>;
}

function getAccentSearchQueriesDouble(service: SupabaseService): AccentSearchQueriesDouble {
  const queries = Reflect.get(service, 'queries');
  if (!isAccentSearchQueriesDouble(queries)) {
    throw new Error('Supabase test setup did not expose accent search query helpers.');
  }

  return queries;
}

function isAccentSearchQueriesDouble(value: unknown): value is AccentSearchQueriesDouble {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  return typeof Reflect.get(value, 'fetchAllRows') === 'function'
    && typeof Reflect.get(value, 'fetchAllModuleActivityRowsForManufacturers') === 'function';
}

describe('SupabaseService - accent-insensitive search', () => {
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

  it('matches accented patch names from an unaccented search query', (done) => {
    const mockPatches = [
      {id: 1, name: 'Lùbadh Jam', author_profile_gate: {public: true}},
      {id: 2, name: 'Mimeophon Jam', author_profile_gate: {public: true}}
    ] satisfies PatchSearchRow[];
    const mock: SupabaseQueryChain<PatchSearchRow> = chainable<PatchSearchRow>({
      data: mockPatches,
      count: 2,
      error: null
    } satisfies QueryCountRowsResult<PatchSearchRow>);
    const filterSpy = spyOn(mock, 'filter').and.returnValue(mock);
    const orderSpy = spyOn(mock, 'order').and.returnValue(mock);
    const rangeSpy = spyOn(mock, 'range').and.returnValue(mock);
    const fromSpy = spyOn(supabaseClient, 'from').and.returnValue(mock);

    service.GET.patches(0, 10, '  lubadh  ').subscribe({
      next: (result: SearchObservableResult<PatchSearchRow>) => {
        expect(fromSpy).toHaveBeenCalledWith('patches');
        expect(filterSpy).toHaveBeenCalledWith('public', 'eq', true);
        expect(orderSpy).toHaveBeenCalledWith('name', {ascending: false});
        expect(rangeSpy).not.toHaveBeenCalled();
        expect(result.count).toBe(1);
        expect(result.data?.[0]?.name).toBe('Lùbadh Jam');
        done();
      },
      error: (err: unknown) => { fail(err); done(); }
    });
  }, TEST_TIMEOUT);

  it('matches accented rack names from an unaccented search query', (done) => {
    const mockRacks = [
      {id: 1, name: 'Lùbadh Case', author_profile_gate: {public: true}},
      {id: 2, name: 'Performance Case', author_profile_gate: {public: true}}
    ] satisfies RackSearchRow[];
    const mock: SupabaseQueryChain<RackSearchRow> = chainable<RackSearchRow>({
      data: mockRacks,
      count: 2,
      error: null
    } satisfies QueryCountRowsResult<RackSearchRow>);
    const filterSpy = spyOn(mock, 'filter').and.returnValue(mock);
    const orderSpy = spyOn(mock, 'order').and.returnValue(mock);
    const rangeSpy = spyOn(mock, 'range').and.returnValue(mock);
    spyOn(supabaseClient, 'from').and.returnValue(mock);

    service.GET.racksMinimal(0, 10, '  lubadh  ').subscribe({
      next: (result: SearchObservableResult<RackSearchRow>) => {
        expect(filterSpy).toHaveBeenCalledWith('public', 'eq', true);
        expect(filterSpy).toHaveBeenCalledWith('author_profile_gate.public', 'eq', true);
        expect(orderSpy.calls.allArgs()).toEqual([
          ['name', {ascending: false}],
          ['id', {ascending: false}]
        ]);
        expect(rangeSpy).not.toHaveBeenCalled();
        expect(result.count).toBe(1);
        expect(result.data?.[0]?.name).toBe('Lùbadh Case');
        done();
      },
      error: (err: unknown) => { fail(err); done(); }
    });
  }, TEST_TIMEOUT);

  it('matches accented manufacturer names from an unaccented search query', (done) => {
    const queries = getAccentSearchQueriesDouble(service);
    const mockManufacturers = [
      {id: 1, name: 'Instruō'},
      {id: 2, name: 'Make Noise'}
    ] satisfies ManufacturerSearchRow[];
    const mock: SupabaseQueryChain<ManufacturerSearchRow> = chainable<ManufacturerSearchRow>({
      data: mockManufacturers,
      count: 2,
      error: null
    } satisfies QueryCountRowsResult<ManufacturerSearchRow>);
    const orderSpy = spyOn(mock, 'order').and.returnValue(mock);
    const rangeSpy = spyOn(mock, 'range').and.returnValue(mock);
    spyOn(supabaseClient, 'from').and.returnValue(mock);
    const moduleActivitySpy = spyOn(queries, 'fetchAllModuleActivityRowsForManufacturers')
      .and.returnValue(Promise.resolve({data: [], error: null}));

    service.GET.manufacturersPaginated(0, 10, '  instruo  ').subscribe({
      next: (result: SearchObservableResult<ManufacturerSearchRow>) => {
        expect(orderSpy).toHaveBeenCalledWith('name', {ascending: true});
        expect(rangeSpy).not.toHaveBeenCalled();
        expect(moduleActivitySpy).toHaveBeenCalledWith([1]);
        expect(result.count).toBe(1);
        expect(result.data?.[0]?.name).toBe('Instruō');
        done();
      },
      error: (err: unknown) => { fail(err); done(); }
    });
  }, TEST_TIMEOUT);

  it('matches accented module names through the broad client-side fallback', (done) => {
    const queries = getAccentSearchQueriesDouble(service);
    const detailRows = [
      {id: 1, name: 'Érbe-Verb', description: null, manufacturer: {name: 'Make Noise'}, panels: [], tags: []}
    ] satisfies ModuleDetailRow[];
    const detailQuery: SupabaseQueryChain<ModuleDetailRow> = chainable<ModuleDetailRow>({
      data: detailRows,
      count: 1,
      error: null
    } satisfies QueryCountRowsResult<ModuleDetailRow>);
    const detailFilterSpy = spyOn(detailQuery, 'filter').and.returnValue(detailQuery);
    const detailOrderSpy = spyOn(detailQuery, 'order').and.returnValue(detailQuery);
    const detailLimitSpy = spyOn(detailQuery, 'limit').and.returnValue(detailQuery);
    const detailRangeSpy = spyOn(detailQuery, 'range').and.returnValue(detailQuery);
    spyOn(supabaseClient, 'from').and.returnValue(detailQuery);
    const fallbackRows = [
      {id: 1, name: 'Érbe-Verb', description: 'Stereo reverb'},
      {id: 2, name: 'Mimeophon', description: 'Stereo delay'}
    ] satisfies ModuleSearchRow[];
    const fetchAllRowsSpy = spyOn(queries, 'fetchAllRows').and.callFake(async (_table, buildQuery) => {
      const searchQuery: SupabaseQueryChain<ModuleSearchRow> = chainable<ModuleSearchRow>({
        data: [],
        error: null
      } satisfies QueryListRowsResult<ModuleSearchRow>);
      const ilikeSpy = spyOn(searchQuery, 'ilike').and.returnValue(searchQuery);
      const filterSpy = spyOn(searchQuery, 'filter').and.returnValue(searchQuery);
      const orderSpy = spyOn(searchQuery, 'order').and.returnValue(searchQuery);

      buildQuery(searchQuery);
      expect(filterSpy).toHaveBeenCalledWith('public', 'eq', true);
      expect(orderSpy).toHaveBeenCalledWith('name', {ascending: false});

      if (fetchAllRowsSpy.calls.count() === 1) {
        expect(ilikeSpy).toHaveBeenCalledWith('name', '%erbe%');
        return {data: [], error: null} satisfies QueryListRowsResult<ModuleSearchRow>;
      }

      expect(ilikeSpy).not.toHaveBeenCalled();
      return {data: fallbackRows, error: null} satisfies QueryListRowsResult<ModuleSearchRow>;
    });

    service.GET.modules(0, 10, '  erbe  ').subscribe({
      next: (result: SearchObservableResult<ModuleDetailRow>) => {
        expect(fetchAllRowsSpy.calls.count()).toBe(2);
        expect(detailFilterSpy).toHaveBeenCalledWith('id', 'in', '(1)');
        expect(detailRangeSpy).toHaveBeenCalledWith(0, 0);
        expect(detailOrderSpy.calls.allArgs()).toEqual([
          ['color', {foreignTable: 'module_panels', ascending: true}],
          ['name', {ascending: false}]
        ]);
        expect(detailLimitSpy).toHaveBeenCalledWith(1, {foreignTable: 'module_panels'});
        expect(result.count).toBe(1);
        expect(result.data?.[0]?.name).toBe('Érbe-Verb');
        done();
      },
      error: (err: unknown) => { fail(err); done(); }
    });
  }, TEST_TIMEOUT);

  it('returns broad module fallback errors without issuing a detail query', (done) => {
    const queries = getAccentSearchQueriesDouble(service);
    const fallbackError: PostgrestError = {
      code: 'PGRST000',
      details: '',
      hint: '',
      message: 'fallback failed',
      name: 'PostgrestError'
    };
    spyOn(supabaseClient, 'from');
    spyOn(queries, 'fetchAllRows').and.returnValues(
      Promise.resolve({data: [], error: null} satisfies QueryListRowsResult<ModuleSearchRow>),
      Promise.resolve({data: [], error: fallbackError})
    );

    service.GET.modules(0, 10, 'erbe').subscribe({
      next: (result: QueryChainResult<ModuleSearchRow>) => {
        expect(supabaseClient.from).not.toHaveBeenCalled();
        expect(result.error).toBe(fallbackError);
        done();
      },
      error: (err: unknown) => { fail(err); done(); }
    });
  }, TEST_TIMEOUT);
});
