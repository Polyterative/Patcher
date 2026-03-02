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

describe('SupabaseService - get complex queries', () => {
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
  
  describe('get.tagVotesForModule', () => {
    it('should aggregate vote counts per moduleTagId', (done) => {
      const mockRows = [
        {moduletagid: 1},
        {moduletagid: 1},
        {moduletagid: 2}
      ];
      spyOn(supabaseClient, 'from').and.returnValue(chainable({data: mockRows, error: null}));
      
      service.get.tagVotesForModule([1, 2]).subscribe({
        next: (result: any[]) => {
          const tag1 = result.find(r => r.moduleTagId === 1);
          const tag2 = result.find(r => r.moduleTagId === 2);
          expect(tag1.count).toBe(2);
          expect(tag2.count).toBe(1);
          done();
        },
        error: (err) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
    
    it('should return an empty array when there are no votes', (done) => {
      spyOn(supabaseClient, 'from').and.returnValue(chainable({data: [], error: null}));
      
      service.get.tagVotesForModule([1, 2]).subscribe({
        next: (result: any[]) => {
          expect(result.length).toBe(0);
          done();
        },
        error: (err) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
    
    it('should handle null data response gracefully', (done) => {
      spyOn(supabaseClient, 'from').and.returnValue(chainable({data: null, error: null}));
      
      service.get.tagVotesForModule([1]).subscribe({
        next: (result: any[]) => {
          expect(result.length).toBe(0);
          done();
        },
        error: (err) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
  });
  
  describe('get.statistics', () => {
    it('should return a tuple of [moduleCount, rackCount, patchCount]', (done) => {
      spyOn(supabaseClient, 'from').and.callFake((table: string) => {
        if (table === 'modules') return chainable({data: [], count: 150, error: null});
        if (table === 'racks') return chainable({data: [], count: 75, error: null});
        return chainable({data: [], count: 40, error: null}); // patches
      });
      
      service.get.statistics().subscribe({
        next: ([modules, racks, patches]: any) => {
          expect(modules).toBe(150);
          expect(racks).toBe(75);
          expect(patches).toBe(40);
          done();
        },
        error: (err) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
  });
  
  describe('get.modulesBySameManufacturer', () => {
    it('should return the data array from the query result', (done) => {
      const mockModules = [{id: 1, name: 'VCO'}, {id: 2, name: 'VCF'}];
      spyOn(supabaseClient, 'from').and.returnValue(chainable({data: mockModules, error: null}));
      
      service.get.modulesBySameManufacturer(3).subscribe({
        next: (result: any) => {
          expect(result).toEqual(mockModules);
          done();
        },
        error: (err) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
    
    it('should apply manufacturer filter', (done) => {
      const mock = chainable({data: [], error: null});
      const filterSpy = spyOn(mock, 'filter').and.returnValue(mock);
      spyOn(supabaseClient, 'from').and.returnValue(mock);
      
      service.get.modulesBySameManufacturer(7).subscribe({
        next: () => {
          expect(filterSpy).toHaveBeenCalledWith('manufacturerId', 'eq', 7);
          done();
        },
        error: (err) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
    
    it('should order by updated desc with id desc tie-break', (done) => {
      const mock = chainable({data: [], error: null});
      const orderSpy = spyOn(mock, 'order').and.returnValue(mock);
      spyOn(supabaseClient, 'from').and.returnValue(mock);
      
      service.get.modulesBySameManufacturer(7).subscribe({
        next: () => {
          expect(orderSpy).toHaveBeenCalledWith('updated', {ascending: false});
          expect(orderSpy).toHaveBeenCalledWith('id', {ascending: false});
          done();
        },
        error: (err) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
  });
  
  describe('GET.manufacturersPaginated', () => {
    it('should sort by latest module updated timestamp (desc) with +00 offsets', (done) => {
      const manufacturers = [
        {id: 1, name: 'Endorphin.es', logo: null, websiteURL: null, adminUser: null},
        {id: 2, name: 'SD Modular', logo: null, websiteURL: null, adminUser: null}
      ];
      const moduleActivityRows = [
        {id: 11, manufacturerId: 2, updated: '2026-03-01T10:00:00.123456+00'},
        {id: 10, manufacturerId: 1, updated: '2026-02-01T10:00:00.123456+00'}
      ];
      
      spyOn(supabaseClient, 'from').and.callFake((table: string) => {
        if (table === 'manufacturers') {
          return chainable({data: manufacturers, count: manufacturers.length, error: null});
        }
        if (table === 'modules') {
          return chainable({data: moduleActivityRows, error: null});
        }
        return chainable({data: [], error: null});
      });
      
      service.GET.manufacturersPaginated(0, 19, '', 'module_updated', 'desc').subscribe({
        next: (result: any) => {
          const orderedNames = (result?.data ?? []).map((x: any) => x.name);
          expect(orderedNames).toEqual(['SD Modular', 'Endorphin.es']);
          expect(result?.data?.[0]?.latestModuleUpdatedAt).toBe('2026-03-01T10:00:00.123456+00');
          done();
        },
        error: (err) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
    
    it('should sort by latest module updated timestamp (desc) with mixed timestamp formats', (done) => {
      const manufacturers = [
        {id: 1, name: 'Older Maker', logo: null, websiteURL: null, adminUser: null},
        {id: 2, name: 'Newer Maker', logo: null, websiteURL: null, adminUser: null},
        {id: 3, name: 'Middle Maker', logo: null, websiteURL: null, adminUser: null}
      ];
      const moduleActivityRows = [
        {id: 22, manufacturerId: 2, updated: '2026-03-01 10:00:00.123456+0000'},
        {id: 23, manufacturerId: 3, updated: '2026-02-20T09:15:00.4Z'},
        {id: 21, manufacturerId: 1, updated: '2026-02-01T10:00:00.123456+00'}
      ];
      
      spyOn(supabaseClient, 'from').and.callFake((table: string) => {
        if (table === 'manufacturers') {
          return chainable({data: manufacturers, count: manufacturers.length, error: null});
        }
        if (table === 'modules') {
          return chainable({data: moduleActivityRows, error: null});
        }
        return chainable({data: [], error: null});
      });
      
      service.GET.manufacturersPaginated(0, 19, '', 'module_updated', 'desc').subscribe({
        next: (result: any) => {
          const orderedNames = (result?.data ?? []).map((x: any) => x.name);
          expect(orderedNames).toEqual(['Newer Maker', 'Middle Maker', 'Older Maker']);
          done();
        },
        error: (err) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
  });
  
  describe('get.racksWithModule', () => {
    it('should complete successfully and pass through result', (done) => {
      const mockData = {data: [{id: 1, rack: {name: 'My Rack'}}], count: 1, error: null};
      spyOn(supabaseClient, 'from').and.returnValue(chainable(mockData));
      
      service.get.racksWithModule(42).subscribe({
        next: (result: any) => {
          expect(result.data).toBeDefined();
          done();
        },
        error: (err) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
    
    it('should filter by module id', (done) => {
      const mock = chainable({data: [], count: 0, error: null});
      const filterSpy = spyOn(mock, 'filter').and.returnValue(mock);
      spyOn(supabaseClient, 'from').and.returnValue(mock);
      
      service.get.racksWithModule(99).subscribe({
        next: () => {
          expect(filterSpy).toHaveBeenCalledWith('moduleid', 'eq', 99);
          done();
        },
        error: (err) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
  });
});