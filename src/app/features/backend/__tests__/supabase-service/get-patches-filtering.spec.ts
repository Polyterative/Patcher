import { SupabaseService } from '../../supabase.service';
import { Patch } from 'src/app/models/patch';
import {
  cleanupSupabaseServiceTest,
  setupSupabaseServiceTest,
  TEST_TIMEOUT
} from './test-setup';


type PatchListingRow = Pick<Patch, 'id' | 'name' | 'public'>;

interface PatchListingResult {
  data: PatchListingRow[];
  count: number;
  error: null;
}

interface OrderOptions {
  ascending: boolean;
}

interface SelectOptions {
  count?: 'exact';
}

class PatchQueryDouble implements PromiseLike<PatchListingResult> {
  constructor(private readonly resolveValue: PatchListingResult = {data: [], count: 0, error: null}) {}

  select(_columns: string, _options?: SelectOptions): this {
    return this;
  }

  filter(_column: string, _operator: string, _value: boolean | number | string | null): this {
    return this;
  }

  eq(_column: string, _value: boolean | number | string | null): this {
    return this;
  }

  neq(_column: string, _value: boolean | number | string | null): this {
    return this;
  }

  is(_column: string, _value: boolean | number | string | null): this {
    return this;
  }

  in(_column: string, _values: readonly (boolean | number | string | null)[]): this {
    return this;
  }

  range(_from: number, _to: number): this {
    return this;
  }

  order(_column: string, _options: OrderOptions): this {
    return this;
  }

  limit(_count: number): this {
    return this;
  }

  single(): this {
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

  then<TResult1 = PatchListingResult, TResult2 = never>(
    onfulfilled?: ((value: PatchListingResult) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): PromiseLike<TResult1 | TResult2> {
    return Promise.resolve(this.resolveValue).then(onfulfilled, onrejected);
  }
}

interface SupabaseClientDouble {
  from(table: string): PatchQueryDouble;
}

function chainableWithIlike(resolveValue: PatchListingResult = {data: [], count: 0, error: null}): PatchQueryDouble {
  return new PatchQueryDouble(resolveValue);
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

describe('SupabaseService - GET.patches filtering and ordering', () => {
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
  
  it('should return patch data and count on a default call', (done) => {
    const mockPatches = [{id: 1, name: 'DrumPatch', public: true}];
    spyOn(supabaseClient, 'from').and.returnValue(
      chainableWithIlike({data: mockPatches, count: 1, error: null})
    );
    
    service.GET.patches(0, 9).subscribe({
      next: (result: PatchListingResult) => {
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
      next: (result: PatchListingResult) => {
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
