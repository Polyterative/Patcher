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

  async function enterEditMode(page: any): Promise<void> {
    const editBtn = page.getByRole('button', {name: /^Edit rack$/i}).first();
    if (await editBtn.isVisible().catch(() => false)) {
      await editBtn.click();
    }
    await expect(page.locator('app-module-browser-root')).toBeVisible({timeout: 10_000});
  }

  async function getModuleRowIndex(page: any, moduleAltText: string): Promise<number> {
    const rows = page.locator('app-rack-visual-model #screen .rackRow');
    const rowCount = await rows.count();
    for (let i = 0; i < rowCount; i++) {
      if (await rows.nth(i).locator(`img[alt*="${ moduleAltText }"]`).count() > 0) {
        return i;
      }
    }
    return -1;
  }

  async function openPanelSwitchMenu(page: any, moduleLocator: any) {
    await expect(moduleLocator).toBeVisible({timeout: 10_000});
    await moduleLocator.click({button: 'right'});

    const switchPanelTrigger = page.getByRole('menuitem', {name: /Switch panel/i});
    await expect(switchPanelTrigger).toBeVisible({timeout: 8_000});
    await switchPanelTrigger.hover();

    const panelMenu = page.locator('.cdk-overlay-pane').filter({
      has: page.getByRole('menuitem', {name: /Panel 1/i})
    }).last();
    await expect(panelMenu).toBeVisible({timeout: 5_000});

    const panel1Item = panelMenu.getByRole('menuitem', {name: /Panel 1/i});
    const panel2Item = panelMenu.getByRole('menuitem', {name: /Panel 2|Dark/i});
    await expect(panel1Item).toBeVisible({timeout: 5_000});
    await expect(panel2Item).toBeVisible({timeout: 5_000});

    return {panel1Item, panel2Item};
  }

  /** Creates a fresh private test rack, returns its URL. Already in edit mode on return. */
  async function createPrivateTestRack(page: any): Promise<string> {
    await page.goto('/user/area');
    await expect(page).toHaveURL(/\/user\/area/, {timeout: 20_000});

    const createRackBtn = page.locator('app-user-racks app-brand-primary-button', {hasText: /create rack/i}).first();
    await expect(createRackBtn).toBeVisible({timeout: 15_000});
    await createRackBtn.click();

    await expect(page.getByRole('heading', {name: /create new rack/i})).toBeVisible({timeout: 10_000});
    const createRackDialog = page.locator('mat-dialog-container').last();
    await setCreateRackDialogPrivacy(page, createRackDialog, false);

    // Set the rack name so we can reliably identify and delete it later
    const nameInput = createRackDialog.locator('input').first();
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
    await enterEditMode(page);
    
    return rackUrl;
  }

  async function setCreateRackDialogPrivacy(page: any, dialog: any, shouldBePublic: boolean): Promise<void> {
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

    await expect(actions.locator('mat-icon', {hasText: shouldBePublic ? 'public' : 'lock'}).first()).toBeVisible({timeout: 5_000});
  }

  /** Deletes the test rack via the UI delete button. Call from afterEach. */
  async function deleteTestRack(page: any, rackUrl: string) {
    try {
      await page.goto(rackUrl, {timeout: 15_000});
      await expect(page.locator('app-rack-visual-model')).toBeVisible({timeout: 10_000});

      // Ensure edit mode so the delete button is enabled
      await enterEditMode(page);

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

  test('moving a module between rows persists after reload', async ({page}) => {
    const browser = page.locator('app-module-browser-root');
    await expect(browser).toBeVisible({timeout: 10_000});
    await browser.locator('input').first().fill('Belgrad');

    const belgradCard = browser.locator('app-module-minimal', {hasText: /Belgrad/i}).first();
    await expect(belgradCard).toBeVisible({timeout: 15_000});
    await belgradCard.locator('button').last().click();

    await page.waitForTimeout(2_500);
    await page.goto(rackUrl);
    await expect(page.locator('app-rack-visual-model')).toBeVisible({timeout: 15_000});
    await enterEditMode(page);

    const rows = page.locator('app-rack-visual-model #screen .rackRow');
    await expect.poll(async () => rows.count(), {timeout: 10_000}).toBeGreaterThan(1);

    const sourceRowIndex = await getModuleRowIndex(page, 'Belgrad');
    expect(sourceRowIndex).toBeGreaterThanOrEqual(0);

    const targetRowIndex = sourceRowIndex === 0 ? 1 : 0;

    const saveRequest = page.waitForResponse(response => {
      if (!response.url().includes('/rest/v1/rack_modules')) {
        return false;
      }
      if (!['POST', 'PATCH'].includes(response.request().method())) {
        return false;
      }
      const body = response.request().postData() ?? '';
      return body.includes('"row":') && body.includes('"column":');
    }, {timeout: 10_000});

    await page.evaluate(({moduleName, targetRowIndex}) => {
      const ng = (window as any).ng;
      if (!ng?.getComponent) {
        throw new Error('Angular debug API unavailable');
      }

      const rackVisualModel = document.querySelector('app-rack-visual-model');
      if (!rackVisualModel) {
        throw new Error('Rack visual model not found');
      }

      const component = ng.getComponent(rackVisualModel);
      const service = component.rackDetailDataService;
      const rows = service.rowedRackedModules$.value;
      let sourceRowIndex = -1;
      let sourceColumnIndex = -1;
      let moduleToMove = null;

      for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
        const columnIndex = rows[rowIndex].findIndex((entry: any) => entry.module?.name === moduleName);
        if (columnIndex >= 0) {
          sourceRowIndex = rowIndex;
          sourceColumnIndex = columnIndex;
          moduleToMove = rows[rowIndex][columnIndex];
          break;
        }
      }

      if (!moduleToMove) {
        throw new Error(`Module ${moduleName} not found`);
      }

      service.rackOrderChange$.next({
        event: {
          previousIndex: sourceColumnIndex,
          currentIndex: 0
        },
        newRow: targetRowIndex,
        module: moduleToMove
      });
    }, {
      moduleName: 'Belgrad',
      targetRowIndex
    });
    await saveRequest;

    await page.getByRole('button', {name: /^Lock rack$/i}).first().click();
    await page.goto(rackUrl);
    await expect(page.locator('app-rack-visual-model')).toBeVisible({timeout: 15_000});
    await enterEditMode(page);

    const persistedRowIndex = await getModuleRowIndex(page, 'Belgrad');
    expect(persistedRowIndex).toBe(targetRowIndex);
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
    await enterEditMode(page);

    // --- Phase 1: read current panel state ---
    const belgradInRack = page.locator('app-rack-visual-model app-module-realistic')
      .filter({has: page.locator('img[alt*="Belgrad"]')}).first();
    const {panel1Item, panel2Item} = await openPanelSwitchMenu(page, belgradInRack);

    const panel1Active = ((await panel1Item.textContent()) ?? '').includes('✓');
    const panelSwitchRequest = page.waitForResponse(response => {
      if (!response.url().includes('/rest/v1/rack_modules')) {
        return false;
      }
      if (response.request().method() !== 'PATCH') {
        return false;
      }
      return (response.request().postData() ?? '').includes('selected_panel_id');
    }, {timeout: 10_000});

    // Switch to the OTHER panel
    if (panel1Active) {
      await panel2Item.evaluate((element: HTMLButtonElement) => element.click());
    } else {
      await panel1Item.evaluate((element: HTMLButtonElement) => element.click());
    }
    await panelSwitchRequest;

    // --- Phase 2: reload and verify persistence ---
    await page.goto(rackUrl);
    await expect(page.locator('app-rack-visual-model')).toBeVisible({timeout: 15_000});
    await enterEditMode(page);

    const belgradAfterReload = page.locator('app-rack-visual-model app-module-realistic')
      .filter({has: page.locator('img[alt*="Belgrad"]')}).first();
    const afterReloadMenu = await openPanelSwitchMenu(page, belgradAfterReload);
    const activePanelItem = panel1Active ? afterReloadMenu.panel2Item : afterReloadMenu.panel1Item;
    const inactivePanelItem = panel1Active ? afterReloadMenu.panel1Item : afterReloadMenu.panel2Item;

    await expect(activePanelItem).toContainText('✓', {timeout: 8_000});
    await expect(inactivePanelItem).not.toContainText('✓');
  });
});
