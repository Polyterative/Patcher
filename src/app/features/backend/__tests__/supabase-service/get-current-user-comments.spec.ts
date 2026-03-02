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

describe('SupabaseService - GET.currentUserComments', () => {
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
  
  it('should return paginated comments for the current user', (done) => {
    const mockUser = {id: 'comment-user'};
    spyOn(service.auth as any, 'getUserSession$').and.returnValue(of(mockUser));
    
    const mockComments = [
      {id: 1, content: 'Hello!', authorId: 'comment-user'},
      {id: 2, content: 'World!', authorId: 'comment-user'}
    ];
    spyOn(supabaseClient, 'from').and.returnValue(
      chainable({data: mockComments, count: 2, error: null})
    );
    
    service.GET.currentUserComments(0, 9).subscribe({
      next: (result: any) => {
        expect(result.data).toEqual(mockComments);
        expect(result.count).toBe(2);
        done();
      },
      error: (err) => {
        fail(err);
        done();
      }
    });
  }, TEST_TIMEOUT);
  
  it('should filter comments by current user authorId', (done) => {
    const mockUser = {id: 'author-123'};
    spyOn(service.auth as any, 'getUserSession$').and.returnValue(of(mockUser));
    
    const mock = chainable({data: [], count: 0, error: null});
    const filterSpy = spyOn(mock, 'filter').and.returnValue(mock);
    spyOn(supabaseClient, 'from').and.returnValue(mock);
    
    service.GET.currentUserComments(0, 9).subscribe({
      next: () => {
        expect(filterSpy).toHaveBeenCalledWith('authorId', 'eq', 'author-123');
        done();
      },
      error: (err) => {
        fail(err);
        done();
      }
    });
  }, TEST_TIMEOUT);
  
  it('should order comments by created descending', (done) => {
    const mockUser = {id: 'u1'};
    spyOn(service.auth as any, 'getUserSession$').and.returnValue(of(mockUser));
    
    const mock = chainable({data: [], count: 0, error: null});
    const orderSpy = spyOn(mock, 'order').and.returnValue(mock);
    spyOn(supabaseClient, 'from').and.returnValue(mock);
    
    service.GET.currentUserComments(0, 9).subscribe({
      next: () => {
        expect(orderSpy).toHaveBeenCalledWith('created', {ascending: false});
        done();
      },
      error: (err) => {
        fail(err);
        done();
      }
    });
  }, TEST_TIMEOUT);
  
  it('should apply from/to range for pagination', (done) => {
    const mockUser = {id: 'u1'};
    spyOn(service.auth as any, 'getUserSession$').and.returnValue(of(mockUser));
    
    const mock = chainable({data: [], count: 0, error: null});
    const rangeSpy = spyOn(mock, 'range').and.returnValue(mock);
    spyOn(supabaseClient, 'from').and.returnValue(mock);
    
    service.GET.currentUserComments(5, 14).subscribe({
      next: () => {
        expect(rangeSpy).toHaveBeenCalledWith(5, 14);
        done();
      },
      error: (err) => {
        fail(err);
        done();
      }
    });
  }, TEST_TIMEOUT);
  
  it('should return an observable', (done) => {
    const mockUser = {id: 'u1'};
    spyOn(service.auth as any, 'getUserSession$').and.returnValue(of(mockUser));
    spyOn(supabaseClient, 'from').and.returnValue(chainable({data: [], count: 0, error: null}));
    
    const result$ = service.GET.currentUserComments(0, 9);
    expect(typeof result$.subscribe).toBe('function');
    result$.subscribe({
      next: () => done(), error: (e) => {
        fail(e);
        done();
      }
    });
  }, TEST_TIMEOUT);
});