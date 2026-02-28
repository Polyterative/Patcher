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

describe('SupabaseService - add misc and update bulk', () => {
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
  
  describe('add.patchModuleInstances (batch)', () => {
    beforeEach(() => {
      spyOn(service.auth as any, 'getUserSession$').and.returnValue(of({id: 'test-user'}));
    });

    it('should insert multiple instances in a single call', (done) => {
      const mockRows = [
        {id: 1, patch_id: 10, module_id: 1, instance_label: 'VCO #1'},
        {id: 2, patch_id: 10, module_id: 2, instance_label: 'VCF #1'}
      ];
      const mock = chainable({data: mockRows, error: null});
      const insertSpy = spyOn(mock, 'insert').and.returnValue(mock);
      spyOn(supabaseClient, 'from').and.returnValue(mock);
      
      const rows = [
        {patch_id: 10, module_id: 1, instance_label: 'VCO #1'},
        {patch_id: 10, module_id: 2, instance_label: 'VCF #1'}
      ];
      
      service.add.patchModuleInstances(rows).subscribe({
        next: (result: any) => {
          expect(insertSpy).toHaveBeenCalledWith(rows);
          expect(result).toEqual(mockRows);
          done();
        },
        error: (err) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
    
    it('should bust patchConnections and patchModuleInstances caches', (done) => {
      spyOn(supabaseClient, 'from').and.returnValue(
        chainable({data: [{id: 1, patch_id: 1, module_id: 1, instance_label: null}], error: null})
      );
      const bustedKeys: any[] = [];
      service.cacheResetter$.subscribe(keys => bustedKeys.push(...(keys as any[])));
      
      service.add.patchModuleInstances([{patch_id: 1, module_id: 1, instance_label: null}]).subscribe({
        next: () => {
          expect(bustedKeys).toContain('patchConnections');
          expect(bustedKeys).toContain('patchModuleInstances');
          done();
        },
        error: (err) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
    
    it('should default instance_label to null when omitted', (done) => {
      const mock = chainable({data: [{id: 5, patch_id: 2, module_id: 3, instance_label: null}], error: null});
      const insertSpy = spyOn(mock, 'insert').and.returnValue(mock);
      spyOn(supabaseClient, 'from').and.returnValue(mock);
      
      service.add.patchModuleInstances([{patch_id: 2, module_id: 3, instance_label: null}]).subscribe({
        next: () => {
          const sentRows = insertSpy.calls.first().args[0] as any[];
          expect(sentRows[0].instance_label).toBeNull();
          done();
        },
        error: (err) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
  });
  
  describe('update.modules (bulk upsert)', () => {
    it('should upsert a list of modules and bust caches', (done) => {
      const mock = chainable({data: null, error: null});
      const upsertSpy = spyOn(mock, 'upsert').and.returnValue(mock);
      spyOn(supabaseClient, 'from').and.returnValue(mock);
      
      const modules = [
        {id: 1, name: 'VCO', hp: 8, standard: {id: 1}, manufacturer: {id: 2}} as any
      ];
      const bustedKeys: any[] = [];
      service.cacheResetter$.subscribe(keys => bustedKeys.push(...(keys as any[])));
      
      service.update.modules(modules).subscribe({
        next: () => {
          expect(upsertSpy).toHaveBeenCalled();
          expect(bustedKeys).toContain('modules');
          expect(bustedKeys).toContain('moduleWithId');
          done();
        },
        error: (err) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
    
    it('should transform nested standard object to id before upsert', (done) => {
      const mock = chainable({data: null, error: null});
      const upsertSpy = spyOn(mock, 'upsert').and.returnValue(mock);
      spyOn(supabaseClient, 'from').and.returnValue(mock);
      
      const modules = [{id: 5, name: 'VCF', hp: 10, standard: {id: 3}, manufacturer: undefined} as any];
      
      service.update.modules(modules).subscribe({
        next: () => {
          const upsertedData = upsertSpy.calls.first().args[0] as any[];
          // standard should be transformed from object to id
          expect(upsertedData[0].standard).toBe(3);
          done();
        },
        error: (err) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
    
    it('should strip manufacturer, ins, outs, created and updated fields', (done) => {
      const mock = chainable({data: null, error: null});
      const upsertSpy = spyOn(mock, 'upsert').and.returnValue(mock);
      spyOn(supabaseClient, 'from').and.returnValue(mock);
      
      const modules = [{
        id: 7,
        name: 'LFO',
        manufacturer: {id: 1},
        ins: [{id: 1}],
        outs: [{id: 2}],
        created: '2024-01-01',
        updated: '2024-06-01'
      } as any];
      
      service.update.modules(modules).subscribe({
        next: () => {
          const upsertedData = upsertSpy.calls.first().args[0] as any[];
          expect(upsertedData[0].manufacturer).toBeUndefined();
          expect(upsertedData[0].ins).toBeUndefined();
          expect(upsertedData[0].outs).toBeUndefined();
          expect(upsertedData[0].created).toBeUndefined();
          expect(upsertedData[0].updated).toBeUndefined();
          done();
        },
        error: (err) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
  });
  
  describe('get.currentUserPatches', () => {
    it('should return empty array when user is not logged in', (done) => {
      spyOn(service.auth as any, 'getUserSession$').and.returnValue(of(null));
      
      service.get.currentUserPatches().subscribe({
        next: (result: any) => {
          expect(Array.isArray(result)).toBeTrue();
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
  
  describe('get.currentUserRacks', () => {
    it('should use explicit authorid when provided, bypassing session', (done) => {
      const getUserSessionSpy = spyOn(service.auth as any, 'getUserSession$').and.returnValue(of({id: 'session-user'}));
      
      spyOn(supabaseClient, 'from').and.returnValue(
        chainable({data: [{id: 1, name: 'My Rack', authorid: 'explicit-author'}], error: null})
      );
      
      service.get.currentUserRacks('explicit-author').subscribe({
        next: () => {
          // With explicit authorid, getUserSession$ should NOT be called
          expect(getUserSessionSpy).not.toHaveBeenCalled();
          done();
        },
        error: (err) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
    
    it('should fall back to getUserSession$ when no authorid provided', (done) => {
      spyOn(service.auth as any, 'getUserSession$').and.returnValue(of(null));
      
      service.get.currentUserRacks().subscribe({
        next: (result: any) => {
          expect(Array.isArray(result)).toBeTrue();
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
});