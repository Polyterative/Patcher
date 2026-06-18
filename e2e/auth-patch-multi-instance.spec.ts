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

const TARGET_MODULE: OwnedModule = {
  id: 1025,
  name: 'Maths'
};
const OUTPUT_CV_NAME = 'End Of Rise';
const INSTANCE_ONE_INPUT_CV_NAME = 'CH 1 Both';
const INSTANCE_TWO_INPUT_CV_NAME = 'CH 2 Signal';

type CreatedPatch = {
  id: number;
  url: string;
};

type PersistedPatchModuleInstance = {
  id: number;
  instance_label: string | null;
};

type PersistedPatchConnection = {
  ordinal: number;
  instance_id_a: number | null;
  instance_id_b: number | null;
};

test.describe('Authenticated patch — multi-instance', () => {
  test.describe.configure({mode: 'serial'});
  test.skip(!SUPABASE_ANON_KEY, 'SUPABASE_ANON_KEY not configured');

  let ownedModule: OwnedModule | undefined;
  let seededModuleId: number | null = null;
  let createdPatch: CreatedPatch | undefined;
  let legacyPatch: CreatedPatch | undefined;

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
    legacyPatch = await createOwnedPatch(page);
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
    if (legacyPatch) {
      await deletePatch(page, legacyPatch);
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

  test('connects one output CV from instance one to an input CV on instance one', async ({page}) => {
    test.setTimeout(120_000);
    expect(ownedModule).toBeDefined();
    expect(createdPatch).toBeDefined();
    const errors = collectCriticalErrors(page);

    await openPatchEditor(page, createdPatch!);
    await switchToCollectionMode(page);
    await focusCollectionModule(page, ownedModule!.name);
    await expectModuleCopies(page, ownedModule!.name, ['(1)', '(2)', '(3)']);

    await selectConnectionBetweenInstances(page, ownedModule!.name, '(1)', '(1)', INSTANCE_ONE_INPUT_CV_NAME);
    await confirmPendingConnection(page, 1);

    expect(errors()).toEqual([]);
  });

  test('connects the same output CV from instance one to an input CV on instance two', async ({page}) => {
    test.setTimeout(120_000);
    expect(ownedModule).toBeDefined();
    expect(createdPatch).toBeDefined();
    const errors = collectCriticalErrors(page);

    await openPatchEditor(page, createdPatch!);
    await switchToCollectionMode(page);
    await focusCollectionModule(page, ownedModule!.name);
    await expectModuleCopies(page, ownedModule!.name, ['(1)', '(2)', '(3)']);

    await selectConnectionBetweenInstances(page, ownedModule!.name, '(1)', '(2)', INSTANCE_TWO_INPUT_CV_NAME);
    await confirmPendingConnection(page, 2);

    expect(errors()).toEqual([]);
  });

  test('rejects the same instance-aware connection as a duplicate', async ({page}) => {
    test.setTimeout(120_000);
    expect(ownedModule).toBeDefined();
    expect(createdPatch).toBeDefined();
    const errors = collectCriticalErrors(page);

    await openPatchEditor(page, createdPatch!);
    await switchToCollectionMode(page);
    await focusCollectionModule(page, ownedModule!.name);
    await expectModuleCopies(page, ownedModule!.name, ['(1)', '(2)', '(3)']);
    await expectPatchConnectionCount(page, 2);

    await selectConnectionBetweenInstances(page, ownedModule!.name, '(1)', '(2)', INSTANCE_TWO_INPUT_CV_NAME);

    await expectDuplicateConnectionRejected(page);
    await expectPatchConnectionCount(page, 2);
    expect(errors()).toEqual([]);
  });

  test('persists instance labels and connections after closing and reloading the patch', async ({page}) => {
    test.setTimeout(120_000);
    expect(ownedModule).toBeDefined();
    expect(createdPatch).toBeDefined();
    const errors = collectCriticalErrors(page);

    await openPatchEditor(page, createdPatch!);
    await switchToCollectionMode(page);
    await focusCollectionModule(page, ownedModule!.name);
    await expectModuleCopies(page, ownedModule!.name, ['(1)', '(2)', '(3)']);
    await expectPatchConnectionCount(page, 2);

    await closePatchEditor(page);
    await page.reload();
    await openPatchEditor(page, createdPatch!);
    await switchToCollectionMode(page);
    await focusCollectionModule(page, ownedModule!.name);
    await expectModuleCopies(page, ownedModule!.name, ['(1)', '(2)', '(3)']);
    await expectPatchConnectionCount(page, 2);

    expect(errors()).toEqual([]);
  });

  test('shows a confirmation dialog when deleting an instance with connections', async ({page}) => {
    test.setTimeout(120_000);
    expect(ownedModule).toBeDefined();
    expect(createdPatch).toBeDefined();
    const errors = collectCriticalErrors(page);

    await openPatchEditor(page, createdPatch!);
    await switchToCollectionMode(page);
    await focusCollectionModule(page, ownedModule!.name);
    await expectModuleCopies(page, ownedModule!.name, ['(1)', '(2)', '(3)']);
    await expectPatchConnectionCount(page, 2);

    await clickRemoveCopy(page, ownedModule!.name, '(1)');
    const dialog = page.locator('mat-dialog-container').last();
    await expect(dialog.getByRole('heading', {name: /Remove this copy\?/i})).toBeVisible({timeout: 10_000});
    await expect(dialog).toContainText(/This copy has 2 connections that will be disconnected\./i);

    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden({timeout: 10_000});
    await expectModuleCopies(page, ownedModule!.name, ['(1)', '(2)', '(3)']);
    await expectPatchConnectionCount(page, 2);

    expect(errors()).toEqual([]);
  });

  test('removes a connected instance, scrubs its persisted connection references, and renumbers survivors', async ({page}) => {
    test.setTimeout(120_000);
    expect(ownedModule).toBeDefined();
    expect(createdPatch).toBeDefined();
    const errors = collectCriticalErrors(page);

    await openPatchEditor(page, createdPatch!);
    await switchToCollectionMode(page);
    await focusCollectionModule(page, ownedModule!.name);
    await expectModuleCopies(page, ownedModule!.name, ['(1)', '(2)', '(3)']);
    await expectPatchConnectionCount(page, 2);

    const beforeDelete = await readPatchPersistence(page, createdPatch!.id, ownedModule!.id);
    const removedInstanceId = beforeDelete.instances.find(instance => instance.instance_label === '(1)')?.id;
    expect(removedInstanceId).toBeTruthy();

    await clickRemoveCopy(page, ownedModule!.name, '(1)');
    const dialog = page.locator('mat-dialog-container').last();
    await expect(dialog.getByRole('heading', {name: /Remove this copy\?/i})).toBeVisible({timeout: 10_000});
    await dialog.locator('app-brand-primary-button').filter({hasText: /Remove/i}).locator('a').first().click({
      force: true
    });

    await expect(page.getByText(/Instance removed\./i).first()).toBeVisible({timeout: 10_000});
    await expectModuleCopies(page, ownedModule!.name, ['(1)', '(2)']);
    await expectPatchConnectionCount(page, 2);

    await expect.poll(async () => {
      const persisted = await readPatchPersistence(page, createdPatch!.id, ownedModule!.id);
      return JSON.stringify({
        labels: persisted.instances.map(instance => instance.instance_label).sort(),
        containsRemovedInstance: persisted.instances.some(instance => instance.id === removedInstanceId),
        connectionCount: persisted.connections.length,
        containsRemovedConnectionReference: persisted.connections.some(connection =>
          connection.instance_id_a === removedInstanceId || connection.instance_id_b === removedInstanceId
        )
      });
    }, {timeout: 20_000}).toBe(JSON.stringify({
      labels: ['(1)', '(2)'],
      containsRemovedInstance: false,
      connectionCount: 2,
      containsRemovedConnectionReference: false
    }));

    expect(errors()).toEqual([]);
  });

  test('loads a patch with no instance rows as the legacy single-copy shape', async ({page}) => {
    test.setTimeout(120_000);
    expect(ownedModule).toBeDefined();
    expect(legacyPatch).toBeDefined();
    const errors = collectCriticalErrors(page);

    await page.goto('/user/area');
    await expect(page.locator('app-user-area-root')).toBeVisible({timeout: 20_000});
    const persisted = await readPatchPersistence(page, legacyPatch!.id, ownedModule!.id);
    expect(persisted.instances).toHaveLength(0);

    await openPatchEditor(page, legacyPatch!);
    await switchToCollectionMode(page);
    await focusCollectionModule(page, ownedModule!.name);

    const cards = collectionModuleCards(page, ownedModule!.name);
    await expect(cards).toHaveCount(1, {timeout: 20_000});
    await expect(cards.first().locator('.instance-suffix')).toHaveCount(0);
    expect(persisted.connections).toHaveLength(0);

    expect(errors()).toEqual([]);
  });
});

async function ensureOwnedModule(page: Page): Promise<{module: OwnedModule; seededModuleId: number | null}> {
  await page.goto('/user/area');
  await expect(page.locator('app-user-area-root')).toBeVisible({timeout: 20_000});
  await page.evaluate(() => localStorage.removeItem('CACHE_STORAGE'));

  const result = await page.evaluate(async ({supabaseUrl, anonKey, targetModule}) => {
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

    const userModuleSelect = 'kind,moduleid';
    const existingResponse = await fetch(
      `${ supabaseUrl }/rest/v1/user_modules?select=${ encodeURIComponent(userModuleSelect) }&profileid=eq.${ profileId }&moduleid=eq.${ targetModule.id }&limit=1`,
      {headers}
    );
    const existingRows = await existingResponse.json() as Array<{
      kind: string | null;
      moduleid: number | null;
    }>;
    const existingRow = Array.isArray(existingRows)
      ? existingRows.find(row => row.moduleid === targetModule.id)
      : undefined;
    const existingUsableCollectionRow = existingRow?.kind === 'HAS' || existingRow?.kind === 'SELLS';
    if (existingUsableCollectionRow) {
      return {
        status: 'already owned',
        module: targetModule,
        seededModuleId: null
      };
    }
    if (existingRow) {
      return {
        status: `module ${ targetModule.id } already has non-collection user_modules kind ${ existingRow.kind ?? 'null' }; refusing to mutate it`,
        module: null,
        seededModuleId: null
      };
    }

    const insertResponse = await fetch(`${ supabaseUrl }/rest/v1/user_modules?on_conflict=profileid,moduleid`, {
      method: 'POST',
      headers: {...headers, Prefer: 'return=minimal,resolution=merge-duplicates'},
      body: JSON.stringify({profileid: profileId, moduleid: targetModule.id, kind: 'HAS'})
    });
    if (!insertResponse.ok) {
      return {status: `insert failed ${ insertResponse.status }`, module: null, seededModuleId: null};
    }

    return {
      status: 'seeded',
      module: targetModule,
      seededModuleId: targetModule.id
    };

  }, {supabaseUrl: SUPABASE_URL, anonKey: SUPABASE_ANON_KEY, targetModule: TARGET_MODULE});

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

async function clickRemoveCopy(page: Page, moduleName: string, label: string): Promise<void> {
  const card = collectionModuleCardWithLabel(page, moduleName, label);
  await expect(card).toBeVisible({timeout: 20_000});
  const removeCopyButton = card.getByRole('button', {name: /Remove this copy/i}).first();
  await expect(removeCopyButton).toBeVisible({timeout: 20_000});
  await removeCopyButton.click();
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

async function selectConnectionBetweenInstances(
  page: Page,
  moduleName: string,
  outputLabel: string,
  inputLabel: string,
  inputCvName: string
): Promise<void> {
  const outputCard = collectionModuleCardWithLabel(page, moduleName, outputLabel);
  const inputCard = collectionModuleCardWithLabel(page, moduleName, inputLabel);

  await clickCardCv(outputCard, 'out', OUTPUT_CV_NAME);
  await expect(page.getByText(/Output selected — now pick an input/i)).toBeVisible({timeout: 10_000});
  await clickCardCv(inputCard, 'in', inputCvName);
}

async function clickCardCv(card: Locator, kind: 'in' | 'out', cvName: string): Promise<void> {
  await expect(card).toBeVisible({timeout: 20_000});
  const cv = card.locator(`app-module-cvitem .${ kind }`).filter({hasText: cvName}).first();
  await expect(cv).toBeVisible({timeout: 10_000});
  await cv.click();
}

async function confirmPendingConnection(page: Page, expectedCount: number): Promise<void> {
  const saveResponse = page.waitForResponse(response =>
    response.url().includes('/rest/v1/patch_connections')
    && response.request().method() === 'POST', {timeout: 20_000});

  const confirm = page.locator('app-brand-primary-button', {hasText: /Confirm connection/i}).last();
  await expect(confirm).toBeVisible({timeout: 10_000});
  await confirm.click();

  await expect(page.getByText(/recorded/i).first()).toBeVisible({timeout: 10_000});
  const response = await saveResponse;
  expect(response.ok(), `patch_connections POST failed (${ response.status() }): ${ await response.text() }`).toBe(true);
  await expectPatchConnectionCount(page, expectedCount);
}

async function expectPatchConnectionCount(page: Page, expectedCount: number): Promise<void> {
  await expect(page.getByText(new RegExp(`Patch connections \\(${ expectedCount }\\)`, 'i')).first()).toBeVisible({
    timeout: 20_000
  });
}

async function expectDuplicateConnectionRejected(page: Page): Promise<void> {
  const selectionPanel = page.locator('.panel-card').filter({hasText: /Your selection/i}).last();
  const duplicateNotice = page.getByText(/already in this patch/i).first();
  const confirm = selectionPanel.locator('app-brand-primary-button', {hasText: /Confirm connection/i}).last();
  if (await confirm.isVisible().catch(() => false)) {
    await confirm.click();
    await expect(duplicateNotice).toBeVisible({timeout: 10_000});
    return;
  }

  await expect(selectionPanel).toBeVisible({timeout: 10_000});
  await expect(selectionPanel.getByRole('button', {name: /^Recorded$/i}).first()).toBeVisible({timeout: 10_000});
  await expect(confirm).toBeHidden();
}

async function readPatchPersistence(
  page: Page,
  patchId: number,
  moduleId: number
): Promise<{instances: PersistedPatchModuleInstance[]; connections: PersistedPatchConnection[]}> {
  const result = await page.evaluate(async ({patchId: pId, moduleId: mId, supabaseUrl, anonKey}) => {
    const lsKey = Object.keys(localStorage).find(key => key.includes('auth-token'));
    if (!lsKey) {
      return {status: 'missing auth token', instances: [], connections: []};
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
      return {status: 'missing access token', instances: [], connections: []};
    }
    if (!anonKey) {
      return {status: 'missing anon key', instances: [], connections: []};
    }

    const headers: Record<string, string> = {
      Authorization: `Bearer ${ accessToken }`,
      apikey: anonKey
    };
    const [instancesResponse, connectionsResponse] = await Promise.all([
      fetch(
        `${ supabaseUrl }/rest/v1/patch_module_instances?select=${ encodeURIComponent('id,instance_label') }&patch_id=eq.${ pId }&module_id=eq.${ mId }&order=id.asc`,
        {headers}
      ),
      fetch(
        `${ supabaseUrl }/rest/v1/patch_connections?select=${ encodeURIComponent('ordinal,instance_id_a,instance_id_b') }&patchid=eq.${ pId }&order=ordinal.asc`,
        {headers}
      )
    ]);

    if (!instancesResponse.ok) {
      return {status: `instances read failed ${ instancesResponse.status }`, instances: [], connections: []};
    }
    if (!connectionsResponse.ok) {
      return {status: `connections read failed ${ connectionsResponse.status }`, instances: [], connections: []};
    }

    return {
      status: 'ok',
      instances: await instancesResponse.json() as PersistedPatchModuleInstance[],
      connections: await connectionsResponse.json() as PersistedPatchConnection[]
    };
  }, {patchId, moduleId, supabaseUrl: SUPABASE_URL, anonKey: SUPABASE_ANON_KEY});

  if (result.status !== 'ok') {
    throw new Error(`Unable to read patch persistence for multi-instance E2E: ${ result.status }`);
  }

  return {
    instances: result.instances,
    connections: result.connections
  };
}

function collectionModuleCardWithLabel(page: Page, moduleName: string, label: string): Locator {
  return collectionModuleCards(page, moduleName).filter({
    has: page.locator('.instance-suffix', {hasText: label})
  }).first();
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
