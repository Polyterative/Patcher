import { of } from 'rxjs';
import { QueryJoins } from '../../DatabaseStrings';
import { PublicUser } from 'src/app/models/user';
import { SupabaseService } from '../../supabase.service';
import {
  cleanupSupabaseServiceTest,
  setupSupabaseServiceTest,
  TEST_TIMEOUT
} from './test-setup';


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

/** Builds a chainable Supabase query mock that records every .select() call. */
function chainableWithSelectSpy(resolveValue: any = {data: [], error: null}) {
  const calls: string[] = [];
  const m: any = {};
  ['filter', 'eq', 'neq', 'is', 'in', 'range', 'order', 'limit',
    'single', 'maybeSingle', 'insert', 'update', 'delete', 'upsert', 'ilike', 'inner'].forEach(method => {
    m[method] = () => m;
  });
  m.select = (...args: any[]) => {
    calls.push(args[0] ?? '');
    return m;
  };
  m.then = (res: Function, rej?: Function) =>
    Promise.resolve(resolveValue).then(res as any, rej as any);
  m._selectCalls = calls;
  return m;
}

// ─── 1. Static query-string contracts ────────────────────────────────────────

describe('Email leakage – QueryJoins static strings', () => {
  
  it('QueryJoins.author must not contain "email"', () => {
    expect(QueryJoins.author).not.toContain('email');
  });
  
  it('QueryJoins.rack must not contain "email"', () => {
    expect(QueryJoins.rack).not.toContain('email');
  });
  
  it('every QueryJoins value must not contain "email"', () => {
    const keys = Object.getOwnPropertyNames(QueryJoins)
      .filter(k => !['prototype', 'length', 'name'].includes(k));
    
    for (const key of keys) {
      const value: string = (QueryJoins as any)[key];
      expect(value)
        .withContext(`QueryJoins.${ key } must not expose email`)
        .not.toContain('email');
    }
  });
  
  it('QueryJoins.author still selects username and id', () => {
    expect(QueryJoins.author).toContain('username');
    expect(QueryJoins.author).toContain('id');
  });
  
  it('QueryJoins.rack still selects author username and id via nested join', () => {
    expect(QueryJoins.rack).toContain('username');
    expect(QueryJoins.rack).toContain('id');
  });
});

// ─── 2. PublicUser model contract ────────────────────────────────────────────

describe('Email leakage – PublicUser interface', () => {
  
  it('PublicUser does not have an email field', () => {
    // Compile-time: if email existed, the cast below would carry it.
    // Runtime: construct a minimal valid PublicUser and assert no email key.
    const user: PublicUser = {id: 'u1', username: 'alice'};
    expect((user as any).email).toBeUndefined();
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
  let supabaseClient: any;
  
  beforeEach(() => {
    const setup = setupSupabaseServiceTest();
    service = setup.service;
    supabaseClient = (service as any).supabase;
  });
  
  afterEach(() => cleanupSupabaseServiceTest());
  
  it('must not request email in the profiles join', (done) => {
    const mock = chainableWithSelectSpy({data: [], error: null});
    spyOn(supabaseClient, 'from').and.returnValue(mock);
    
    service.GET.comments(1, 1).subscribe({
      next: () => {
        for (const call of mock._selectCalls) {
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
    const mock = chainableWithSelectSpy({data: [], error: null});
    spyOn(supabaseClient, 'from').and.returnValue(mock);
    
    service.GET.comments(1, 1).subscribe({
      next: () => {
        const joined = mock._selectCalls.join(' ');
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
  let supabaseClient: any;
  
  beforeEach(() => {
    const setup = setupSupabaseServiceTest();
    service = setup.service;
    supabaseClient = (service as any).supabase;
  });
  
  afterEach(() => cleanupSupabaseServiceTest());
  
  it('must not request email in the profiles join', (done) => {
    spyOn(service.auth as any, 'getUserSession$').and.returnValue(of({id: 'u1'}));
    const mock = chainableWithSelectSpy({data: [], count: 0, error: null});
    spyOn(supabaseClient, 'from').and.returnValue(mock);
    
    service.GET.currentUserComments(0, 9).subscribe({
      next: () => {
        for (const call of mock._selectCalls) {
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
  let supabaseClient: any;
  
  beforeEach(() => {
    const setup = setupSupabaseServiceTest();
    service = setup.service;
    supabaseClient = (service as any).supabase;
  });
  
  afterEach(() => cleanupSupabaseServiceTest());
  
  it('get.patchWithId must not request email', (done) => {
    const mock = chainableWithSelectSpy({data: {id: 1, name: 'P'}, error: null});
    spyOn(supabaseClient, 'from').and.returnValue(mock);
    
    service.get.patchWithId(1).subscribe({
      next: () => {
        for (const call of mock._selectCalls) {
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
    const mock = chainableWithSelectSpy({data: {id: 5, name: 'R'}, error: null});
    spyOn(supabaseClient, 'from').and.returnValue(mock);
    
    service.GET.rackWithId(5).subscribe({
      next: () => {
        for (const call of mock._selectCalls) {
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
    const mock = chainableWithSelectSpy({data: [], count: 0, error: null});
    spyOn(supabaseClient, 'from').and.returnValue(mock);
    
    service.GET.patches(0, 9).subscribe({
      next: () => {
        for (const call of mock._selectCalls) {
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
    const mock = chainableWithSelectSpy({data: [], count: 0, error: null});
    spyOn(supabaseClient, 'from').and.returnValue(mock);
    
    service.GET.racksMinimal(0, 9).subscribe({
      next: () => {
        for (const call of mock._selectCalls) {
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
    spyOn(service.auth as any, 'getUserSession$').and.returnValue(of({id: 'u1'}));
    const mock = chainableWithSelectSpy({data: [], count: 0, error: null});
    spyOn(supabaseClient, 'from').and.returnValue(mock);
    
    service.GET.userPatchesPaginated(0, 9).subscribe({
      next: () => {
        for (const call of mock._selectCalls) {
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
    spyOn(service.auth as any, 'getUserSession$').and.returnValue(of({id: 'u1'}));
    const mock = chainableWithSelectSpy({data: [], count: 0, error: null});
    spyOn(supabaseClient, 'from').and.returnValue(mock);
    
    service.GET.userRacksPaginated(0, 9).subscribe({
      next: () => {
        for (const call of mock._selectCalls) {
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
    const allJoins: Record<string, string> = {};
    Object.getOwnPropertyNames(QueryJoins)
      .filter(k => !['prototype', 'length', 'name'].includes(k))
      .forEach(k => {
        allJoins[k] = (QueryJoins as any)[k];
      });
    
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