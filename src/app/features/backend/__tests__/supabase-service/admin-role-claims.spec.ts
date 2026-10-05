import { SupabaseService } from '../../supabase.service';
import {
  AuthSessionSubjectDouble,
  AuthSessionUserFixture,
  authSessionFixture,
  getAuthSessionSubjectDouble
} from './supabase-query-test-doubles';
import {
  cleanupSupabaseServiceTest,
  setupSupabaseServiceTest
} from './test-setup';

function user(over: Partial<AuthSessionUserFixture> & Record<string, unknown> = {}): AuthSessionUserFixture {
  return {
    id: 'u1',
    email: 'u1@test.com',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-06-01T00:00:00Z',
    ...over
  } as AuthSessionUserFixture;
}

describe('SupabaseService - hasAdminRole$ claim hardening', () => {
  let service: SupabaseService;
  let authSession$: AuthSessionSubjectDouble;

  beforeEach(() => {
    service = setupSupabaseServiceTest().service;
    authSession$ = getAuthSessionSubjectDouble(service);
  });

  afterEach(() => cleanupSupabaseServiceTest());

  function isAdminFor(session: unknown): boolean {
    let latest: boolean | undefined;
    const subscription = service.auth.hasAdminRole$().subscribe(value => latest = value);
    authSession$.next(session as never);
    subscription.unsubscribe();
    return latest as boolean;
  }

  it('grants admin only for the exact string "admin" in app_metadata.role', () => {
    expect(isAdminFor(authSessionFixture(user({app_metadata: {role: 'admin'}})))).toBeTrue();
  });

  for (const role of ['Admin', 'ADMIN', ' admin', 'admin ', 'administrator', 'super_admin', 'service_role', '', 'user', 'authenticated']) {
    it(`denies app_metadata.role ${JSON.stringify(role)}`, () => {
      expect(isAdminFor(authSessionFixture(user({app_metadata: {role}})))).toBeFalse();
    });
  }

  for (const role of [['admin'], {admin: true}, true, 1, null, undefined]) {
    it(`denies a non-string role ${JSON.stringify(role)}`, () => {
      expect(isAdminFor(authSessionFixture(user({app_metadata: {role}})))).toBeFalse();
    });
  }

  it('ignores other claim shapes that look like admin', () => {
    for (const metadata of [{roles: ['admin']}, {is_admin: true}, {admin: true}, {claims_admin: true}, {Role: 'admin'}]) {
      expect(isAdminFor(authSessionFixture(user({app_metadata: metadata})))).withContext(JSON.stringify(metadata)).toBeFalse();
    }
  });

  it('does not trust user_metadata, which end users can edit themselves', () => {
    expect(isAdminFor(authSessionFixture(user({user_metadata: {role: 'admin'}} as never)))).toBeFalse();
    expect(isAdminFor(authSessionFixture(user({app_metadata: {role: 'user'}, user_metadata: {role: 'admin'}} as never)))).toBeFalse();
  });

  it('denies sessions with missing or malformed metadata, and signed-out state', () => {
    expect(isAdminFor(authSessionFixture(user()))).toBeFalse();
    expect(isAdminFor(authSessionFixture(user({app_metadata: null} as never)))).toBeFalse();
    expect(isAdminFor(authSessionFixture(user({app_metadata: 'admin'} as never)))).toBeFalse();
    expect(isAdminFor(authSessionFixture(user({app_metadata: ['admin']} as never)))).toBeFalse();
    expect(isAdminFor(null)).toBeFalse();
    expect(isAdminFor(undefined)).toBeFalse();
    expect(isAdminFor({})).toBeFalse();
    expect(isAdminFor({user: null})).toBeFalse();
  });

  it('revokes admin immediately when the session is replaced or signed out', () => {
    const emitted: boolean[] = [];
    const subscription = service.auth.hasAdminRole$().subscribe(value => emitted.push(value));
    authSession$.next(authSessionFixture(user({app_metadata: {role: 'admin'}})) as never);
    authSession$.next(null as never);
    authSession$.next(authSessionFixture(user({app_metadata: {role: 'admin'}})) as never);
    authSession$.next(authSessionFixture(user({app_metadata: {}})) as never);
    subscription.unsubscribe();
    expect(emitted.slice(-4)).toEqual([true, false, true, false]);
  });
});
