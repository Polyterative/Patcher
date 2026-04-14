import {
  expect,
  test
} from '@playwright/test';


/**
 * E2E: Rack module panel switching
 *
 * Strategy:
 * - beforeEach creates a dedicated private test rack named "[E2E] Panel Switch Test"
 * - afterEach deletes it via the UI delete button — no DB pollution, no public racks
 *
 * Test module: Belgrad by XAOC Devices (id=371, 2 panels)
 * Active panel has " ✓" appended to its label.
 */
test.describe('Authenticated Rack Panel Switching', () => {

  const TEST_RACK_NAME = '[E2E] Panel Switch Test';

  /** Creates a fresh private test rack, returns its URL. Already in edit mode on return. */
  async function createPrivateTestRack(page: any): Promise<string> {
    await page.goto('/user/area');
    await expect(page).toHaveURL(/\/user\/area/, {timeout: 20_000});

    const createRackBtn = page.locator('app-user-racks app-brand-primary-button', {hasText: /create rack/i}).first();
    await expect(createRackBtn).toBeVisible({timeout: 15_000});
    await createRackBtn.click();

    await expect(page.getByRole('heading', {name: /create new rack/i})).toBeVisible({timeout: 10_000});

    // Set the rack name so we can reliably identify and delete it later
    const nameInput = page.locator('mat-dialog-container input').first();
    await nameInput.fill('');
    await nameInput.fill(TEST_RACK_NAME);

    const confirmBtn = page.locator('mat-dialog-actions app-brand-primary-button', {hasText: /create/i}).first();
    await expect(confirmBtn).toBeVisible({timeout: 10_000});
    await confirmBtn.click();

    // Wait for the new card to appear and click it
    const newRackCard = page.locator('app-user-racks app-hero-clickable-title .title', {hasText: TEST_RACK_NAME}).first();
    await expect(newRackCard).toBeVisible({timeout: 15_000});
    await newRackCard.click();

    await expect(page).toHaveURL(/\/racks\/details\/\d+/, {timeout: 15_000});
    const rackUrl = page.url();

    // Enter edit mode
    const editBtn = page.getByRole('button', {name: /^Edit rack$/i}).first();
    if (await editBtn.isVisible().catch(() => false)) {
      await editBtn.click();
    }
    await expect(page.getByRole('button', {name: /^(Lock rack|Discard changes)$/i}).first()).toBeVisible({timeout: 10_000});
    
    // New racks now default to private, so only toggle when the rack is still public.
    const privacyBtn = page.locator('app-rack-minimal button').filter({hasText: /^(public|lock)$/i}).first();
    await expect(privacyBtn).toBeVisible({timeout: 5_000});
    const privacyIcon = privacyBtn.locator('mat-icon').first();
    await expect(privacyIcon).toBeVisible({timeout: 5_000});
    const privacyIconName = ((await privacyIcon.textContent()) ?? '').trim();
    if (privacyIconName === 'public') {
      await privacyBtn.click();
    }
    await expect(privacyBtn.locator('mat-icon', {hasText: 'lock'})).toBeVisible({timeout: 5_000});

    return rackUrl;
  }

  /** Deletes the test rack via the UI delete button. Call from afterEach. */
  async function deleteTestRack(page: any, rackUrl: string) {
    try {
      await page.goto(rackUrl, {timeout: 15_000});
      await expect(page.locator('app-rack-visual-model')).toBeVisible({timeout: 10_000});

      // Ensure edit mode so the delete button is enabled
      const editBtn = page.getByRole('button', {name: /^Edit rack$/i}).first();
      if (await editBtn.isVisible().catch(() => false)) {
        await editBtn.click();
      }
      await expect(page.getByRole('button', {name: /^(Lock rack|Discard changes)$/i}).first()).toBeVisible({timeout: 10_000});

      // Click the delete button (matTooltip="Delete rack")
      const deleteBtn = page.locator('button[mattooltip="Delete rack"]').first();
      await expect(deleteBtn).toBeVisible({timeout: 5_000});
      await deleteBtn.click();

      // Confirm the deletion dialog
      const confirmDelete = page.locator('mat-dialog-actions button, mat-dialog-actions app-brand-primary-button')
        .filter({hasText: /delete|confirm|yes/i}).first();
      await expect(confirmDelete).toBeVisible({timeout: 8_000});
      await confirmDelete.click();

      // Should redirect away from the rack after deletion
      await expect(page).not.toHaveURL(rackUrl, {timeout: 10_000});
    } catch {
      // Best-effort cleanup — don't fail the test if teardown has issues
    }
  }

  let rackUrl = '';

  test.beforeEach(async ({page}) => {
    rackUrl = await createPrivateTestRack(page);
  });

  test.afterEach(async ({page}) => {
    await deleteTestRack(page, rackUrl);
  });

  test('right-click panel switch changes module panel and persists after reload', async ({page}) => {
    // Add Belgrad (multi-panel module) via the module browser
    const browser = page.locator('app-module-browser-root');
    await expect(browser).toBeVisible({timeout: 10_000});
    const nameInput = browser.locator('input').first();
    await nameInput.fill('Belgrad');
    const belgradCard = browser.locator('app-module-minimal', {hasText: /Belgrad/i}).first();
    await expect(belgradCard).toBeVisible({timeout: 15_000});
    await belgradCard.locator('button').last().click();

    // Wait for DB sync, then reload so the module has a persisted id
    await page.waitForTimeout(2_500);
    await page.goto(rackUrl);
    await expect(page.locator('app-rack-visual-model')).toBeVisible({timeout: 15_000});
    const editBtnReload = page.getByRole('button', {name: /^Edit rack$/i}).first();
    if (await editBtnReload.isVisible().catch(() => false)) {
      await editBtnReload.click();
    }
    await expect(page.getByRole('button', {name: /^(Lock rack|Discard changes)$/i}).first()).toBeVisible({timeout: 10_000});

    // --- Phase 1: read current panel state ---
    const belgradInRack = page.locator('app-rack-visual-model app-module-realistic')
      .filter({has: page.locator('img[alt*="Belgrad"]')}).first();
    await expect(belgradInRack).toBeVisible({timeout: 10_000});
    await belgradInRack.click({button: 'right'});

    const switchPanelTrigger = page.locator('button[mat-menu-item]', {hasText: /Switch panel/i});
    await expect(switchPanelTrigger).toBeVisible({timeout: 8_000});
    await switchPanelTrigger.click();

    const panel1Item = page.locator('button[mat-menu-item]', {hasText: /Panel 1/i});
    const panel2Item = page.locator('button[mat-menu-item]', {hasText: /Panel 2|Dark/i});
    await expect(panel1Item).toBeVisible({timeout: 5_000});
    await expect(panel2Item).toBeVisible({timeout: 5_000});

    const panel1Active = ((await panel1Item.textContent()) ?? '').includes('✓');

    // Switch to the OTHER panel
    if (panel1Active) {
      await panel2Item.click();
    } else {
      await panel1Item.click();
    }

    // Wait for backend persist
    await page.waitForTimeout(2_500);

    // --- Phase 2: reload and verify persistence ---
    await page.goto(rackUrl);
    await expect(page.locator('app-rack-visual-model')).toBeVisible({timeout: 15_000});
    const editBtnAfterReload = page.getByRole('button', {name: /^Edit rack$/i}).first();
    if (await editBtnAfterReload.isVisible().catch(() => false)) {
      await editBtnAfterReload.click();
    }
    await expect(page.getByRole('button', {name: /^(Lock rack|Discard changes)$/i}).first()).toBeVisible({timeout: 10_000});

    const belgradAfterReload = page.locator('app-rack-visual-model app-module-realistic')
      .filter({has: page.locator('img[alt*="Belgrad"]')}).first();
    await expect(belgradAfterReload).toBeVisible({timeout: 10_000});
    await belgradAfterReload.click({button: 'right'});

    const switchPanelAfterReload = page.locator('button[mat-menu-item]', {hasText: /Switch panel/i});
    await expect(switchPanelAfterReload).toBeVisible({timeout: 8_000});
    await switchPanelAfterReload.click();

    const expectedActiveLabel = panel1Active ? /Panel 2.*✓|Dark.*✓/i : /Panel 1.*✓/i;
    const expectedInactiveLabel = panel1Active ? /Panel 1(?!.*✓)/i : /Panel 2(?!.*✓)|Dark(?!.*✓)/i;

    await expect(page.locator('button[mat-menu-item]', {hasText: expectedActiveLabel})).toBeVisible({timeout: 8_000});
    await expect(page.locator('button[mat-menu-item]', {hasText: expectedInactiveLabel})).toBeVisible({timeout: 5_000});
  });
});