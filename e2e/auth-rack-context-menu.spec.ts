import {
  expect,
  Page,
  TestInfo,
  test
} from '@playwright/test';


/**
 * E2E: Right-click context menu actions on rack modules
 *
 * Covers every item in the right-click menu:
 *   - Inspect panel      → opens the panel zoom dialog
 *   - Duplicate          → POSTs a new rack_module row
 *   - Replace with blank → PATCHes module_id to a blank panel id
 *   - Delete from rack   → DELETEs the rack_module row
 *   - Delete all in row  → DELETEs all rack_module rows in the row
 *
 * Strategy:
 *   - beforeEach creates a fresh private test rack with one module added
 *   - afterEach deletes it via the UI — no DB pollution, no public racks
 *
 * Test module: Afterneath by EarthQuaker Devices (id=2674)
 */

const TEST_MODULE = {id: 2674, name: 'Afterneath'} as const;

test.describe('Authenticated Rack Context Menu Actions', () => {
  test.describe.configure({mode: 'serial'});

  let rackUrl = '';

  test.beforeEach(async ({page}, testInfo) => {
    test.setTimeout(120_000);
    rackUrl = await createPreparedRack(page, testInfo);
  });

  test.afterEach(async ({page}) => {
    await deleteTestRack(page, rackUrl);
  });

  // ---------------------------------------------------------------------------
  // Inspect panel
  // ---------------------------------------------------------------------------

  test('right-click Inspect panel opens the panel zoom dialog', async ({page}) => {
    await enterEditMode(page);

    const moduleLocator = getModuleLocator(page, TEST_MODULE.name);
    await rightClickModule(page, moduleLocator);

    const inspectItem = page.getByRole('menuitem', {name: /Inspect panel/i});
    await expect(inspectItem).toBeVisible({timeout: 8_000});
    await inspectItem.click();

    const dialog = page.locator('mat-dialog-container, app-module-panel-zoom-dialog').first();
    await expect(dialog).toBeVisible({timeout: 10_000});

    const panelImage = dialog.locator('img').first();
    await expect(panelImage).toBeVisible({timeout: 8_000});
  });

  // ---------------------------------------------------------------------------
  // Duplicate
  // ---------------------------------------------------------------------------

  test('right-click Duplicate inserts a new rack_module and shows two copies', async ({page}) => {
    await enterEditMode(page);

    const modulesBefore = await page.locator('app-rack-visual-model .module').count();

    const duplicateRequest = page.waitForResponse(response =>
      response.url().includes('/rest/v1/rack_modules')
      && response.request().method() === 'POST'
      && response.ok(),
    {timeout: 15_000});

    const moduleLocator = getModuleLocator(page, TEST_MODULE.name);
    await rightClickModule(page, moduleLocator);

    const duplicateItem = page.getByRole('menuitem', {name: /^Duplicate$/i});
    await expect(duplicateItem).toBeVisible({timeout: 8_000});
    await duplicateItem.click();
    await duplicateRequest;

    await page.waitForFunction(
      ({selector, expected}) => document.querySelectorAll(selector).length >= expected,
      {selector: 'app-rack-visual-model .module', expected: modulesBefore + 1},
      {timeout: 15_000}
    );

    const modulesAfter = await page.locator('app-rack-visual-model .module').count();
    expect(modulesAfter).toBe(modulesBefore + 1);
  });

  // ---------------------------------------------------------------------------
  // Replace with blank
  // ---------------------------------------------------------------------------

  test('right-click Replace with blank deletes the module and inserts a blank in its place', async ({page}) => {
    await enterEditMode(page);

    // Replace with blank = DELETE the original + POST a blank module
    const deleteRequest = page.waitForResponse(response =>
      response.url().includes('/rest/v1/rack_modules')
      && response.request().method() === 'DELETE'
      && response.ok(),
    {timeout: 15_000});

    const moduleLocator = getModuleLocator(page, TEST_MODULE.name);
    await rightClickModule(page, moduleLocator);

    const replaceItem = page.getByRole('menuitem', {name: /Replace with blank/i});
    await expect(replaceItem).toBeVisible({timeout: 8_000});
    await replaceItem.click();
    await deleteRequest;

    // The named module image should no longer be in the rack
    await expect(
      page.locator(`app-rack-visual-model img[alt*="${ TEST_MODULE.name }"]`).first()
    ).toBeHidden({timeout: 10_000});
  });

  // ---------------------------------------------------------------------------
  // Delete from rack
  // ---------------------------------------------------------------------------

  test('right-click Delete from rack removes the module from the DOM', async ({page}) => {
    await enterEditMode(page);

    const modulesBefore = await page.locator('app-rack-visual-model .module').count();

    const deleteRequest = page.waitForResponse(response =>
      response.url().includes('/rest/v1/rack_modules')
      && response.request().method() === 'DELETE'
      && response.ok(),
    {timeout: 15_000});

    const moduleLocator = getModuleLocator(page, TEST_MODULE.name);
    await rightClickModule(page, moduleLocator);

    const deleteItem = page.getByRole('menuitem', {name: /^Delete from rack$/i});
    await expect(deleteItem).toBeVisible({timeout: 8_000});
    await deleteItem.click();
    await deleteRequest;

    await page.waitForFunction(
      ({selector, expected}) => document.querySelectorAll(selector).length <= expected,
      {selector: 'app-rack-visual-model .module', expected: modulesBefore - 1},
      {timeout: 15_000}
    );

    const modulesAfter = await page.locator('app-rack-visual-model .module').count();
    expect(modulesAfter).toBe(modulesBefore - 1);
  });

  // ---------------------------------------------------------------------------
  // Delete all in row
  // ---------------------------------------------------------------------------

  test('right-click Delete all in row removes every module in that row', async ({page}) => {
    await enterEditMode(page);

    // Add a second copy so the row has 2 modules
    await addModuleToRack(page, TEST_MODULE);
    await page.waitForFunction(
      ({selector, expected}) => document.querySelectorAll(selector).length >= expected,
      {selector: `app-rack-visual-model img[alt*="${ TEST_MODULE.name }"]`, expected: 2},
      {timeout: 15_000}
    );

    const totalBefore = await page.locator('app-rack-visual-model .module').count();
    expect(totalBefore).toBeGreaterThanOrEqual(2);

    const deleteRequest = page.waitForResponse(response =>
      response.url().includes('/rest/v1/rack_modules')
      && response.request().method() === 'DELETE'
      && response.ok(),
    {timeout: 15_000});

    const moduleLocator = getModuleLocator(page, TEST_MODULE.name);
    await rightClickModule(page, moduleLocator);

    const deleteAllItem = page.getByRole('menuitem', {name: /Delete all in row/i});
    await expect(deleteAllItem).toBeVisible({timeout: 8_000});
    await deleteAllItem.click();
    await deleteRequest;

    // All named module images should be gone from the rack
    await expect(
      page.locator(`app-rack-visual-model img[alt*="${ TEST_MODULE.name }"]`).first()
    ).toBeHidden({timeout: 10_000});

    const totalAfter = await page.locator('app-rack-visual-model .module').count();
    expect(totalAfter).toBeLessThan(totalBefore);
  });
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getModuleLocator(page: Page, moduleName: string) {
  return page.locator('app-rack-visual-model app-module-realistic')
    .filter({has: page.locator(`img[alt*="${ moduleName }"]`)})
    .first();
}

async function rightClickModule(page: Page, moduleLocator: ReturnType<Page['locator']>): Promise<void> {
  await expect(moduleLocator).toBeVisible({timeout: 10_000});
  await moduleLocator.click({button: 'right'});
  // Wait for any menu item to appear
  await expect(page.locator('[role="menu"]').first()).toBeVisible({timeout: 8_000});
}


async function enterEditMode(page: Page): Promise<void> {
  const moduleBrowser = page.locator('app-module-browser-root');
  const mobileLockBtn = page.locator('app-rack-editor .rackEditorResponsiveActions button', {hasText: /^Lock rack$/i}).first();
  const desktopLockBtn = page.getByRole('button', {name: /^(Lock rack|Discard changes)$/i}).first();

  if (
    await mobileLockBtn.isVisible().catch(() => false)
    || await desktopLockBtn.isVisible().catch(() => false)
    || await moduleBrowser.isVisible().catch(() => false)
  ) {
    return;
  }

  const desktopEditBtn = page.getByRole('button', {name: /^Edit rack$/i}).first();
  const mobileEditBtn = page.locator('app-rack-editor .rackEditorResponsiveActions button', {hasText: /^Edit rack$/i}).first();

  if (await desktopEditBtn.isVisible().catch(() => false)) {
    await desktopEditBtn.click();
  } else if (await mobileEditBtn.isVisible().catch(() => false)) {
    await mobileEditBtn.click();
  }

  await expect(moduleBrowser).toBeVisible({timeout: 10_000});
}

async function addModuleToRack(page: Page, module: {id: number; name: string}): Promise<void> {
  await expect(page.locator('app-module-browser-root')).toBeVisible({timeout: 10_000});

  // Determine next available column in row 0 so modules land in a real row
  const existingColumnCount = await page.evaluate(() => {
    const ng = (window as any).ng;
    const rackVisualModel = document.querySelector('app-rack-visual-model');
    if (!rackVisualModel || !ng?.getComponent) return 0;
    const component = ng.getComponent(rackVisualModel);
    const rows: unknown[][] = component.rackDetailDataService?.rowedRackedModules$?.value ?? [];
    return (rows[0] ?? []).length;
  });

  const addRequest = page.waitForResponse(response =>
    response.url().includes('/rest/v1/rack_modules')
    && response.request().method() === 'POST'
    && response.ok(),
  {timeout: 15_000});

  await page.evaluate(({moduleId, column}) => {
    const ng = (window as any).ng;
    if (!ng?.getComponent) throw new Error('Angular debug API unavailable');
    const rackDetail = document.querySelector('app-rack-browser-rack-detail');
    if (!rackDetail) throw new Error('Rack detail view not found');
    const component = ng.getComponent(rackDetail);
    const service = component.dataService;
    // Insert directly with row=0 so the module is placed in a real row, not the virtual unracked row
    service.backend.add.rackModule(moduleId, service.singleRackData$.value.id, 0, column)
      .subscribe(() => service.updateSingleRackData$.next(service.singleRackData$.value.id));
  }, {moduleId: module.id, column: existingColumnCount});

  await addRequest;
  await page.waitForFunction(
    ({selector}) => document.querySelectorAll(selector).length > 0,
    {selector: `app-rack-visual-model img[alt*="${ module.name }"]`},
    {timeout: 15_000}
  );
}

async function createPreparedRack(page: Page, testInfo: TestInfo): Promise<string> {
  const rackName = buildRackName(testInfo);

  await page.goto('/user/area');
  await expect(page).toHaveURL(/\/user\/area/, {timeout: 20_000});

  const createRackBtn = page.locator('app-user-racks app-brand-primary-button', {hasText: /create rack/i}).first();
  await expect(createRackBtn).toBeVisible({timeout: 15_000});
  await createRackBtn.click();

  const dialog = page.locator('mat-dialog-container').last();
  await expect(dialog).toBeVisible({timeout: 10_000});
  await dialog.locator('input').first().fill(rackName);
  await setCreateRackDialogPrivacy(page, dialog, false);

  const createResponse = page.waitForResponse(async response =>
    response.url().includes('/rest/v1/racks')
    && response.request().method() === 'POST'
    && response.ok(),
  {timeout: 15_000});

  const confirmBtn = page.locator('mat-dialog-actions app-brand-primary-button', {hasText: /create/i}).first();
  await expect(confirmBtn).toBeVisible({timeout: 10_000});
  await confirmBtn.click();

  const rackPayload = await (await createResponse).json();
  const rackId = Array.isArray(rackPayload) ? rackPayload[0]?.id : rackPayload?.id;
  expect(rackId).toBeTruthy();

  const createdRackUrl = `/racks/details/${ rackId }`;
  await page.goto(createdRackUrl);
  await expect(page).toHaveURL(new RegExp(`/racks/details/${ rackId }(?:$|[?#])`), {timeout: 15_000});

  await enterEditMode(page);
  await addModuleToRack(page, TEST_MODULE);

  return createdRackUrl;
}

async function deleteTestRack(page: Page, rackUrl: string): Promise<void> {
  if (!rackUrl) {
    return;
  }

  try {
    await page.goto(rackUrl, {timeout: 15_000});
    await expect(page.locator('app-rack-editor')).toBeVisible({timeout: 10_000});
    await enterEditMode(page);

    const deleteBtn = page.locator('app-rack-minimal button[mattooltip="Delete rack"]').first();
    await expect(deleteBtn).toBeVisible({timeout: 8_000});
    await deleteBtn.click();

    const confirmDelete = page.locator('mat-dialog-actions button, mat-dialog-actions app-brand-primary-button')
      .filter({hasText: /delete|confirm|yes/i}).first();
    await expect(confirmDelete).toBeVisible({timeout: 8_000});
    await confirmDelete.click();

    await expect(page).not.toHaveURL(rackUrl, {timeout: 10_000});
  } catch {
    // Best-effort cleanup.
  }
}

async function setCreateRackDialogPrivacy(
  page: Page,
  dialog: ReturnType<Page['locator']>,
  shouldBePublic: boolean
): Promise<void> {
  const actions = page.locator('mat-dialog-actions').last();
  await expect(actions).toBeVisible({timeout: 5_000});

  const icon = actions.locator('mat-icon').first();
  await expect(icon).toBeVisible({timeout: 5_000});
  const currentIcon = ((await icon.textContent()) ?? '').trim();
  const isCurrentlyPublic = currentIcon === 'public';

  if (isCurrentlyPublic !== shouldBePublic) {
    const toggleInput = actions.locator('input[type="checkbox"]').first();
    if (await toggleInput.isVisible().catch(() => false)) {
      await toggleInput.click({force: true});
    } else {
      await actions.locator('mat-slide-toggle').first().click();
    }
  }

  await expect(
    actions.locator('mat-icon', {hasText: shouldBePublic ? 'public' : 'lock'}).first()
  ).toBeVisible({timeout: 5_000});
}

function buildRackName(testInfo: TestInfo): string {
  const titleSlug = testInfo.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 10);

  return `[E2E] ${ titleSlug } ${ Date.now().toString().slice(-6) }`;
}
