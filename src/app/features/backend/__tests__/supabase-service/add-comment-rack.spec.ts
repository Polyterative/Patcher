import { SupabaseService } from '../../supabase.service';
import type { CachedEntity } from '../../supabase.cache';
import type {
  SupabaseTableInsert,
  SupabaseTableRow
} from '../../supabase-db.types';
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
  type QueryListRowsResult,
  type SupabaseClientDouble,
  type SupabaseQueryChain
} from './supabase-query-test-doubles';


type AddCommentDraft = Parameters<SupabaseService['add']['comment']>[0];
type AddRackDraft = Parameters<SupabaseService['add']['rack']>[0];
type CommentInsert = SupabaseTableInsert<'comments'>;
type RackInsert = SupabaseTableInsert<'racks'>;
type RackInsertResultRow = Pick<SupabaseTableRow<'racks'>, 'id'> &
  Partial<Pick<SupabaseTableRow<'racks'>, 'public_id'>>;
type RackModuleInsert = SupabaseTableInsert<'rack_modules'>;
type RackModuleInsertExpectation = Partial<RackModuleInsert>;
type RackModuleInsertResultRow = Pick<
  SupabaseTableRow<'rack_modules'>,
  'column' | 'id' | 'moduleid' | 'orientation' | 'rackid' | 'row' | 'selected_panel_id'
>;
type RackDraftFixture = Pick<AddRackDraft, 'hp' | 'name' | 'rows'> &
  Partial<Pick<AddRackDraft, 'description' | 'image' | 'locked' | 'public' | 'public_id'>>;

function rackDraftFixture(data: RackDraftFixture): AddRackDraft {
  return data as AddRackDraft;
}

describe('SupabaseService - add.comment', () => {
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
  
  it('should insert a comment with the correct fields', (done) => {
    const mockUser = authUserFixture('commenter-1');
    mockUserSession(service, mockUser);
    
    const mock: SupabaseQueryChain<CommentInsert> = chainable<CommentInsert>(
      {data: null, error: null} satisfies QueryChainResult<CommentInsert>
    );
    const insertSpy: jasmine.Spy<SupabaseQueryChain<CommentInsert>['insert']> =
      spyOn(mock, 'insert').and.returnValue(mock);
    spyOn(mock, 'select').and.returnValue(mock);
    spyOn(supabaseClient, 'from').and.returnValue(mock);
    
    const commentDraft = {entityId: 5, entityType: 2, content: 'Nice rack!'} satisfies AddCommentDraft;
    service.add.comment(commentDraft).subscribe({
      next: () => {
        expect(insertSpy).toHaveBeenCalledWith(jasmine.objectContaining({
          entityId: 5,
          entityType: 2,
          content: 'Nice rack!',
          authorId: 'commenter-1'
        } satisfies CommentInsert));
        done();
      },
      error: (err: unknown) => {
        fail(err);
        done();
      }
    });
  }, TEST_TIMEOUT);
  
  it('should bust comments and currentUserComments caches', (done) => {
    const mockUser = authUserFixture('u');
    mockUserSession(service, mockUser);
    spyOn(supabaseClient, 'from').and.returnValue(
      chainable<CommentInsert>({data: null, error: null} satisfies QueryChainResult<CommentInsert>)
    );
    
    const bustedKeys: CachedEntity[] = [];
    service.cacheResetter$.subscribe(keys => bustedKeys.push(...keys));
    
    service.add.comment({entityId: 1, entityType: 1, content: 'test'}).subscribe({
      next: () => {
        expect(bustedKeys).toContain('comments');
        expect(bustedKeys).toContain('currentUserComments');
        done();
      },
      error: (err: unknown) => {
        fail(err);
        done();
      }
    });
  }, TEST_TIMEOUT);
  
  it('should insert to the comments table', (done) => {
    const mockUser = authUserFixture('u');
    mockUserSession(service, mockUser);
    
    let usedTable = '';
    spyOn(supabaseClient, 'from').and.callFake((t: string) => {
      usedTable = t;
      return chainable<CommentInsert>();
    });
    
    service.add.comment({entityId: 10, entityType: 3, content: 'yo'}).subscribe({
      next: () => {
        expect(usedTable).toContain('comment');
        done();
      },
      error: (err: unknown) => {
        fail(err);
        done();
      }
    });
  }, TEST_TIMEOUT);
});

describe('SupabaseService - add.rack', () => {
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
  
  it('should insert a rack with authorid from session', (done) => {
    const mockUser = authUserFixture('rack-creator');
    mockUserSession(service, mockUser);
    
    const mock: SupabaseQueryChain<RackInsertResultRow> = chainable<RackInsertResultRow>({
      data: [{id: 12}],
      error: null
    } satisfies QueryListRowsResult<RackInsertResultRow>);
    const insertSpy: jasmine.Spy<SupabaseQueryChain<RackInsertResultRow>['insert']> =
      spyOn(mock, 'insert').and.returnValue(mock);
    spyOn(supabaseClient, 'from').and.returnValue(mock);
    
    const rackDraft = {
      name: 'My Rack',
      hp: 84,
      rows: 2,
      locked: false,
      public: true
    } satisfies AddRackDraft;
    service.add.rack(rackDraft).subscribe({
      next: () => {
        const payload = insertSpy.calls.first().args[0] as RackInsert;
        expect(payload.authorid).toBe('rack-creator');
        expect(payload.name).toBe('My Rack');
        done();
      },
      error: (err: unknown) => {
        fail(err);
        done();
      }
    });
  }, TEST_TIMEOUT);
  
  it('should throw when user is not authenticated', (done) => {
    mockUserSession(service, null);
    
    service.add.rack(rackDraftFixture({name: 'My Rack', hp: 84, rows: 2})).subscribe({
      next: () => {
        fail('should have errored');
        done();
      },
      error: (err: Error) => {
        expect(err.message).toContain('Authentication required');
        done();
      }
    });
  }, TEST_TIMEOUT);
  
  it('should bust rackWithId cache', (done) => {
    const mockUser = authUserFixture('u');
    mockUserSession(service, mockUser);
    spyOn(supabaseClient, 'from').and.returnValue(
      chainable<RackInsertResultRow>({
        data: [{id: 1}],
        error: null
      } satisfies QueryListRowsResult<RackInsertResultRow>)
    );
    
    const bustedKeys: CachedEntity[] = [];
    service.cacheResetter$.subscribe(keys => bustedKeys.push(...keys));
    
    service.add.rack(rackDraftFixture({name: 'R', hp: 84, rows: 2})).subscribe({
      next: () => {
        expect(bustedKeys).toContain('rackWithId');
        done();
      },
      error: (err: unknown) => {
        fail(err);
        done();
      }
    });
  }, TEST_TIMEOUT);
});

describe('SupabaseService - add.rackModule', () => {
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
  
  it('should insert with moduleid and rackid', (done) => {
    const mockUser = authUserFixture('u');
    mockUserSession(service, mockUser);
    
    const mock: SupabaseQueryChain<RackModuleInsertResultRow> = chainable<RackModuleInsertResultRow>(
      {data: null, error: null} satisfies QueryChainResult<RackModuleInsertResultRow>
    );
    const insertSpy: jasmine.Spy<SupabaseQueryChain<RackModuleInsertResultRow>['insert']> =
      spyOn(mock, 'insert').and.returnValue(mock);
    const selectSpy: jasmine.Spy<SupabaseQueryChain<RackModuleInsertResultRow>['select']> =
      spyOn(mock, 'select').and.returnValue(mock);
    spyOn(supabaseClient, 'from').and.returnValue(mock);
    
    service.add.rackModule(3, 7, 0, 2).subscribe({
      next: () => {
        expect(insertSpy).toHaveBeenCalledWith(jasmine.objectContaining({
          moduleid: 3,
          rackid: 7,
          row: 0,
          column: 2,
          orientation: 'normal'
        } satisfies RackModuleInsert));
        expect(selectSpy).toHaveBeenCalledWith('id,moduleid,rackid,row,column,selected_panel_id,orientation');
        done();
      },
      error: (err: unknown) => {
        fail(err);
        done();
      }
    });
  }, TEST_TIMEOUT);

  it('should insert an explicit rack module orientation', (done) => {
    const mockUser = authUserFixture('u');
    mockUserSession(service, mockUser);

    const mock: SupabaseQueryChain<RackModuleInsertResultRow> = chainable<RackModuleInsertResultRow>(
      {data: null, error: null} satisfies QueryChainResult<RackModuleInsertResultRow>
    );
    const insertSpy: jasmine.Spy<SupabaseQueryChain<RackModuleInsertResultRow>['insert']> =
      spyOn(mock, 'insert').and.returnValue(mock);
    spyOn(supabaseClient, 'from').and.returnValue(mock);

    service.add.rackModule(3, 7, 0, 2, 'rot180').subscribe({
      next: () => {
        expect(insertSpy).toHaveBeenCalledWith(jasmine.objectContaining({
          orientation: 'rot180'
        } satisfies RackModuleInsertExpectation));
        done();
      },
      error: (err: unknown) => {
        fail(err);
        done();
      }
    });
  }, TEST_TIMEOUT);
  
  it('should throw when user is not authenticated', (done) => {
    mockUserSession(service, null);
    
    service.add.rackModule(1, 1).subscribe({
      next: () => {
        fail('should have errored');
        done();
      },
      error: (err: Error) => {
        expect(err.message).toContain('Authentication required');
        done();
      }
    });
  }, TEST_TIMEOUT);
});