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

describe('SupabaseService - get.myVotes, get.allTags and password reset errors', () => {
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
  
  describe('get.myVotes', () => {
    it('should return an array of moduletagid numbers', (done) => {
      spyOn(service.auth as any, 'getUserSession$').and.returnValue(of({id: 'voter-1'}));
      spyOn(supabaseClient, 'from').and.returnValue(
        chainable({data: [{moduletagid: 1}, {moduletagid: 3}, {moduletagid: 7}], error: null})
      );
      
      service.get.myVotes().subscribe({
        next: (result: any) => {
          expect(result).toEqual([1, 3, 7]);
          done();
        },
        error: (err) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
    
    it('should return empty array when user has no votes', (done) => {
      spyOn(service.auth as any, 'getUserSession$').and.returnValue(of({id: 'voter-2'}));
      spyOn(supabaseClient, 'from').and.returnValue(chainable({data: [], error: null}));
      
      service.get.myVotes().subscribe({
        next: (result: any) => {
          expect(result).toEqual([]);
          done();
        },
        error: (err) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
    
    it('should return empty array when data is null', (done) => {
      spyOn(service.auth as any, 'getUserSession$').and.returnValue(of({id: 'voter-3'}));
      spyOn(supabaseClient, 'from').and.returnValue(chainable({data: null, error: null}));
      
      service.get.myVotes().subscribe({
        next: (result: any) => {
          expect(result).toEqual([]);
          done();
        },
        error: (err) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
  });
  
  describe('get.allTags', () => {
    it('should return all tags sorted by type and name', (done) => {
      const mockTags = [
        {id: 1, name: 'Envelope', type: 'function'},
        {id: 2, name: 'VCO', type: 'module_type'}
      ];
      spyOn(supabaseClient, 'from').and.returnValue(chainable({data: mockTags, error: null}));
      
      service.get.allTags().subscribe({
        next: (result: any) => {
          expect(result).toEqual(mockTags);
          done();
        },
        error: (err) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
    
    it('should return empty array when data is null', (done) => {
      spyOn(supabaseClient, 'from').and.returnValue(chainable({data: null, error: null}));
      
      service.get.allTags().subscribe({
        next: (result: any) => {
          expect(result).toEqual([]);
          done();
        },
        error: (err) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
  });
  
  describe('resetPassword$ error code branches', () => {
    it('should produce samePassword error for "same_password" error code', (done) => {
      spyOn(supabaseClient.auth, 'updateUser').and.returnValue(
        Promise.resolve({data: null, error: {error_code: 'same_password', message: 'Password unchanged'}})
      );
      
      service.auth.resetPassword$('token', 'SamePass!').subscribe({
        next: () => {
          fail('Should have errored');
          done();
        },
        error: (err) => {
          expect(err.message).toContain('differ');
          done();
        }
      });
    }, TEST_TIMEOUT);
    
    it('should produce weakPassword error for "weak_password" error code', (done) => {
      spyOn(supabaseClient.auth, 'updateUser').and.returnValue(
        Promise.resolve({data: null, error: {error_code: 'weak_password', message: 'Weak'}})
      );
      
      service.auth.resetPassword$('token', 'weak').subscribe({
        next: () => {
          fail('Should have errored');
          done();
        },
        error: (err) => {
          expect(err.message).toContain('weak');
          done();
        }
      });
    }, TEST_TIMEOUT);
    
    it('should produce invalidSession error for "invalid_grant" error code', (done) => {
      spyOn(supabaseClient.auth, 'updateUser').and.returnValue(
        Promise.resolve({data: null, error: {error_code: 'invalid_grant', message: 'Token expired'}})
      );
      
      service.auth.resetPassword$('token', 'NewPass!').subscribe({
        next: () => {
          fail('Should have errored');
          done();
        },
        error: (err) => {
          expect(err.message).toContain('expired');
          done();
        }
      });
    }, TEST_TIMEOUT);
    
    it('should produce networkError for "network_error" error code', (done) => {
      spyOn(supabaseClient.auth, 'updateUser').and.returnValue(
        Promise.resolve({data: null, error: {error_code: 'network_error', message: 'Network issue'}})
      );
      
      service.auth.resetPassword$('token', 'NewPass!').subscribe({
        next: () => {
          fail('Should have errored');
          done();
        },
        error: (err) => {
          expect(err.message).toContain('Network');
          done();
        }
      });
    }, TEST_TIMEOUT);
    
    it('should use message as default when error code is unrecognised', (done) => {
      spyOn(supabaseClient.auth, 'updateUser').and.returnValue(
        Promise.resolve({data: null, error: {error_code: 'unknown_error', message: 'Something went wrong'}})
      );
      
      service.auth.resetPassword$('token', 'NewPass!').subscribe({
        next: () => {
          fail('Should have errored');
          done();
        },
        error: (err) => {
          expect(err).toBeDefined();
          done();
        }
      });
    }, TEST_TIMEOUT);
  });
});