import {
  expect,
  test
} from '@playwright/test';

/**
 * E2E: Rack module panel switching
 *
 * Covers:
 * - "Switch panel" context-menu items appear for multi-panel modules
 * - Clicking a panel variant updates the displayed panel
 * - The selection persists after a full page reload
 *
 * Test module: Belgrad by XAOC Devices (id=371, 2 panels)
 *   Panel 1 (id=8)  – label "Panel 1"  (no description in DB, fallback label)
 *   Panel 2 (id=12) – label "Panel 2"
 * Active panel has " ✓" appended to its label.
 *
 * The test is state-independent: it reads the current active panel, switches
 * to the OTHER panel, reloads, and verifies the switch persisted. This means
 * it works correctly even if a previous run left the rack with Panel 2 selected.
 */
test.describe('Authenticated Rack Panel Switching', () => {

  async function openRackInEditMode(page: any): Promise<string> {
    await page.goto('/user/area');
    await expect(page).toHaveURL(/\/user\/area/, {timeout: 20_000});

    const rackCards = page.locator('app-user-racks app-hero-clickable-title .title');
    const createRackBtn = page.locator('app-user-racks app-brand-primary-button', {hasText: /create rack/i}).first();

    if ((await rackCards.count()) === 0) {
      await expect(createRackBtn).toBeVisible({timeout: 15_000});
      await createRackBtn.click();
      await expect(page.getByRole('heading', {name: /create new rack/i})).toBeVisible({timeout: 10_000});
      const confirmBtn = page.locator('mat-dialog-actions app-brand-primary-button', {hasText: /create/i}).first();
      await expect(confirmBtn).toBeVisible({timeout: 10_000});
      await confirmBtn.click();
      await expect(rackCards.first()).toBeVisible({timeout: 15_000});
    }

    await rackCards.first().click();
    await expect(page).toHaveURL(/\/racks\/details\/\d+/, {timeout: 15_000});
    const rackUrl = page.url();

    const editBtn = page.getByRole('button', {name: /^Edit rack$/i}).first();
    if (await editBtn.isVisible().catch(() => false)) {
      await editBtn.click();
    }
    await expect(page.getByRole('button', {name: /^(Lock rack|Discard changes)$/i}).first()).toBeVisible({timeout: 10_000});

    return rackUrl;
  }

  async function ensureBelgradInRack(page: any) {
    const browser = page.locator('app-module-browser-root');
    await expect(browser).toBeVisible({timeout: 10_000});

    // Check if Belgrad is already in the rack
    const existingBelgrad = page.locator('app-rack-visual-model app-module-realistic')
      .filter({has: page.locator('img[alt*="Belgrad"]')})
      .first();

    if (await existingBelgrad.isVisible().catch(() => false)) {
      return; // Already in the rack
    }

    // Search for Belgrad in the module browser and add it
    const nameInput = browser.locator('input').first();
    await nameInput.fill('Belgrad');
    const belgradCard = browser.locator('app-module-minimal', {hasText: /Belgrad/i}).first();
    await expect(belgradCard).toBeVisible({timeout: 15_000});
    const addBtn = belgradCard.locator('button').last();
    await addBtn.click();

    // Wait for DB sync and reload so the module has a persisted id
    await page.waitForTimeout(2_500);
  }

  test('right-click panel switch changes module panel and persists after reload', async ({page}) => {
    const rackUrl = await openRackInEditMode(page);
    await ensureBelgradInRack(page);

    // If we added Belgrad, reload to get its DB-assigned id before switching panels
    await page.goto(rackUrl);
    await expect(page.locator('app-rack-visual-model')).toBeVisible({timeout: 15_000});
    const editBtnFirst = page.getByRole('button', {name: /^Edit rack$/i}).first();
    if (await editBtnFirst.isVisible().catch(() => false)) {
      await editBtnFirst.click();
    }
    await expect(page.getByRole('button', {name: /^(Lock rack|Discard changes)$/i}).first()).toBeVisible({timeout: 10_000});

    // --- Phase 1: determine current panel state ---
    const belgradInRack = page.locator('app-rack-visual-model app-module-realistic')
      .filter({has: page.locator('img[alt*="Belgrad"]')})
      .first();
    await expect(belgradInRack).toBeVisible({timeout: 10_000});
    await belgradInRack.click({button: 'right'});

    // Click "Switch panel" to open submenu
    const switchPanelTrigger = page.locator('button[mat-menu-item]', {hasText: /Switch panel/i});
    await expect(switchPanelTrigger).toBeVisible({timeout: 8_000});
    await switchPanelTrigger.click();

    // Both panel items must be visible in the submenu
    const panel1Item = page.locator('button[mat-menu-item]', {hasText: /Panel 1/i});
    const panel2Item = page.locator('button[mat-menu-item]', {hasText: /Panel 2|Dark/i});
    await expect(panel1Item).toBeVisible({timeout: 5_000});
    await expect(panel2Item).toBeVisible({timeout: 5_000});

    // Determine which panel is currently active (has ✓)
    const panel1Text = await panel1Item.textContent() ?? '';
    const panel1Active = panel1Text.includes('✓');

    // Click whichever panel is NOT currently active
    if (panel1Active) {
      await panel2Item.click(); // switch to Panel 2
    } else {
      await panel1Item.click(); // switch to Panel 1
    }

    // Wait for backend persist before navigating away
    await page.waitForTimeout(2_500);

    // --- Phase 2: reload and verify the switch persisted ---
    await page.goto(rackUrl);
    await expect(page.locator('app-rack-visual-model')).toBeVisible({timeout: 15_000});
    const editBtnAfterReload = page.getByRole('button', {name: /^Edit rack$/i}).first();
    if (await editBtnAfterReload.isVisible().catch(() => false)) {
      await editBtnAfterReload.click();
    }
    await expect(page.getByRole('button', {name: /^(Lock rack|Discard changes)$/i}).first()).toBeVisible({timeout: 10_000});

    const belgradAfterReload = page.locator('app-rack-visual-model app-module-realistic')
      .filter({has: page.locator('img[alt*="Belgrad"]')})
      .first();
    await expect(belgradAfterReload).toBeVisible({timeout: 10_000});
    await belgradAfterReload.click({button: 'right'});

    // Open "Switch panel" submenu again
    const switchPanelTriggerAfterReload = page.locator('button[mat-menu-item]', {hasText: /Switch panel/i});
    await expect(switchPanelTriggerAfterReload).toBeVisible({timeout: 8_000});
    await switchPanelTriggerAfterReload.click();

    // After reload: the panel we switched TO should have ✓ in its label,
    // and the context menu must also show the other panel (without ✓).
    const expectedActiveLabel = panel1Active ? /Panel 2.*✓|Dark.*✓/i : /Panel 1.*✓/i;
    const expectedInactiveLabel = panel1Active ? /Panel 1(?!.*✓)|Dark(?!.*✓)/i : /Panel 2(?!.*✓)|Dark(?!.*✓)/i;

    await expect(page.locator('button[mat-menu-item]', {hasText: expectedActiveLabel})).toBeVisible({timeout: 8_000});
    await expect(page.locator('button[mat-menu-item]', {hasText: expectedInactiveLabel})).toBeVisible({timeout: 5_000});
  });
});
