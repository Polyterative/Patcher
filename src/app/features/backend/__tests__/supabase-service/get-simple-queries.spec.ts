import { SupabaseService } from '../../supabase.service';
import {
  cleanupSupabaseServiceTest,
  setupSupabaseServiceTest,
  TEST_TIMEOUT
} from './test-setup';


/** Builds a chainable Supabase query mock that resolves as a thenable. */
function chainable(resolveValue: any = {data: null, error: null}) {
  const m: any = {};
  ['select', 'filter', 'eq', 'neq', 'is', 'in', 'range', 'order', 'limit', 'single', 'maybeSingle',
    'insert', 'update', 'delete', 'upsert'].forEach(method => {
    m[method] = () => m;
  });
  m.then = (res: Function, rej?: Function) =>
    Promise.resolve(resolveValue).then(res as any, rej as any);
  return m;
}

describe('SupabaseService - get simple queries', () => {
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
  
  describe('get.standards', () => {
    it('should return data from the standards table', (done) => {
      const mockData = [{id: 0, name: '3U'}, {id: 1, name: 'Intellijel 1U'}];
      spyOn(supabaseClient, 'from').and.returnValue(chainable({data: mockData, error: null}));
      
      service.get.standards().subscribe({
        next: (result: any) => {
          expect(result.data).toEqual(mockData);
          done();
        },
        error: (err) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
    
    it('should query the correct table', (done) => {
      const fromSpy = spyOn(supabaseClient, 'from').and.returnValue(
        chainable({data: [], error: null})
      );
      
      service.get.standards().subscribe({
        next: () => {
          expect(fromSpy).toHaveBeenCalled();
          done();
        },
        error: (err) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
  });
  
  describe('get.manufacturerWithId', () => {
    it('should resolve with the manufacturer data', (done) => {
      const mockData = {id: 5, name: 'Mutable Instruments'};
      spyOn(supabaseClient, 'from').and.returnValue(chainable({data: mockData, error: null}));
      
      service.get.manufacturerWithId(5).subscribe({
        next: (result: any) => {
          expect(result.data).toEqual(mockData);
          done();
        },
        error: (err) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
    
    it('should use default pagination parameters', (done) => {
      const mock = chainable({data: {id: 1}, error: null});
      const rangeSpy = spyOn(mock, 'range').and.returnValue(mock);
      spyOn(supabaseClient, 'from').and.returnValue(mock);
      
      service.get.manufacturerWithId(1).subscribe({
        next: () => {
          expect(rangeSpy).toHaveBeenCalled();
          done();
        },
        error: (err) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
  });
  
  describe('get.userWithId', () => {
    it('should resolve with user profile data', (done) => {
      const mockData = {id: 'user-42', username: 'patcher_fan'};
      spyOn(supabaseClient, 'from').and.returnValue(chainable({data: mockData, error: null}));
      
      service.get.userWithId('user-42').subscribe({
        next: (result: any) => {
          expect(result.data).toEqual(mockData);
          done();
        },
        error: (err) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
  });
  
  describe('get.patchWithId', () => {
    it('should resolve with patch data', (done) => {
      const mockData = {id: 10, name: 'My Patch', author: {id: 'u1'}};
      spyOn(supabaseClient, 'from').and.returnValue(chainable({data: mockData, error: null}));
      
      service.get.patchWithId(10).subscribe({
        next: (result: any) => {
          expect(result.data.id).toBe(10);
          done();
        },
        error: (err) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
    
    it('should accept a custom columns argument', (done) => {
      const mock = chainable({data: {id: 10}, error: null});
      const selectSpy = spyOn(mock, 'select').and.returnValue(mock);
      spyOn(supabaseClient, 'from').and.returnValue(mock);
      
      service.get.patchWithId(10, 'id,name').subscribe({
        next: () => {
          expect(selectSpy).toHaveBeenCalledWith(jasmine.stringContaining('id,name'));
          done();
        },
        error: (err) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
  });
  
  describe('get.rackedModules', () => {
    it('should map raw rows to rackingData + module shape', (done) => {
      const rawRow = {
        id: 1,
        row: 0,
        column: 2,
        moduleid: 42,
        rackid: 7,
        module: {
          id: 42,
          name: 'VCO',
          tags: [
            {
              id: 8,
              tag: {id: 3, name: 'VCO', type: 0},
              voteCount: [{moduletagid: 8}]
            }
          ]
        }
      };
      spyOn(supabaseClient, 'from').and.returnValue(chainable({data: [rawRow], error: null}));
      
      service.get.rackedModules(7).subscribe({
        next: (result: any[]) => {
          expect(result.length).toBe(1);
          expect(result[0].module.id).toBe(42);
          expect(result[0].module.tags?.[0]?.tag?.name).toBe('VCO');
          expect(result[0].rackingData.rackid).toBe(7);
          expect(result[0].rackingData.row).toBe(0);
          expect(result[0].rackingData.column).toBe(2);
          done();
        },
        error: (err) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);

    it('requests module tags in the rack-module join', (done) => {
      const mock = chainable({data: [], error: null});
      const selectSpy = spyOn(mock, 'select').and.returnValue(mock);
      spyOn(supabaseClient, 'from').and.returnValue(mock);

      service.get.rackedModules(7).subscribe({
        next: () => {
          expect(selectSpy).toHaveBeenCalledWith(jasmine.stringContaining('tags:module_tags'));
          done();
        },
        error: (err) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);

    it('requests module ins and outs in the rack-module join', (done) => {
      const mock = chainable({data: [], error: null});
      const selectSpy = spyOn(mock, 'select').and.returnValue(mock);
      spyOn(supabaseClient, 'from').and.returnValue(mock);

      service.get.rackedModules(7).subscribe({
        next: () => {
          expect(selectSpy).toHaveBeenCalledWith(jasmine.stringContaining('ins:module_ins'));
          expect(selectSpy).toHaveBeenCalledWith(jasmine.stringContaining('outs:module_outs'));
          done();
        },
        error: (err) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
    
    it('should map selected_panel_id from raw row to selectedPanelId', (done) => {
      const rawRow = {id: 1, row: 0, column: 0, moduleid: 10, rackid: 3, selected_panel_id: 5, module: {id: 10}};
      spyOn(supabaseClient, 'from').and.returnValue(chainable({data: [rawRow], error: null}));
      
      service.get.rackedModules(3).subscribe({
        next: (result: any[]) => {
          expect(result[0].rackingData.selectedPanelId).toBe(5);
          done();
        },
        error: (err) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
    
    it('should map null selected_panel_id to selectedPanelId null', (done) => {
      const rawRow = {id: 2, row: 0, column: 0, moduleid: 10, rackid: 3, selected_panel_id: null, module: {id: 10}};
      spyOn(supabaseClient, 'from').and.returnValue(chainable({data: [rawRow], error: null}));
      
      service.get.rackedModules(3).subscribe({
        next: (result: any[]) => {
          expect(result[0].rackingData.selectedPanelId).toBeNull();
          done();
        },
        error: (err) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);

    it('should return an empty array when rack has no modules', (done) => {
      spyOn(supabaseClient, 'from').and.returnValue(chainable({data: [], error: null}));
      
      service.get.rackedModules(99).subscribe({
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

  describe('get.publicProfileByUsername', () => {
    it('should resolve with public profile data for a username', (done) => {
      const mockData = {
        id: 'user-42',
        username: 'patcher_fan',
        public: true,
        website: 'https://example.com',
        avatar_url: null,
      };
      spyOn(supabaseClient, 'from').and.returnValue(chainable({data: mockData, error: null}));

      service.get.publicProfileByUsername('patcher_fan').subscribe({
        next: (result: any) => {
          expect(result.data).toEqual(mockData);
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
