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
 * RLS contract test for public.user_module_tags.
 *
 * Drives the real Supabase REST endpoint with the anon key and a signed-in
 * test user — the same path the Patcher app uses — so policy regressions
 * surface here before they reach production.
 *
 * Skips when SUPABASE_URL / SUPABASE_ANON_KEY are not configured; sign-in
 * creds are guaranteed by the chromium-auth Playwright project.
 */
test.describe('RLS · user_module_tags', () => {
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
  let testModuleTagId: number;
  const strangerUid = randomUUID();

  test.beforeAll(async () => {
    const creds = getE2EAuthCredentialsOrThrow();
    authedClient = newAnonClient();
    const {data, error} = await authedClient.auth.signInWithPassword({email: creds.email, password: creds.password});
    expect(error, `Supabase sign-in failed: ${ error?.message }`).toBeNull();
    expect(data.user?.id).toBeTruthy();
    testUserId = data.user!.id;

    const {data: moduleTags, error: moduleTagsError} = await newAnonClient()
      .from('module_tags')
      .select('id')
      .order('id', {ascending: true})
      .limit(50);
    expect(moduleTagsError, `module tag lookup failed: ${ moduleTagsError?.message }`).toBeNull();
    expect(moduleTags?.length ?? 0).toBeGreaterThan(0);

    const {data: owned} = await authedClient
      .from('user_module_tags')
      .select('moduletagid')
      .eq('authorid', testUserId);
    const ownedSet = new Set((owned ?? []).map(r => r.moduletagid));

    const fresh = (moduleTags ?? []).find(m => !ownedSet.has(m.id));
    expect(fresh, 'no module tag available that the test user has not already voted on').toBeDefined();
    testModuleTagId = fresh!.id;
  });

  test.afterAll(async () => {
    if (authedClient && testUserId && testModuleTagId) {
      await authedClient.from('user_module_tags').delete().eq('authorid', testUserId).eq('moduletagid', testModuleTagId);
      await authedClient.auth.signOut();
    }
  });

  test('anon can SELECT (vote counts are public; this powers the module browser)', async () => {
    const {data, error} = await newAnonClient().from('user_module_tags').select('moduletagid').limit(5);
    expect(error, `anon SELECT failed: ${ error?.message }`).toBeNull();
    expect(data?.length ?? 0, 'anon SELECT returned no rows — module browser vote counts would break').toBeGreaterThan(0);
  });

  test('anon INSERT is blocked', async () => {
    const {error} = await newAnonClient()
      .from('user_module_tags')
      .insert({authorid: strangerUid, moduletagid: testModuleTagId});
    expect(error, 'anon INSERT unexpectedly succeeded — RLS is not enforcing writes').not.toBeNull();
  });

  test('anon DELETE leaves rows intact', async () => {
    // Insert a known owner row first, then attempt anon delete and verify it still exists.
    const insertResult = await authedClient.from('user_module_tags')
      .insert({authorid: testUserId, moduletagid: testModuleTagId});
    expect(insertResult.error, `setup insert failed: ${ insertResult.error?.message }`).toBeNull();

    await newAnonClient().from('user_module_tags').delete().eq('moduletagid', testModuleTagId);

    const {data} = await newAnonClient()
      .from('user_module_tags')
      .select('authorid')
      .eq('authorid', testUserId)
      .eq('moduletagid', testModuleTagId)
      .limit(1);
    expect(data?.length ?? 0, 'anon DELETE removed a row that RLS should have protected').toBe(1);
  });

  test('owner INSERT on own row succeeds', async () => {
    // Make sure the slot is empty before testing INSERT.
    await authedClient.from('user_module_tags').delete().eq('authorid', testUserId).eq('moduletagid', testModuleTagId);

    const {error} = await authedClient
      .from('user_module_tags')
      .insert({authorid: testUserId, moduletagid: testModuleTagId});
    expect(error, `owner INSERT failed: ${ error?.message }`).toBeNull();

    const {data} = await authedClient.from('user_module_tags')
      .select('moduletagid')
      .eq('authorid', testUserId)
      .eq('moduletagid', testModuleTagId);
    expect(data?.[0]?.moduletagid).toBe(testModuleTagId);
  });

  test('authenticated INSERT spoofing another authorid is blocked', async () => {
    const {error} = await authedClient
      .from('user_module_tags')
      .insert({authorid: strangerUid, moduletagid: testModuleTagId});
    expect(error, 'INSERT with foreign authorid unexpectedly succeeded').not.toBeNull();

    const {data} = await newAnonClient()
      .from('user_module_tags')
      .select('authorid')
      .eq('authorid', strangerUid)
      .eq('moduletagid', testModuleTagId)
      .limit(1);
    expect(data?.length ?? 0, 'spoofed row leaked into the table').toBe(0);
  });

  test('authenticated DELETE of a foreign row affects 0 rows', async () => {
    const {data: others, error} = await newAnonClient()
      .from('user_module_tags')
      .select('authorid, moduletagid')
      .neq('authorid', testUserId)
      .limit(1);
    expect(error, `foreign-row lookup failed: ${ error?.message }`).toBeNull();
    expect(others?.length ?? 0, 'no foreign row available to attempt deletion against').toBeGreaterThan(0);
    const target = others![0];

    await authedClient.from('user_module_tags')
      .delete()
      .eq('authorid', target.authorid)
      .eq('moduletagid', target.moduletagid);

    const {data: still} = await newAnonClient()
      .from('user_module_tags')
      .select('authorid')
      .eq('authorid', target.authorid)
      .eq('moduletagid', target.moduletagid)
      .limit(1);
    expect(still?.length ?? 0, 'RLS allowed an authenticated user to delete a foreign row').toBe(1);
  });

  test('owner DELETE on own row succeeds', async () => {
    const {error} = await authedClient
      .from('user_module_tags')
      .delete()
      .eq('authorid', testUserId)
      .eq('moduletagid', testModuleTagId);
    expect(error, `owner DELETE failed: ${ error?.message }`).toBeNull();

    const {data} = await authedClient.from('user_module_tags')
      .select('moduletagid')
      .eq('authorid', testUserId)
      .eq('moduletagid', testModuleTagId);
    expect(data?.length ?? 0).toBe(0);
  });
});
