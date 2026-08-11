import { QueryJoins } from '../../DatabaseStrings';
import { PublicUser } from 'src/app/models/user';
import { SupabaseService } from '../../supabase.service';
import type { SupabaseTableRow } from '../../supabase-db.types';
import {
  cleanupSupabaseServiceTest,
  setupSupabaseServiceTest,
  TEST_TIMEOUT
} from './test-setup';
import {
  authUserFixture,
  getSupabaseClientDouble,
  mockUserSession,
  type QueryChainResult,
  type QueryCountRowsResult,
  type QuerySingleRowResult,
  type SupabaseClientDouble,
  SupabaseQueryChain
} from './supabase-query-test-doubles';


/**
 * Security Tests – Email Leakage Prevention
 *
 * Verifies that no query string, data model, or service method
 * exposes email addresses through public-facing API surfaces.
 *
 * Only the logged-in user should ever see their own email
 * (via RichUserModel / SimpleUserModel in auth flows).
 */

// ─── helpers ────────────────────────────────────────────────────────────────

type QueryJoinStringKey = {
  [Key in keyof typeof QueryJoins]: typeof QueryJoins[Key] extends string ? Key : never
}[keyof typeof QueryJoins];
type CommentRow = Pick<SupabaseTableRow<'comments'>, 'authorId' | 'content' | 'entityId' | 'entityType' | 'id'>;
type PatchRow = Pick<SupabaseTableRow<'patches'>, 'id' | 'name'>;
type RackRow = Pick<SupabaseTableRow<'racks'>, 'id' | 'name'>;

class SelectRecordingQueryChain<Row = unknown> extends SupabaseQueryChain<Row> {
  readonly selectCalls: string[] = [];

  override select(...args: Parameters<SupabaseQueryChain<Row>['select']>): this {
    const [columns] = args;
    this.selectCalls.push(columns);

    return super.select(...args);
  }
}

function selectRecordingQueryChain<Row>(
  resolveValue: QueryChainResult<Row>
): SelectRecordingQueryChain<Row> {
  return new SelectRecordingQueryChain(resolveValue);
}

function isQueryJoinStringKey(key: string): key is QueryJoinStringKey {
  return !['prototype', 'length', 'name'].includes(key)
    && typeof Reflect.get(QueryJoins, key) === 'string';
}

function queryJoinStringEntries(): Array<[QueryJoinStringKey, string]> {
  return Object.getOwnPropertyNames(QueryJoins)
    .filter(isQueryJoinStringKey)
    .map(key => [key, QueryJoins[key]]);
}

// ─── 1. Static query-string contracts ────────────────────────────────────────

describe('Email leakage – QueryJoins static strings', () => {
  
  it('QueryJoins.author must not contain "email"', () => {
    expect(QueryJoins.author).not.toContain('email');
  });
  
  it('every QueryJoins value must not contain "email"', () => {
    const entries = queryJoinStringEntries();
    
    for (const [key, value] of entries) {
      expect(value)
        .withContext(`QueryJoins.${ key } must not expose email`)
        .not.toContain('email');
    }
  });
  
  it('QueryJoins.author still selects username and id', () => {
    expect(QueryJoins.author).toContain('username');
    expect(QueryJoins.author).toContain('id');
  });
  
});

// ─── 2. PublicUser model contract ────────────────────────────────────────────

describe('Email leakage – PublicUser interface', () => {
  
  it('PublicUser does not have an email field', () => {
    const user: PublicUser = {id: 'u1', username: 'alice'};
    expect('email' in user).toBeFalse();
  });
  
  it('PublicUser only exposes id and username', () => {
    const user: PublicUser = {id: 'u2', username: 'bob'};
    const keys = Object.keys(user);
    expect(keys).toEqual(jasmine.arrayWithExactContents(['id', 'username']));
  });
});

// ─── 3. getComments – public, unauthenticated endpoint ───────────────────────

describe('Email leakage – GET.comments (public endpoint)', () => {
  let service: SupabaseService;
  let supabaseClient: SupabaseClientDouble;
  
  beforeEach(() => {
    const setup = setupSupabaseServiceTest();
    service = setup.service;
    supabaseClient = getSupabaseClientDouble(service);
  });
  
  afterEach(() => cleanupSupabaseServiceTest());
  
  it('must not request email in the profiles join', (done) => {
    const mock = selectRecordingQueryChain<CommentRow>({
      data: [],
      error: null
    });
    spyOn(supabaseClient, 'from').and.returnValue(mock);
    
    service.GET.comments(1, 1).subscribe({
      next: () => {
        for (const call of mock.selectCalls) {
          expect(call)
            .withContext('getComments select string must not contain email')
            .not.toContain('email');
        }
        done();
      },
      error: (err) => {
        fail(err);
        done();
      }
    });
  }, TEST_TIMEOUT);
  
  it('still requests profile id and username', (done) => {
    const mock = selectRecordingQueryChain<CommentRow>({
      data: [],
      error: null
    });
    spyOn(supabaseClient, 'from').and.returnValue(mock);
    
    service.GET.comments(1, 1).subscribe({
      next: () => {
        const joined = mock.selectCalls.join(' ');
        expect(joined).toContain('username');
        expect(joined).toContain('id');
        done();
      },
      error: (err) => {
        fail(err);
        done();
      }
    });
  }, TEST_TIMEOUT);
});

// ─── 4. currentUserComments – authenticated but still must not leak ───────────

describe('Email leakage – GET.currentUserComments (own comments)', () => {
  let service: SupabaseService;
  let supabaseClient: SupabaseClientDouble;
  
  beforeEach(() => {
    const setup = setupSupabaseServiceTest();
    service = setup.service;
    supabaseClient = getSupabaseClientDouble(service);
  });
  
  afterEach(() => cleanupSupabaseServiceTest());
  
  it('must not request email in the profiles join', (done) => {
    mockUserSession(service, authUserFixture('u1'));
    const mock = selectRecordingQueryChain<CommentRow>({
      data: [],
      count: 0,
      error: null
    } satisfies QueryCountRowsResult<CommentRow>);
    spyOn(supabaseClient, 'from').and.returnValue(mock);
    
    service.GET.currentUserComments(0, 9).subscribe({
      next: () => {
        for (const call of mock.selectCalls) {
          expect(call)
            .withContext('getCurrentUserComments select string must not contain email')
            .not.toContain('email');
        }
        done();
      },
      error: (err) => {
        fail(err);
        done();
      }
    });
  }, TEST_TIMEOUT);
});

// ─── 5. Patch & rack author queries ──────────────────────────────────────────

describe('Email leakage – patch and rack author queries', () => {
  let service: SupabaseService;
  let supabaseClient: SupabaseClientDouble;
  
  beforeEach(() => {
    const setup = setupSupabaseServiceTest();
    service = setup.service;
    supabaseClient = getSupabaseClientDouble(service);
  });
  
  afterEach(() => cleanupSupabaseServiceTest());
  
  it('get.patchWithId must not request email', (done) => {
    const mock = selectRecordingQueryChain<PatchRow>({
      data: {id: 1, name: 'P'},
      error: null
    } satisfies QuerySingleRowResult<PatchRow>);
    spyOn(supabaseClient, 'from').and.returnValue(mock);
    
    service.get.patchWithId(1).subscribe({
      next: () => {
        for (const call of mock.selectCalls) {
          expect(call)
            .withContext('patchWithId select must not contain email')
            .not.toContain('email');
        }
        done();
      },
      error: (err) => {
        fail(err);
        done();
      }
    });
  }, TEST_TIMEOUT);
  
  it('GET.rackWithId must not request email', (done) => {
    const mock = selectRecordingQueryChain<RackRow>({
      data: {id: 5, name: 'R'},
      error: null
    } satisfies QuerySingleRowResult<RackRow>);
    spyOn(supabaseClient, 'from').and.returnValue(mock);
    
    service.GET.rackWithId(5).subscribe({
      next: () => {
        for (const call of mock.selectCalls) {
          expect(call)
            .withContext('rackWithId select must not contain email')
            .not.toContain('email');
        }
        done();
      },
      error: (err) => {
        fail(err);
        done();
      }
    });
  }, TEST_TIMEOUT);
  
  it('GET.patches (public listing) must not request email', (done) => {
    const mock = selectRecordingQueryChain<PatchRow>({
      data: [],
      count: 0,
      error: null
    } satisfies QueryCountRowsResult<PatchRow>);
    spyOn(supabaseClient, 'from').and.returnValue(mock);
    
    service.GET.patches(0, 9).subscribe({
      next: () => {
        for (const call of mock.selectCalls) {
          expect(call)
            .withContext('getPatches select must not contain email')
            .not.toContain('email');
        }
        done();
      },
      error: (err) => {
        fail(err);
        done();
      }
    });
  }, TEST_TIMEOUT);
  
  it('GET.racksMinimal (public listing) must not request email', (done) => {
    const mock = selectRecordingQueryChain<RackRow>({
      data: [],
      count: 0,
      error: null
    } satisfies QueryCountRowsResult<RackRow>);
    spyOn(supabaseClient, 'from').and.returnValue(mock);
    
    service.GET.racksMinimal(0, 9).subscribe({
      next: () => {
        for (const call of mock.selectCalls) {
          expect(call)
            .withContext('racksMinimal select must not contain email')
            .not.toContain('email');
        }
        done();
      },
      error: (err) => {
        fail(err);
        done();
      }
    });
  }, TEST_TIMEOUT);
  
  it('GET.userPatchesPaginated must not request email', (done) => {
    mockUserSession(service, authUserFixture('u1'));
    const mock = selectRecordingQueryChain<PatchRow>({
      data: [],
      count: 0,
      error: null
    } satisfies QueryCountRowsResult<PatchRow>);
    spyOn(supabaseClient, 'from').and.returnValue(mock);
    
    service.GET.userPatchesPaginated(0, 9).subscribe({
      next: () => {
        for (const call of mock.selectCalls) {
          expect(call)
            .withContext('userPatchesPaginated select must not contain email')
            .not.toContain('email');
        }
        done();
      },
      error: (err) => {
        fail(err);
        done();
      }
    });
  }, TEST_TIMEOUT);
  
  it('GET.userRacksPaginated must not request email', (done) => {
    mockUserSession(service, authUserFixture('u1'));
    const mock = selectRecordingQueryChain<RackRow>({
      data: [],
      count: 0,
      error: null
    } satisfies QueryCountRowsResult<RackRow>);
    spyOn(supabaseClient, 'from').and.returnValue(mock);
    
    service.GET.userRacksPaginated(0, 9).subscribe({
      next: () => {
        for (const call of mock.selectCalls) {
          expect(call)
            .withContext('userRacksPaginated select must not contain email')
            .not.toContain('email');
        }
        done();
      },
      error: (err) => {
        fail(err);
        done();
      }
    });
  }, TEST_TIMEOUT);
});

// ─── 6. Regression guard: email must not re-appear in any future join ────────

describe('Email leakage – regression guard on all QueryJoins values', () => {
  
  it('no QueryJoins value contains the literal string "email"', () => {
    // This acts as a canary: if someone adds email back to any join string,
    // this test will fail immediately and explain why.
    const allJoins: Record<string, string> = Object.fromEntries(queryJoinStringEntries());
    
    Object.entries(allJoins).forEach(([key, value]) => {
      expect(value)
        .withContext(
          `QueryJoins.${ key } re-introduced "email" — ` +
          `only RichUserModel/SimpleUserModel (own session) may carry email`
        )
        .not.toContain('email');
    });
  });
});