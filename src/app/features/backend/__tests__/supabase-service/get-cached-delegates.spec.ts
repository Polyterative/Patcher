import { of } from 'rxjs';
import { SupabaseService } from '../../supabase.service';
import {
  cleanupSupabaseServiceTest,
  setupSupabaseServiceTest,
  TEST_TIMEOUT
} from './test-setup';


function chainable(resolveValue: any = {data: null, error: null}) {
  const m: any = {};
  ['select', 'filter', 'eq', 'neq', 'is', 'in', 'range', 'order', 'limit', 'single',
    'insert', 'update', 'delete', 'upsert', 'ilike'].forEach(method => {
    m[method] = () => m;
  });
  m.then = (res: Function, rej?: Function) =>
    Promise.resolve(resolveValue).then(res as any, rej as any);
  return m;
}

describe('SupabaseService - GET cached delegates', () => {
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
  
  describe('GET.rackWithId', () => {
    it('should return rack data for the given id', (done) => {
      const mockRack = {data: {id: 7, name: 'Studio Rack'}, error: null};
      spyOn(supabaseClient, 'from').and.returnValue(chainable(mockRack));
      
      service.GET.rackWithId(7).subscribe({
        next: (result: any) => {
          expect(result.data.id).toBe(7);
          done();
        },
        error: (err) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
  });
  
  describe('GET.comments', () => {
    it('should return comments for the given entity', (done) => {
      const mockComments = {data: [{id: 1, content: 'Nice patch!'}], error: null};
      spyOn(supabaseClient, 'from').and.returnValue(chainable(mockComments));
      
      service.GET.comments(42, 1).subscribe({
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
  });
  
  describe('GET.manufacturers', () => {
    it('should return manufacturers list', (done) => {
      const mockMfrs = {data: [{id: 1, name: 'Moog'}, {id: 2, name: 'Doepfer'}], error: null};
      spyOn(supabaseClient, 'from').and.returnValue(chainable(mockMfrs));
      
      service.GET.manufacturers().subscribe({
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
  });
  
  describe('GET.patchConnections', () => {
    it('should return patch connections for the given patchid', (done) => {
      const mockConns = {data: [{id: 1, patchid: 3, a: 10, b: 20}], error: null};
      spyOn(supabaseClient, 'from').and.returnValue(chainable(mockConns));
      
      service.GET.patchConnections(3).subscribe({
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
  });
  
  describe('GET.patchModuleInstances', () => {
    it('should return patch module instances for the given patch_id', (done) => {
      const mockInstances = {data: [{id: 1, patch_id: 5, module_id: 10, instance_label: 'VCO'}], error: null};
      spyOn(supabaseClient, 'from').and.returnValue(chainable(mockInstances));
      
      service.GET.patchModuleInstances(5).subscribe({
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
  });
  
  describe('GET.moduleWithId', () => {
    it('should return module data for the given id', (done) => {
      const mockModule = {data: {id: 11, name: 'Ripples'}, error: null};
      spyOn(supabaseClient, 'from').and.returnValue(chainable(mockModule));
      
      service.GET.moduleWithId(11).subscribe({
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
  });
  
  describe('GET.patches', () => {
    it('should return patches list on default call', (done) => {
      const mockPatches = {data: [{id: 1, name: 'Ambient 1'}], count: 1, error: null};
      spyOn(supabaseClient, 'from').and.returnValue(chainable(mockPatches));
      
      service.GET.patches().subscribe({
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
    
    it('should apply ilike name filter when name is provided', (done) => {
      const mock = chainable({data: [], count: 0, error: null});
      const ilikeSpy = spyOn(mock, 'ilike').and.returnValue(mock);
      spyOn(supabaseClient, 'from').and.returnValue(mock);
      
      service.GET.patches(0, 10, 'Ambient').subscribe({
        next: () => {
          expect(ilikeSpy).toHaveBeenCalledWith('name', jasmine.stringContaining('ambient'));
          done();
        },
        error: (err) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
  });
  
  describe('GET.racksMinimal', () => {
    it('should return racks list on default call', (done) => {
      const mockRacks = {data: [{id: 1, name: 'My Rack'}], count: 1, error: null};
      spyOn(supabaseClient, 'from').and.returnValue(chainable(mockRacks));
      
      service.GET.racksMinimal().subscribe({
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
    
    it('should apply ilike name filter when name is provided', (done) => {
      const mock = chainable({data: [], count: 0, error: null});
      const ilikeSpy = spyOn(mock, 'ilike').and.returnValue(mock);
      spyOn(supabaseClient, 'from').and.returnValue(mock);
      
      service.GET.racksMinimal(0, undefined, 'studio').subscribe({
        next: () => {
          expect(ilikeSpy).toHaveBeenCalledWith('name', jasmine.stringContaining('studio'));
          done();
        },
        error: (err) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
  });
  
  describe('GET.currentUserModules', () => {
    it('should return current user modules with collectionUpdated metadata', (done) => {
      const mockUser = {id: 'u1'};
      spyOn(service as any, 'getUserSession$').and.returnValue(of(mockUser));
      
      spyOn(supabaseClient, 'from').and.returnValue(
        chainable({
          data: [
            {
              collectionUpdated: '2026-02-25T12:00:00.000Z',
              module: {id: 1, name: 'VCO'}
            }
          ],
          error: null
        })
      );
      
      service.GET.currentUserModules().subscribe({
        next: (result: any) => {
          expect(result).toBeDefined();
          expect(result[0].collectionUpdated).toBe('2026-02-25T12:00:00.000Z');
          done();
        },
        error: (err) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
    
    it('should apply whitelisted backend module name ordering when requested', (done) => {
      const mockUser = {id: 'u1'};
      spyOn(service as any, 'getUserSession$').and.returnValue(of(mockUser));
      
      const query = chainable({data: [{collectionUpdated: null, module: {id: 1, name: 'VCO'}}], error: null});
      const orderSpy = spyOn(query, 'order').and.returnValue(query);
      spyOn(supabaseClient, 'from').and.returnValue(query);
      
      service.GET.currentUserModules(true, false, {key: 'moduleName', direction: 'desc'}).subscribe({
        next: () => {
          expect(orderSpy).toHaveBeenCalledWith('name', jasmine.objectContaining({
            foreignTable: 'module',
            ascending: false
          }));
          const hasUserModulesUpdatedOrdering = orderSpy.calls.allArgs().some(args => args[0] === 'updated');
          expect(hasUserModulesUpdatedOrdering).toBeFalse();
          done();
        },
        error: (err) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
  });
  
  describe('GET.currentUserComments', () => {
    it('should return current user comments', (done) => {
      const mockUser = {id: 'u2'};
      spyOn(service as any, 'getUserSession$').and.returnValue(of(mockUser));
      
      spyOn(supabaseClient, 'from').and.returnValue(chainable({data: [{id: 1, content: 'Hello'}], error: null}));
      
      service.GET.currentUserComments().subscribe({
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
  });
});
