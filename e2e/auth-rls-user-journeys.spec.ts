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

interface CleanupResult {
  error?: {message?: string} | null;
}

test.describe('RLS · critical user journeys', () => {
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

  const cleanup = async (description: string, action: () => PromiseLike<CleanupResult>): Promise<void> => {
    try {
      const result = await action();
      if (result.error) {
        console.warn(`[auth-rls-user-journeys cleanup] ${ description }: ${ result.error.message ?? 'unknown error' }`);
      }
    } catch (error: unknown) {
      console.warn(`[auth-rls-user-journeys cleanup] ${ description }`, error);
    }
  };

  const firstPublicModuleId = async (): Promise<number> => {
    const {data, error} = await newAnonClient()
      .from('modules')
      .select('id')
      .order('id', {ascending: true})
      .limit(1);
    expect(error, `module lookup failed: ${ error?.message }`).toBeNull();
    expect(data?.length ?? 0, 'no module available for RLS journey setup').toBeGreaterThan(0);
    return data![0].id;
  };

  const moduleNotInUserModules = async (): Promise<number> => {
    const {data: modules, error: modulesError} = await newAnonClient()
      .from('modules')
      .select('id')
      .order('id', {ascending: true})
      .limit(100);
    expect(modulesError, `module lookup failed: ${ modulesError?.message }`).toBeNull();
    expect(modules?.length ?? 0, 'no modules available for user_modules setup').toBeGreaterThan(0);

    const {data: owned, error: ownedError} = await authedClient
      .from('user_modules')
      .select('moduleid')
      .eq('profileid', testUserId);
    expect(ownedError, `owned module lookup failed: ${ ownedError?.message }`).toBeNull();

    const ownedSet = new Set((owned ?? []).map(row => row.moduleid));
    const available = (modules ?? []).find(module => !ownedSet.has(module.id));
    expect(available, 'no module available that the test user does not already own').toBeDefined();
    return available!.id;
  };

  const manufacturerId = async (): Promise<number> => {
    const {data, error} = await newAnonClient()
      .from('manufacturers')
      .select('id')
      .order('id', {ascending: true})
      .limit(1);
    expect(error, `manufacturer lookup failed: ${ error?.message }`).toBeNull();
    expect(data?.length ?? 0, 'no manufacturer available for module setup').toBeGreaterThan(0);
    return data![0].id;
  };

  const freshModuleTagPair = async (): Promise<{moduleid: number; tagid: number}> => {
    const [{data: modules, error: modulesError}, {data: tags, error: tagsError}, {data: existing, error: existingError}] = await Promise.all([
      newAnonClient().from('modules').select('id').order('id', {ascending: true}).limit(50),
      newAnonClient().from('tags').select('id').order('id', {ascending: true}).limit(50),
      newAnonClient().from('module_tags').select('moduleid, tagid').limit(5000)
    ]);
    expect(modulesError, `module lookup failed: ${ modulesError?.message }`).toBeNull();
    expect(tagsError, `tag lookup failed: ${ tagsError?.message }`).toBeNull();
    expect(existingError, `module_tags lookup failed: ${ existingError?.message }`).toBeNull();
    expect(modules?.length ?? 0, 'no module available for module_tags setup').toBeGreaterThan(0);
    expect(tags?.length ?? 0, 'no tag available for module_tags setup').toBeGreaterThan(0);

    const existingPairs = new Set((existing ?? []).map(row => `${ row.moduleid }:${ row.tagid }`));
    for (const module of modules ?? []) {
      for (const tag of tags ?? []) {
        if (!existingPairs.has(`${ module.id }:${ tag.id }`)) {
          return {moduleid: module.id, tagid: tag.id};
        }
      }
    }

    throw new Error('no unused module/tag pair available for RLS journey setup');
  };

  const createTestModule = async (name: string): Promise<number> => {
    const makerId = await manufacturerId();
    const {data, error} = await authedClient
      .from('modules')
      .insert({name, hp: 4, manufacturerId: makerId, standard: 1})
      .select('id')
      .single();
    expect(error, `module create failed: ${ error?.message }`).toBeNull();
    expect(data?.id, 'module create did not return an id').toBeTruthy();
    return data!.id;
  };

  test.beforeAll(async () => {
    const creds = getE2EAuthCredentialsOrThrow();
    authedClient = newAnonClient();
    const {data, error} = await authedClient.auth.signInWithPassword({email: creds.email, password: creds.password});
    expect(error, `Supabase sign-in failed: ${ error?.message }`).toBeNull();
    expect(data.user?.id).toBeTruthy();
    testUserId = data.user!.id;
  });

  test.afterAll(async () => {
    if (authedClient) {
      await cleanup('sign out', () => authedClient.auth.signOut());
    }
  });

  test('anon browses module catalog', async () => {
    const {data, error} = await newAnonClient()
      .from('modules')
      .select('id, name, hp, manufacturers(name)')
      .limit(10);
    expect(error, 'anon browses module catalog').toBeNull();
    expect(data?.length ?? 0, 'anon module catalog returned no rows').toBeGreaterThan(0);
  });

  test('anon opens module detail with Community counters', async () => {
    const moduleId = await firstPublicModuleId();

    const {data, error} = await newAnonClient()
      .from('modules')
      .select('id, module_ins(*), module_outs(*), module_panels(*), module_tags(*)')
      .eq('id', moduleId)
      .single();
    expect(error, 'anon opens module detail with Community counters').toBeNull();
    expect(Array.isArray(data?.module_ins), 'module detail did not embed module_ins').toBe(true);
    expect(Array.isArray(data?.module_outs), 'module detail did not embed module_outs').toBe(true);
    expect(Array.isArray(data?.module_panels), 'module detail did not embed module_panels').toBe(true);
    expect(Array.isArray(data?.module_tags), 'module detail did not embed module_tags').toBe(true);

    const {error: countError, count} = await newAnonClient()
      .from('user_modules')
      .select('moduleid', {count: 'exact', head: true})
      .eq('moduleid', moduleId);
    expect(countError, 'anon opens module detail Community counters').toBeNull();
    expect(count, 'Community counter did not return a count').not.toBeNull();
  });

  test('anon browses public racks', async () => {
    const {data: racks, error} = await newAnonClient()
      .from('racks')
      .select('id, name, public')
      .eq('public', true)
      .limit(5);
    expect(error, 'anon browses public racks').toBeNull();
    expect(racks?.length ?? 0, 'anon public rack browse returned no rows').toBeGreaterThan(0);

    const {error: modulesError} = await newAnonClient()
      .from('rack_modules')
      .select('id, rackid, moduleid')
      .eq('rackid', racks![0].id);
    expect(modulesError, 'anon browses modules for a public rack').toBeNull();
  });

  test('anon browses public patches', async () => {
    const {data: patches, error} = await newAnonClient()
      .from('patches')
      .select('id, name, public')
      .eq('public', true)
      .limit(5);
    expect(error, 'anon browses public patches').toBeNull();
    expect(patches?.length ?? 0, 'anon public patch browse returned no rows').toBeGreaterThan(0);

    const patchId = patches![0].id;
    const {error: connectionsError} = await newAnonClient()
      .from('patch_connections')
      .select('patchid, ordinal, a, b')
      .eq('patchid', patchId);
    expect(connectionsError, 'anon browses public patch connections').toBeNull();

    const {error: instancesError} = await newAnonClient()
      .from('patch_module_instances')
      .select('id, patch_id, module_id')
      .eq('patch_id', patchId);
    expect(instancesError, 'anon browses public patch module instances').toBeNull();
  });

  test('anon views a public profile', async () => {
    const {data, error} = await newAnonClient()
      .from('profiles')
      .select('id, username, public')
      .eq('id', testUserId);
    expect(error, 'anon views a public profile').toBeNull();
    expect(data?.length ?? 0, 'anon profile lookup did not return the test user profile').toBe(1);
  });

  test('signup -> profile auto-created', async () => {
    const {data, error} = await authedClient
      .from('profiles')
      .select('id')
      .eq('id', testUserId);
    expect(error, 'signup -> profile auto-created').toBeNull();
    expect(data?.length ?? 0, 'authed profile lookup did not return the test user profile').toBe(1);
  });

  test('authed user adds a module to HAS collection', async () => {
    const moduleId = await moduleNotInUserModules();

    try {
      const {error} = await authedClient
        .from('user_modules')
        .insert({profileid: testUserId, moduleid: moduleId, kind: 'HAS'});
      expect(error, 'authed adds module to HAS').toBeNull();

      const {data, error: verifyError} = await authedClient
        .from('user_modules')
        .select('kind')
        .eq('profileid', testUserId)
        .eq('moduleid', moduleId);
      expect(verifyError, 'authed verifies module in HAS').toBeNull();
      expect(data?.[0]?.kind, 'inserted user_modules row was not kind HAS').toBe('HAS');
    } finally {
      await cleanup('delete HAS user_modules row', () => authedClient.from('user_modules').delete().eq('profileid', testUserId).eq('moduleid', moduleId));
    }
  });

  test('authed user toggles WANTS / SELLS', async () => {
    const moduleId = await moduleNotInUserModules();

    try {
      const {error: hasError} = await authedClient
        .from('user_modules')
        .upsert({profileid: testUserId, moduleid: moduleId, kind: 'HAS'}, {onConflict: 'profileid,moduleid'});
      expect(hasError, 'authed seeds HAS before toggling WANTS/SELLS').toBeNull();

      const {error} = await authedClient
        .from('user_modules')
        .upsert({profileid: testUserId, moduleid: moduleId, kind: 'WANTS'}, {onConflict: 'profileid,moduleid'});
      expect(error, 'authed toggles WANTS/SELLS').toBeNull();

      const {data, error: verifyError} = await authedClient
        .from('user_modules')
        .select('kind')
        .eq('profileid', testUserId)
        .eq('moduleid', moduleId);
      expect(verifyError, 'authed verifies WANTS toggle').toBeNull();
      expect(data?.[0]?.kind, 'user_modules kind did not toggle to WANTS').toBe('WANTS');
    } finally {
      await cleanup('delete WANTS user_modules row', () => authedClient.from('user_modules').delete().eq('profileid', testUserId).eq('moduleid', moduleId));
    }
  });

  test('authed user removes from collection', async () => {
    const moduleId = await moduleNotInUserModules();

    try {
      const {error: insertError} = await authedClient
        .from('user_modules')
        .insert({profileid: testUserId, moduleid: moduleId, kind: 'HAS'});
      expect(insertError, 'authed seeds module before removing from collection').toBeNull();

      const {error} = await authedClient
        .from('user_modules')
        .delete()
        .eq('profileid', testUserId)
        .eq('moduleid', moduleId);
      expect(error, 'authed removes from collection').toBeNull();

      const {data, error: verifyError} = await authedClient
        .from('user_modules')
        .select('moduleid')
        .eq('profileid', testUserId)
        .eq('moduleid', moduleId);
      expect(verifyError, 'authed verifies collection removal').toBeNull();
      expect(data?.length ?? 0, 'removed user_modules row is still visible').toBe(0);
    } finally {
      await cleanup('delete removed user_modules row', () => authedClient.from('user_modules').delete().eq('profileid', testUserId).eq('moduleid', moduleId));
    }
  });

  test('authed user submits a new module', async () => {
    const moduleName = `__rls-test-mod-${ randomUUID() }`;
    let moduleId: number | undefined;

    try {
      moduleId = await createTestModule(moduleName);

      const {error: inError} = await authedClient
        .from('module_ins')
        .insert({moduleid: moduleId, name: 'CV', authorid: testUserId});
      expect(inError, 'authed adds input to submitted module').toBeNull();

      const {error: outError} = await authedClient
        .from('module_outs')
        .insert({moduleid: moduleId, name: 'OUT', authorid: testUserId});
      expect(outError, 'authed adds output to submitted module').toBeNull();
    } finally {
      if (moduleId) {
        await cleanup('delete submitted module inputs', () => authedClient.from('module_ins').delete().eq('moduleid', moduleId!));
        await cleanup('delete submitted module outputs', () => authedClient.from('module_outs').delete().eq('moduleid', moduleId!));
      }
      // Module intentionally remains; admin can sweep DELETE FROM modules WHERE name LIKE '__rls-test-mod-%'.
    }
  });

  test('authed user edits their own module', async () => {
    const moduleName = `__rls-test-mod-${ randomUUID() }`;
    const panelFilename = `__rls-test-panel-${ randomUUID() }.jpg`;
    let moduleId: number | undefined;
    let panelId: number | undefined;

    try {
      moduleId = await createTestModule(moduleName);

      const {error: moduleUpdateError} = await authedClient
        .from('modules')
        .update({description: 'rls-test-updated'})
        .eq('id', moduleId);
      expect(moduleUpdateError, 'authed edits own module').toBeNull();

      const {data: panel, error: panelError} = await authedClient
        .from('module_panels')
        .insert({moduleid: moduleId, color: 1, description: 'rls-test', filename: panelFilename})
        .select('id')
        .single();
      expect(panelError, 'authed adds panel to own module').toBeNull();
      expect(panel?.id, 'panel insert did not return an id').toBeTruthy();
      panelId = panel!.id;

      const {error: panelUpdateError} = await authedClient
        .from('module_panels')
        .update({description: 'rls-test-updated'})
        .eq('id', panelId);
      expect(panelUpdateError, 'authed updates own module panel').toBeNull();

      const {error: panelDeleteError} = await authedClient
        .from('module_panels')
        .delete()
        .eq('id', panelId);
      expect(panelDeleteError, 'authed deletes own module panel').toBeNull();
      panelId = undefined;
    } finally {
      if (panelId) {
        await cleanup('delete own module panel', () => authedClient.from('module_panels').delete().eq('id', panelId!));
      }
      if (moduleId) {
        await cleanup('delete own module panels by module', () => authedClient.from('module_panels').delete().eq('moduleid', moduleId!));
      }
      // Module intentionally remains; admin can sweep DELETE FROM modules WHERE name LIKE '__rls-test-mod-%'.
    }
  });

  test('authed user votes a tag on a module', async () => {
    const pair = await freshModuleTagPair();
    let moduleTagId: number | undefined;

    try {
      const {data, error} = await authedClient
        .from('module_tags')
        .insert(pair)
        .select('id')
        .single();
      expect(error, 'authed votes a tag').toBeNull();
      expect(data?.id ?? 0, 'module_tags insert did not return a positive id').toBeGreaterThan(0);
      moduleTagId = data!.id;
    } finally {
      if (moduleTagId) {
        await cleanup('delete module_tags vote row', () => authedClient.from('module_tags').delete().eq('id', moduleTagId!));
      }
    }
  });

  test('authed user creates a private patch with connections', async () => {
    const moduleId = await firstPublicModuleId();
    let patchId: number | undefined;

    try {
      const {data: patch, error} = await authedClient
        .from('patches')
        .insert({name: `__rls-test-patch-${ randomUUID() }`, authorid: testUserId, public: false})
        .select('id')
        .single();
      expect(error, 'authed creates private patch with connections').toBeNull();
      expect(patch?.id, 'private patch insert did not return an id').toBeTruthy();
      patchId = patch!.id;

      const {error: instanceError} = await authedClient
        .from('patch_module_instances')
        .insert({patch_id: patchId, module_id: moduleId});
      expect(instanceError, 'authed adds module instance to private patch').toBeNull();

      const {data: anonRows, error: anonError} = await newAnonClient()
        .from('patches')
        .select('id')
        .eq('id', patchId);
      expect(anonError, 'anon cannot view private patch').toBeNull();
      expect(anonRows?.length ?? 0, 'anon could view private patch').toBe(0);

      const {data: authedRows, error: authedError} = await authedClient
        .from('patches')
        .select('id')
        .eq('id', patchId);
      expect(authedError, 'authed can view own private patch').toBeNull();
      expect(authedRows?.length ?? 0, 'authed could not view own private patch').toBe(1);
    } finally {
      if (patchId) {
        await cleanup('delete private patch module instances', () => authedClient.from('patch_module_instances').delete().eq('patch_id', patchId!));
        await cleanup('delete private patch', () => authedClient.from('patches').delete().eq('id', patchId!));
      }
    }
  });

  test('authed user creates a rack and adds modules', async () => {
    const moduleId = await firstPublicModuleId();
    let rackId: number | undefined;

    try {
      const {data: rack, error} = await authedClient
        .from('racks')
        .insert({name: `__rls-test-rack-${ randomUUID() }`, authorid: testUserId, public: false, rows: 1, hp: 84})
        .select('id')
        .single();
      expect(error, 'authed creates private rack and adds modules').toBeNull();
      expect(rack?.id, 'private rack insert did not return an id').toBeTruthy();
      rackId = rack!.id;

      const {error: moduleError} = await authedClient
        .from('rack_modules')
        .insert({rackid: rackId, moduleid: moduleId, row: 0, column: 0});
      expect(moduleError, 'authed adds module to private rack').toBeNull();

      const {data: anonRows, error: anonError} = await newAnonClient()
        .from('racks')
        .select('id')
        .eq('id', rackId);
      expect(anonError, 'anon cannot view private rack').toBeNull();
      expect(anonRows?.length ?? 0, 'anon could view private rack').toBe(0);

      const {data: authedRows, error: authedError} = await authedClient
        .from('racks')
        .select('id')
        .eq('id', rackId);
      expect(authedError, 'authed can view own private rack').toBeNull();
      expect(authedRows?.length ?? 0, 'authed could not view own private rack').toBe(1);
    } finally {
      if (rackId) {
        await cleanup('delete private rack modules', () => authedClient.from('rack_modules').delete().eq('rackid', rackId!));
        await cleanup('delete private rack', () => authedClient.from('racks').delete().eq('id', rackId!));
      }
    }
  });

  test('authed user flags a module', async () => {
    const moduleId = await firstPublicModuleId();
    let flagId: number | undefined;

    try {
      const {data, error} = await authedClient
        .from('module_flags')
        .insert({module_id: moduleId, category: 'duplicate', user_id: testUserId, note: `__rls-test-${ randomUUID() } SAFE TO DELETE`})
        .select('id')
        .single();
      expect(error, 'authed flags module').toBeNull();
      expect(data?.id, 'module flag insert did not return an id').toBeTruthy();
      flagId = data!.id;

      const {data: authedRows, error: authedError} = await authedClient
        .from('module_flags')
        .select('id')
        .eq('id', flagId);
      expect(authedError, 'authed verifies module flag exists').toBeNull();
      expect(authedRows?.length ?? 0, 'authed could not verify module flag').toBe(1);

      const {data: anonRows, error: anonError} = await newAnonClient()
        .from('module_flags')
        .select('id')
        .eq('id', flagId);
      expect(anonError, 'anon cannot read module flag').toBeNull();
      expect(anonRows?.length ?? 0, 'anon could read module flag').toBe(0);
    } finally {
      if (flagId) {
        await cleanup('delete module flag', () => authedClient.from('module_flags').delete().eq('id', flagId!));
      }
    }
  });
});
