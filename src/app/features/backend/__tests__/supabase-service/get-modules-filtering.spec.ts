import { SupabaseService } from '../../supabase.service';
import {
  cleanupSupabaseServiceTest,
  setupSupabaseServiceTest,
  TEST_TIMEOUT
} from './test-setup';


// getModules can still use ilike in some branches, so we keep it in the mock
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
  
  it('should filter by description when description is provided', (done) => {
    const mockData = {
      data: [
        {id: 1, name: 'VCO', description: 'Analog oscillator'},
        {id: 2, name: 'Mixer', description: 'Audio mixer'}
      ],
      count: 2,
      error: null
    };
    spyOn(supabaseClient, 'from').and.returnValue(chainableWithIlike(mockData));
    
    service.GET.modules(0, 10, undefined, undefined, undefined, undefined, undefined, undefined, undefined, 'oscillator').subscribe({
      next: (result: any) => {
        expect(result.count).toBe(1);
        expect(result.data[0].name).toBe('VCO');
        done();
      },
      error: (err) => {
        fail(err);
        done();
      }
    });
  }, TEST_TIMEOUT);

  it('applies a server-side ilike filter for module name searches before client refinement', (done) => {
    const mock = chainableWithIlike({
      data: [{id: 1, name: 'Rings', description: 'Resonator'}],
      count: 1,
      error: null
    });
    const ilikeSpy = spyOn(mock, 'ilike').and.callThrough();
    spyOn(supabaseClient, 'from').and.returnValue(mock);

    service.GET.modules(0, 10, 'rings').subscribe({
      next: () => {
        expect(ilikeSpy).toHaveBeenCalledWith('name', '%rings%');
        done();
      },
      error: (err) => {
        fail(err);
        done();
      }
    });
  }, TEST_TIMEOUT);

  it('falls back to the broad client-side scan when narrowed ilike results are empty', (done) => {
    const queries = (service as any).queries;
    spyOn(supabaseClient, 'from').and.returnValue(chainableWithIlike({
      data: [{id: 1, name: 'Lùbadh', description: 'Dual looper'}],
      count: 1,
      error: null
    }));
    const fetchAllRowsSpy = spyOn(queries as any, 'fetchAllRows').and.returnValues(
      Promise.resolve({data: [], error: null}),
      Promise.resolve({
        data: [
          {id: 1, name: 'Lùbadh', description: 'Dual looper'},
          {id: 2, name: 'Mimeophon', description: 'Stereo delay'}
        ],
        error: null
      })
    );

    service.GET.modules(0, 10, 'Lubadh').subscribe({
      next: (result: any) => {
        expect(fetchAllRowsSpy.calls.count()).toBe(2);
        expect(result.count).toBe(1);
        expect(result.data[0].name).toBe('Lùbadh');
        done();
      },
      error: (err) => {
        fail(err);
        done();
      }
    });
  }, TEST_TIMEOUT);

  it('returns an empty result when neither narrowed nor fallback matching finds a module', (done) => {
    const queries = (service as any).queries;
    spyOn(queries as any, 'fetchAllRows').and.returnValues(
      Promise.resolve({data: [], error: null}),
      Promise.resolve({
        data: [
          {id: 1, name: 'Rings', description: 'Resonator'},
          {id: 2, name: 'Belgrad', description: 'Dual peak filter'}
        ],
        error: null
      })
    );

    service.GET.modules(0, 10, 'zzqxv').subscribe({
      next: (result: any) => {
        expect(result.count).toBe(0);
        expect(result.data).toEqual([]);
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

  it('matches accented module names when the query is unaccented', (done) => {
    const mockData = {
      data: [
        {id: 1, name: 'Lùbadh', description: 'Looper'},
        {id: 2, name: 'Mimeophon', description: 'Delay'}
      ],
      count: 2,
      error: null
    };
    spyOn(supabaseClient, 'from').and.returnValue(chainableWithIlike(mockData));

    service.GET.modules(0, 10, 'Lubadh').subscribe({
      next: (result: any) => {
        expect(result.count).toBe(1);
        expect(result.data.map((module: any) => module.name)).toEqual(['Lùbadh']);
        done();
      },
      error: (err) => {
        fail(err);
        done();
      }
    });
  }, TEST_TIMEOUT);

  it('matches accented module descriptions when the query is unaccented', (done) => {
    const mockData = {
      data: [
        {id: 1, name: 'Lùbadh', description: 'Dual lòoper and sampler'},
        {id: 2, name: 'Mimeophon', description: 'Stereo delay'}
      ],
      count: 2,
      error: null
    };
    spyOn(supabaseClient, 'from').and.returnValue(chainableWithIlike(mockData));

    service.GET.modules(0, 10, undefined, undefined, undefined, undefined, undefined, undefined, undefined, 'looper').subscribe({
      next: (result: any) => {
        expect(result.count).toBe(1);
        expect(result.data[0].name).toBe('Lùbadh');
        done();
      },
      error: (err) => {
        fail(err);
        done();
      }
    });
  }, TEST_TIMEOUT);
});
