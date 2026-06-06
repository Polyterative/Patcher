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
 * RLS contract test for public.user_modules.
 *
 * Drives the real Supabase REST endpoint with the anon key and a signed-in
 * test user — the same path the Patcher app uses — so policy regressions
 * surface here before they reach production.
 *
 * Skips when SUPABASE_URL / SUPABASE_ANON_KEY are not configured; sign-in
 * creds are guaranteed by the chromium-auth Playwright project.
 */
test.describe('RLS · user_modules', () => {
  loadE2EEnvFromDotEnv();

  test.describe.configure({mode: 'serial'});

  const SUPABASE_URL = process.env['SUPABASE_URL'];
  const SUPABASE_ANON_KEY = process.env['SUPABASE_ANON_KEY'];

  test.skip(!SUPABASE_URL || !SUPABASE_ANON_KEY, 'SUPABASE_URL / SUPABASE_ANON_KEY not configured');

  const newAnonClient = (): SupabaseClient => createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
    auth: {persistSession: false, autoRefreshToken: false}
  });

  let authedClient: SupabaseClient;
  let testUserId: string;
  let testModuleId: number;
  const strangerUid = randomUUID();

  test.beforeAll(async () => {
    const creds = getE2EAuthCredentialsOrThrow();
    authedClient = newAnonClient();
    const {data, error} = await authedClient.auth.signInWithPassword({email: creds.email, password: creds.password});
    expect(error, `Supabase sign-in failed: ${ error?.message }`).toBeNull();
    expect(data.user?.id).toBeTruthy();
    testUserId = data.user!.id;

    const {data: modules, error: modulesError} = await newAnonClient()
      .from('modules')
      .select('id')
      .order('id', {ascending: true})
      .limit(50);
    expect(modulesError, `module lookup failed: ${ modulesError?.message }`).toBeNull();
    expect(modules?.length ?? 0).toBeGreaterThan(0);

    const {data: owned} = await authedClient
      .from('user_modules')
      .select('moduleid')
      .eq('profileid', testUserId);
    const ownedSet = new Set((owned ?? []).map(r => r.moduleid));

    const fresh = (modules ?? []).find(m => !ownedSet.has(m.id));
    expect(fresh, 'no module available that the test user does not already own').toBeDefined();
    testModuleId = fresh!.id;
  });

  test.afterAll(async () => {
    if (authedClient && testUserId && testModuleId) {
      await authedClient.from('user_modules').delete().eq('profileid', testUserId).eq('moduleid', testModuleId);
      await authedClient.auth.signOut();
    }
  });

  test('anon can SELECT (Community counters depend on this)', async () => {
    const {data, error} = await newAnonClient().from('user_modules').select('kind').limit(5);
    expect(error, `anon SELECT failed: ${ error?.message }`).toBeNull();
    expect(data?.length ?? 0, 'anon SELECT returned no rows — Community counter would break').toBeGreaterThan(0);
  });

  test('anon INSERT is blocked', async () => {
    const {error} = await newAnonClient()
      .from('user_modules')
      .insert({profileid: strangerUid, moduleid: testModuleId, kind: 'HAS'});
    expect(error, 'anon INSERT unexpectedly succeeded — RLS is not enforcing writes').not.toBeNull();
  });

  test('anon DELETE leaves rows intact', async () => {
    // Insert a known owner row first, then attempt anon delete and verify it still exists.
    const insertResult = await authedClient.from('user_modules')
      .upsert({profileid: testUserId, moduleid: testModuleId, kind: 'HAS'}, {onConflict: 'profileid,moduleid'});
    expect(insertResult.error, `setup insert failed: ${ insertResult.error?.message }`).toBeNull();

    await newAnonClient().from('user_modules').delete().eq('moduleid', testModuleId);

    const {data} = await newAnonClient()
      .from('user_modules')
      .select('profileid')
      .eq('profileid', testUserId)
      .eq('moduleid', testModuleId)
      .limit(1);
    expect(data?.length ?? 0, 'anon DELETE removed a row that RLS should have protected').toBe(1);
  });

  test('owner INSERT on own row succeeds', async () => {
    // Make sure the slot is empty before testing INSERT.
    await authedClient.from('user_modules').delete().eq('profileid', testUserId).eq('moduleid', testModuleId);

    const {error} = await authedClient
      .from('user_modules')
      .insert({profileid: testUserId, moduleid: testModuleId, kind: 'HAS'});
    expect(error, `owner INSERT failed: ${ error?.message }`).toBeNull();

    const {data} = await authedClient.from('user_modules')
      .select('kind')
      .eq('profileid', testUserId)
      .eq('moduleid', testModuleId);
    expect(data?.[0]?.kind).toBe('HAS');
  });

  test('owner UPSERT (kind change) on own row succeeds', async () => {
    const {error} = await authedClient.from('user_modules')
      .upsert({profileid: testUserId, moduleid: testModuleId, kind: 'WANTS'}, {onConflict: 'profileid,moduleid'});
    expect(error, `owner UPSERT failed: ${ error?.message }`).toBeNull();

    const {data} = await authedClient.from('user_modules')
      .select('kind')
      .eq('profileid', testUserId)
      .eq('moduleid', testModuleId);
    expect(data?.[0]?.kind).toBe('WANTS');
  });

  test('authenticated INSERT spoofing another profileid is blocked', async () => {
    const {error} = await authedClient
      .from('user_modules')
      .insert({profileid: strangerUid, moduleid: testModuleId, kind: 'HAS'});
    expect(error, 'INSERT with foreign profileid unexpectedly succeeded').not.toBeNull();

    const {data} = await newAnonClient()
      .from('user_modules')
      .select('profileid')
      .eq('profileid', strangerUid)
      .limit(1);
    expect(data?.length ?? 0, 'spoofed row leaked into the table').toBe(0);
  });

  test('authenticated DELETE of a foreign row affects 0 rows', async () => {
    const {data: others, error} = await newAnonClient()
      .from('user_modules')
      .select('profileid, moduleid')
      .neq('profileid', testUserId)
      .limit(1);
    expect(error, `foreign-row lookup failed: ${ error?.message }`).toBeNull();
    expect(others?.length ?? 0, 'no foreign row available to attempt deletion against').toBeGreaterThan(0);
    const target = others![0];

    await authedClient.from('user_modules')
      .delete()
      .eq('profileid', target.profileid)
      .eq('moduleid', target.moduleid);

    const {data: still} = await newAnonClient()
      .from('user_modules')
      .select('profileid')
      .eq('profileid', target.profileid)
      .eq('moduleid', target.moduleid)
      .limit(1);
    expect(still?.length ?? 0, 'RLS allowed an authenticated user to delete a foreign row').toBe(1);
  });

  test('owner DELETE on own row succeeds', async () => {
    const {error} = await authedClient
      .from('user_modules')
      .delete()
      .eq('profileid', testUserId)
      .eq('moduleid', testModuleId);
    expect(error, `owner DELETE failed: ${ error?.message }`).toBeNull();

    const {data} = await authedClient.from('user_modules')
      .select('kind')
      .eq('profileid', testUserId)
      .eq('moduleid', testModuleId);
    expect(data?.length ?? 0).toBe(0);
  });
});
