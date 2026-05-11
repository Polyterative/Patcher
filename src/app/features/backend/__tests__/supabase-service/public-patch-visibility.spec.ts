import { SupabaseService } from '../../supabase.service';
import {
  cleanupSupabaseServiceTest,
  setupSupabaseServiceTest,
  TEST_TIMEOUT
} from './test-setup';


function chainable(resolveValue: any = {data: [], count: 0, error: null}) {
  const m: any = {};
  ['select', 'filter', 'eq', 'neq', 'is', 'in', 'range', 'order', 'limit', 'single',
    'insert', 'update', 'delete', 'upsert', 'ilike'].forEach(method => {
    m[method] = () => m;
  });
  m.then = (res: Function, rej?: Function) =>
    Promise.resolve(resolveValue).then(res as any, rej as any);
  return m;
}

describe('SupabaseService - public patch visibility', () => {
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

  it('GET.patches should not gate public patches by author profile visibility', (done) => {
    const mock = chainable();
    const selectSpy = spyOn(mock, 'select').and.returnValue(mock);
    const filterSpy = spyOn(mock, 'filter').and.returnValue(mock);
    spyOn(supabaseClient, 'from').and.returnValue(mock);

    service.GET.patches(0, 9).subscribe({
      next: () => {
        expect(selectSpy.calls.mostRecent().args[0]).not.toContain('author_profile_gate:authorid!inner(public)');
        expect(filterSpy).toHaveBeenCalledWith('public', 'eq', true);
        expect(filterSpy).not.toHaveBeenCalledWith('author_profile_gate.public', 'eq', true);
        done();
      },
      error: (err) => {
        fail(err);
        done();
      }
    });
  }, TEST_TIMEOUT);

  it('GET.publicPatchWithId should load a public patch without author profile gating', (done) => {
    const mock = chainable({data: {id: 238, name: 'Repulsive Scarlet'}, error: null});
    const selectSpy = spyOn(mock, 'select').and.returnValue(mock);
    const filterSpy = spyOn(mock, 'filter').and.returnValue(mock);
    spyOn(supabaseClient, 'from').and.returnValue(mock);

    service.GET.publicPatchWithId(238).subscribe({
      next: (result: any) => {
        expect(result.data?.id).toBe(238);
        expect(selectSpy.calls.mostRecent().args[0]).not.toContain('author_profile_gate:authorid!inner(public)');
        expect(filterSpy).toHaveBeenCalledWith('public', 'eq', true);
        expect(filterSpy).not.toHaveBeenCalledWith('author_profile_gate.public', 'eq', true);
        done();
      },
      error: (err) => {
        fail(err);
        done();
      }
    });
  }, TEST_TIMEOUT);

  it('GET.publicUserPatchesPaginated should keep author filtering but ignore author profile visibility', (done) => {
    const mock = chainable({data: [], count: 0, error: null});
    const selectSpy = spyOn(mock, 'select').and.returnValue(mock);
    const filterSpy = spyOn(mock, 'filter').and.returnValue(mock);
    spyOn(supabaseClient, 'from').and.returnValue(mock);

    service.GET.publicUserPatchesPaginated('author-1', 0, 9).subscribe({
      next: () => {
        expect(selectSpy.calls.mostRecent().args[0]).not.toContain('author_profile_gate:authorid!inner(public)');
        expect(filterSpy).toHaveBeenCalledWith('authorid', 'eq', 'author-1');
        expect(filterSpy).toHaveBeenCalledWith('public', 'eq', true);
        expect(filterSpy).not.toHaveBeenCalledWith('author_profile_gate.public', 'eq', true);
        done();
      },
      error: (err) => {
        fail(err);
        done();
      }
    });
  }, TEST_TIMEOUT);

  it('GET.applicationStatistics should count public patch activity without author profile gating', (done) => {
    const patchesQuery = chainable({count: 11, error: null});
    const recentPatchesQuery = chainable({count: 5, error: null});
    const patchConnectionsQuery = chainable({count: 48, error: null});
    const genericQuery = chainable({count: 1, error: null});

    const patchesSelectSpy = spyOn(patchesQuery, 'select').and.returnValue(patchesQuery);
    const patchesFilterSpy = spyOn(patchesQuery, 'filter').and.returnValue(patchesQuery);
    const recentPatchesSelectSpy = spyOn(recentPatchesQuery, 'select').and.returnValue(recentPatchesQuery);
    const recentPatchesFilterSpy = spyOn(recentPatchesQuery, 'filter').and.returnValue(recentPatchesQuery);
    const patchConnectionsSelectSpy = spyOn(patchConnectionsQuery, 'select').and.returnValue(patchConnectionsQuery);
    const patchConnectionsFilterSpy = spyOn(patchConnectionsQuery, 'filter').and.returnValue(patchConnectionsQuery);

    let patchesCallCount = 0;

    spyOn(supabaseClient, 'from').and.callFake((table: string) => {
      if (table === 'modules' || table === 'manufacturers') {
        return genericQuery;
      }
      if (table === 'profiles') {
        return genericQuery;
      }
      if (table === 'racks') {
        return genericQuery;
      }
      if (table === 'patch_connections') {
        return patchConnectionsQuery;
      }
      if (table === 'patches') {
        return patchesCallCount++ === 0 ? patchesQuery : recentPatchesQuery;
      }
      fail(`Unexpected table ${ table }`);
      return genericQuery;
    });

    service.GET.applicationStatistics().subscribe({
      next: (result: any) => {
        expect(result.publicPatches).toBe(11);
        expect(result.publicPatchesUpdatedLast30Days).toBe(5);
        expect(result.publicPatchConnections).toBe(48);
        expect(patchesSelectSpy.calls.mostRecent().args[0]).not.toContain('author_profile_gate:authorid!inner(public)');
        expect(recentPatchesSelectSpy.calls.mostRecent().args[0]).not.toContain('author_profile_gate:authorid!inner(public)');
        expect(patchConnectionsSelectSpy.calls.mostRecent().args[0]).not.toContain('author_profile_gate:authorid!inner(public)');
        expect(patchesFilterSpy).toHaveBeenCalledWith('public', 'eq', true);
        expect(patchesFilterSpy).not.toHaveBeenCalledWith('author_profile_gate.public', 'eq', true);
        expect(recentPatchesFilterSpy).toHaveBeenCalledWith('public', 'eq', true);
        expect(recentPatchesFilterSpy).not.toHaveBeenCalledWith('author_profile_gate.public', 'eq', true);
        expect(patchConnectionsFilterSpy).toHaveBeenCalledWith('patch.public', 'eq', true);
        expect(patchConnectionsFilterSpy).not.toHaveBeenCalledWith('patch.author_profile_gate.public', 'eq', true);
        done();
      },
      error: (err) => {
        fail(err);
        done();
      }
    });
  }, TEST_TIMEOUT);

  it('GET.applicationActivitySeries should include public patches without author profile gating', (done) => {
    const modulesQuery = chainable({data: [], error: null});
    const racksQuery = chainable({data: [], error: null});
    const patchesQuery = chainable({data: [], error: null});
    const patchesSelectSpy = spyOn(patchesQuery, 'select').and.returnValue(patchesQuery);
    const patchesFilterSpy = spyOn(patchesQuery, 'filter').and.returnValue(patchesQuery);

    spyOn(supabaseClient, 'from').and.callFake((table: string) => {
      if (table === 'modules') { return modulesQuery; }
      if (table === 'racks') { return racksQuery; }
      if (table === 'patches') { return patchesQuery; }
      fail(`Unexpected table ${ table }`);
      return chainable();
    });

    service.GET.applicationActivitySeries(7).subscribe({
      next: () => {
        expect(patchesSelectSpy.calls.mostRecent().args[0]).not.toContain('author_profile_gate:authorid!inner(public)');
        expect(patchesFilterSpy).toHaveBeenCalledWith('public', 'eq', true);
        expect(patchesFilterSpy).not.toHaveBeenCalledWith('author_profile_gate.public', 'eq', true);
        done();
      },
      error: (err) => {
        fail(err);
        done();
      }
    });
  }, TEST_TIMEOUT);
});
