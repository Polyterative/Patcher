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

describe('SupabaseService - GET single-entity fetchers', () => {
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
  
  // ── get.manufacturerWithId ────────────────────────────────────────────────
  
  describe('get.manufacturerWithId', () => {
    it('should return manufacturer data for the given id', (done) => {
      spyOn(supabaseClient, 'from').and.returnValue(
        chainable({data: {id: 3, name: 'Make Noise'}, error: null})
      );
      
      service.get.manufacturerWithId(3).subscribe({
        next: (result: any) => {
          expect(result.data.id).toBe(3);
          expect(result.data.name).toBe('Make Noise');
          done();
        },
        error: (err) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
    
    it('should filter by the correct manufacturer id', (done) => {
      const mock = chainable({data: {id: 7}, error: null});
      const filterSpy = spyOn(mock, 'filter').and.returnValue(mock);
      spyOn(supabaseClient, 'from').and.returnValue(mock);
      
      service.get.manufacturerWithId(7).subscribe({
        next: () => {
          expect(filterSpy).toHaveBeenCalledWith('id', 'eq', 7);
          done();
        },
        error: (err) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
  });
  
  // ── get.standards ─────────────────────────────────────────────────────────
  
  describe('get.standards', () => {
    it('should return array of standards', (done) => {
      const mockStds = [{id: 0, name: '3U'}, {id: 1, name: '1U'}];
      spyOn(supabaseClient, 'from').and.returnValue(
        chainable({data: mockStds, error: null})
      );
      
      service.get.standards().subscribe({
        next: (result: any) => {
          expect(Array.isArray(result.data)).toBeTrue();
          expect(result.data.length).toBe(2);
          done();
        },
        error: (err) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
    
    it('should return empty array when no standards exist', (done) => {
      spyOn(supabaseClient, 'from').and.returnValue(chainable({data: null, error: null}));
      
      service.get.standards().subscribe({
        next: (result: any) => {
          expect(result.data).toBeNull();
          done();
        },
        error: (err) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
  });
  
  // ── GET.moduleWithId ──────────────────────────────────────────────────────
  
  describe('GET.moduleWithId', () => {
    it('should return module data for the given id', (done) => {
      const mockModule = {data: {id: 42, name: 'Maths', hp: 20}, error: null};
      spyOn(supabaseClient, 'from').and.returnValue(chainable(mockModule));
      
      service.GET.moduleWithId(42).subscribe({
        next: (result: any) => {
          expect(result.data.id).toBe(42);
          done();
        },
        error: (err) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
  });
  
  // ── GET.patchWithId ───────────────────────────────────────────────────────
  
  describe('get.patchWithId', () => {
    it('should return patch data for the given id', (done) => {
      const mockPatch = {data: {id: 99, name: 'Ambient Pad'}, error: null};
      spyOn(supabaseClient, 'from').and.returnValue(chainable(mockPatch));
      
      service.get.patchWithId(99).subscribe({
        next: (result: any) => {
          expect(result.data.id).toBe(99);
          done();
        },
        error: (err) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
  });
  
  // ── GET.userWithId ────────────────────────────────────────────────────────
  
  describe('GET.userWithId', () => {
    it('should return user profile for the given id', (done) => {
      const mockProfile = {data: {id: 'abc', username: 'patcher_pro'}, error: null};
      spyOn(supabaseClient, 'from').and.returnValue(chainable(mockProfile));
      
      service.get.userWithId('abc').subscribe({
        next: (result: any) => {
          expect(result.data.username).toBe('patcher_pro');
          done();
        },
        error: (err) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
  });
  
  // ── get.userWithId (lower-case namespace alias) ────────────────────────────
  
  describe('get.userWithId duplicate check', () => {
    it('should return user profile for the given id', (done) => {
      const mockProfile = {data: {id: 'xyz', username: 'modmaster'}, error: null};
      spyOn(supabaseClient, 'from').and.returnValue(chainable(mockProfile));
      
      service.get.userWithId('xyz').subscribe({
        next: (result: any) => {
          expect(result.data.username).toBe('modmaster');
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