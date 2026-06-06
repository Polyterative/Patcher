import {
  expect,
  test
} from '@playwright/test';
import {
  createClient,
  type SupabaseClient
} from '@supabase/supabase-js';
import {randomUUID} from 'node:crypto';

import {
  getE2EAuthCredentialsOrThrow,
  loadE2EEnvFromDotEnv
} from './helpers/auth';

/**
 * RLS contract test for public.standards.
 *
 * Drives the real Supabase REST endpoint with the anon key and a signed-in
 * test user — the same path the Patcher app uses — so policy regressions
 * surface here before they reach production.
 *
 * Skips when SUPABASE_URL / SUPABASE_ANON_KEY are not configured; sign-in
 * creds are guaranteed by the chromium-auth Playwright project.
 */
test.describe('RLS · standards', () => {
  loadE2EEnvFromDotEnv();

  test.describe.configure({mode: 'serial'});

  const SUPABASE_URL = process.env['SUPABASE_URL'];
  const SUPABASE_ANON_KEY = process.env['SUPABASE_ANON_KEY'];

  test.skip(!SUPABASE_URL || !SUPABASE_ANON_KEY, 'SUPABASE_URL / SUPABASE_ANON_KEY not configured');

  const newAnonClient = (): SupabaseClient => createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
    auth: {persistSession: false, autoRefreshToken: false}
  });

  let authedClient: SupabaseClient;
  let existingStandard: {id: number; name: string};

  test.beforeAll(async () => {
    const creds = getE2EAuthCredentialsOrThrow();
    authedClient = newAnonClient();
    const {data, error} = await authedClient.auth.signInWithPassword({email: creds.email, password: creds.password});
    expect(error, `Supabase sign-in failed: ${ error?.message }`).toBeNull();
    expect(data.user?.id).toBeTruthy();

    const {data: standards, error: standardsError} = await newAnonClient()
      .from('standards')
      .select('id, name')
      .order('id', {ascending: true})
      .limit(1);
    expect(standardsError, `standard lookup failed: ${ standardsError?.message }`).toBeNull();
    expect(standards?.length ?? 0).toBeGreaterThan(0);
    existingStandard = standards![0];
  });

  test.afterAll(async () => {
    if (authedClient) {
      await authedClient.from('standards').delete().like('name', 'rls-test-%');
      await authedClient.auth.signOut();
    }
  });

  test('anon can SELECT (module browser reference data depends on this)', async () => {
    const {data, error} = await newAnonClient().from('standards').select('id, name').limit(5);
    expect(error, `anon SELECT failed: ${ error?.message }`).toBeNull();
    expect(data?.length ?? 0, 'anon SELECT returned no rows — module browser standards would break').toBeGreaterThan(0);
  });

  test('authenticated user can SELECT (module browser reference data depends on this)', async () => {
    const {data, error} = await authedClient.from('standards').select('id, name').limit(5);
    expect(error, `authenticated SELECT failed: ${ error?.message }`).toBeNull();
    expect(data?.length ?? 0, 'authenticated SELECT returned no rows — module browser standards would break').toBeGreaterThan(0);
  });

  test('anon INSERT is blocked', async () => {
    const standardName = `rls-test-${ randomUUID() }`;
    const {error} = await newAnonClient()
      .from('standards')
      .insert({name: standardName});
    expect(error, 'anon INSERT unexpectedly succeeded — RLS is not enforcing writes').not.toBeNull();

    const {data} = await newAnonClient()
      .from('standards')
      .select('id')
      .eq('name', standardName)
      .limit(1);
    expect(data?.length ?? 0, 'blocked anon INSERT leaked a row into standards').toBe(0);
  });

  test('authenticated INSERT is blocked', async () => {
    const standardName = `rls-test-${ randomUUID() }`;
    const {error} = await authedClient
      .from('standards')
      .insert({name: standardName});
    expect(error, 'authenticated INSERT unexpectedly succeeded — reference data should be read-only').not.toBeNull();

    const {data} = await newAnonClient()
      .from('standards')
      .select('id')
      .eq('name', standardName)
      .limit(1);
    expect(data?.length ?? 0, 'blocked authenticated INSERT leaked a row into standards').toBe(0);
  });

  test('authenticated UPDATE is blocked', async () => {
    const {data: updated, error} = await authedClient
      .from('standards')
      .update({name: existingStandard.name})
      .eq('id', existingStandard.id)
      .select('id');
    expect(error || (updated?.length ?? 0) === 0, 'authenticated UPDATE unexpectedly returned an updated standard row').toBeTruthy();

    const {data, error: lookupError} = await newAnonClient()
      .from('standards')
      .select('id, name')
      .eq('id', existingStandard.id)
      .limit(1);
    expect(lookupError, `post-UPDATE lookup failed: ${ lookupError?.message }`).toBeNull();
    expect(data?.[0]?.name, 'standard row changed after blocked UPDATE attempt').toBe(existingStandard.name);
  });
});
