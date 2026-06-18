import {
  expect,
  type Locator,
  type Page,
  test
} from '@playwright/test';
import {loadE2EEnvFromDotEnv} from './helpers/auth';


loadE2EEnvFromDotEnv();

const DESKTOP_VIEWPORT = {width: 1280, height: 960} as const;
const SUPABASE_URL = (process.env['SUPABASE_URL']?.trim() || 'https://sozmatmywjpstwidzlss.supabase.co').replace(/\/+$/, '');
const SUPABASE_ANON_KEY =
  process.env['SUPABASE_ANON_KEY']?.trim()
  || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlhdCI6MTYxODA4NDU1OCwiZXhwIjoxOTMzNjYwNTU4fQ.3pSLsqyaCAGgISvOrHMt2CIX9hQowty2r8etzMwlpy8';

type OwnedModule = {
  id: number;
  name: string;
};

type CreatedPatch = {
  id: number;
  url: string;
};

test.describe('Authenticated patch — multi-instance', () => {
  test.describe.configure({mode: 'serial'});
  test.skip(!SUPABASE_ANON_KEY, 'SUPABASE_ANON_KEY not configured');

  let ownedModule: OwnedModule | undefined;
  let seededModuleId: number | null = null;
  let createdPatch: CreatedPatch | undefined;

  test.beforeAll(async ({browser}) => {
    const context = await browser.newContext({
      storageState: 'playwright/.auth/user.json',
      viewport: DESKTOP_VIEWPORT
    });
    const page = await context.newPage();
    const prepared = await ensureOwnedModule(page);
    ownedModule = prepared.module;
    seededModuleId = prepared.seededModuleId;
    createdPatch = await createOwnedPatch(page);
    await context.close();
  });

  test.afterAll(async ({browser}) => {
    const context = await browser.newContext({
      storageState: 'playwright/.auth/user.json',
      viewport: DESKTOP_VIEWPORT
    });
    const page = await context.newPage();

    if (createdPatch) {
      await deletePatch(page, createdPatch);
    }
    if (seededModuleId != null) {
      await removeOwnedModule(page, seededModuleId);
    }

    await context.close();
  });

  test('opens a patch editor and renders collection modules as cards', async ({page}) => {
    test.setTimeout(90_000);
    expect(ownedModule).toBeDefined();
    expect(createdPatch).toBeDefined();
    const errors = collectCriticalErrors(page);

    await openPatchEditor(page, createdPatch!);
    await switchToCollectionMode(page);
    await focusCollectionModule(page, ownedModule!.name);

    await expect(collectionModuleCards(page, ownedModule!.name).first()).toBeVisible({timeout: 20_000});
    await expect(page.locator('app-patch-editor lib-clean-card app-module-composite').first()).toBeVisible({
      timeout: 20_000
    });

    expect(errors()).toEqual([]);
  });

  test('adds the first copy and renders two instance labels', async ({page}) => {
    test.setTimeout(120_000);
    expect(ownedModule).toBeDefined();
    expect(createdPatch).toBeDefined();
    const errors = collectCriticalErrors(page);

    await openPatchEditor(page, createdPatch!);
    await switchToCollectionMode(page);
    await focusCollectionModule(page, ownedModule!.name);

    await addCopyFromFirstVisibleCard(page, ownedModule!.name);
    await expectModuleCopies(page, ownedModule!.name, ['(1)', '(2)']);
    expect(errors()).toEqual([]);
  });

  test('adds another copy and renders three instance labels', async ({page}) => {
    test.setTimeout(120_000);
    expect(ownedModule).toBeDefined();
    expect(createdPatch).toBeDefined();
    const errors = collectCriticalErrors(page);

    await openPatchEditor(page, createdPatch!);
    await switchToCollectionMode(page);
    await focusCollectionModule(page, ownedModule!.name);
    await expectModuleCopies(page, ownedModule!.name, ['(1)', '(2)']);

    await addCopyFromFirstVisibleCard(page, ownedModule!.name);
    await expectModuleCopies(page, ownedModule!.name, ['(1)', '(2)', '(3)']);
    expect(errors()).toEqual([]);
  });

  test('persists instance labels after closing and reloading the patch', async ({page}) => {
    test.setTimeout(120_000);
    expect(ownedModule).toBeDefined();
    expect(createdPatch).toBeDefined();
    const errors = collectCriticalErrors(page);

    await openPatchEditor(page, createdPatch!);
    await switchToCollectionMode(page);
    await focusCollectionModule(page, ownedModule!.name);
    await expectModuleCopies(page, ownedModule!.name, ['(1)', '(2)', '(3)']);

    await closePatchEditor(page);
    await page.reload();
    await openPatchEditor(page, createdPatch!);
    await switchToCollectionMode(page);
    await focusCollectionModule(page, ownedModule!.name);
    await expectModuleCopies(page, ownedModule!.name, ['(1)', '(2)', '(3)']);

    expect(errors()).toEqual([]);
  });
});

async function ensureOwnedModule(page: Page): Promise<{module: OwnedModule; seededModuleId: number | null}> {
  await page.goto('/user/area');
  await expect(page.locator('app-user-area-root')).toBeVisible({timeout: 20_000});
  await page.evaluate(() => localStorage.removeItem('CACHE_STORAGE'));

  const result = await page.evaluate(async ({supabaseUrl, anonKey}) => {
    const lsKey = Object.keys(localStorage).find(key => key.includes('auth-token'));
    if (!lsKey) {
      return {status: 'missing auth token', module: null, seededModuleId: null};
    }

    const authData = JSON.parse(localStorage.getItem(lsKey) ?? '{}') as {
      access_token?: string;
      currentSession?: {access_token?: string};
      session?: {access_token?: string};
    };
    const accessToken = authData.access_token
      ?? authData.currentSession?.access_token
      ?? authData.session?.access_token;
    if (!accessToken) {
      return {status: 'missing access token', module: null, seededModuleId: null};
    }

    let profileId: string | null = null;
    try {
      const payload = JSON.parse(atob(accessToken.split('.')[1])) as {sub?: string};
      profileId = payload.sub ?? null;
    } catch {
      return {status: 'invalid auth token', module: null, seededModuleId: null};
    }
    if (!profileId) {
      return {status: 'missing profile id', module: null, seededModuleId: null};
    }

    if (!anonKey) {
      return {status: 'missing anon key', module: null, seededModuleId: null};
    }
    const headers: Record<string, string> = {
      Authorization: `Bearer ${ accessToken }`,
      apikey: anonKey,
      'Content-Type': 'application/json'
    };

    const userModuleSelect = 'kind,module:modules!user_modules_moduleid_fkey(id,name,manufacturer:manufacturerId(id,name))';
    const existingResponse = await fetch(
      `${ supabaseUrl }/rest/v1/user_modules?select=${ encodeURIComponent(userModuleSelect) }&profileid=eq.${ profileId }&limit=10`,
      {headers}
    );
    const existingRows = await existingResponse.json() as Array<{
      kind: string | null;
      module: {id: number; name: string; manufacturer: {id: number} | null} | null;
    }>;
    const existingOwned = Array.isArray(existingRows)
      ? existingRows.find(row =>
        (row.kind === 'HAS' || row.kind === 'SELLS')
        && row.module?.id != null
        && row.module.manufacturer != null
      )
      : undefined;
    if (existingOwned?.module) {
      return {
        status: 'already owned',
        module: {id: existingOwned.module.id, name: existingOwned.module.name},
        seededModuleId: null
      };
    }

    const moduleResponse = await fetch(
      `${ supabaseUrl }/rest/v1/modules?select=id,name,manufacturer:manufacturerId(id)&isApproved=eq.true&limit=10`,
      {headers}
    );
    const modules = await moduleResponse.json() as Array<{
      id: number;
      name: string;
      manufacturer: {id: number} | null;
    }>;
    const module = Array.isArray(modules)
      ? modules.find(candidate => candidate.id != null && candidate.manufacturer?.id != null)
      : undefined;
    if (!module) {
      return {status: 'no approved module available', module: null, seededModuleId: null};
    }

    const insertResponse = await fetch(`${ supabaseUrl }/rest/v1/user_modules?on_conflict=profileid,moduleid`, {
      method: 'POST',
      headers: {...headers, Prefer: 'return=minimal,resolution=merge-duplicates'},
      body: JSON.stringify({profileid: profileId, moduleid: module.id, kind: 'HAS'})
    });
    if (!insertResponse.ok) {
      return {status: `insert failed ${ insertResponse.status }`, module: null, seededModuleId: null};
    }

    return {
      status: 'seeded',
      module: {id: module.id, name: module.name},
      seededModuleId: module.id
    };

  }, {supabaseUrl: SUPABASE_URL, anonKey: SUPABASE_ANON_KEY});

  if (!result.module) {
    throw new Error(`Unable to prepare an owned module for multi-instance E2E: ${ result.status }`);
  }

  await page.evaluate(() => localStorage.removeItem('CACHE_STORAGE'));
  return {
    module: result.module,
    seededModuleId: result.seededModuleId
  };
}

async function removeOwnedModule(page: Page, moduleId: number): Promise<void> {
  await page.goto('/user/area');
  await expect(page.locator('app-user-area-root')).toBeVisible({timeout: 20_000});

  await page.evaluate(async ({mId, supabaseUrl, anonKey}) => {
    const lsKey = Object.keys(localStorage).find(key => key.includes('auth-token'));
    if (!lsKey) return;

    const authData = JSON.parse(localStorage.getItem(lsKey) ?? '{}') as {
      access_token?: string;
      currentSession?: {access_token?: string};
      session?: {access_token?: string};
    };
    const accessToken = authData.access_token
      ?? authData.currentSession?.access_token
      ?? authData.session?.access_token;
    if (!accessToken) return;

    let profileId: string | null = null;
    try {
      const payload = JSON.parse(atob(accessToken.split('.')[1])) as {sub?: string};
      profileId = payload.sub ?? null;
    } catch {
      return;
    }
    if (!profileId) return;
    if (!anonKey) return;
    await fetch(`${ supabaseUrl }/rest/v1/user_modules?moduleid=eq.${ mId }&profileid=eq.${ profileId }`, {
      method: 'DELETE',
      headers: {apikey: anonKey, Authorization: `Bearer ${ accessToken }`}
    });
  }, {mId: moduleId, supabaseUrl: SUPABASE_URL, anonKey: SUPABASE_ANON_KEY});
}

async function createOwnedPatch(page: Page): Promise<CreatedPatch> {
  await page.goto('/user/area');
  await expect(page).toHaveURL(/\/user\/area/, {timeout: 20_000});
  await expect(page.locator('app-user-patches')).toBeVisible({timeout: 20_000});

  const createPatchButton = page.locator('app-user-patches app-brand-primary-button', {hasText: /create patch/i}).first();
  await expect(createPatchButton).toBeVisible({timeout: 20_000});
  await createPatchButton.click();

  const dialog = page.locator('mat-dialog-container').last();
  await expect(page.getByRole('heading', {name: /create new patch/i})).toBeVisible({timeout: 10_000});
  await dialog.getByRole('combobox', {name: /name/i}).first().fill(`[E2E] multi-instance ${ Date.now().toString().slice(-6) }`);

  const createResponsePromise = page.waitForResponse(response =>
    response.url().includes('/rest/v1/patches')
    && response.request().method() === 'POST'
    && response.ok(), {timeout: 20_000});

  const confirmCreateByRole = dialog.getByRole('button', {name: /^Create$/i}).first();
  if (await confirmCreateByRole.isVisible().catch(() => false)) {
    await confirmCreateByRole.click();
  } else {
    await dialog.locator('app-brand-primary-button', {hasText: /create/i}).first().click();
  }

  const createPayload = await (await createResponsePromise).json();
  const row = Array.isArray(createPayload) ? createPayload[0] : createPayload;
  const id = row?.id;
  const publicId = row?.public_id;
  expect(id).toBeTruthy();

  await expect(dialog).toBeHidden({timeout: 20_000});
  return {
    id,
    url: publicId ? `/patches/${ publicId }` : `/patches/details/${ id }`
  };
}

async function deletePatch(page: Page, patch: CreatedPatch): Promise<void> {
  try {
    await page.goto(patch.url, {timeout: 20_000});
    await expect(page.locator('app-patch-composite').first()).toBeVisible({timeout: 20_000});

    const deleteButton = page.locator('button[mattooltip="Delete patch"]').first();
    await expect(deleteButton).toBeVisible({timeout: 10_000});
    await deleteButton.click();

    const dialog = page.locator('mat-dialog-container').last();
    await expect(dialog).toBeVisible({timeout: 8_000});
    const deleteResponse = page.waitForResponse(response =>
      response.url().includes('/rest/v1/patches')
      && response.request().method() === 'DELETE'
      && response.ok(), {timeout: 8_000}).catch(() => undefined);

    const confirm = dialog.getByRole('button', {name: /^Delete$/i}).first();
    if (await confirm.isVisible().catch(() => false)) {
      await confirm.click();
    } else {
      await dialog.locator('app-brand-primary-button', {hasText: /delete/i}).first().click();
    }
    await deleteResponse;
  } catch {
    // Best-effort cleanup for a dedicated E2E patch.
  }
}

async function openPatchEditor(page: Page, patch: CreatedPatch): Promise<void> {
  await page.setViewportSize(DESKTOP_VIEWPORT);
  await page.evaluate(() => localStorage.removeItem('CACHE_STORAGE')).catch(() => undefined);
  await page.goto(patch.url);
  await expect(page.locator('app-patch-composite').first()).toBeVisible({timeout: 20_000});

  const editingHeading = page.getByRole('heading', {name: /Patch editing/i}).first();
  const editButton = page.locator('app-edit-fab button', {hasText: /^Edit$/i}).first();
  await Promise.any([
    editingHeading.waitFor({state: 'visible', timeout: 12_000}),
    editButton.waitFor({state: 'visible', timeout: 12_000})
  ]).catch(() => undefined);

  if (!(await editingHeading.isVisible().catch(() => false))) {
    await expect(editButton).toBeVisible({timeout: 10_000});
    await editButton.click();
    await expect(editingHeading).toBeVisible({timeout: 20_000});
  }
}

async function closePatchEditor(page: Page): Promise<void> {
  const detailsHeading = page.getByRole('heading', {name: /Patch details/i}).first();
  if (await detailsHeading.isVisible().catch(() => false)) {
    return;
  }

  const closeButton = page.getByRole('button', {name: /Close editor/i}).first();
  await expect(closeButton).toBeVisible({timeout: 20_000});
  await closeButton.click();
  await expect(detailsHeading).toBeVisible({timeout: 20_000});
}

async function switchToCollectionMode(page: Page): Promise<void> {
  const collectionMode = page.getByRole('radio', {name: /^Collection$/i}).first();
  await expect(collectionMode).toBeVisible({timeout: 20_000});
  if (!(await collectionMode.isChecked().catch(() => false))) {
    await collectionMode.click();
  }
  await expect(page.locator('app-patch-editor .patch-editor-controls')).toBeVisible({timeout: 20_000});
}

async function focusCollectionModule(page: Page, moduleName: string): Promise<void> {
  const searchInput = page.getByRole('combobox', {name: /find module in collection/i}).first();
  await expect(searchInput).toBeVisible({timeout: 20_000});
  await searchInput.fill(moduleName);
  await expect(collectionModuleCards(page, moduleName).first()).toBeVisible({timeout: 20_000});
}

async function addCopyFromFirstVisibleCard(page: Page, moduleName: string): Promise<void> {
  const card = collectionModuleCards(page, moduleName).first();
  await expect(card).toBeVisible({timeout: 20_000});

  const addResponse = page.waitForResponse(response =>
    response.url().includes('/rest/v1/patch_module_instances')
    && response.request().method() === 'POST'
    && response.ok(), {timeout: 20_000});

  const addCopyButton = card.getByRole('button', {name: /Add another copy of this module/i}).first();
  await expect(addCopyButton).toBeVisible({timeout: 20_000});
  await addCopyButton.click();
  await addResponse;
}

async function expectModuleCopies(page: Page, moduleName: string, labels: string[]): Promise<void> {
  const cards = collectionModuleCards(page, moduleName);
  await expect(cards).toHaveCount(labels.length, {timeout: 20_000});

  for (const label of labels) {
    await expect(cards.filter({has: page.locator('.instance-suffix', {hasText: label})})).toHaveCount(1, {
      timeout: 20_000
    });
  }
}

function collectionModuleCards(page: Page, moduleName: string): Locator {
  return page.locator('app-patch-editor lib-clean-card').filter({
    has: page.locator('app-module-composite').filter({has: page.locator('app-module-part-name', {hasText: moduleName})})
  });
}

function collectCriticalErrors(page: Page): () => string[] {
  const errors: string[] = [];
  const criticalPattern = /(TypeError|ReferenceError|NullInjectorError|ExpressionChangedAfterItHasBeenCheckedError|PAGE_ERROR)/i;

  page.on('pageerror', error => errors.push(`PAGE_ERROR: ${ error.message }`));
  page.on('console', message => {
    if (message.type() !== 'error') return;
    const text = message.text();
    if (criticalPattern.test(text)) {
      errors.push(text);
    }
  });

  return () => errors;
}
