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

describe('SupabaseService - update extended', () => {
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
  
  describe('update.patch', () => {
    beforeEach(() => {
      spyOn(service.auth as any, 'getUserSession$').and.returnValue(of({id: 'test-user'}));
    });

    it('should update a patch and strip the author field', (done) => {
      const mock = chainable({data: {id: 1}, error: null});
      const updateSpy = spyOn(mock, 'update').and.returnValue(mock);
      spyOn(supabaseClient, 'from').and.returnValue(mock);
      
      const patchData = {id: 1, name: 'Edited Patch', author: {id: 'u1'}} as any;
      service.update.patch(patchData).subscribe({
        next: () => {
          const sentData = updateSpy.calls.first().args[0] as any;
          expect(sentData.author).toBeUndefined();
          expect(sentData.name).toBe('Edited Patch');
          done();
        },
        error: (err) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
    
    it('should bust patches cache', (done) => {
      spyOn(supabaseClient, 'from').and.returnValue(chainable({data: {id: 1}, error: null}));
      const bustedKeys: any[] = [];
      service.cacheResetter$.subscribe(keys => bustedKeys.push(...(keys as any[])));
      
      service.update.patch({id: 1, name: 'X'} as any).subscribe({
        next: () => {
          expect(bustedKeys).toContain('patches');
          done();
        },
        error: (err) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
  });
  
  describe('update.patchSilent', () => {
    beforeEach(() => {
      spyOn(service.auth as any, 'getUserSession$').and.returnValue(of({id: 'test-user'}));
    });

    it('should update a patch without showing a success toast', (done) => {
      const mock = chainable({data: {id: 2}, error: null});
      const updateSpy = spyOn(mock, 'update').and.returnValue(mock);
      spyOn(supabaseClient, 'from').and.returnValue(mock);
      
      const patchData = {id: 2, name: 'Silent Edit', author: {id: 'u2'}} as any;
      service.update.patchSilent(patchData).subscribe({
        next: () => {
          const sentData = updateSpy.calls.first().args[0] as any;
          expect(sentData.author).toBeUndefined();
          done();
        },
        error: (err) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
    
    it('should bust patches cache', (done) => {
      spyOn(supabaseClient, 'from').and.returnValue(chainable({data: {id: 2}, error: null}));
      const bustedKeys: any[] = [];
      service.cacheResetter$.subscribe(keys => bustedKeys.push(...(keys as any[])));
      
      service.update.patchSilent({id: 2, name: 'S'} as any).subscribe({
        next: () => {
          expect(bustedKeys).toContain('patches');
          done();
        },
        error: (err) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
  });
  
  describe('update.patchConnectionNoteSilent', () => {
    beforeEach(() => {
      spyOn(service.auth as any, 'getUserSession$').and.returnValue(of({id: 'test-user'}));
    });

    const mockConn = () => ({
      patch: {id: 1},
      a: {id: 10, name: 'out', module: {id: 100} as any},
      b: {id: 20, name: 'in', module: {id: 200} as any},
      notes: 'pitch',
      instance_id_a: undefined as number | undefined,
      instance_id_b: undefined as number | undefined
    });
    
    it('should update the notes field', (done) => {
      const mock = chainable({data: null, error: null});
      const updateSpy = spyOn(mock, 'update').and.returnValue(mock);
      spyOn(supabaseClient, 'from').and.returnValue(mock);
      
      const conn = {...mockConn(), notes: 'gate'} as any;
      service.update.patchConnectionNoteSilent(conn).subscribe({
        next: () => {
          expect(updateSpy).toHaveBeenCalledWith({notes: 'gate'});
          done();
        },
        error: (err) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
    
    it('should use .is() for null instance_id_a (null branch)', (done) => {
      const mock = chainable({data: null, error: null});
      const isSpy = spyOn(mock, 'is').and.returnValue(mock);
      spyOn(supabaseClient, 'from').and.returnValue(mock);
      
      const conn = {...mockConn(), instance_id_a: null, instance_id_b: null} as any;
      service.update.patchConnectionNoteSilent(conn).subscribe({
        next: () => {
          expect(isSpy).toHaveBeenCalledWith('instance_id_a', null);
          expect(isSpy).toHaveBeenCalledWith('instance_id_b', null);
          done();
        },
        error: (err) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
    
    it('should use .eq() for non-null instance_id_a (non-null branch)', (done) => {
      const mock = chainable({data: null, error: null});
      const eqSpy = spyOn(mock, 'eq').and.returnValue(mock);
      spyOn(supabaseClient, 'from').and.returnValue(mock);
      
      const conn = {...mockConn(), instance_id_a: 5, instance_id_b: 6} as any;
      service.update.patchConnectionNoteSilent(conn).subscribe({
        next: () => {
          expect(eqSpy).toHaveBeenCalledWith('instance_id_a', 5);
          expect(eqSpy).toHaveBeenCalledWith('instance_id_b', 6);
          done();
        },
        error: (err) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
  });
  
  describe('update.patchModuleInstanceLabel', () => {
    beforeEach(() => {
      spyOn(service.auth as any, 'getUserSession$').and.returnValue(of({id: 'test-user'}));
    });

    it('should update instance label and return a PatchModuleInstance', (done) => {
      const mockInstance = {id: 3, patch_id: 1, module_id: 2, instance_label: 'VCO #2'};
      spyOn(supabaseClient, 'from').and.returnValue(chainable({data: mockInstance, error: null}));
      
      service.update.patchModuleInstanceLabel(3, 'VCO #2').subscribe({
        next: (result: any) => {
          expect(result.instance_label).toBe('VCO #2');
          done();
        },
        error: (err) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
    
    it('should accept null label (clearing the label)', (done) => {
      const mock = chainable({data: {id: 3, instance_label: null}, error: null});
      const updateSpy = spyOn(mock, 'update').and.returnValue(mock);
      spyOn(supabaseClient, 'from').and.returnValue(mock);
      
      service.update.patchModuleInstanceLabel(3, null).subscribe({
        next: () => {
          expect(updateSpy).toHaveBeenCalledWith({instance_label: null});
          done();
        },
        error: (err) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
  });
  
  describe('update.rackedModules', () => {
    beforeEach(() => {
      spyOn(service.auth as any, 'getUserSession$').and.returnValue(of({id: 'test-user'}));
    });

    it('should upsert existing modules (with defined id)', (done) => {
      const mock = chainable({data: null, error: null});
      const upsertSpy = spyOn(mock, 'upsert').and.returnValue(mock);
      spyOn(supabaseClient, 'from').and.returnValue(mock);
      
      const data = [{
        rackingData: {id: 1, rackid: 5, moduleid: 10, row: 0, column: 0},
        module: {id: 10} as any
      }];
      
      service.update.rackedModules(data).subscribe({
        next: () => {
          expect(upsertSpy).toHaveBeenCalled();
          done();
        },
        error: (err) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
    
    it('should insert new modules when rackingData.id is undefined', (done) => {
      const mock = chainable({data: null, error: null});
      const insertSpy = spyOn(mock, 'insert').and.returnValue(mock);
      spyOn(supabaseClient, 'from').and.returnValue(mock);
      
      const data = [{
        rackingData: {id: undefined as any, rackid: 5, moduleid: 11, row: 1, column: 2},
        module: {id: 11} as any
      }];
      
      service.update.rackedModules(data).subscribe({
        next: () => {
          expect(insertSpy).toHaveBeenCalled();
          done();
        },
        error: (err) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
  });
  
  describe('update.patchConnections', () => {
    it('should call buildPatchConnectionInserter and bust cache', (done) => {
      spyOn(supabaseClient, 'from').and.returnValue(chainable({data: [], error: null}));
      const bustedKeys: any[] = [];
      service.cacheResetter$.subscribe(keys => bustedKeys.push(...(keys as any[])));

      service.update.patchConnections([]).subscribe({
        next: () => {
          expect(supabaseClient.from).toHaveBeenCalled();
          expect(bustedKeys).toContain('patchConnections');
          done();
        },
        error: (err) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
  });

  describe('update.patchConnectionsSilent', () => {
    it('should call buildPatchConnectionInserter silently and bust cache', (done) => {
      spyOn(supabaseClient, 'from').and.returnValue(chainable({data: [], error: null}));
      const bustedKeys: any[] = [];
      service.cacheResetter$.subscribe(keys => bustedKeys.push(...(keys as any[])));

      service.update.patchConnectionsSilent([]).subscribe({
        next: () => {
          expect(supabaseClient.from).toHaveBeenCalled();
          expect(bustedKeys).toContain('patchConnections');
          done();
        },
        error: (err) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
  });

  describe('update.moduleINsOUTs', () => {
    it('should complete and bust modules cache', (done) => {
      const mockUser = {id: 'editor-1'};
      spyOn(service.auth as any, 'getUserSession$').and.returnValue(of(mockUser));
      spyOn(supabaseClient, 'from').and.returnValue(chainable({data: null, error: null}));
      const bustedKeys: any[] = [];
      service.cacheResetter$.subscribe(keys => bustedKeys.push(...(keys as any[])));
      
      // CV with id=0 triggers the insert path in buildCVInserter, giving forkJoin a non-empty observable array
      service.update.moduleINsOUTs(1, [{id: 0, name: 'A'} as any], []).subscribe({
        next: () => {
          expect(bustedKeys).toContain('modules');
          done();
        },
        error: (err) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
    
    it('should prefer explicit authorid over user session id', (done) => {
      const mockUser = {id: 'session-user'};
      spyOn(service.auth as any, 'getUserSession$').and.returnValue(of(mockUser));
      
      const insertMock = chainable({data: null, error: null});
      const insertSpy = spyOn(insertMock, 'insert').and.returnValue(insertMock);
      spyOn(supabaseClient, 'from').and.returnValue(insertMock);
      
      // CV with id=0 triggers insert path in buildCVInserter
      service.update.moduleINsOUTs(1, [{id: 0, name: 'A'} as any], [], 'explicit-author').subscribe({
        next: () => {
          const insertedData = insertSpy.calls.first().args[0] as any;
          expect(insertedData.authorid).toBe('explicit-author');
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