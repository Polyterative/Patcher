import { SupabaseService } from '../../supabase.service';
import {
  cleanupSupabaseServiceTest,
  setupSupabaseServiceTest,
  TEST_TIMEOUT
} from './test-setup';


function chainableWithIlike(resolveValue: any = {data: [], count: 0, error: null}) {
  const m: any = {};
  ['select', 'filter', 'eq', 'neq', 'is', 'in', 'range', 'order', 'limit', 'single',
    'insert', 'update', 'delete', 'upsert', 'ilike'].forEach(method => {
    m[method] = () => m;
  });
  m.then = (res: Function, rej?: Function) =>
    Promise.resolve(resolveValue).then(res as any, rej as any);
  return m;
}

describe('SupabaseService - GET.patches filtering and ordering', () => {
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
  
  it('should return patch data and count on a default call', (done) => {
    const mockPatches = [{id: 1, name: 'DrumPatch', public: true}];
    spyOn(supabaseClient, 'from').and.returnValue(
      chainableWithIlike({data: mockPatches, count: 1, error: null})
    );
    
    service.GET.patches(0, 9).subscribe({
      next: (result: any) => {
        expect(result.data).toEqual(mockPatches);
        expect(result.count).toBe(1);
        done();
      },
      error: (err) => {
        fail(err);
        done();
      }
    });
  }, TEST_TIMEOUT);
  
  it('should filter patches to public=true', (done) => {
    const mock = chainableWithIlike({data: [], count: 0, error: null});
    const filterSpy = spyOn(mock, 'filter').and.returnValue(mock);
    spyOn(supabaseClient, 'from').and.returnValue(mock);
    
    service.GET.patches(0, 9).subscribe({
      next: () => {
        expect(filterSpy).toHaveBeenCalledWith('public', 'eq', true);
        done();
      },
      error: (err) => {
        fail(err);
        done();
      }
    });
  }, TEST_TIMEOUT);
  
  it('should apply the name filter client-side when name is provided', (done) => {
    const mock = chainableWithIlike({
      data: [
        {id: 1, name: 'DrumPatch', public: true},
        {id: 2, name: 'BassPatch', public: true}
      ],
      count: 2,
      error: null
    });
    const ilikeSpy = spyOn(mock, 'ilike').and.callThrough();
    spyOn(supabaseClient, 'from').and.returnValue(mock);
    
    service.GET.patches(0, 9, 'drum').subscribe({
      next: (result: any) => {
        expect(ilikeSpy).not.toHaveBeenCalled();
        expect(result.count).toBe(1);
        expect(result.data).toEqual([
          {id: 1, name: 'DrumPatch', public: true}
        ]);
        done();
      },
      error: (err) => {
        fail(err);
        done();
      }
    });
  }, TEST_TIMEOUT);

  it('should not inner-join the author visibility gate for public patch listings', (done) => {
    const mock = chainableWithIlike({data: [], count: 0, error: null});
    const selectSpy = spyOn(mock, 'select').and.returnValue(mock);
    spyOn(supabaseClient, 'from').and.returnValue(mock);

    service.GET.patches(0, 9).subscribe({
      next: () => {
        expect(selectSpy.calls.mostRecent().args[0]).not.toContain('author_profile_gate:authorid!inner(public)');
        done();
      },
      error: (err) => {
        fail(err);
        done();
      }
    });
  }, TEST_TIMEOUT);

  it('should not require linked_rack_id in the public patch listing select', (done) => {
    const mock = chainableWithIlike({data: [], count: 0, error: null});
    const selectSpy = spyOn(mock, 'select').and.returnValue(mock);
    spyOn(supabaseClient, 'from').and.returnValue(mock);

    service.GET.patches(0, 9).subscribe({
      next: () => {
        expect(selectSpy.calls.mostRecent().args[0]).not.toContain('linked_rack_id');
        done();
      },
      error: (err) => {
        fail(err);
        done();
      }
    });
  }, TEST_TIMEOUT);
  
  it('should NOT apply ilike when name is not provided', (done) => {
    const mock = chainableWithIlike({data: [], count: 0, error: null});
    const ilikeSpy = spyOn(mock, 'ilike').and.returnValue(mock);
    spyOn(supabaseClient, 'from').and.returnValue(mock);
    
    service.GET.patches(0, 9).subscribe({
      next: () => {
        expect(ilikeSpy).not.toHaveBeenCalled();
        done();
      },
      error: (err) => {
        fail(err);
        done();
      }
    });
  }, TEST_TIMEOUT);
  
  it('should apply order with ascending=true for "asc" direction', (done) => {
    const mock = chainableWithIlike({data: [], count: 0, error: null});
    const orderSpy = spyOn(mock, 'order').and.returnValue(mock);
    spyOn(supabaseClient, 'from').and.returnValue(mock);
    
    service.GET.patches(0, 9, undefined, 'name', 'asc').subscribe({
      next: () => {
        expect(orderSpy).toHaveBeenCalledWith('name', {ascending: true});
        done();
      },
      error: (err) => {
        fail(err);
        done();
      }
    });
  }, TEST_TIMEOUT);
  
  it('should apply order with ascending=false for "desc" direction', (done) => {
    const mock = chainableWithIlike({data: [], count: 0, error: null});
    const orderSpy = spyOn(mock, 'order').and.returnValue(mock);
    spyOn(supabaseClient, 'from').and.returnValue(mock);
    
    service.GET.patches(0, 9, undefined, 'updated', 'desc').subscribe({
      next: () => {
        expect(orderSpy).toHaveBeenCalledWith('updated', {ascending: false});
        done();
      },
      error: (err) => {
        fail(err);
        done();
      }
    });
  }, TEST_TIMEOUT);
  
  it('should apply range for pagination', (done) => {
    const mock = chainableWithIlike({data: [], count: 0, error: null});
    const rangeSpy = spyOn(mock, 'range').and.returnValue(mock);
    spyOn(supabaseClient, 'from').and.returnValue(mock);
    
    service.GET.patches(20, 39).subscribe({
      next: () => {
        expect(rangeSpy).toHaveBeenCalledWith(20, 39);
        done();
      },
      error: (err) => {
        fail(err);
        done();
      }
    });
  }, TEST_TIMEOUT);
  
  it('should use "name" as default order column when none specified', (done) => {
    const mock = chainableWithIlike({data: [], count: 0, error: null});
    const orderSpy = spyOn(mock, 'order').and.returnValue(mock);
    spyOn(supabaseClient, 'from').and.returnValue(mock);
    
    service.GET.patches(0, 9).subscribe({
      next: () => {
        expect(orderSpy).toHaveBeenCalledWith('name', jasmine.any(Object));
        done();
      },
      error: (err) => {
        fail(err);
        done();
      }
    });
  }, TEST_TIMEOUT);
});
