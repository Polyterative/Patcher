import { SupabaseService } from '../../supabase.service';
import {
  cleanupSupabaseServiceTest,
  setupSupabaseServiceTest
} from './test-setup';
import { getSupabaseClientDouble } from './supabase-query-test-doubles';
import type { RecoveryEventSession } from '../../supabase-auth.helpers';


/**
 * Unit coverage for the S2 additions to `createAuthNamespace`
 * (`verifyRecoveryOtp$`, `getCurrentSessionFingerprint$`) and for
 * `SupabaseService`'s `passwordRecoverySession$` root-listener boundary
 * (`ReviewRepairS2AuthResilience.md` findings 2 and the R13 SSR gap). These
 * exercise the *real* implementation (spying on the real, placeholder-backed
 * Supabase client), not just the mocked `auth` namespace used by
 * `user-reset-password-data.service.spec.ts`.
 */
function base64url(payload: object): string {
  const json = JSON.stringify(payload);
  const base64 = typeof btoa === 'function'
    ? btoa(json)
    : Buffer.from(json).toString('base64');
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function jwtWithClaims(claims: Record<string, unknown>): string {
  return `${ base64url({alg: 'none'}) }.${ base64url(claims) }.sig`;
}

describe('SupabaseService.auth — recovery methods (S2)', () => {
  let service: SupabaseService;
  let supabaseClient: ReturnType<typeof getSupabaseClientDouble>;

  beforeEach(() => {
    const setup = setupSupabaseServiceTest();
    service = setup.service;
    supabaseClient = getSupabaseClientDouble(service);
  });

  afterEach(() => {
    cleanupSupabaseServiceTest();
  });

  describe('verifyRecoveryOtp$', () => {
    it('resolves a RecoveryEventSession when the session_id claim is well-formed', (done) => {
      spyOn(supabaseClient.auth, 'verifyOtp').and.returnValue(Promise.resolve({
        data: {session: {user: {id: 'user-1'}, access_token: jwtWithClaims({session_id: 'sess-1'})}},
        error: null
      }));

      service.auth.verifyRecoveryOtp$('abc123').subscribe({
        next: (result: RecoveryEventSession | null) => {
          expect(result).toEqual(jasmine.objectContaining({userId: 'user-1', sessionId: 'sess-1'}));
          done();
        },
        error: done.fail
      });
    });

    it('resolves null (fails closed) when the session_id claim is missing', (done) => {
      spyOn(supabaseClient.auth, 'verifyOtp').and.returnValue(Promise.resolve({
        data: {session: {user: {id: 'user-1'}, access_token: jwtWithClaims({sub: 'user-1'})}},
        error: null
      }));

      service.auth.verifyRecoveryOtp$('abc123').subscribe({
        next: result => {
          expect(result).toBeNull();
          done();
        },
        error: done.fail
      });
    });

    it('resolves null (fails closed) when the session_id claim is an empty string', (done) => {
      spyOn(supabaseClient.auth, 'verifyOtp').and.returnValue(Promise.resolve({
        data: {session: {user: {id: 'user-1'}, access_token: jwtWithClaims({session_id: ''})}},
        error: null
      }));

      service.auth.verifyRecoveryOtp$('abc123').subscribe({
        next: result => {
          expect(result).toBeNull();
          done();
        },
        error: done.fail
      });
    });

    it('rethrows the raw SDK error on verification failure', (done) => {
      spyOn(supabaseClient.auth, 'verifyOtp').and.returnValue(Promise.resolve({
        data: {session: null},
        error: {message: 'otp_expired'}
      }));

      service.auth.verifyRecoveryOtp$('abc123').subscribe({
        next: () => done.fail('expected an error, got a value'),
        error: (error: {message: string}) => {
          expect(error.message).toBe('otp_expired');
          done();
        }
      });
    });
  });

  describe('getCurrentSessionFingerprint$', () => {
    it('resolves null when the session_id claim cannot be extracted, never a fingerprint with an empty sessionId', (done) => {
      const authSession = Reflect.get(service, 'authSession$') as {next: (v: unknown) => void};
      authSession.next({user: {id: 'user-1'}, access_token: jwtWithClaims({sub: 'user-1'})});

      service.auth.getCurrentSessionFingerprint$().subscribe(fingerprint => {
        expect(fingerprint).toBeNull();
        done();
      });
    });
  });

  describe('passwordRecoverySession$ — SSR root-listener boundary (R13)', () => {
    it('never emits a synthesized recovery event from mere construction under SSR', () => {
      // `setupSupabaseServiceTest()` constructs `SupabaseService` with
      // `PLATFORM_ID: 'server'` (test-setup.ts's standing convention for this
      // whole file). The only two things that can make `passwordRecoverySession$`
      // emit are (a) its own constructor seed (`null`, asserted here) and (b) a
      // real `PASSWORD_RECOVERY`/`SIGNED_OUT` event from the Supabase client's
      // own `onAuthStateChange` callback — which in turn only fires from a
      // real network response or the SDK's `_initialize()` hash-fragment
      // auto-processing. `_initialize()`'s hash-processing reads
      // `window.location` directly (measured in `TechnicalAuthResilience.md`
      // Decision 3's SDK research) and is therefore structurally impossible
      // to trigger in Node/SSR — there is no Patcher-owned gate to add or
      // remove here beyond the (pre-existing, unchanged) SSR-safe client
      // construction (`persistSession: isBrowser`, stubbed storage) already
      // covered by `initialization.spec.ts`. This test pins the *observable*
      // half of that guarantee: no side effect reaches subscribers.
      const emitted: (RecoveryEventSession | null)[] = [];
      service.auth.passwordRecoverySession$.subscribe(value => emitted.push(value));

      expect(emitted).toEqual([null]);
    });
  });
});
