import { SupabaseService } from '../../supabase.service';
import type { DbComment } from 'src/app/models/comment';
import {
  cleanupSupabaseServiceTest,
  setupSupabaseServiceTest,
  TEST_TIMEOUT
} from './test-setup';
import {
  chainable,
  getSupabaseClientDouble,
  type QueryCountRowsResult,
  type SupabaseClientDouble,
  type SupabaseQueryChain
} from './supabase-query-test-doubles';


type CommentRow = Pick<DbComment, 'content' | 'entityId' | 'entityType' | 'id'>;
type CommentsQueryResult = QueryCountRowsResult<CommentRow>;
type CommentsObservableResult = {
  data: CommentRow[] | null;
  count: number | null;
};

describe('SupabaseService - GET.comments', () => {
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

  it('should return comments with count for the given entity', (done) => {
    const mockComments = [
      { id: 1, content: 'First!', entityId: 5, entityType: 1 },
      { id: 2, content: 'Second!', entityId: 5, entityType: 1 }
    ] satisfies CommentRow[];
    spyOn(supabaseClient, 'from').and.returnValue(
      chainable<CommentRow>({ data: mockComments, count: 2, error: null } satisfies CommentsQueryResult)
    );

    service.GET.comments(5, 1).subscribe({
      next: (result: CommentsObservableResult) => {
        expect(result.data).toEqual(mockComments);
        expect(result.count).toBe(2);
        done();
      },
      error: (err: unknown) => { fail(err); done(); }
    });
  }, TEST_TIMEOUT);

  it('should filter by entityId and entityType', (done) => {
    const mock: SupabaseQueryChain<CommentRow> = chainable<CommentRow>(
      { data: [], count: 0, error: null } satisfies CommentsQueryResult
    );
    const filterSpy = spyOn(mock, 'filter').and.returnValue(mock);
    spyOn(supabaseClient, 'from').and.returnValue(mock);

    service.GET.comments(42, 2).subscribe({
      next: () => {
        expect(filterSpy).toHaveBeenCalledWith('entityId', 'eq', 42);
        expect(filterSpy).toHaveBeenCalledWith('entityType', 'eq', 2);
        done();
      },
      error: (err: unknown) => { fail(err); done(); }
    });
  }, TEST_TIMEOUT);

  it('should order comments by created descending (newest first)', (done) => {
    const mock: SupabaseQueryChain<CommentRow> = chainable<CommentRow>(
      { data: [], count: 0, error: null } satisfies CommentsQueryResult
    );
    const orderSpy = spyOn(mock, 'order').and.returnValue(mock);
    spyOn(supabaseClient, 'from').and.returnValue(mock);

    service.GET.comments(1, 1).subscribe({
      next: () => {
        expect(orderSpy).toHaveBeenCalledWith('created', { ascending: false });
        done();
      },
      error: (err: unknown) => { fail(err); done(); }
    });
  }, TEST_TIMEOUT);

  it('should apply default range (0 to 24) when no range args given', (done) => {
    const mock: SupabaseQueryChain<CommentRow> = chainable<CommentRow>(
      { data: [], count: 0, error: null } satisfies CommentsQueryResult
    );
    const rangeSpy = spyOn(mock, 'range').and.returnValue(mock);
    spyOn(supabaseClient, 'from').and.returnValue(mock);

    service.GET.comments(1, 1).subscribe({
      next: () => {
        expect(rangeSpy).toHaveBeenCalledWith(0, 24);
        done();
      },
      error: (err: unknown) => { fail(err); done(); }
    });
  }, TEST_TIMEOUT);

  it('should apply custom range when from/to are provided', (done) => {
    const mock: SupabaseQueryChain<CommentRow> = chainable<CommentRow>(
      { data: [], count: 0, error: null } satisfies CommentsQueryResult
    );
    const rangeSpy = spyOn(mock, 'range').and.returnValue(mock);
    spyOn(supabaseClient, 'from').and.returnValue(mock);

    service.GET.comments(1, 1, 25, 49).subscribe({
      next: () => {
        expect(rangeSpy).toHaveBeenCalledWith(25, 49);
        done();
      },
      error: (err: unknown) => { fail(err); done(); }
    });
  }, TEST_TIMEOUT);

  it('should query the comments table', (done) => {
    let usedTable = '';
    spyOn(supabaseClient, 'from').and.callFake((t: string) => {
      usedTable = t;
      return chainable<CommentRow>({ data: [], count: 0, error: null } satisfies CommentsQueryResult);
    });

    service.GET.comments(3, 1).subscribe({
      next: () => {
        expect(usedTable).toBe('comments');
        done();
      },
      error: (err: unknown) => { fail(err); done(); }
    });
  }, TEST_TIMEOUT);

  it('should return an observable', (done) => {
    spyOn(supabaseClient, 'from').and.returnValue(
      chainable<CommentRow>({ data: [], count: 0, error: null } satisfies CommentsQueryResult)
    );

    const result$ = service.GET.comments(1, 1);
    expect(typeof result$.subscribe).toBe('function');
    result$.subscribe({ next: () => done(), error: (e: unknown) => { fail(e); done(); } });
  }, TEST_TIMEOUT);
});
