import { SupabaseService } from '../../supabase.service';
import {
  cleanupSupabaseServiceTest,
  setupSupabaseServiceTest,
  TEST_TIMEOUT
} from './test-setup';
import { of } from 'rxjs';


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

describe('SupabaseService - add.comment', () => {
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
  
  it('should insert a comment with the correct fields', (done) => {
    const mockUser = {id: 'commenter-1'};
    spyOn(service.auth as any, 'getUserSession$').and.returnValue(of(mockUser));
    
    const mock = chainable({data: null, error: null});
    const insertSpy = spyOn(mock, 'insert').and.returnValue(mock);
    spyOn(supabaseClient, 'from').and.returnValue(mock);
    
    service.add.comment({entityId: 5, entityType: 2, content: 'Nice rack!'}).subscribe({
      next: () => {
        expect(insertSpy).toHaveBeenCalledWith(jasmine.objectContaining({
          entityId: 5,
          entityType: 2,
          content: 'Nice rack!',
          authorId: 'commenter-1'
        }));
        done();
      },
      error: (err) => {
        fail(err);
        done();
      }
    });
  }, TEST_TIMEOUT);
  
  it('should bust comments and currentUserComments caches', (done) => {
    const mockUser = {id: 'u'};
    spyOn(service.auth as any, 'getUserSession$').and.returnValue(of(mockUser));
    spyOn(supabaseClient, 'from').and.returnValue(chainable({data: null, error: null}));
    
    const bustedKeys: any[] = [];
    service.cacheResetter$.subscribe(keys => bustedKeys.push(...(keys as any[])));
    
    service.add.comment({entityId: 1, entityType: 1, content: 'test'}).subscribe({
      next: () => {
        expect(bustedKeys).toContain('comments');
        expect(bustedKeys).toContain('currentUserComments');
        done();
      },
      error: (err) => {
        fail(err);
        done();
      }
    });
  }, TEST_TIMEOUT);
  
  it('should insert to the comments table', (done) => {
    const mockUser = {id: 'u'};
    spyOn(service.auth as any, 'getUserSession$').and.returnValue(of(mockUser));
    
    let usedTable = '';
    spyOn(supabaseClient, 'from').and.callFake((t: string) => {
      usedTable = t;
      return chainable();
    });
    
    service.add.comment({entityId: 10, entityType: 3, content: 'yo'}).subscribe({
      next: () => {
        expect(usedTable).toContain('comment');
        done();
      },
      error: (err) => {
        fail(err);
        done();
      }
    });
  }, TEST_TIMEOUT);
});

describe('SupabaseService - add.rack', () => {
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
  
  it('should insert a rack with authorid from session', (done) => {
    const mockUser = {id: 'rack-creator'};
    spyOn(service.auth as any, 'getUserSession$').and.returnValue(of(mockUser));
    
    const mock = chainable({data: [{id: 12}], error: null});
    const insertSpy = spyOn(mock, 'insert').and.returnValue(mock);
    spyOn(supabaseClient, 'from').and.returnValue(mock);
    
    service.add.rack({name: 'My Rack', hp: 84, rows: 2, locked: false, public: true} as any).subscribe({
      next: () => {
        const payload = insertSpy.calls.first().args[0] as any;
        expect(payload.authorid).toBe('rack-creator');
        expect(payload.name).toBe('My Rack');
        done();
      },
      error: (err) => {
        fail(err);
        done();
      }
    });
  }, TEST_TIMEOUT);
  
  it('should throw when user is not authenticated', (done) => {
    spyOn(service.auth as any, 'getUserSession$').and.returnValue(of(null));
    
    service.add.rack({name: 'My Rack', hp: 84, rows: 2} as any).subscribe({
      next: () => {
        fail('should have errored');
        done();
      },
      error: (err) => {
        expect(err.message).toContain('Authentication required');
        done();
      }
    });
  }, TEST_TIMEOUT);
  
  it('should bust rackWithId cache', (done) => {
    const mockUser = {id: 'u'};
    spyOn(service.auth as any, 'getUserSession$').and.returnValue(of(mockUser));
    spyOn(supabaseClient, 'from').and.returnValue(chainable({data: [{id: 1}], error: null}));
    
    const bustedKeys: any[] = [];
    service.cacheResetter$.subscribe(keys => bustedKeys.push(...(keys as any[])));
    
    service.add.rack({name: 'R', hp: 84, rows: 2} as any).subscribe({
      next: () => {
        expect(bustedKeys).toContain('rackWithId');
        done();
      },
      error: (err) => {
        fail(err);
        done();
      }
    });
  }, TEST_TIMEOUT);
});

describe('SupabaseService - add.rackModule', () => {
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
  
  it('should insert with moduleid and rackid', (done) => {
    const mockUser = {id: 'u'};
    spyOn(service.auth as any, 'getUserSession$').and.returnValue(of(mockUser));
    
    const mock = chainable({data: null, error: null});
    const insertSpy = spyOn(mock, 'insert').and.returnValue(mock);
    spyOn(supabaseClient, 'from').and.returnValue(mock);
    
    service.add.rackModule(3, 7, 0, 2).subscribe({
      next: () => {
        expect(insertSpy).toHaveBeenCalledWith(jasmine.objectContaining({
          moduleid: 3, rackid: 7, row: 0, column: 2
        }));
        done();
      },
      error: (err) => {
        fail(err);
        done();
      }
    });
  }, TEST_TIMEOUT);
  
  it('should throw when user is not authenticated', (done) => {
    spyOn(service.auth as any, 'getUserSession$').and.returnValue(of(null));
    
    service.add.rackModule(1, 1).subscribe({
      next: () => {
        fail('should have errored');
        done();
      },
      error: (err) => {
        expect(err.message).toContain('Authentication required');
        done();
      }
    });
  }, TEST_TIMEOUT);
});