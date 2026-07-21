import { SupabaseService } from '../../supabase.service';
import type { SupabaseTableRow } from '../../supabase-db.types';
import {
  cleanupSupabaseServiceTest,
  setupSupabaseServiceTest,
  TEST_TIMEOUT
} from './test-setup';
import {
  authUserFixture,
  chainable,
  getSupabaseClientDouble,
  mockUserSession,
  type QueryChainResult,
  type SupabaseClientDouble
} from './supabase-query-test-doubles';


type CurrentUserCommentRow = Pick<SupabaseTableRow<'comments'>, 'authorId' | 'content' | 'id'>;
type CurrentUserCommentsResult = QueryChainResult<CurrentUserCommentRow> & {
  count: number;
  data: CurrentUserCommentRow[];
  error: null;
};

describe('SupabaseService - GET.currentUserComments', () => {
  let service: SupabaseService;
  let supabaseClient: SupabaseClientDouble;
  
  beforeEach(() => {
    const setup = setupSupabaseServiceTest();
    service = setup.service;
    supabaseClient = getSupabaseClientDouble(service);
  });
  
  afterEach(() => {
    cleanupSupabaseServiceTest();
  });
  
  it('should return paginated comments for the current user', (done) => {
    const mockUser = authUserFixture('comment-user');
    mockUserSession(service, mockUser);
    
    const mockComments: CurrentUserCommentRow[] = [
      {id: 1, content: 'Hello!', authorId: 'comment-user'},
      {id: 2, content: 'World!', authorId: 'comment-user'}
    ];
    spyOn(supabaseClient, 'from').and.returnValue(
      chainable<CurrentUserCommentRow>({data: mockComments, count: 2, error: null})
    );
    
    service.GET.currentUserComments(0, 9).subscribe({
      next: (result: CurrentUserCommentsResult) => {
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
    const mockUser = authUserFixture('author-123');
    mockUserSession(service, mockUser);
    
    const mock = chainable<CurrentUserCommentRow>({data: [], count: 0, error: null});
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
    const mockUser = authUserFixture('u1');
    mockUserSession(service, mockUser);
    
    const mock = chainable<CurrentUserCommentRow>({data: [], count: 0, error: null});
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
    const mockUser = authUserFixture('u1');
    mockUserSession(service, mockUser);
    
    const mock = chainable<CurrentUserCommentRow>({data: [], count: 0, error: null});
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
    const mockUser = authUserFixture('u1');
    mockUserSession(service, mockUser);
    spyOn(supabaseClient, 'from').and.returnValue(
      chainable<CurrentUserCommentRow>({data: [], count: 0, error: null})
    );
    
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