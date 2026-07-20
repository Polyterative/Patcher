import { SupabaseService } from '../../supabase.service';
import {
  type AuthError,
  type Session,
  type User
} from '@supabase/supabase-js';
import {
  cleanupSupabaseServiceTest,
  setupSupabaseServiceTest,
  TEST_TIMEOUT
} from './test-setup';


type DatabaseResponse = {
  data: Array<{id?: string; username?: string}> | null;
  error: {code?: string; message: string} | null;
};
type SignupAuthResponse = {
  data: {
    user: Pick<User, 'id' | 'email' | 'created_at' | 'updated_at'> | null;
    session: Session | null;
  };
  error: {message: string} | null;
};
type SupabaseClientHarness = {
  auth: {
    signUp: (credentials: {
      email: string;
      password: string;
      options: {data: {username: string}};
    }) => Promise<SignupAuthResponse>;
    signOut: () => Promise<{error: AuthError | null}>;
    getSession: () => Promise<unknown>;
  };
  from: (table: string) => ChainableQueryMock;
};
type SupabaseServiceHarness = {
  supabase: SupabaseClientHarness;
};

class ChainableQueryMock implements PromiseLike<DatabaseResponse> {
  constructor(private readonly resolveValue: DatabaseResponse = {data: null, error: null}) {}

  select(_columns?: string): this {
    return this;
  }

  filter(_column?: string, _operator?: string, _value?: unknown): this {
    return this;
  }

  eq(_column?: string, _value?: unknown): this {
    return this;
  }

  neq(_column?: string, _value?: unknown): this {
    return this;
  }

  ilike(_column?: string, _pattern?: string): this {
    return this;
  }

  is(_column?: string, _value?: unknown): this {
    return this;
  }

  in(_column?: string, _values?: unknown[]): this {
    return this;
  }

  range(_from?: number, _to?: number): this {
    return this;
  }

  order(_column?: string, _options?: unknown): this {
    return this;
  }

  limit(_count?: number): this {
    return this;
  }

  single(): this {
    return this;
  }

  insert(): this {
    return this;
  }

  update(): this {
    return this;
  }

  delete(): this {
    return this;
  }

  upsert(): this {
    return this;
  }

  then<TResult1 = DatabaseResponse, TResult2 = never>(
    onfulfilled?: ((value: DatabaseResponse) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return Promise.resolve(this.resolveValue).then(onfulfilled, onrejected);
  }
}

function chainable(resolveValue: DatabaseResponse = {data: null, error: null}) {
  return new ChainableQueryMock(resolveValue);
}

type AuthSessionTestHarness = {
  authSession$: {
    next: (session: {user: unknown} | null) => void;
  };
};

describe('SupabaseService - auth signup and profile helpers', () => {
  let service: SupabaseService;
  let supabaseClient: SupabaseClientHarness;
  let authSession$: AuthSessionTestHarness['authSession$'];
  
  beforeEach(() => {
    const setup = setupSupabaseServiceTest();
    service = setup.service;
    supabaseClient = (service as unknown as SupabaseServiceHarness).supabase;
    authSession$ = (service as unknown as AuthSessionTestHarness).authSession$;
  });
  
  afterEach(() => {
    cleanupSupabaseServiceTest();
  });
  
  // ── signup$ ───────────────────────────────────────────────────────────────
  
  describe('signup$', () => {
    it('should call supabase.auth.signUp with email, password, and username metadata', (done) => {
      spyOn(supabaseClient.auth, 'signUp').and.returnValue(
        Promise.resolve({
          data: {
            user: {
              id: 'new-user',
              email: 'test@example.com',
              created_at: '',
              updated_at: ''
            },
            session: null
          },
          error: null
        })
      );
      
      service.auth.signup$('testuser', 'test@example.com', 'Password123').subscribe({
        next: () => {
          expect(supabaseClient.auth.signUp).toHaveBeenCalledWith({
            email: 'test@example.com',
            password: 'Password123',
            options: {
              data: {
                username: 'testuser'
              }
            }
          });
          done();
        },
        error: done.fail
      });
    }, TEST_TIMEOUT);
    
    it('should error when supabase signup returns an error', (done) => {
      spyOn(supabaseClient.auth, 'signUp').and.returnValue(
        Promise.resolve({data: {user: null, session: null}, error: {message: 'Email taken'}})
      );
      
      service.auth.signup$('user', 'taken@test.com', 'pass').subscribe({
        next: () => {
          fail('Expected signup$ to error');
          done();
        },
        error: (error: Error) => {
          expect(error.message).toContain('Email taken');
          done();
        }
      });
    }, TEST_TIMEOUT);
  });
  
  // ── _burstAllCaches ───────────────────────────────────────────────────────
  
  describe('_burstAllCaches', () => {
    it('should emit all major cache keys on cacheResetter$', (done) => {
      const emittedKeys: Array<string | void> = [];
      service.cacheResetter$.subscribe(keys => emittedKeys.push(...keys));
      
      service.auth._burstAllCaches();
      
      setTimeout(() => {
        expect(emittedKeys).toContain('modules');
        expect(emittedKeys).toContain('patches');
        expect(emittedKeys).toContain('manufacturers');
        expect(emittedKeys).toContain('patchConnections');
        expect(emittedKeys).toContain('rackWithId');
        expect(emittedKeys).toContain('comments');
        done();
      }, 50);
    }, TEST_TIMEOUT);
  });
  
  // ── logoff$ calls _burstAllCaches ────────────────────────────────────────
  
  describe('logoff$ side-effects', () => {
    it('should burst all cache keys when logging off', (done) => {
      spyOn(supabaseClient.auth, 'signOut').and.returnValue(Promise.resolve({error: null}));
      const bustedKeys: Array<string | void> = [];
      service.cacheResetter$.subscribe(keys => bustedKeys.push(...keys));
      
      service.auth.logoff$().subscribe({
        next: () => {
          expect(bustedKeys).toContain('currentUserModules');
          expect(bustedKeys).toContain('currentUserComments');
          expect(bustedKeys).toContain('patchModuleInstances');
          done();
        },
        error: (err) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
  });
  
  // ── updateUsername$ duplicate / DB error path ─────────────────────────────
  
  describe('updateUsername$ database errors', () => {
    it('should rethrow unique-violation as "already taken" message', (done) => {
      const mock = chainable({data: null, error: {code: '23505', message: 'duplicate key'}});
      spyOn(supabaseClient, 'from').and.returnValue(mock);
      
      service.auth.updateUsername$('uid', 'existinguser').subscribe({
        next: () => {
          fail('should have errored');
          done();
        },
        error: (err) => {
          expect(err.message).toContain('already taken');
          done();
        }
      });

    }, TEST_TIMEOUT);
    
    it('should rethrow generic DB error message', (done) => {
      const mock = chainable({data: null, error: {code: '500', message: 'Internal error'}});
      spyOn(supabaseClient, 'from').and.returnValue(mock);
      
      service.auth.updateUsername$('uid', 'uniqueuser').subscribe({
        next: () => {
          fail('should have errored');
          done();
        },
        error: (err) => {
          expect(err.message).toContain('Internal error');
          done();
        }
      });
    }, TEST_TIMEOUT);
  });

  describe('isUsernameAvailable$', () => {
    it('should return false when another profile already uses the username', (done) => {
      const mock = chainable({data: [{id: 'other-user'}], error: null});
      spyOn(supabaseClient, 'from').and.returnValue(mock);
      spyOn(mock, 'select').and.callThrough();
      spyOn(mock, 'ilike').and.callThrough();
      spyOn(mock, 'neq').and.callThrough();
      spyOn(mock, 'limit').and.callThrough();

      service.auth.isUsernameAvailable$('Polyterative', 'current-user').subscribe({
        next: (isAvailable) => {
          expect(isAvailable).toBeFalse();
          expect(supabaseClient.from).toHaveBeenCalledWith('profiles');
          expect(mock.select).toHaveBeenCalledWith('id');
          expect(mock.ilike).toHaveBeenCalledWith('username', 'Polyterative');
          expect(mock.neq).toHaveBeenCalledWith('id', 'current-user');
          expect(mock.limit).toHaveBeenCalledWith(1);
          done();
        },
        error: done.fail
      });
    }, TEST_TIMEOUT);

    it('should return true when no other profile uses the username', (done) => {
      const mock = chainable({data: [], error: null});
      spyOn(supabaseClient, 'from').and.returnValue(mock);

      service.auth.isUsernameAvailable$('newname', 'current-user').subscribe({
        next: (isAvailable) => {
          expect(isAvailable).toBeTrue();
          done();
        },
        error: done.fail
      });
    }, TEST_TIMEOUT);

    it('should surface lookup errors', (done) => {
      const mock = chainable({data: null, error: {message: 'RLS denied'}});
      spyOn(supabaseClient, 'from').and.returnValue(mock);

      service.auth.isUsernameAvailable$('newname', 'current-user').subscribe({
        next: () => {
          fail('should have errored');
          done();
        },
        error: (err) => {
          expect(err.message).toContain('RLS denied');
          done();
        }
      });
    }, TEST_TIMEOUT);

    it('should escape ilike wildcard characters in usernames', (done) => {
      const mock = chainable({data: [], error: null});
      spyOn(supabaseClient, 'from').and.returnValue(mock);
      spyOn(mock, 'ilike').and.callThrough();

      service.auth.isUsernameAvailable$('patch_user', 'current-user').subscribe({
        next: () => {
          expect(mock.ilike).toHaveBeenCalledWith('username', 'patch\\_user');
          done();
        },
        error: done.fail
      });
    }, TEST_TIMEOUT);

    it('should check signup usernames without excluding a current profile', (done) => {
      const mock = chainable({data: [], error: null});
      spyOn(supabaseClient, 'from').and.returnValue(mock);
      spyOn(mock, 'neq').and.callThrough();

      service.auth.isUsernameAvailable$('signupname').subscribe({
        next: (isAvailable) => {
          expect(isAvailable).toBeTrue();
          expect(mock.neq).not.toHaveBeenCalled();
          done();
        },
        error: done.fail
      });
    }, TEST_TIMEOUT);

    it('should return false for empty or whitespace usernames without querying Supabase', (done) => {
      const fromSpy = spyOn(supabaseClient, 'from');
      const results: boolean[] = [];

      service.auth.isUsernameAvailable$('').subscribe({
        next: (isAvailable) => results.push(isAvailable),
        error: done.fail
      });
      service.auth.isUsernameAvailable$('   ').subscribe({
        next: (isAvailable) => results.push(isAvailable),
        error: done.fail,
        complete: () => {
          expect(results).toEqual([false, false]);
          expect(fromSpy).not.toHaveBeenCalled();
          done();
        }
      });
    }, TEST_TIMEOUT);
  });
  
  // ── getUserSession$ session stream ────────────────────────────────────────
  
  describe('getUserSession$ session stream', () => {
    it('should reuse the restored auth session without calling getSession', (done) => {
      const mockSession = {
        user: {id: 'u1', email: 'a@b.com', created_at: '', updated_at: ''}
      };
      const getSessionSpy = spyOn(supabaseClient.auth, 'getSession')
        .and.callFake(() => Promise.reject(new Error('lock failed')));
      authSession$.next(mockSession);
      
      let completedCount = 0;
      const onComplete = () => {
        completedCount++;
        if (completedCount === 2) {
          expect(getSessionSpy).not.toHaveBeenCalled();
          done();
        }
      };
      
      service.auth.getUserSession$().subscribe({next: () => onComplete(), error: done.fail});
      service.auth.getUserSession$().subscribe({next: () => onComplete(), error: done.fail});
    }, TEST_TIMEOUT);
  });
});
