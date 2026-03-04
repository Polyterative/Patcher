import { SupabaseService } from '../../supabase.service';
import {
  cleanupSupabaseServiceTest,
  setupSupabaseServiceTest,
  TEST_TIMEOUT
} from './test-setup';


// getModules always ends its query chain with .ilike(), so we need it in the mock
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

describe('SupabaseService - GET.modules filtering', () => {
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
  
  it('should return data and count on a default call', (done) => {
    const mockData = {data: [{id: 1, name: 'VCO'}], count: 1, error: null};
    spyOn(supabaseClient, 'from').and.returnValue(chainableWithIlike(mockData));
    
    service.GET.modules().subscribe({
      next: (result: any) => {
        expect(result).toBeDefined();
        done();
      },
      error: (err) => {
        fail(err);
        done();
      }
    });
  }, TEST_TIMEOUT);
  
  it('should apply "eq" filter for hp when condition is "="', (done) => {
    const mock = chainableWithIlike({data: [], count: 0, error: null});
    const filterSpy = spyOn(mock, 'filter').and.returnValue(mock);
    spyOn(supabaseClient, 'from').and.returnValue(mock);
    
    service.GET.modules(0, 10, undefined, undefined, undefined, undefined, 8, '=').subscribe({
      next: () => {
        expect(filterSpy).toHaveBeenCalledWith('hp', 'eq', 8);
        done();
      },
      error: (err) => {
        fail(err);
        done();
      }
    });
  }, TEST_TIMEOUT);
  
  it('should apply "gt" filter for hp when condition is ">"', (done) => {
    const mock = chainableWithIlike({data: [], count: 0, error: null});
    const filterSpy = spyOn(mock, 'filter').and.returnValue(mock);
    spyOn(supabaseClient, 'from').and.returnValue(mock);
    
    service.GET.modules(0, 10, undefined, undefined, undefined, undefined, 6, '>').subscribe({
      next: () => {
        expect(filterSpy).toHaveBeenCalledWith('hp', 'gt', 6);
        done();
      },
      error: (err) => {
        fail(err);
        done();
      }
    });
  }, TEST_TIMEOUT);
  
  it('should apply "lt" filter for hp when condition is "<"', (done) => {
    const mock = chainableWithIlike({data: [], count: 0, error: null});
    const filterSpy = spyOn(mock, 'filter').and.returnValue(mock);
    spyOn(supabaseClient, 'from').and.returnValue(mock);
    
    service.GET.modules(0, 10, undefined, undefined, undefined, undefined, 16, '<').subscribe({
      next: () => {
        expect(filterSpy).toHaveBeenCalledWith('hp', 'lt', 16);
        done();
      },
      error: (err) => {
        fail(err);
        done();
      }
    });
  }, TEST_TIMEOUT);
  
  it('should apply "gte" filter for hp when condition is ">="', (done) => {
    const mock = chainableWithIlike({data: [], count: 0, error: null});
    const filterSpy = spyOn(mock, 'filter').and.returnValue(mock);
    spyOn(supabaseClient, 'from').and.returnValue(mock);
    
    service.GET.modules(0, 10, undefined, undefined, undefined, undefined, 4, '>=').subscribe({
      next: () => {
        expect(filterSpy).toHaveBeenCalledWith('hp', 'gte', 4);
        done();
      },
      error: (err) => {
        fail(err);
        done();
      }
    });
  }, TEST_TIMEOUT);
  
  it('should apply "lte" filter for hp when condition is "<="', (done) => {
    const mock = chainableWithIlike({data: [], count: 0, error: null});
    const filterSpy = spyOn(mock, 'filter').and.returnValue(mock);
    spyOn(supabaseClient, 'from').and.returnValue(mock);
    
    service.GET.modules(0, 10, undefined, undefined, undefined, undefined, 20, '<=').subscribe({
      next: () => {
        expect(filterSpy).toHaveBeenCalledWith('hp', 'lte', 20);
        done();
      },
      error: (err) => {
        fail(err);
        done();
      }
    });
  }, TEST_TIMEOUT);
  
  it('should apply "neq" filter for hp when condition is "!="', (done) => {
    const mock = chainableWithIlike({data: [], count: 0, error: null});
    const filterSpy = spyOn(mock, 'filter').and.returnValue(mock);
    spyOn(supabaseClient, 'from').and.returnValue(mock);
    
    service.GET.modules(0, 10, undefined, undefined, undefined, undefined, 3, '!=').subscribe({
      next: () => {
        expect(filterSpy).toHaveBeenCalledWith('hp', 'neq', 3);
        done();
      },
      error: (err) => {
        fail(err);
        done();
      }
    });
  }, TEST_TIMEOUT);
  
  it('should apply manufacturer filter when manufacturerId is provided', (done) => {
    const mock = chainableWithIlike({data: [], count: 0, error: null});
    const filterSpy = spyOn(mock, 'filter').and.returnValue(mock);
    spyOn(supabaseClient, 'from').and.returnValue(mock);
    
    service.GET.modules(0, 10, undefined, undefined, undefined, 5).subscribe({
      next: () => {
        expect(filterSpy).toHaveBeenCalledWith('manufacturerId', 'eq', 5);
        done();
      },
      error: (err) => {
        fail(err);
        done();
      }
    });
  }, TEST_TIMEOUT);
  
  it('should apply standard filter when standard is provided', (done) => {
    const mock = chainableWithIlike({data: [], count: 0, error: null});
    const filterSpy = spyOn(mock, 'filter').and.returnValue(mock);
    spyOn(supabaseClient, 'from').and.returnValue(mock);
    
    service.GET.modules(0, 10, undefined, undefined, undefined, undefined, undefined, undefined, 2).subscribe({
      next: () => {
        expect(filterSpy).toHaveBeenCalledWith('standard', 'eq', 2);
        done();
      },
      error: (err) => {
        fail(err);
        done();
      }
    });
  }, TEST_TIMEOUT);
  
  it('should NOT apply public filter when onlyPublic is false', (done) => {
    const mock = chainableWithIlike({data: [], count: 0, error: null});
    const filterSpy = spyOn(mock, 'filter').and.returnValue(mock);
    spyOn(supabaseClient, 'from').and.returnValue(mock);
    
    // onlyPublic is the 11th parameter
    service.GET.modules(0, 10, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, false).subscribe({
      next: () => {
        // Should not have called filter('public', 'eq', true)
        const publicFilterCall = filterSpy.calls.all()
          .find((call: any) => call.args[0] === 'public' && call.args[1] === 'eq');
        expect(publicFilterCall).toBeUndefined();
        done();
      },
      error: (err) => {
        fail(err);
        done();
      }
    });
  }, TEST_TIMEOUT);
  
  it('should apply ilike for description filter when description is provided', (done) => {
    const mock = chainableWithIlike({data: [], count: 0, error: null});
    const ilikeSpy = spyOn(mock, 'ilike').and.returnValue(mock);
    spyOn(supabaseClient, 'from').and.returnValue(mock);
    
    service.GET.modules(0, 10, undefined, undefined, undefined, undefined, undefined, undefined, undefined, 'oscillator').subscribe({
      next: () => {
        // ilike is called at least once for description
        expect(ilikeSpy).toHaveBeenCalledWith('description', jasmine.stringContaining('oscillator'));
        done();
      },
      error: (err) => {
        fail(err);
        done();
      }
    });
  }, TEST_TIMEOUT);
  
  it('should apply filter on module_tags.tagid when tagIds are provided', (done) => {
    const mock = chainableWithIlike({data: [], count: 0, error: null});
    const filterSpy = spyOn(mock, 'filter').and.returnValue(mock);
    spyOn(supabaseClient, 'from').and.returnValue(mock);
    
    // tagIds is the 12th argument (index 11)
    service.GET.modules(0, 10, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, true, [2, 5]).subscribe({
      next: () => {
        expect(filterSpy).toHaveBeenCalledWith('module_tags.tagid', 'in', '(2,5)');
        done();
      },
      error: (err) => {
        fail(err);
        done();
      }
    });
  }, TEST_TIMEOUT);
  
  it('should NOT apply tag filter when tagIds is undefined', (done) => {
    const mock = chainableWithIlike({data: [], count: 0, error: null});
    const filterSpy = spyOn(mock, 'filter').and.returnValue(mock);
    spyOn(supabaseClient, 'from').and.returnValue(mock);
    
    service.GET.modules(0, 10, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, true, undefined).subscribe({
      next: () => {
        const tagFilterCall = filterSpy.calls.all()
          .find((call: any) => call.args[0] === 'module_tags.tagid');
        expect(tagFilterCall).toBeUndefined();
        done();
      },
      error: (err) => {
        fail(err);
        done();
      }
    });
  }, TEST_TIMEOUT);
  
  it('should NOT apply tag filter when tagIds is an empty array', (done) => {
    const mock = chainableWithIlike({data: [], count: 0, error: null});
    const filterSpy = spyOn(mock, 'filter').and.returnValue(mock);
    spyOn(supabaseClient, 'from').and.returnValue(mock);
    
    service.GET.modules(0, 10, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, true, []).subscribe({
      next: () => {
        const tagFilterCall = filterSpy.calls.all()
          .find((call: any) => call.args[0] === 'module_tags.tagid');
        expect(tagFilterCall).toBeUndefined();
        done();
      },
      error: (err) => {
        fail(err);
        done();
      }
    });
  }, TEST_TIMEOUT);
});