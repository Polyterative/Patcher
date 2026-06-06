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
 * RLS contract test for public.tags.
 *
 * Drives the real Supabase REST endpoint with the anon key and a signed-in
 * test user — the same path the Patcher app uses — so policy regressions
 * surface here before they reach production.
 *
 * Skips when SUPABASE_URL / SUPABASE_ANON_KEY are not configured; sign-in
 * creds are guaranteed by the chromium-auth Playwright project.
 */
test.describe('RLS · tags', () => {
  loadE2EEnvFromDotEnv();

  test.describe.configure({mode: 'serial'});

  const SUPABASE_URL = process.env['SUPABASE_URL'];
  const SUPABASE_ANON_KEY = process.env['SUPABASE_ANON_KEY'];

  test.skip(!SUPABASE_URL || !SUPABASE_ANON_KEY, 'SUPABASE_URL / SUPABASE_ANON_KEY not configured');

  const newAnonClient = (): SupabaseClient => createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
    auth: {persistSession: false, autoRefreshToken: false}
  });

  let authedClient: SupabaseClient;
  let existingTag: {id: number; name: string};

  test.beforeAll(async () => {
    const creds = getE2EAuthCredentialsOrThrow();
    authedClient = newAnonClient();
    const {data, error} = await authedClient.auth.signInWithPassword({email: creds.email, password: creds.password});
    expect(error, `Supabase sign-in failed: ${ error?.message }`).toBeNull();
    expect(data.user?.id).toBeTruthy();

    const {data: tags, error: tagsError} = await newAnonClient()
      .from('tags')
      .select('id, name')
      .order('id', {ascending: true})
      .limit(1);
    expect(tagsError, `tag lookup failed: ${ tagsError?.message }`).toBeNull();
    expect(tags?.length ?? 0).toBeGreaterThan(0);
    existingTag = tags![0];
  });

  test.afterAll(async () => {
    if (authedClient) {
      await authedClient.from('tags').delete().like('name', 'rls-test-%');
      await authedClient.auth.signOut();
    }
  });

  test('anon can SELECT (module browser reference data depends on this)', async () => {
    const {data, error} = await newAnonClient().from('tags').select('id, name').limit(5);
    expect(error, `anon SELECT failed: ${ error?.message }`).toBeNull();
    expect(data?.length ?? 0, 'anon SELECT returned no rows — module browser tags would break').toBeGreaterThan(0);
  });

  test('authenticated user can SELECT (module browser reference data depends on this)', async () => {
    const {data, error} = await authedClient.from('tags').select('id, name').limit(5);
    expect(error, `authenticated SELECT failed: ${ error?.message }`).toBeNull();
    expect(data?.length ?? 0, 'authenticated SELECT returned no rows — module browser tags would break').toBeGreaterThan(0);
  });

  test('anon INSERT is blocked', async () => {
    const tagName = `rls-test-${ randomUUID() }`;
    const {error} = await newAnonClient()
      .from('tags')
      .insert({name: tagName});
    expect(error, 'anon INSERT unexpectedly succeeded — RLS is not enforcing writes').not.toBeNull();

    const {data} = await newAnonClient()
      .from('tags')
      .select('id')
      .eq('name', tagName)
      .limit(1);
    expect(data?.length ?? 0, 'blocked anon INSERT leaked a row into tags').toBe(0);
  });

  test('authenticated INSERT is blocked', async () => {
    const tagName = `rls-test-${ randomUUID() }`;
    const {error} = await authedClient
      .from('tags')
      .insert({name: tagName});
    expect(error, 'authenticated INSERT unexpectedly succeeded — reference data should be read-only').not.toBeNull();

    const {data} = await newAnonClient()
      .from('tags')
      .select('id')
      .eq('name', tagName)
      .limit(1);
    expect(data?.length ?? 0, 'blocked authenticated INSERT leaked a row into tags').toBe(0);
  });

  test('authenticated UPDATE is blocked', async () => {
    const {data: updated, error} = await authedClient
      .from('tags')
      .update({name: existingTag.name})
      .eq('id', existingTag.id)
      .select('id');
    expect(error || (updated?.length ?? 0) === 0, 'authenticated UPDATE unexpectedly returned an updated tag row').toBeTruthy();

    const {data, error: lookupError} = await newAnonClient()
      .from('tags')
      .select('id, name')
      .eq('id', existingTag.id)
      .limit(1);
    expect(lookupError, `post-UPDATE lookup failed: ${ lookupError?.message }`).toBeNull();
    expect(data?.[0]?.name, 'tag row changed after blocked UPDATE attempt').toBe(existingTag.name);
  });
});
