import { SupabaseService } from '../../supabase.service';
import {
  cleanupSupabaseServiceTest,
  setupSupabaseServiceTest,
  TEST_TIMEOUT
} from './test-setup';


interface ModuleListingRow {
  id: number;
  name: string;
  description?: string;
}

interface ModuleListingResult {
  data: ModuleListingRow[];
  count: number;
  error: null;
}

interface ModuleFetchAllRowsResult {
  data: ModuleListingRow[];
  error: null;
}

type QueryFilterValue = boolean | number | string | null;

interface OrderOptions {
  ascending: boolean;
  foreignTable?: string;
}

interface SelectOptions {
  count?: 'exact';
}

interface ForeignTableOptions {
  foreignTable?: string;
}

type ModuleFetchAllRowsBuilder = (query: ModuleQueryDouble) => ModuleQueryDouble;

// getModules can still use ilike in some branches, so we keep it in the mock
class ModuleQueryDouble implements PromiseLike<ModuleListingResult> {
  constructor(private readonly resolveValue: ModuleListingResult = {data: [], count: 0, error: null}) {}

  select(_columns: string, _options?: SelectOptions): this {
    return this;
  }

  filter(_column: string, _operator: string, _value: QueryFilterValue): this {
    return this;
  }

  eq(_column: string, _value: QueryFilterValue): this {
    return this;
  }

  neq(_column: string, _value: QueryFilterValue): this {
    return this;
  }

  is(_column: string, _value: QueryFilterValue): this {
    return this;
  }

  in(_column: string, _values: readonly QueryFilterValue[]): this {
    return this;
  }

  range(_from: number, _to: number): this {
    return this;
  }

  order(_column: string, _options: OrderOptions): this {
    return this;
  }

  limit(_count: number, _options?: ForeignTableOptions): this {
    return this;
  }

  single(): this {
    return this;
  }

  or(_filters: string): this {
    return this;
  }

  insert(_values: readonly Record<string, unknown>[]): this {
    return this;
  }

  update(_values: Record<string, unknown>): this {
    return this;
  }

  delete(): this {
    return this;
  }

  upsert(_values: readonly Record<string, unknown>[]): this {
    return this;
  }

  ilike(_column: string, _pattern: string): this {
    return this;
  }

  then<TResult1 = ModuleListingResult, TResult2 = never>(
    onfulfilled?: ((value: ModuleListingResult) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): PromiseLike<TResult1 | TResult2> {
    return Promise.resolve(this.resolveValue).then(onfulfilled, onrejected);
  }
}

interface SupabaseClientDouble {
  from(table: string): ModuleQueryDouble;
}

interface ModuleQueriesDouble {
  fetchAllRows(table: string, buildQuery: ModuleFetchAllRowsBuilder): Promise<ModuleFetchAllRowsResult>;
}

function chainableWithIlike(resolveValue: ModuleListingResult = {data: [], count: 0, error: null}): ModuleQueryDouble {
  return new ModuleQueryDouble(resolveValue);
}

function isSupabaseClientDouble(value: unknown): value is SupabaseClientDouble {
  if (typeof value !== 'object' || value === null || !('from' in value)) {
    return false;
  }

  return typeof value.from === 'function';
}

function getSupabaseClientDouble(service: SupabaseService): SupabaseClientDouble {
  const client = Reflect.get(service, 'supabase');
  if (!isSupabaseClientDouble(client)) {
    throw new Error('Supabase test setup did not expose a chainable client double.');
  }

  return client;
}

function isModuleQueriesDouble(value: unknown): value is ModuleQueriesDouble {
  if (typeof value !== 'object' || value === null || !('fetchAllRows' in value)) {
    return false;
  }

  return typeof value.fetchAllRows === 'function';
}

function getModuleQueriesDouble(service: SupabaseService): ModuleQueriesDouble {
  const queries = Reflect.get(service, 'queries');
  if (!isModuleQueriesDouble(queries)) {
    throw new Error('Supabase test setup did not expose module query helpers.');
  }

  return queries;
}

describe('SupabaseService - GET.modules filtering', () => {
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
  
  it('should return data and count on a default call', (done) => {
    const mockData = {data: [{id: 1, name: 'VCO'}], count: 1, error: null};
    spyOn(supabaseClient, 'from').and.returnValue(chainableWithIlike(mockData));
    
    service.GET.modules().subscribe({
      next: (result: ModuleListingResult) => {
        expect(result).toBeDefined();
        done();
      },
      error: (err) => {
        fail(err);
        done();
      }
    });
  }, TEST_TIMEOUT);

  it('searches collection editor modules by public name or description without a broad catalogue fallback', (done) => {
    const mock = chainableWithIlike({
      data: [{id: 8025, name: 'Gem HP', description: 'Behind the modest appearance lurks a tonal beast.'}],
      count: 1,
      error: null
    });
    const filterSpy = spyOn(mock, 'filter').and.returnValue(mock);
    const orSpy = spyOn(mock, 'or').and.returnValue(mock);
    const limitSpy = spyOn(mock, 'limit').and.returnValue(mock);
    spyOn(supabaseClient, 'from').and.returnValue(mock);
    const fetchAllRowsSpy = spyOn(getModuleQueriesDouble(service), 'fetchAllRows').and.callThrough();

    service.GET.searchPublicModulesForCollection('modest').subscribe({
      next: (result) => {
        expect(filterSpy).toHaveBeenCalledWith('public', 'eq', true);
        expect(orSpy).toHaveBeenCalledWith('name.ilike.%modest%,description.ilike.%modest%');
        expect(limitSpy).toHaveBeenCalledWith(24);
        expect(fetchAllRowsSpy).not.toHaveBeenCalled();
        expect(result[0].name).toBe('Gem HP');
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
          .find((call) => call.args[0] === 'public' && call.args[1] === 'eq');
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
      next: (result: ModuleListingResult) => {
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
    const queries = getModuleQueriesDouble(service);
    spyOn(supabaseClient, 'from').and.returnValue(chainableWithIlike({
      data: [{id: 1, name: 'Lùbadh', description: 'Dual looper'}],
      count: 1,
      error: null
    }));
    const fetchAllRowsSpy = spyOn(queries, 'fetchAllRows').and.returnValues(
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
      next: (result: ModuleListingResult) => {
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
    const queries = getModuleQueriesDouble(service);
    spyOn(queries, 'fetchAllRows').and.returnValues(
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
      next: (result: ModuleListingResult) => {
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
          .find((call) => call.args[0] === 'module_tags.tagid');
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
          .find((call) => call.args[0] === 'module_tags.tagid');
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
      next: (result: ModuleListingResult) => {
        expect(result.count).toBe(1);
        expect(result.data.map((module) => module.name)).toEqual(['Lùbadh']);
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
      next: (result: ModuleListingResult) => {
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
