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
 * RLS contract test for public.module_tags.
 *
 * Drives the real Supabase REST endpoint with the anon key and a signed-in
 * test user — the same path the Patcher app uses — so policy regressions
 * surface here before they reach production.
 *
 * Skips when SUPABASE_URL / SUPABASE_ANON_KEY are not configured; sign-in
 * creds are guaranteed by the chromium-auth Playwright project.
 */
test.describe('RLS · module_tags', () => {
  loadE2EEnvFromDotEnv();

  test.describe.configure({mode: 'serial'});

  const SUPABASE_URL = process.env['SUPABASE_URL'];
  const SUPABASE_ANON_KEY = process.env['SUPABASE_ANON_KEY'];

  test.skip(!SUPABASE_URL || !SUPABASE_ANON_KEY, 'SUPABASE_URL / SUPABASE_ANON_KEY not configured');

  const newAnonClient = (): SupabaseClient => createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
    auth: {persistSession: false, autoRefreshToken: false}
  });

  let authedClient: SupabaseClient;
  let blockedPair: {moduleid: number; tagid: number};
  let insertPair: {moduleid: number; tagid: number};
  let insertedModuleTagId: number | undefined;

  const findFreshPairs = (
    modules: {id: number}[],
    tags: {id: number}[],
    existing: {moduleid: number; tagid: number}[]
  ): {moduleid: number; tagid: number}[] => {
    const existingPairs = new Set(existing.map(row => `${ row.moduleid }:${ row.tagid }`));
    const pairs: {moduleid: number; tagid: number}[] = [];

    for (const module of modules) {
      for (const tag of tags) {
        const key = `${ module.id }:${ tag.id }`;
        if (!existingPairs.has(key)) {
          pairs.push({moduleid: module.id, tagid: tag.id});
        }
        if (pairs.length === 2) {
          return pairs;
        }
      }
    }

    return pairs;
  };

  test.beforeAll(async () => {
    const creds = getE2EAuthCredentialsOrThrow();
    authedClient = newAnonClient();
    const {data, error} = await authedClient.auth.signInWithPassword({email: creds.email, password: creds.password});
    expect(error, `Supabase sign-in failed: ${ error?.message }`).toBeNull();
    expect(data.user?.id).toBeTruthy();

    const [{data: modules, error: modulesError}, {data: tags, error: tagsError}] = await Promise.all([
      newAnonClient().from('modules').select('id').order('id', {ascending: true}).limit(50),
      newAnonClient().from('tags').select('id').order('id', {ascending: true}).limit(50)
    ]);
    expect(modulesError, `module lookup failed: ${ modulesError?.message }`).toBeNull();
    expect(tagsError, `tag lookup failed: ${ tagsError?.message }`).toBeNull();
    expect(modules?.length ?? 0).toBeGreaterThan(0);
    expect(tags?.length ?? 0).toBeGreaterThan(0);

    const {data: moduleTags, error: moduleTagsError} = await newAnonClient()
      .from('module_tags')
      .select('moduleid, tagid')
      .limit(5000);
    expect(moduleTagsError, `module_tags lookup failed: ${ moduleTagsError?.message }`).toBeNull();

    const freshPairs = findFreshPairs(modules ?? [], tags ?? [], moduleTags ?? []);
    expect(freshPairs.length, 'need two unused module/tag pairs for isolated RLS tests').toBeGreaterThanOrEqual(2);
    [blockedPair, insertPair] = freshPairs;
  });

  test.afterAll(async () => {
    if (authedClient) {
      if (insertedModuleTagId) {
        await authedClient.from('module_tags').delete().eq('id', insertedModuleTagId);
      }
      if (blockedPair) {
        await authedClient.from('module_tags').delete()
          .eq('moduleid', blockedPair.moduleid)
          .eq('tagid', blockedPair.tagid);
      }
      await authedClient.auth.signOut();
    }
  });

  test('anon can SELECT (module catalog tags stay publicly readable)', async () => {
    const {data, error} = await newAnonClient().from('module_tags').select('id, moduleid, tagid').limit(5);
    expect(error, `anon SELECT failed: ${ error?.message }`).toBeNull();
    expect(data?.length ?? 0, 'anon SELECT returned no rows — module catalog tags would break').toBeGreaterThan(0);
  });

  test('authenticated user can SELECT (module catalog tags stay readable)', async () => {
    const {data, error} = await authedClient.from('module_tags').select('id, moduleid, tagid').limit(5);
    expect(error, `authenticated SELECT failed: ${ error?.message }`).toBeNull();
    expect(data?.length ?? 0, 'authenticated SELECT returned no rows — module catalog tags would break').toBeGreaterThan(0);
  });

  test('anon INSERT is blocked', async () => {
    const {error} = await newAnonClient()
      .from('module_tags')
      .insert(blockedPair);
    expect(error, 'anon INSERT unexpectedly succeeded — RLS is not enforcing writes').not.toBeNull();

    const {data} = await newAnonClient()
      .from('module_tags')
      .select('id')
      .eq('moduleid', blockedPair.moduleid)
      .eq('tagid', blockedPair.tagid)
      .limit(1);
    expect(data?.length ?? 0, 'blocked anon INSERT leaked a row into module_tags').toBe(0);
  });

  test('anon UPDATE is blocked', async () => {
    const {data: updated, error} = await newAnonClient()
      .from('module_tags')
      .update({tagid: blockedPair.tagid})
      .eq('moduleid', blockedPair.moduleid)
      .select('id');
    expect(error || (updated?.length ?? 0) === 0, 'anon UPDATE unexpectedly changed module_tags').toBeTruthy();
  });

  test('anon DELETE is blocked', async () => {
    await authedClient.from('module_tags').insert(blockedPair);

    const {data: deleted, error} = await newAnonClient()
      .from('module_tags')
      .delete()
      .eq('moduleid', blockedPair.moduleid)
      .eq('tagid', blockedPair.tagid)
      .select('id');
    expect(error || (deleted?.length ?? 0) === 0, 'anon DELETE unexpectedly removed a module_tags row').toBeTruthy();

    const {data} = await authedClient
      .from('module_tags')
      .select('id')
      .eq('moduleid', blockedPair.moduleid)
      .eq('tagid', blockedPair.tagid)
      .limit(1);
    expect(data?.length ?? 0, 'anon DELETE removed a row that RLS should have protected').toBe(1);
  });

  test('authenticated INSERT succeeds', async () => {
    const {data, error} = await authedClient
      .from('module_tags')
      .insert(insertPair)
      .select('id')
      .single();
    expect(error, `authenticated INSERT failed: ${ error?.message }`).toBeNull();
    expect(data?.id).toBeTruthy();
    insertedModuleTagId = data!.id;
  });

  test('authenticated DELETE succeeds on the row the test inserted', async () => {
    expect(insertedModuleTagId, 'authenticated INSERT test did not create a module_tags row').toBeTruthy();

    const {error} = await authedClient
      .from('module_tags')
      .delete()
      .eq('id', insertedModuleTagId!);
    expect(error, `authenticated DELETE failed: ${ error?.message }`).toBeNull();

    const {data} = await authedClient.from('module_tags').select('id').eq('id', insertedModuleTagId!).limit(1);
    expect(data?.length ?? 0).toBe(0);
    insertedModuleTagId = undefined;
  });
});
