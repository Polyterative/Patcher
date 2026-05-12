import {
  expect,
  type Page
} from '@playwright/test';


export interface PreparedLinkedRackScenario {
  rackUrl: string;
  rackId: number;
  patchUrl: string;
  patchId: number;
}

/**
 * Creates the full scenario needed for linked-rack patch editing:
 *
 * 1. Creates a rack
 * 2. Adds modules from the module browser (picks first 3 available)
 * 3. Creates a patch linked to that rack
 * 4. Returns URLs/IDs for the created resources
 */
export async function ensureLinkedRackScenario(page: Page): Promise<PreparedLinkedRackScenario> {
  // Step 1: Create rack and add modules via module browser UI
  const {rackUrl, rackId} = await ensureRackWithModules(page);

  // Step 2: Create patch linked to rack
  const {patchUrl, patchId} = await ensurePatchLinkedToRack(page, rackId);

  return {rackUrl, rackId, patchUrl, patchId};
}

/**
 * Cleans up entities created by ensureLinkedRackScenario.
 * Best-effort — won't fail the test if cleanup fails.
 */
export async function cleanupLinkedRackScenario(page: Page, scenario: PreparedLinkedRackScenario): Promise<void> {
  try {
    // Delete patch first (it references the rack)
    await deletePatchById(page, scenario.patchId);
  } catch { /* best-effort */ }

  try {
    await deleteRackById(page, scenario.rackUrl);
  } catch { /* best-effort */ }
}

// --- Rack creation ---

async function ensureRackWithModules(page: Page): Promise<{ rackUrl: string; rackId: number }> {
  await page.goto('/user/area');
  await expect(page).toHaveURL(/\/user\/area/, {timeout: 20_000});

  const createRackBtn = page.locator('app-user-racks app-brand-primary-button', {hasText: /create rack/i}).first();
  await expect(createRackBtn).toBeVisible({timeout: 15_000});
  await createRackBtn.click();

  const dialog = page.locator('mat-dialog-container').last();
  await expect(dialog).toBeVisible({timeout: 10_000});

  const nameInput = dialog.locator('input').first();
  await nameInput.fill(`[E2E] linked-rack ${Date.now().toString().slice(-6)}`);

  // Set private
  await setDialogPrivacy(page, false);

  const createResponse = page.waitForResponse(
    r => r.url().includes('/rest/v1/racks') && r.request().method() === 'POST' && r.ok(),
    {timeout: 15_000}
  );

  const confirmBtn = page.locator('mat-dialog-actions app-brand-primary-button', {hasText: /create/i}).first();
  await expect(confirmBtn).toBeVisible({timeout: 10_000});
  await confirmBtn.click();

  const payload = await (await createResponse).json();
  const rackId = Array.isArray(payload) ? payload[0]?.id : payload?.id;
  expect(rackId).toBeTruthy();

  const rackUrl = `/racks/details/${rackId}`;
  await page.goto(rackUrl);
  await expect(page).toHaveURL(new RegExp(`/racks/details/${rackId}`), {timeout: 15_000});
  await expect(page.locator('app-rack-editor')).toBeVisible({timeout: 15_000});

  // Enter edit mode
  await enterRackEditMode(page);

  // Add 3 modules from the "All modules" browse mode
  await addModulesFromBrowser(page, 3);

  // Lock rack
  await lockRack(page);

  return {rackUrl, rackId};
}

/**
 * Uses the module browser to add N modules to the rack.
 * Switches to "All modules" mode, then clicks the first available cards.
 */
async function addModulesFromBrowser(page: Page, count: number): Promise<void> {
  const moduleBrowser = page.locator('app-module-browser-root');
  await expect(moduleBrowser).toBeVisible({timeout: 15_000});

  // Scroll the module browser into view
  await moduleBrowser.scrollIntoViewIfNeeded();
  await page.waitForTimeout(2000);

  // Switch to "All modules" browse mode
  const allModulesBtn = page.locator('.module-browser-mode__button', {hasText: /All modules/i}).first();
  if (await allModulesBtn.isVisible({timeout: 8_000}).catch(() => false)) {
    await allModulesBtn.click();
    await page.waitForTimeout(1500);
  }

  // Wait for module cards to load
  const moduleCards = moduleBrowser.locator('lib-clean-card');
  await expect(moduleCards.first()).toBeVisible({timeout: 20_000});

  // Click the "Add to rack" button on each card
  for (let i = 0; i < count; i++) {
    const card = moduleCards.nth(i);
    if (!(await card.isVisible().catch(() => false))) break;

    // Scroll the card into view
    await card.scrollIntoViewIfNeeded();

    // Find the "Add to rack" button (playlist_add icon)
    const addBtn = card.locator('button[mattooltip*="Add to"]').first();
    if (!(await addBtn.isVisible({timeout: 5_000}).catch(() => false))) {
      // Try icon-based selector
      const iconBtn = card.locator('button:has(mat-icon:text("playlist_add"))').first();
      if (!(await iconBtn.isVisible({timeout: 3_000}).catch(() => false))) continue;
      
      const addResponse = page.waitForResponse(
        r => r.url().includes('/rest/v1/rack_modules') && r.request().method() === 'POST',
        {timeout: 15_000}
      );
      await iconBtn.click();
      await addResponse;
    } else {
      const addResponse = page.waitForResponse(
        r => r.url().includes('/rest/v1/rack_modules') && r.request().method() === 'POST',
        {timeout: 15_000}
      );
      await addBtn.click();
      await addResponse;
    }
    await page.waitForTimeout(1200);
  }
}

async function enterRackEditMode(page: Page): Promise<void> {
  const moduleBrowser = page.locator('app-module-browser-root');
  if (await moduleBrowser.isVisible().catch(() => false)) return;

  const editBtn = page.getByRole('button', {name: /^Edit rack$/i}).first();
  const mobileEditBtn = page.locator('app-rack-editor .rackEditorResponsiveActions button', {hasText: /^Edit rack$/i}).first();

  if (await editBtn.isVisible().catch(() => false)) {
    await editBtn.click();
  } else if (await mobileEditBtn.isVisible().catch(() => false)) {
    await mobileEditBtn.click();
  }

  await expect(moduleBrowser).toBeVisible({timeout: 10_000});
}

async function lockRack(page: Page): Promise<void> {
  const lockBtn = page.getByRole('button', {name: /^Lock rack$/i}).first();
  const mobileLockBtn = page.locator('app-rack-editor .rackEditorResponsiveActions button', {hasText: /^Lock rack$/i}).first();

  if (await lockBtn.isVisible().catch(() => false)) {
    await lockBtn.click();
  } else if (await mobileLockBtn.isVisible().catch(() => false)) {
    await mobileLockBtn.click();
  }

  await expect(page.getByRole('button', {name: /^Edit rack$/i}).first()).toBeVisible({timeout: 10_000});
}

// --- Patch creation with linked rack ---

async function ensurePatchLinkedToRack(page: Page, rackId: number): Promise<{ patchUrl: string; patchId: number }> {
  await page.goto('/user/area');
  await expect(page.locator('app-user-patches')).toBeVisible({timeout: 20_000});

  const createPatchBtn = page.locator('app-user-patches app-brand-primary-button', {hasText: /create patch/i}).first();
  await expect(createPatchBtn).toBeVisible({timeout: 15_000});
  await createPatchBtn.click();

  const dialog = page.locator('mat-dialog-container').last();
  await expect(dialog).toBeVisible({timeout: 10_000});

  // Select the linked rack in the combobox
  const rackCombobox = dialog.getByRole('combobox', {name: /choose linked rack/i}).first();
  if (await rackCombobox.isVisible({timeout: 5_000}).catch(() => false)) {
    await rackCombobox.click({force: true});
    // Wait for options to load
    await page.waitForTimeout(1500);

    // Find the option matching our rack (it starts with "[E2E]")
    const option = page.locator('mat-option', {hasText: /\[E2E\] linked-rack/i}).first();
    if (await option.isVisible({timeout: 5_000}).catch(() => false)) {
      await option.click();
      await page.waitForTimeout(500);
    }
  }

  const createResponse = page.waitForResponse(
    r => r.url().includes('/rest/v1/patches') && r.request().method() === 'POST' && r.ok(),
    {timeout: 15_000}
  );

  const confirmBtn = dialog.getByRole('button', {name: /^Create$/i}).first();
  if (await confirmBtn.isVisible().catch(() => false)) {
    await confirmBtn.click();
  } else {
    await dialog.locator('app-brand-primary-button', {hasText: /create/i}).first().click();
  }

  const payload = await (await createResponse).json();
  const patchId = Array.isArray(payload) ? payload[0]?.id : payload?.id;
  expect(patchId).toBeTruthy();

  await expect(dialog).toBeHidden({timeout: 20_000});

  const patchUrl = `/patches/details/${patchId}`;
  return {patchUrl, patchId};
}

// --- Cleanup ---

async function deletePatchById(page: Page, patchId: number): Promise<void> {
  await page.goto(`/patches/details/${patchId}`);
  await page.waitForTimeout(3000);

  const deleteBtn = page.locator('button[mattooltip*="elete"]').first();
  if (await deleteBtn.isVisible({timeout: 5_000}).catch(() => false)) {
    await deleteBtn.click();
    const confirmBtn = page.locator('mat-dialog-actions button, mat-dialog-actions app-brand-primary-button')
      .filter({hasText: /delete|confirm|yes/i}).first();
    if (await confirmBtn.isVisible({timeout: 5_000}).catch(() => false)) {
      await confirmBtn.click();
      await page.waitForTimeout(2000);
    }
  }
}

async function deleteRackById(page: Page, rackUrl: string): Promise<void> {
  await page.goto(rackUrl);
  await page.waitForTimeout(3000);

  // Enter edit mode to access delete
  await enterRackEditMode(page).catch(() => {});

  const deleteBtn = page.locator('button[mattooltip="Delete rack"]').first();
  if (await deleteBtn.isVisible({timeout: 5_000}).catch(() => false)) {
    await deleteBtn.click();
    const confirmBtn = page.locator('mat-dialog-actions button, mat-dialog-actions app-brand-primary-button')
      .filter({hasText: /delete|confirm|yes/i}).first();
    if (await confirmBtn.isVisible({timeout: 5_000}).catch(() => false)) {
      await confirmBtn.click();
      await page.waitForTimeout(2000);
    }
  }
}

// --- Shared helpers ---

async function setDialogPrivacy(page: Page, shouldBePublic: boolean): Promise<void> {
  const actions = page.locator('mat-dialog-actions').last();
  await expect(actions).toBeVisible({timeout: 5_000});

  const toggle = actions.locator('mat-slide-toggle').first();
  await expect(toggle).toBeVisible({timeout: 5_000});

  const currentIcon = ((await actions.locator('mat-icon').first().textContent()) ?? '').trim();
  const isCurrentlyPublic = currentIcon === 'public';

  if (isCurrentlyPublic !== shouldBePublic) {
    const toggleInput = actions.locator('input[type="checkbox"]').first();
    if (await toggleInput.isVisible().catch(() => false)) {
      await toggleInput.click({force: true});
    } else {
      await toggle.click();
    }
  }

  await expect(
    actions.locator('mat-icon', {hasText: shouldBePublic ? 'public' : 'lock'}).first()
  ).toBeVisible({timeout: 5_000});
}
