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
    'insert', 'update', 'delete', 'upsert'].forEach(method => {
    m[method] = () => m;
  });
  m.then = (res: Function, rej?: Function) =>
    Promise.resolve(resolveValue).then(res as any, rej as any);
  return m;
}

describe('SupabaseService - add extended', () => {
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
  
  describe('add.module_tags', () => {
    it('should upsert module tags and complete', (done) => {
      const mock = chainable({data: null, error: null});
      const upsertSpy = spyOn(mock, 'upsert').and.returnValue(mock);
      spyOn(supabaseClient, 'from').and.returnValue(mock);
      
      service.add.module_tags([{moduleid: 1, tagid: 2} as any]).subscribe({
        next: () => {
          expect(upsertSpy).toHaveBeenCalledWith([{moduleid: 1, tagid: 2}]);
          done();
        },
        error: (err) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
  });
  
  describe('add.userModuleTag', () => {
    it('should insert tag vote with user id and module tag id', (done) => {
      const mockUser = {id: 'voter-1', email: 'voter@test.com'};
      spyOn(service.auth as any, 'getUserSession$').and.returnValue(of(mockUser));
      
      const mock = chainable({data: null, error: null});
      const insertSpy = spyOn(mock, 'insert').and.returnValue(mock);
      spyOn(supabaseClient, 'from').and.returnValue(mock);
      
      service.add.userModuleTag(55).subscribe({
        next: () => {
          expect(insertSpy).toHaveBeenCalledWith({moduletagid: 55, authorid: 'voter-1'});
          done();
        },
        error: (err) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
  });
  
  describe('add.moduleTagLink', () => {
    it('should insert a module-tag link and return the new id', (done) => {
      const mockUser = {id: 'user-x'};
      spyOn(service.auth as any, 'getUserSession$').and.returnValue(of(mockUser));
      
      const mock = chainable({data: {id: 77}, error: null});
      const insertSpy = spyOn(mock, 'insert').and.returnValue(mock);
      spyOn(supabaseClient, 'from').and.returnValue(mock);
      
      service.add.moduleTagLink(10, 3).subscribe({
        next: (result: any) => {
          expect(insertSpy).toHaveBeenCalledWith({moduleid: 10, tagid: 3});
          expect(result.id).toBe(77);
          done();
        },
        error: (err) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
  });
  
  describe('add.manufacturers', () => {
    it('should insert manufacturers and return id+name', (done) => {
      const mockData = [{id: 1, name: 'New Maker'}];
      const mock = chainable({data: mockData, error: null});
      const insertSpy = spyOn(mock, 'insert').and.returnValue(mock);
      spyOn(supabaseClient, 'from').and.returnValue(mock);
      
      service.add.manufacturers([{name: 'New Maker'}]).subscribe({
        next: (result: any) => {
          expect(insertSpy).toHaveBeenCalledWith([{name: 'New Maker'}]);
          expect(result.data).toEqual(mockData);
          done();
        },
        error: (err) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
    
    it('should bust manufacturers cache', (done) => {
      spyOn(supabaseClient, 'from').and.returnValue(chainable({data: [], error: null}));
      let busted = false;
      service.cacheResetter$.subscribe(keys => {
        if ((keys as any[]).includes('manufacturers')) busted = true;
      });
      
      service.add.manufacturers([{name: 'X'}]).subscribe({
        next: () => {
          expect(busted).toBeTrue();
          done();
        },
        error: (err) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
  });
  
  describe('add.panel', () => {
    it('should insert a module panel record', (done) => {
      const panelData = [{moduleid: 1, color: 0, filename: 'panel.jpg', description: 'Light'} as any];
      const mock = chainable({data: null, error: null});
      const insertSpy = spyOn(mock, 'insert').and.returnValue(mock);
      spyOn(supabaseClient, 'from').and.returnValue(mock);
      
      service.add.panel(panelData).subscribe({
        next: () => {
          expect(insertSpy).toHaveBeenCalledWith(panelData);
          done();
        },
        error: (err) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
  });
  
  describe('add.patchModuleInstance', () => {
    it('should insert an instance and return PatchModuleInstance', (done) => {
      const mockInstance = {id: 10, patch_id: 1, module_id: 2, instance_label: 'VCO #1'};
      spyOn(supabaseClient, 'from').and.returnValue(chainable({data: mockInstance, error: null}));
      
      service.add.patchModuleInstance(1, 2, 'VCO #1').subscribe({
        next: (result: any) => {
          expect(result.id).toBe(10);
          expect(result.instance_label).toBe('VCO #1');
          done();
        },
        error: (err) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
    
    it('should default instance_label to null when not provided', (done) => {
      const mock = chainable({data: {id: 5, patch_id: 1, module_id: 2, instance_label: null}, error: null});
      const insertSpy = spyOn(mock, 'insert').and.returnValue(mock);
      spyOn(supabaseClient, 'from').and.returnValue(mock);
      
      service.add.patchModuleInstance(1, 2).subscribe({
        next: () => {
          expect(insertSpy).toHaveBeenCalledWith(
            jasmine.objectContaining({instance_label: null})
          );
          done();
        },
        error: (err) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
  });
  
  describe('add.modules', () => {
    it('should insert new modules (id=0) and update existing ones (id>0)', (done) => {
      const mockUser = {id: 'submitter-1'};
      spyOn(service.auth as any, 'getUserSession$').and.returnValue(of(mockUser));
      
      const mock = chainable({data: null, error: null});
      const insertSpy = spyOn(mock, 'insert').and.returnValue(mock);
      const updateSpy = spyOn(mock, 'update').and.returnValue(mock);
      spyOn(supabaseClient, 'from').and.returnValue(mock);
      
      const newModule = {
        id: 0, name: 'New VCO', hp: 8,
        standard: {id: 0}, manufacturer: {id: 1},
        ins: [], outs: [], switches: [], panels: [], tags: []
      } as any;
      
      const existingModule = {
        id: 99, name: 'Old VCF', hp: 12,
        standard: {id: 0}, manufacturer: {id: 1},
        ins: [], outs: [], switches: [], panels: [], tags: []
      } as any;
      
      service.add.modules([newModule, existingModule]).subscribe({
        next: () => {
          expect(insertSpy).toHaveBeenCalled();
          expect(updateSpy).toHaveBeenCalled();
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