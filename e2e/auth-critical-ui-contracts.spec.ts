import {
  expect,
  type Browser,
  type Page,
  test,
  type TestInfo,
} from '@playwright/test';
import {
  createClient,
  type SupabaseClient,
} from '@supabase/supabase-js';

import {
  getE2EAuthCredentialsOrThrow,
  loadE2EEnvFromDotEnv,
} from './helpers/auth';

loadE2EEnvFromDotEnv();

const SUPABASE_URL = process.env['SUPABASE_URL'];
const SUPABASE_ANON_KEY = process.env['SUPABASE_ANON_KEY'];
const DEFAULT_BASE_URL = 'http://localhost:5556';

type DbClient = SupabaseClient;

interface ProfileState {
  id: string;
  username: string;
  public: boolean;
}

interface ModuleFixture {
  id: number;
  name: string;
  manufacturerId: number;
  standardId: number;
}

interface CreatedRack {
  id: number;
  publicId: string;
  url: string;
  name: string;
}

interface CreatedPatch {
  id: number;
  publicId?: string | null;
  url: string;
  name: string;
}

test.describe('Authenticated critical UI contracts', () => {
  test.describe.configure({mode: 'serial'});
  test.skip(!SUPABASE_URL || !SUPABASE_ANON_KEY, 'SUPABASE_URL / SUPABASE_ANON_KEY not configured');

  let client: DbClient;
  let profile: ProfileState;
  let originalProfilePublic = false;
  let moduleFixture: ModuleFixture;
  let primaryRack: CreatedRack | undefined;
  const touchedModules = new Map<number, string | null>();
  const createdRacks: CreatedRack[] = [];
  const createdPatches: CreatedPatch[] = [];
  const submittedModuleNames: string[] = [];

  test.beforeAll(async () => {
    client = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
      auth: {persistSession: false, autoRefreshToken: false},
    });

    const credentials = getE2EAuthCredentialsOrThrow();
    const {data: authData, error: authError} = await client.auth.signInWithPassword({
      email: credentials.email,
      password: credentials.password,
    });
    expect(authError, `Supabase sign-in failed: ${authError?.message}`).toBeNull();
    expect(authData.user?.id, 'authenticated E2E user id').toBeTruthy();

    profile = await loadCurrentProfile(client, authData.user!.id);
    originalProfilePublic = profile.public;
    moduleFixture = await findUnownedModuleWithIo(client, profile.id);
  });

  test.afterAll(async () => {
    if (!client || !profile) return;

    for (const patch of [...createdPatches].reverse()) {
      await cleanupPatch(client, profile.id, patch.id);
    }

    for (const rack of [...createdRacks].reverse()) {
      await cleanupRack(client, profile.id, rack.id);
    }

    for (const [moduleId, originalKind] of touchedModules) {
      await restoreUserModule(client, profile.id, moduleId, originalKind);
    }

    for (const moduleName of submittedModuleNames) {
      await cleanupSubmittedModule(client, profile.id, moduleName);
    }

    await client.from('profiles')
      .update({public: originalProfilePublic, updated_at: new Date().toISOString()})
      .eq('id', profile.id);
    await client.auth.signOut();
  });

  test('owner profile visibility toggles drive anonymous public/private profile states', async ({page, browser}, testInfo) => {
    test.setTimeout(90_000);

    await setProfileVisibilityViaUserArea(page, true);
    await expect(page.locator('app-user-area-root')).toContainText('Public profile is visible to everyone.');
    await expect(page.locator('app-user-area-root app-brand-primary-button', {hasText: /view public profile/i})).toBeVisible();
    await expect(page.locator('app-user-area-root app-brand-primary-button', {hasText: /copy public link/i})).toBeVisible();

    await expectAnonymousProfileState(browser, testInfo, profile.username, 'ready');

    await setProfileVisibilityViaUserArea(page, false);
    await expect(page.locator('app-user-area-root')).toContainText('Public profile is hidden from visitors.');
    await expect(page.locator('app-user-area-root app-brand-primary-button', {hasText: /view public profile/i})).toHaveCount(0);
    await expect(page.locator('app-user-area-root app-brand-primary-button', {hasText: /copy public link/i})).toHaveCount(0);

    await expectAnonymousProfileState(browser, testInfo, profile.username, 'private');
  });

  test('module detail manages owned, wanted, for-sale, acquisition, filters, reload, and removal through UI', async ({page}) => {
    test.setTimeout(120_000);
    await captureUserModuleForCleanup(client, profile.id, moduleFixture.id, touchedModules);

    await setModulePossessionViaUI(page, moduleFixture, 'Owned', {
      price: '123.45',
      note: `E2E acquisition ${Date.now()}`,
    });
    await expectModuleInUserAreaFilter(page, 'Owned', moduleFixture.name);

    await page.goto(`/modules/details/${moduleFixture.id}`);
    await expect(page.locator('app-module-composite').first()).toBeVisible({timeout: 20_000});
    await expect(page.getByRole('button', {name: /current status: owned/i}).first()).toBeVisible({timeout: 20_000});

    await setModulePossessionViaUI(page, moduleFixture, 'Wanted');
    await expectModuleInUserAreaFilter(page, 'Wanted', moduleFixture.name);

    await setModulePossessionViaUI(page, moduleFixture, 'For sale');
    await expectModuleInUserAreaFilter(page, 'For Sale', moduleFixture.name);

    await removeModulePossessionViaUI(page, moduleFixture);
    await expectModuleAbsentFromUserArea(page, moduleFixture.name);
  });

  test('rack edit mode adds an owned module through Collection/Available UI and persists after reload', async ({page}, testInfo) => {
    test.setTimeout(120_000);
    await captureUserModuleForCleanup(client, profile.id, moduleFixture.id, touchedModules);
    await setModulePossessionViaUI(page, moduleFixture, 'Owned');

    primaryRack = await createRackViaUI(page, testInfo, false);
    createdRacks.push(primaryRack);
    await openRackInEditMode(page, primaryRack);

    await setRackBrowserMode(page, 'Collection');
    await searchRackModuleBrowser(page, moduleFixture.name);
    await expect(page.locator('app-module-list')).toContainText(moduleFixture.name, {timeout: 20_000});

    const rackModuleCreate = waitForResponseOk(page, '/rest/v1/rack_modules', 'POST');
    await page.getByRole('button', {name: new RegExp(`Add to ${escapeRegex(primaryRack.name)}`, 'i')}).first().click();
    await rackModuleCreate;
    await expect(page.locator('app-rack-visual-model .module').first()).toBeVisible({timeout: 20_000});
    await placeRackModuleInFirstRow(client, primaryRack.id, moduleFixture.id);

    await page.evaluate(() => localStorage.removeItem('CACHE_STORAGE'));
    await page.reload();
    await expect(page.locator('app-rack-editor')).toBeVisible({timeout: 20_000});
    await expect(page.locator('app-rack-visual-model #screen .rackRow').first().locator('.module').first()).toBeVisible({
      timeout: 20_000,
    });
    await setRackBrowserMode(page, 'Available');
    await searchRackModuleBrowser(page, moduleFixture.name);
    await expect(page.locator('app-module-list')).not.toContainText(moduleFixture.name);
  });

  test('rack privacy toggle updates public profile listings while token URL remains shareable', async ({page, browser}, testInfo) => {
    test.setTimeout(120_000);
    expect(primaryRack, 'primary rack created by previous scenario').toBeDefined();
    await setProfileVisibilityViaUserArea(page, true);

    await page.goto(primaryRack!.url);
    await expect(page.locator('app-rack-editor')).toBeVisible({timeout: 20_000});
    await ensureRackEditMode(page);

    await setRackPrivacyViaUI(page, true);
    await expectAnonymousRackToken(browser, testInfo, primaryRack!, true);
    await expectAnonymousPublicProfileContains(browser, testInfo, profile.username, primaryRack!.name, true);

    await setRackPrivacyViaUI(page, false);
    await expectAnonymousRackToken(browser, testInfo, primaryRack!, true);
    await expectAnonymousPublicProfileContains(browser, testInfo, profile.username, primaryRack!.name, false);

    await page.reload();
    await expect(page.locator('app-rack-minimal button[aria-label="Make rack public"]').first()).toBeVisible({timeout: 20_000});
  });

  test('comments post through the shared composer, persist across reload, and delete as author', async ({page}) => {
    test.setTimeout(90_000);
    expect(primaryRack, 'primary rack created by previous scenario').toBeDefined();
    const commentText = `E2E shared comment ${Date.now()}`;

    await page.goto(primaryRack!.url);
    await expect(page.locator('app-rack-editor')).toBeVisible({timeout: 20_000});
    await lockRackIfEditing(page);
    await expect(page.locator('app-comments-root')).toBeVisible({timeout: 20_000});

    const createComment = waitForResponseOk(page, '/rest/v1/comments', 'POST');
    await page.getByRole('textbox', {name: /add a comment/i}).fill(commentText);
    await page.locator('app-comments-root app-brand-primary-button', {hasText: /post comment/i}).click();
    await createComment;
    await expect(page.locator('app-comments-root')).toContainText(commentText, {timeout: 20_000});

    await page.reload();
    await expect(page.locator('app-comments-root')).toContainText(commentText, {timeout: 20_000});

    const commentItem = page.locator('app-comments-item', {hasText: commentText}).first();
    await expect(commentItem).toBeVisible({timeout: 20_000});
    await commentItem.getByRole('button', {name: /delete comment/i}).click();
    const deleteComment = waitForResponseOk(page, '/rest/v1/comments', 'DELETE');
    await page.getByRole('button', {name: /^Delete$/}).last().click();
    await deleteComment;
    await expect(page.locator('app-comments-root')).not.toContainText(commentText);
  });

  test('create patch from rack links the rack and keeps the linked-rack workspace after reload', async ({page}) => {
    test.setTimeout(120_000);
    expect(primaryRack, 'primary rack created by previous scenario').toBeDefined();

    await page.goto(primaryRack!.url);
    await expect(page.locator('app-rack-editor')).toBeVisible({timeout: 20_000});
    await lockRackIfEditing(page);

    const patchCreate = waitForResponseOk(page, '/rest/v1/patches', 'POST');
    await page.getByRole('button', {name: /create patch from this rack/i}).first().click();
    const dialog = page.locator('mat-dialog-container').last();
    await expect(dialog).toContainText(new RegExp(escapeRegex(primaryRack!.name)));
    await dialog.locator('app-brand-primary-button', {hasText: /create patch/i}).click();
    const response = await patchCreate;
    const created = firstResponseRow(await response.json()) as {id?: number; public_id?: string | null};
    expect(created.id, 'created linked patch id').toBeTruthy();
    const patch = {
      id: created.id!,
      publicId: created.public_id,
      url: created.public_id ? `/patches/${created.public_id}` : `/patches/details/${created.id}`,
      name: 'linked rack patch',
    };
    createdPatches.push(patch);

    await expect(page).toHaveURL(new RegExp(`/patches/(${escapeRegex(created.public_id ?? '')}|details/${created.id})`), {
      timeout: 20_000,
    });
    await expect(page.locator('app-patch-composite')).toBeVisible({timeout: 20_000});
    await expect(page.locator('app-patch-minimal')).toContainText(primaryRack!.name, {timeout: 20_000});

    await page.reload();
    await expect(page.locator('app-patch-minimal')).toContainText(primaryRack!.name, {timeout: 20_000});
    await enterPatchEditMode(page);
    const rackMode = page.getByRole('radio', {name: /^Rack$/i}).first();
    await expect(rackMode).toBeVisible({timeout: 20_000});
    if (!(await rackMode.isChecked().catch(() => false))) {
      await rackMode.click();
    }
    await expect(page.locator('.patch-editor-rack-visual__module-wrapper').first()).toBeVisible({timeout: 20_000});
  });

  test('delete patch cancels safely, then removes instances, connections, and direct access', async ({page}) => {
    test.setTimeout(120_000);
    await captureUserModuleForCleanup(client, profile.id, moduleFixture.id, touchedModules);
    await setModulePossessionViaUI(page, moduleFixture, 'Owned');

    const patch = await createPatchViaUI(page, 'delete-with-connections');
    createdPatches.push(patch);
    await seedPatchInstanceAndConnection(client, patch.id, moduleFixture);
    await openPatch(page, patch);
    await expect(page.locator('app-patch-connections-list')).toBeVisible({timeout: 20_000});

    await page.getByRole('button', {name: /delete patch/i}).first().click();
    let dialog = page.locator('mat-dialog-container').last();
    await expect(dialog).toContainText(/delete this patch/i);
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden({timeout: 10_000});
    await expect(page.locator('app-patch-composite')).toBeVisible({timeout: 20_000});

    await page.getByRole('button', {name: /delete patch/i}).first().click();
    dialog = page.locator('mat-dialog-container').last();
    await expect(dialog).toContainText(/delete this patch/i);
    const patchDelete = waitForResponseOk(page, '/rest/v1/patches', 'DELETE');
    const confirmDeletePatch = dialog.locator('app-brand-primary-button', {hasText: /delete/i}).last();
    await expect(confirmDeletePatch).toBeVisible({timeout: 10_000});
    await confirmDeletePatch.click();
    await patchDelete;
    await expect(page).toHaveURL(/\/user\/area/, {timeout: 20_000});

    await page.goto(patch.url);
    await expect(page.locator('app-advice-tooltip', {hasText: /unavailable|could not be loaded|isn't publicly available/i})).toBeVisible({
      timeout: 20_000,
    });
  });

  test('successful module submission uses two-step arm, disarms on edits, creates one row, and celebrates', async ({page}) => {
    test.setTimeout(120_000);
    const moduleName = `[E2E] submitted ${Date.now()}`;
    submittedModuleNames.push(moduleName);
    let modulePostCount = 0;
    page.on('request', request => {
      if (request.url().includes('/rest/v1/modules') && request.method() === 'POST') {
        modulePostCount++;
      }
    });

    await page.goto(`/modules/add?manufacturer=${moduleFixture.manufacturerId}&standard=${moduleFixture.standardId}&HP=8`);
    await expect(page.getByRole('heading', {name: /submit a module/i}).first()).toBeVisible({timeout: 20_000});
    await page.locator('app-brand-primary-button', {hasText: /got it/i}).click();

    await page.getByRole('combobox', {name: /^Name$/i}).fill(moduleName);
    await page.getByRole('textbox', {name: /description/i}).fill('Submitted by authenticated E2E UI flow.');
    await page.getByRole('combobox', {name: /^HP$/i}).fill('8');

    const submitButton = page.getByRole('button', {name: /arm to submit/i});
    await expect(submitButton).toBeEnabled({timeout: 20_000});
    await submitButton.click();
    await expect(page.getByRole('button', {name: /confirm submission/i})).toHaveAttribute('aria-pressed', 'true');
    expect(modulePostCount).toBe(0);

    await page.getByRole('textbox', {name: /description/i}).fill('Edited after arming, so submit should disarm.');
    await expect(page.getByRole('button', {name: /arm to submit/i})).toHaveAttribute('aria-pressed', 'false');

    await page.getByRole('button', {name: /arm to submit/i}).click();
    expect(modulePostCount).toBe(0);
    const createModule = waitForResponseOk(page, '/rest/v1/modules', 'POST');
    await page.getByRole('button', {name: /confirm submission/i}).click();
    await createModule;
    expect(modulePostCount).toBe(1);

    await expect(page.locator('.celebration-overlay')).toContainText(moduleName, {timeout: 20_000});
    await expect(page).toHaveURL(/\/modules\/browser/, {timeout: 10_000});

    const {data, error} = await client
      .from('modules')
      .select('id,name')
      .eq('submitter', profile.id)
      .eq('name', moduleName);
    expect(error, `submitted module lookup failed: ${error?.message}`).toBeNull();
    expect(data ?? [], 'module submission created exactly one row').toHaveLength(1);
  });

  test('delete rack cancels safely, then removes rack, modules, comments, and direct access', async ({page}) => {
    test.setTimeout(120_000);
    expect(primaryRack, 'primary rack created by previous scenario').toBeDefined();

    await page.goto(primaryRack!.url);
    await expect(page.locator('app-rack-editor')).toBeVisible({timeout: 20_000});
    await ensureRackEditMode(page);

    await page.getByRole('button', {name: /delete rack/i}).first().click();
    let dialog = page.locator('mat-dialog-container').last();
    await expect(dialog).toContainText(new RegExp(escapeRegex(primaryRack!.name)));
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden({timeout: 10_000});
    await expect(page.locator('app-rack-editor')).toBeVisible({timeout: 20_000});

    await page.getByRole('button', {name: /delete rack/i}).first().click();
    dialog = page.locator('mat-dialog-container').last();
    const rackDelete = waitForResponseOk(page, '/rest/v1/racks', 'DELETE');
    const confirmDeleteRack = dialog.locator('app-brand-primary-button', {hasText: /delete/i}).last();
    await expect(confirmDeleteRack).toBeVisible({timeout: 10_000});
    await confirmDeleteRack.click();
    await rackDelete;
    await expect(page).toHaveURL(/\/user\/area/, {timeout: 20_000});
    await expect(page.locator('app-user-racks')).not.toContainText(primaryRack!.name);

    await page.goto(primaryRack!.url);
    await expect(page.locator('[data-testid="rack-detail-unavailable"]')).toBeVisible({timeout: 20_000});
  });
});

async function loadCurrentProfile(client: DbClient, userId: string): Promise<ProfileState> {
  const {data, error} = await client
    .from('profiles')
    .select('id,username,public')
    .eq('id', userId)
    .single();
  expect(error, `profile lookup failed: ${error?.message}`).toBeNull();
  expect(data?.username, 'E2E profile has username').toBeTruthy();
  return {
    id: data!.id,
    username: data!.username,
    public: Boolean(data!.public),
  };
}

async function findUnownedModuleWithIo(client: DbClient, profileId: string): Promise<ModuleFixture> {
  const {data: owned, error: ownedError} = await client
    .from('user_modules')
    .select('moduleid,kind')
    .eq('profileid', profileId);
  expect(ownedError, `owned module lookup failed: ${ownedError?.message}`).toBeNull();
  const ownedIds = new Set((owned ?? []).map(row => row.moduleid));

  const {data: modules, error} = await client
    .from('modules')
    .select('id,name,standard,manufacturerId,manufacturer:manufacturerId(id,name),ins:module_ins(id,name),outs:module_outs(id,name)')
    .eq('isApproved', true)
    .eq('public', true)
    .limit(200);
  expect(error, `module fixture lookup failed: ${error?.message}`).toBeNull();

  const candidate = (modules ?? []).find(row =>
    row.id != null
    && row.name
    && row.manufacturerId != null
    && row.standard != null
    && !ownedIds.has(row.id)
    && Array.isArray(row.ins)
    && row.ins.length > 0
    && Array.isArray(row.outs)
    && row.outs.length > 0
  );
  expect(candidate, 'unowned approved module with manufacturer, standard, input, and output fixture').toBeDefined();

  return {
    id: candidate!.id,
    name: candidate!.name,
    manufacturerId: candidate!.manufacturerId,
    standardId: candidate!.standard,
  };
}

async function captureUserModuleForCleanup(
  client: DbClient,
  profileId: string,
  moduleId: number,
  touchedModules: Map<number, string | null>,
): Promise<void> {
  if (touchedModules.has(moduleId)) return;
  const {data, error} = await client
    .from('user_modules')
    .select('kind')
    .eq('profileid', profileId)
    .eq('moduleid', moduleId)
    .maybeSingle();
  expect(error, `user module state lookup failed: ${error?.message}`).toBeNull();
  touchedModules.set(moduleId, data?.kind ?? null);
}

async function setProfileVisibilityViaUserArea(page: Page, shouldBePublic: boolean): Promise<void> {
  await page.goto('/user/area');
  await expect(page.locator('app-user-area-root')).toBeVisible({timeout: 20_000});
  const targetButton = page.locator('app-user-area-root app-brand-primary-button', {
    hasText: shouldBePublic ? /make profile public/i : /make profile private/i,
  }).first();
  if (await targetButton.isVisible({timeout: 5_000}).catch(() => false)) {
    const update = waitForResponseOk(page, '/rest/v1/profiles', 'PATCH');
    await targetButton.click();
    await update;
  }
  await expect(page.locator('app-user-area-root app-brand-primary-button', {
    hasText: shouldBePublic ? /make profile private/i : /make profile public/i,
  }).first()).toBeVisible({timeout: 20_000});
}

async function expectAnonymousProfileState(
  browser: Browser,
  testInfo: TestInfo,
  username: string,
  state: 'ready' | 'private',
): Promise<void> {
  const context = await browser.newContext({baseURL: baseUrl(testInfo)});
  const page = await context.newPage();
  try {
    await page.goto(`/u/${username}`);
    if (state === 'ready') {
      await expect(page.getByRole('heading', {name: /public profile/i}).first()).toBeVisible({timeout: 20_000});
      await expect(page.locator('app-public-profile')).toContainText(username);
      await expect(page.locator('app-public-profile app-brand-primary-button', {hasText: /copy profile link/i})).toBeVisible();
    } else {
      await expect(page.getByText(/this profile is private/i)).toBeVisible({timeout: 20_000});
      await expect(page.locator('app-public-profile app-brand-primary-button', {hasText: /copy profile link/i})).toHaveCount(0);
    }
  } finally {
    await context.close();
  }
}

async function setModulePossessionViaUI(
  page: Page,
  module: ModuleFixture,
  label: 'Owned' | 'Wanted' | 'For sale',
  acquisition?: {price: string; note: string},
): Promise<void> {
  await page.goto(`/modules/details/${module.id}`);
  await expect(page.locator('app-module-composite').first()).toBeVisible({timeout: 20_000});
  const possessionButton = page.getByRole('button', {
    name: /add module to your collection|current status:/i,
  }).first();
  await expect(possessionButton).toBeVisible({timeout: 20_000});
  await possessionButton.click();

  const dialog = page.locator('mat-dialog-container').last();
  await expect(dialog).toBeVisible({timeout: 10_000});
  await dialog.getByRole('radio', {name: new RegExp(`^${escapeRegex(label)}\\b`, 'i')}).click();

  if (label === 'Owned' && acquisition) {
    await dialog.getByLabel(/price paid/i).fill(acquisition.price);
    await dialog.getByLabel(/note/i).fill(acquisition.note);
  }

  const update = waitForResponseOk(page, '/rest/v1/user_modules', 'POST');
  const saveButton = dialog.locator('app-brand-primary-button', {hasText: /save/i}).last();
  await expect(saveButton).toBeVisible({timeout: 10_000});
  await saveButton.click();
  await update;
  await expect(dialog).toBeHidden({timeout: 20_000});
  await expect(page.getByRole('button', {name: new RegExp(`current status: ${label}`, 'i')}).first()).toBeVisible({
    timeout: 20_000,
  });
}

async function removeModulePossessionViaUI(page: Page, module: ModuleFixture): Promise<void> {
  await page.goto(`/modules/details/${module.id}`);
  await expect(page.locator('app-module-composite').first()).toBeVisible({timeout: 20_000});
  await page.getByRole('button', {name: /current status:/i}).first().click();
  const dialog = page.locator('mat-dialog-container').last();
  await expect(dialog).toBeVisible({timeout: 10_000});
  const remove = waitForResponseOk(page, '/rest/v1/user_modules', 'DELETE');
  await dialog.locator('app-brand-primary-button', {hasText: /remove/i}).click();
  await remove;
  await expect(dialog).toBeHidden({timeout: 20_000});
  await expect(page.getByRole('button', {name: /add module to your collection/i}).first()).toBeVisible({timeout: 20_000});
}

async function expectModuleInUserAreaFilter(page: Page, filter: 'Owned' | 'Wanted' | 'For Sale', moduleName: string): Promise<void> {
  await page.goto('/user/area');
  await expect(page.locator('app-user-modules')).toBeVisible({timeout: 20_000});
  await page.locator('app-user-modules mat-button-toggle', {hasText: new RegExp(filter, 'i')}).click();
  await expect(page.locator('app-user-modules app-module-list')).toContainText(moduleName, {timeout: 20_000});
  await page.reload();
  await page.locator('app-user-modules mat-button-toggle', {hasText: new RegExp(filter, 'i')}).click();
  await expect(page.locator('app-user-modules app-module-list')).toContainText(moduleName, {timeout: 20_000});
}

async function expectModuleAbsentFromUserArea(page: Page, moduleName: string): Promise<void> {
  await page.goto('/user/area');
  await expect(page.locator('app-user-modules')).toBeVisible({timeout: 20_000});
  for (const filter of ['Owned', 'Wanted', 'For Sale']) {
    await page.locator('app-user-modules mat-button-toggle', {hasText: new RegExp(filter, 'i')}).click();
    await expect(page.locator('app-user-modules')).not.toContainText(moduleName);
  }
}

async function createRackViaUI(page: Page, testInfo: TestInfo, isPublic: boolean): Promise<CreatedRack> {
  const name = `[E2E] rack ${Date.now().toString().slice(-6)}-${testInfo.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .slice(0, 8)}`;
  await page.goto('/user/area');
  await expect(page.locator('app-user-racks')).toBeVisible({timeout: 20_000});
  await page.locator('app-user-racks app-brand-primary-button', {hasText: /create rack/i}).first().click();
  const dialog = page.locator('mat-dialog-container').last();
  await expect(dialog).toBeVisible({timeout: 10_000});
  await dialog.locator('input').first().fill(name);
  await setCreateRackDialogPrivacy(page, isPublic);
  const create = waitForResponseOk(page, '/rest/v1/racks', 'POST');
  await dialog.locator('app-brand-primary-button', {hasText: /create/i}).click();
  const response = await create;
  const row = firstResponseRow(await response.json()) as {id?: number; public_id?: string | null};
  expect(row.id, 'created rack id').toBeTruthy();
  expect(row.public_id, 'created rack public id').toBeTruthy();
  await expect(dialog).toBeHidden({timeout: 20_000});
  return {
    id: row.id!,
    publicId: row.public_id!,
    url: `/racks/${row.public_id}`,
    name,
  };
}

async function openRackInEditMode(page: Page, rack: CreatedRack): Promise<void> {
  await page.goto(rack.url);
  await expect(page.locator('app-rack-editor')).toBeVisible({timeout: 20_000});
  await ensureRackEditMode(page);
}

async function ensureRackEditMode(page: Page): Promise<void> {
  const moduleBrowser = page.locator('app-module-browser-root');
  if (await moduleBrowser.isVisible().catch(() => false)) return;
  await page.getByRole('button', {name: /^Edit rack$/i}).first().click();
  await expect(moduleBrowser).toBeVisible({timeout: 20_000});
}

async function lockRackIfEditing(page: Page): Promise<void> {
  const lock = page.getByRole('button', {name: /^Lock rack$/i}).first();
  if (await lock.isVisible({timeout: 5_000}).catch(() => false)) {
    await lock.click();
  }
  await expect(page.getByRole('button', {name: /^Edit rack$/i}).first()).toBeVisible({timeout: 20_000});
}

async function setCreateRackDialogPrivacy(page: Page, shouldBePublic: boolean): Promise<void> {
  const actions = page.locator('mat-dialog-actions').last();
  const icon = actions.locator('mat-icon').first();
  await expect(icon).toBeVisible({timeout: 5_000});
  const isPublic = ((await icon.textContent()) ?? '').trim() === 'public';
  if (isPublic !== shouldBePublic) {
    await actions.locator('mat-slide-toggle').first().click();
  }
  await expect(actions.locator('mat-icon', {hasText: shouldBePublic ? 'public' : 'lock'}).first()).toBeVisible({
    timeout: 5_000,
  });
}

async function setRackBrowserMode(page: Page, label: 'Available' | 'Collection' | 'All modules'): Promise<void> {
  const toggle = page.locator('[role="group"][aria-label="Rack module browser mode"]');
  await expect(toggle).toBeVisible({timeout: 20_000});
  const button = toggle.getByRole('button', {name: label});
  await button.click();
  await expect(button).toHaveAttribute('aria-pressed', 'true', {timeout: 10_000});
}

async function searchRackModuleBrowser(page: Page, moduleName: string): Promise<void> {
  const search = page.locator('app-module-browser-root input').first();
  await expect(search).toBeVisible({timeout: 20_000});
  await search.fill(moduleName);
}

async function setRackPrivacyViaUI(page: Page, shouldBePublic: boolean): Promise<void> {
  await ensureRackEditMode(page);
  const button = page.locator('app-rack-minimal button', {
    hasText: shouldBePublic ? /lock/ : /public/,
  }).first();
  const label = shouldBePublic ? /make rack public/i : /make rack private/i;
  const privacyButton = page.getByRole('button', {name: label}).first();
  if (await privacyButton.isVisible({timeout: 5_000}).catch(() => false)) {
    const update = waitForResponseOk(page, '/rest/v1/racks', 'POST');
    await privacyButton.click();
    await update;
  } else {
    await expect(button).toBeVisible({timeout: 20_000});
  }
  await expect(page.getByRole('button', {name: shouldBePublic ? /make rack private/i : /make rack public/i}).first()).toBeVisible({
    timeout: 20_000,
  });
}

async function expectAnonymousRackToken(browser: Browser, testInfo: TestInfo, rack: CreatedRack, shouldOpen: boolean): Promise<void> {
  const context = await browser.newContext({baseURL: baseUrl(testInfo)});
  const page = await context.newPage();
  try {
    await page.goto(rack.url);
    if (shouldOpen) {
      await expect(page.locator('app-rack-editor')).toBeVisible({timeout: 20_000});
      await expect(page.locator('body')).toContainText(rack.name);
    } else {
      await expect(page.locator('[data-testid="rack-detail-unavailable"]')).toBeVisible({timeout: 20_000});
    }
  } finally {
    await context.close();
  }
}

async function expectAnonymousPublicProfileContains(
  browser: Browser,
  testInfo: TestInfo,
  username: string,
  rackName: string,
  shouldContain: boolean,
): Promise<void> {
  const context = await browser.newContext({baseURL: baseUrl(testInfo)});
  const page = await context.newPage();
  try {
    await page.goto(`/u/${username}`);
    await expect(page.getByRole('heading', {name: /public profile/i}).first()).toBeVisible({timeout: 20_000});
    const racksSection = page.locator('lib-hero-content-card.racksBG').first();
    if (shouldContain) {
      await expect(racksSection).toContainText(rackName, {timeout: 20_000});
    } else {
      await expect(racksSection).not.toContainText(rackName);
    }
  } finally {
    await context.close();
  }
}

async function createPatchViaUI(page: Page, slug: string): Promise<CreatedPatch> {
  const name = `[E2E] ${slug.slice(0, 8)} ${Date.now().toString().slice(-6)}`;
  await page.goto('/user/area');
  await expect(page.locator('app-user-patches')).toBeVisible({timeout: 20_000});
  await page.locator('app-user-patches app-brand-primary-button', {hasText: /create patch/i}).first().click();
  const dialog = page.locator('mat-dialog-container').last();
  await expect(dialog).toBeVisible({timeout: 10_000});
  await dialog.getByRole('combobox', {name: /name/i}).first().fill(name);
  const create = waitForResponseOk(page, '/rest/v1/patches', 'POST');
  const createButton = dialog.locator('app-brand-primary-button', {hasText: /create/i}).last();
  await expect(createButton).toBeVisible({timeout: 10_000});
  await createButton.click();
  const response = await create;
  const row = firstResponseRow(await response.json()) as {id?: number; public_id?: string | null};
  expect(row.id, 'created patch id').toBeTruthy();
  await expect(dialog).toBeHidden({timeout: 20_000});
  return {
    id: row.id!,
    publicId: row.public_id,
    url: row.public_id ? `/patches/${row.public_id}` : `/patches/details/${row.id}`,
    name,
  };
}

async function openPatch(page: Page, patch: CreatedPatch): Promise<void> {
  await page.goto(patch.url);
  await expect(page.locator('app-patch-composite')).toBeVisible({timeout: 20_000});
  await expect(page.getByRole('heading', {name: /Patch (details|editing)/i}).first()).toBeVisible({timeout: 20_000});
}

async function enterPatchEditMode(page: Page): Promise<void> {
  const editingHeading = page.getByRole('heading', {name: /Patch editing/i}).first();
  if (await editingHeading.isVisible().catch(() => false)) return;
  await page.getByRole('button', {name: /^Edit$/i}).first().click();
  await expect(editingHeading).toBeVisible({timeout: 20_000});
}

async function closePatchEditor(page: Page): Promise<void> {
  const detailsHeading = page.getByRole('heading', {name: /Patch details/i}).first();
  if (await detailsHeading.isVisible().catch(() => false)) return;
  await page.getByRole('button', {name: /close editor/i}).first().click();
  await expect(detailsHeading).toBeVisible({timeout: 20_000});
}

function waitForResponseOk(page: Page, urlPart: string, method: string) {
  return page.waitForResponse(response =>
    response.url().includes(urlPart)
    && response.request().method() === method
    && response.ok(),
  {timeout: 30_000});
}

function firstResponseRow(payload: unknown): unknown {
  return Array.isArray(payload) ? payload[0] : payload;
}

async function restoreUserModule(client: DbClient, profileId: string, moduleId: number, originalKind: string | null): Promise<void> {
  await client.from('user_module_acquisitions')
    .delete()
    .eq('profileid', profileId)
    .eq('moduleid', moduleId);
  if (originalKind) {
    await client.from('user_modules')
      .upsert({profileid: profileId, moduleid: moduleId, kind: originalKind}, {onConflict: 'profileid,moduleid'});
  } else {
    await client.from('user_modules')
      .delete()
      .eq('profileid', profileId)
      .eq('moduleid', moduleId);
  }
}

async function cleanupRack(client: DbClient, profileId: string, rackId: number): Promise<void> {
  await client.from('rack_modules').delete().eq('rackid', rackId);
  await client.from('comments').delete().eq('entityId', rackId).eq('entityType', 2);
  await client.from('racks').delete().eq('authorid', profileId).eq('id', rackId);
}

async function cleanupPatch(client: DbClient, profileId: string, patchId: number): Promise<void> {
  await client.from('patch_connections').delete().eq('patchid', patchId);
  await client.from('patch_module_instances').delete().eq('patch_id', patchId);
  await client.from('comments').delete().eq('entityId', patchId).eq('entityType', 3);
  await client.from('patches').delete().eq('authorid', profileId).eq('id', patchId);
}

async function cleanupSubmittedModule(client: DbClient, profileId: string, moduleName: string): Promise<void> {
  const {data} = await client
    .from('modules')
    .select('id')
    .eq('submitter', profileId)
    .eq('name', moduleName);
  for (const row of data ?? []) {
    await client.from('comments').delete().eq('entityId', row.id).eq('entityType', 1);
    await client.from('modules').delete().eq('submitter', profileId).eq('id', row.id);
  }
}

async function seedPatchInstanceAndConnection(client: DbClient, patchId: number, module: ModuleFixture): Promise<void> {
  const [{data: outs, error: outsError}, {data: ins, error: insError}] = await Promise.all([
    client.from('module_outs').select('id').eq('moduleid', module.id).limit(1),
    client.from('module_ins').select('id').eq('moduleid', module.id).limit(1),
  ]);
  expect(outsError, `module output lookup failed: ${outsError?.message}`).toBeNull();
  expect(insError, `module input lookup failed: ${insError?.message}`).toBeNull();
  expect(outs?.[0]?.id, 'module fixture output id').toBeTruthy();
  expect(ins?.[0]?.id, 'module fixture input id').toBeTruthy();

  const {data: instance, error: instanceError} = await client
    .from('patch_module_instances')
    .insert({patch_id: patchId, module_id: module.id})
    .select('id')
    .single();
  expect(instanceError, `patch instance setup failed: ${instanceError?.message}`).toBeNull();
  expect(instance?.id, 'patch module instance id').toBeTruthy();

  const {error: connectionError} = await client
    .from('patch_connections')
    .insert({
      patchid: patchId,
      a: outs![0].id,
      b: ins![0].id,
      ordinal: 0,
      instance_id_a: instance!.id,
      instance_id_b: instance!.id,
    });
  expect(connectionError, `patch connection setup failed: ${connectionError?.message}`).toBeNull();
}

async function placeRackModuleInFirstRow(client: DbClient, rackId: number, moduleId: number): Promise<void> {
  const {error} = await client
    .from('rack_modules')
    .update({row: 0, column: 0})
    .eq('rackid', rackId)
    .eq('moduleid', moduleId);
  expect(error, `rack module placement setup failed: ${error?.message}`).toBeNull();
}

function baseUrl(testInfo: TestInfo): string {
  const fromProject = testInfo.project.use.baseURL;
  return typeof fromProject === 'string' ? fromProject : DEFAULT_BASE_URL;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
