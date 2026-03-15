import { of } from 'rxjs';
import { SupabaseService } from '../../supabase.service';
import { createUpdateNamespace } from '../../supabase-update';
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

describe('SupabaseService - update.module', () => {
  let service: SupabaseService;
  let supabaseClient: any;
  
  beforeEach(() => {
    const setup = setupSupabaseServiceTest();
    service = setup.service;
    supabaseClient = (service as any).supabase;
    spyOn(service.auth as any, 'getUserSession$').and.returnValue(of({id: 'test-user-id'}));
  });
  
  afterEach(() => {
    cleanupSupabaseServiceTest();
  });
  
  it('should send an update to the modules table', (done) => {
    const mock = chainable({data: [{id: 5, updated: new Date().toISOString(), created: ''}], error: null});
    const updateSpy = spyOn(mock, 'update').and.returnValue(mock);
    spyOn(supabaseClient, 'from').and.returnValue(mock);
    
    service.update.module({id: 5, name: 'VCO', hp: 8} as any).subscribe({
      next: () => {
        expect(updateSpy).toHaveBeenCalled();
        done();
      },
      error: (err) => {
        fail(err);
        done();
      }
    });
  }, TEST_TIMEOUT);
  
  it('should strip the manufacturer field before sending', (done) => {
    const mock = chainable({data: [{id: 3}], error: null});
    const updateSpy = spyOn(mock, 'update').and.returnValue(mock);
    spyOn(supabaseClient, 'from').and.returnValue(mock);
    
    service.update.module({id: 3, name: 'Filter', manufacturer: {id: 10, name: 'Moog'} as any} as any).subscribe({
      next: () => {
        const payload = updateSpy.calls.first().args[0] as any;
        expect(payload.manufacturer).toBeUndefined();
        done();
      },
      error: (err) => {
        fail(err);
        done();
      }
    });
  }, TEST_TIMEOUT);
  
  it('should strip ins, outs, tags, panels fields', (done) => {
    const mock = chainable({data: [{id: 4}], error: null});
    const updateSpy = spyOn(mock, 'update').and.returnValue(mock);
    spyOn(supabaseClient, 'from').and.returnValue(mock);
    
    service.update.module({
      id: 4, name: 'Env', hp: 4,
      ins: [{}], outs: [{}], tags: [{}], panels: [{}]
    } as any).subscribe({
      next: () => {
        const payload = updateSpy.calls.first().args[0] as any;
        expect(payload.ins).toBeUndefined();
        expect(payload.outs).toBeUndefined();
        expect(payload.tags).toBeUndefined();
        expect(payload.panels).toBeUndefined();
        done();
      },
      error: (err) => {
        fail(err);
        done();
      }
    });
  }, TEST_TIMEOUT);
  
  it('should set updated to a recent ISO timestamp', (done) => {
    const before = Date.now();
    const mock = chainable({data: [{id: 7}], error: null});
    const updateSpy = spyOn(mock, 'update').and.returnValue(mock);
    spyOn(supabaseClient, 'from').and.returnValue(mock);
    
    service.update.module({id: 7, name: 'LFO', hp: 6} as any).subscribe({
      next: () => {
        const payload = updateSpy.calls.first().args[0] as any;
        expect(typeof payload.updated).toBe('string');
        const updatedMs = new Date(payload.updated).getTime();
        expect(updatedMs).toBeGreaterThanOrEqual(before);
        done();
      },
      error: (err) => {
        fail(err);
        done();
      }
    });
  }, TEST_TIMEOUT);
  
  it('should bust modules and moduleWithId caches', (done) => {
    spyOn(supabaseClient, 'from').and.returnValue(
      chainable({data: [{id: 1, updated: '', created: ''}], error: null})
    );
    const bustedKeys: any[] = [];
    service.cacheResetter$.subscribe(keys => bustedKeys.push(...(keys as any[])));
    
    service.update.module({id: 1, name: 'A', hp: 2} as any).subscribe({
      next: () => {
        expect(bustedKeys).toContain('modules');
        expect(bustedKeys).toContain('moduleWithId');
        expect(bustedKeys).toContain('currentUserModules');
        done();
      },
      error: (err) => {
        fail(err);
        done();
      }
    });
  }, TEST_TIMEOUT);
  
  it('should normalise standard object to its id', (done) => {
    const mock = chainable({data: [{id: 2}], error: null});
    const updateSpy = spyOn(mock, 'update').and.returnValue(mock);
    spyOn(supabaseClient, 'from').and.returnValue(mock);
    
    service.update.module({id: 2, name: 'Seq', standard: {id: 1, name: '3U'} as any} as any).subscribe({
      next: () => {
        const payload = updateSpy.calls.first().args[0] as any;
        expect(payload.standard).toBe(1);
        done();
      },
      error: (err) => {
        fail(err);
        done();
      }
    });
  }, TEST_TIMEOUT);
  
  it('should filter the row by the module id', (done) => {
    const mock = chainable({data: [{id: 9}], error: null});
    const eqSpy = spyOn(mock, 'eq').and.returnValue(mock);
    spyOn(supabaseClient, 'from').and.returnValue(mock);

    service.update.module({id: 9, name: 'VCA', hp: 4} as any).subscribe({
      next: () => {
        expect(eqSpy).toHaveBeenCalledWith('id', 9);
        done();
      },
      error: (err) => {
        fail(err);
        done();
      }
    });
  }, TEST_TIMEOUT);
});

describe('update.module - admin vs non-admin submitter filter', () => {
  function buildNamespace(isAdmin: boolean) {
    const eqCalls: Array<[string, unknown]> = [];
    const mock: any = {};
    ['select', 'update', 'insert', 'delete', 'upsert', 'filter'].forEach(m => { mock[m] = () => mock; });
    mock.eq = (col: string, val: unknown) => { eqCalls.push([col, val]); return mock; };
    mock.then = (res: Function) => Promise.resolve({data: [{id: 1, updated: '', created: ''}], error: null}).then(res as any);

    const supabase: any = {from: () => mock};
    const snackBar: any = {open: () => {}};
    const getUserSession$ = () => of({id: 'user-42', created_at: ''} as any);
    const hasAdminRole$ = () => of(isAdmin);
    const ns = createUpdateNamespace(supabase, snackBar, getUserSession$, () => of(null), hasAdminRole$);
    return {ns, eqCalls};
  }

  it('non-admin: applies submitter filter with user id', (done) => {
    const {ns, eqCalls} = buildNamespace(false);
    ns.module({id: 7, name: 'VCO'} as any).subscribe({
      next: () => {
        expect(eqCalls).toContain(jasmine.arrayContaining(['submitter', 'user-42']));
        done();
      },
      error: (err) => { fail(err); done(); }
    });
  });

  it('admin: skips the submitter filter', (done) => {
    const {ns, eqCalls} = buildNamespace(true);
    ns.module({id: 8, name: 'VCA'} as any).subscribe({
      next: () => {
        const submitterCall = eqCalls.find(([col]) => col === 'submitter');
        expect(submitterCall).toBeUndefined();
        done();
      },
      error: (err) => { fail(err); done(); }
    });
  });
});