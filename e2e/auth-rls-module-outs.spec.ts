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
 * RLS contract test for public.module_outs.
 *
 * Drives the real Supabase REST endpoint with the anon key and a signed-in
 * test user — the same path the Patcher app uses — so policy regressions
 * surface here before they reach production.
 *
 * Skips when SUPABASE_URL / SUPABASE_ANON_KEY are not configured; sign-in
 * creds are guaranteed by the chromium-auth Playwright project.
 */
test.describe('RLS · module_outs', () => {
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
  let guardOutputId: number | undefined;
  let insertedOutputId: number | undefined;

  const outputRow = (name: string): {name: string; moduleid: number; min: number; max: number; authorid: string} => ({
    name,
    moduleid: testModuleId,
    min: 0,
    max: 1,
    authorid: testUserId
  });

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
      .limit(1);
    expect(modulesError, `module lookup failed: ${ modulesError?.message }`).toBeNull();
    expect(modules?.length ?? 0).toBeGreaterThan(0);
    testModuleId = modules![0].id;

    const {data: guard, error: guardError} = await authedClient
      .from('module_outs')
      .insert(outputRow(`rls-test-guard-${ randomUUID() }`))
      .select('id')
      .single();
    expect(guardError, `guard output insert failed: ${ guardError?.message }`).toBeNull();
    guardOutputId = guard!.id;
  });

  test.afterAll(async () => {
    if (authedClient) {
      if (guardOutputId) {
        await authedClient.from('module_outs').delete().eq('id', guardOutputId);
      }
      if (insertedOutputId) {
        await authedClient.from('module_outs').delete().eq('id', insertedOutputId);
      }
      await authedClient.from('module_outs').delete().like('name', 'rls-test-%');
      await authedClient.auth.signOut();
    }
  });

  test('anon can SELECT (module catalog outputs stay publicly readable)', async () => {
    const {data, error} = await newAnonClient().from('module_outs').select('id, name, moduleid').limit(5);
    expect(error, `anon SELECT failed: ${ error?.message }`).toBeNull();
    expect(data?.length ?? 0, 'anon SELECT returned no rows — module catalog outputs would break').toBeGreaterThan(0);
  });

  test('authenticated user can SELECT (module catalog outputs stay readable)', async () => {
    const {data, error} = await authedClient.from('module_outs').select('id, name, moduleid').limit(5);
    expect(error, `authenticated SELECT failed: ${ error?.message }`).toBeNull();
    expect(data?.length ?? 0, 'authenticated SELECT returned no rows — module catalog outputs would break').toBeGreaterThan(0);
  });

  test('anon INSERT is blocked', async () => {
    const name = `rls-test-blocked-${ randomUUID() }`;
    const {error} = await newAnonClient()
      .from('module_outs')
      .insert({name, moduleid: testModuleId, min: 0, max: 1, authorid: testUserId});
    expect(error, 'anon INSERT unexpectedly succeeded — RLS is not enforcing writes').not.toBeNull();

    const {data} = await newAnonClient().from('module_outs').select('id').eq('name', name).limit(1);
    expect(data?.length ?? 0, 'blocked anon INSERT leaked a row into module_outs').toBe(0);
  });

  test('anon UPDATE is blocked', async () => {
    expect(guardOutputId).toBeTruthy();
    const {data: updated, error} = await newAnonClient()
      .from('module_outs')
      .update({name: 'rls-test-anon-update'})
      .eq('id', guardOutputId!)
      .select('id');
    expect(error || (updated?.length ?? 0) === 0, 'anon UPDATE unexpectedly changed module_outs').toBeTruthy();

    const {data} = await authedClient.from('module_outs').select('name').eq('id', guardOutputId!).single();
    expect(data?.name).not.toBe('rls-test-anon-update');
  });

  test('anon DELETE is blocked', async () => {
    expect(guardOutputId).toBeTruthy();
    const {data: deleted, error} = await newAnonClient()
      .from('module_outs')
      .delete()
      .eq('id', guardOutputId!)
      .select('id');
    expect(error || (deleted?.length ?? 0) === 0, 'anon DELETE unexpectedly removed a module_outs row').toBeTruthy();

    const {data} = await authedClient.from('module_outs').select('id').eq('id', guardOutputId!).limit(1);
    expect(data?.length ?? 0, 'anon DELETE removed a row that RLS should have protected').toBe(1);
  });

  test('authenticated INSERT succeeds', async () => {
    const name = `rls-test-inserted-${ randomUUID() }`;
    const {data, error} = await authedClient
      .from('module_outs')
      .insert(outputRow(name))
      .select('id, name')
      .single();
    expect(error, `authenticated INSERT failed: ${ error?.message }`).toBeNull();
    expect(data?.name).toBe(name);
    insertedOutputId = data!.id;
  });

  test('authenticated UPDATE succeeds on the row the test inserted', async () => {
    expect(insertedOutputId, 'authenticated INSERT test did not create a module_outs row').toBeTruthy();

    const name = `rls-test-updated-${ randomUUID() }`;
    const {data, error} = await authedClient
      .from('module_outs')
      .update({name})
      .eq('id', insertedOutputId!)
      .select('name')
      .single();
    expect(error, `authenticated UPDATE failed: ${ error?.message }`).toBeNull();
    expect(data?.name).toBe(name);
  });
});
