import { SupabaseService } from '../../supabase.service';
import {
  cleanupSupabaseServiceTest,
  setupSupabaseServiceTest,
  TEST_TIMEOUT
} from './test-setup';


function chainable(resolveValue: any = { data: null, count: null, error: null }) {
  const m: any = {};
  ['select', 'filter', 'eq', 'neq', 'is', 'in', 'range', 'order', 'limit', 'single',
    'insert', 'update', 'delete', 'upsert'].forEach(method => {
    m[method] = () => m;
  });
  m.then = (res: Function, rej?: Function) =>
    Promise.resolve(resolveValue).then(res as any, rej as any);
  return m;
}

describe('SupabaseService - GET.comments', () => {
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

  it('should return comments with count for the given entity', (done) => {
    const mockComments = [
      { id: 1, content: 'First!', entityId: 5, entityType: 1 },
      { id: 2, content: 'Second!', entityId: 5, entityType: 1 }
    ];
    spyOn(supabaseClient, 'from').and.returnValue(
      chainable({ data: mockComments, count: 2, error: null })
    );

    service.GET.comments(5, 1).subscribe({
      next: (result: any) => {
        expect(result.data).toEqual(mockComments);
        expect(result.count).toBe(2);
        done();
      },
      error: (err) => { fail(err); done(); }
    });
  }, TEST_TIMEOUT);

  it('should filter by entityId and entityType', (done) => {
    const mock = chainable({ data: [], count: 0, error: null });
    const filterSpy = spyOn(mock, 'filter').and.returnValue(mock);
    spyOn(supabaseClient, 'from').and.returnValue(mock);

    service.GET.comments(42, 2).subscribe({
      next: () => {
        expect(filterSpy).toHaveBeenCalledWith('entityId', 'eq', 42);
        expect(filterSpy).toHaveBeenCalledWith('entityType', 'eq', 2);
        done();
      },
      error: (err) => { fail(err); done(); }
    });
  }, TEST_TIMEOUT);

  it('should order comments by created descending (newest first)', (done) => {
    const mock = chainable({ data: [], count: 0, error: null });
    const orderSpy = spyOn(mock, 'order').and.returnValue(mock);
    spyOn(supabaseClient, 'from').and.returnValue(mock);

    service.GET.comments(1, 1).subscribe({
      next: () => {
        expect(orderSpy).toHaveBeenCalledWith('created', { ascending: false });
        done();
      },
      error: (err) => { fail(err); done(); }
    });
  }, TEST_TIMEOUT);

  it('should apply default range (0 to 24) when no range args given', (done) => {
    const mock = chainable({ data: [], count: 0, error: null });
    const rangeSpy = spyOn(mock, 'range').and.returnValue(mock);
    spyOn(supabaseClient, 'from').and.returnValue(mock);

    service.GET.comments(1, 1).subscribe({
      next: () => {
        expect(rangeSpy).toHaveBeenCalledWith(0, 24);
        done();
      },
      error: (err) => { fail(err); done(); }
    });
  }, TEST_TIMEOUT);

  it('should apply custom range when from/to are provided', (done) => {
    const mock = chainable({ data: [], count: 0, error: null });
    const rangeSpy = spyOn(mock, 'range').and.returnValue(mock);
    spyOn(supabaseClient, 'from').and.returnValue(mock);

    service.GET.comments(1, 1, 25, 49).subscribe({
      next: () => {
        expect(rangeSpy).toHaveBeenCalledWith(25, 49);
        done();
      },
      error: (err) => { fail(err); done(); }
    });
  }, TEST_TIMEOUT);

  it('should query the comments table', (done) => {
    let usedTable = '';
    spyOn(supabaseClient, 'from').and.callFake((t: string) => {
      usedTable = t;
      return chainable({ data: [], count: 0, error: null });
    });

    service.GET.comments(3, 1).subscribe({
      next: () => {
        expect(usedTable).toBe('comments');
        done();
      },
      error: (err) => { fail(err); done(); }
    });
  }, TEST_TIMEOUT);

  it('should return an observable', (done) => {
    spyOn(supabaseClient, 'from').and.returnValue(chainable({ data: [], count: 0, error: null }));

    const result$ = service.GET.comments(1, 1);
    expect(typeof result$.subscribe).toBe('function');
    result$.subscribe({ next: () => done(), error: (e) => { fail(e); done(); } });
  }, TEST_TIMEOUT);
});
