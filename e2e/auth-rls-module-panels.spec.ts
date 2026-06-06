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
 * RLS contract test for public.module_panels.
 *
 * Drives the real Supabase REST endpoint with the anon key and a signed-in
 * test user — the same path the Patcher app uses — so policy regressions
 * surface here before they reach production.
 *
 * Skips when SUPABASE_URL / SUPABASE_ANON_KEY are not configured; sign-in
 * creds are guaranteed by the chromium-auth Playwright project.
 */
test.describe('RLS · module_panels', () => {
  loadE2EEnvFromDotEnv();

  test.describe.configure({mode: 'serial'});

  const SUPABASE_URL = process.env['SUPABASE_URL'];
  const SUPABASE_ANON_KEY = process.env['SUPABASE_ANON_KEY'];

  test.skip(!SUPABASE_URL || !SUPABASE_ANON_KEY, 'SUPABASE_URL / SUPABASE_ANON_KEY not configured');

  const newAnonClient = (): SupabaseClient => createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
    auth: {persistSession: false, autoRefreshToken: false}
  });

  let authedClient: SupabaseClient;
  let testModuleId: number;
  let guardPanelId: number | undefined;
  let insertedPanelId: number | undefined;

  const panelRow = (description: string): {filename: string; moduleid: number; description: string} => ({
    filename: `rls-test-${ randomUUID() }.svg`,
    moduleid: testModuleId,
    description
  });

  test.beforeAll(async () => {
    const creds = getE2EAuthCredentialsOrThrow();
    authedClient = newAnonClient();
    const {data, error} = await authedClient.auth.signInWithPassword({email: creds.email, password: creds.password});
    expect(error, `Supabase sign-in failed: ${ error?.message }`).toBeNull();
    expect(data.user?.id).toBeTruthy();

    const {data: modules, error: modulesError} = await newAnonClient()
      .from('modules')
      .select('id')
      .order('id', {ascending: true})
      .limit(1);
    expect(modulesError, `module lookup failed: ${ modulesError?.message }`).toBeNull();
    expect(modules?.length ?? 0).toBeGreaterThan(0);
    testModuleId = modules![0].id;

    const {data: guard, error: guardError} = await authedClient
      .from('module_panels')
      .insert(panelRow('rls-test-guard'))
      .select('id')
      .single();
    expect(guardError, `guard panel insert failed: ${ guardError?.message }`).toBeNull();
    guardPanelId = guard!.id;
  });

  test.afterAll(async () => {
    if (authedClient) {
      if (guardPanelId) {
        await authedClient.from('module_panels').delete().eq('id', guardPanelId);
      }
      if (insertedPanelId) {
        await authedClient.from('module_panels').delete().eq('id', insertedPanelId);
      }
      await authedClient.from('module_panels').delete().like('filename', 'rls-test-%');
      await authedClient.auth.signOut();
    }
  });

  test('anon can SELECT (module catalog panels stay publicly readable)', async () => {
    const {data, error} = await newAnonClient().from('module_panels').select('id, filename, description').limit(5);
    expect(error, `anon SELECT failed: ${ error?.message }`).toBeNull();
    expect(data?.length ?? 0, 'anon SELECT returned no rows — module catalog panels would break').toBeGreaterThan(0);
  });

  test('authenticated user can SELECT (module catalog panels stay readable)', async () => {
    const {data, error} = await authedClient.from('module_panels').select('id, filename, description').limit(5);
    expect(error, `authenticated SELECT failed: ${ error?.message }`).toBeNull();
    expect(data?.length ?? 0, 'authenticated SELECT returned no rows — module catalog panels would break').toBeGreaterThan(0);
  });

  test('anon INSERT is blocked', async () => {
    const blocked = panelRow('rls-test-blocked-insert');
    const {error} = await newAnonClient()
      .from('module_panels')
      .insert(blocked);
    expect(error, 'anon INSERT unexpectedly succeeded — RLS is not enforcing writes').not.toBeNull();

    const {data} = await newAnonClient()
      .from('module_panels')
      .select('id')
      .eq('filename', blocked.filename)
      .limit(1);
    expect(data?.length ?? 0, 'blocked anon INSERT leaked a row into module_panels').toBe(0);
  });

  test('anon UPDATE is blocked', async () => {
    expect(guardPanelId).toBeTruthy();
    const {data: updated, error} = await newAnonClient()
      .from('module_panels')
      .update({description: 'rls-test-anon-update'})
      .eq('id', guardPanelId!)
      .select('id');
    expect(error || (updated?.length ?? 0) === 0, 'anon UPDATE unexpectedly changed module_panels').toBeTruthy();

    const {data} = await authedClient.from('module_panels').select('description').eq('id', guardPanelId!).single();
    expect(data?.description).toBe('rls-test-guard');
  });

  test('anon DELETE is blocked', async () => {
    expect(guardPanelId).toBeTruthy();
    const {data: deleted, error} = await newAnonClient()
      .from('module_panels')
      .delete()
      .eq('id', guardPanelId!)
      .select('id');
    expect(error || (deleted?.length ?? 0) === 0, 'anon DELETE unexpectedly removed a module_panels row').toBeTruthy();

    const {data} = await authedClient.from('module_panels').select('id').eq('id', guardPanelId!).limit(1);
    expect(data?.length ?? 0, 'anon DELETE removed a row that RLS should have protected').toBe(1);
  });

  test('authenticated INSERT succeeds', async () => {
    const {data, error} = await authedClient
      .from('module_panels')
      .insert(panelRow('rls-test-inserted'))
      .select('id, description')
      .single();
    expect(error, `authenticated INSERT failed: ${ error?.message }`).toBeNull();
    expect(data?.id).toBeTruthy();
    expect(data?.description).toBe('rls-test-inserted');
    insertedPanelId = data!.id;
  });

  test('authenticated UPDATE succeeds on the row the test inserted', async () => {
    expect(insertedPanelId, 'authenticated INSERT test did not create a module_panels row').toBeTruthy();

    const {data, error} = await authedClient
      .from('module_panels')
      .update({description: 'rls-test-updated'})
      .eq('id', insertedPanelId!)
      .select('description')
      .single();
    expect(error, `authenticated UPDATE failed: ${ error?.message }`).toBeNull();
    expect(data?.description).toBe('rls-test-updated');
  });
});
