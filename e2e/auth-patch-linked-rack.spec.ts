import {
  expect,
  test
} from '@playwright/test';
import {
  cleanupLinkedRackScenario,
  ensureLinkedRackScenario,
  type PreparedLinkedRackScenario
} from './helpers/linked-rack-scenario';


test.describe('Linked rack visual in patch editor', () => {
  test.describe.configure({mode: 'serial'});

  let scenario: PreparedLinkedRackScenario;

  test.beforeAll(async ({browser}) => {
    const context = await browser.newContext({
      storageState: 'playwright/.auth/user.json'
    });
    const page = await context.newPage();
    scenario = await ensureLinkedRackScenario(page);
    await context.close();
  });

  test.afterAll(async ({browser}) => {
    if (!scenario) return;
    const context = await browser.newContext({
      storageState: 'playwright/.auth/user.json'
    });
    const page = await context.newPage();
    await cleanupLinkedRackScenario(page, scenario);
    await context.close();
  });

  test('rack visual shows modules with non-zero dimensions', async ({page}) => {
    test.setTimeout(90_000);

    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', err => consoleErrors.push(`PAGE_ERROR: ${err.message}`));

    // Navigate to the linked patch and enter edit mode
    await page.goto(scenario.patchUrl);
    await expect(page.locator('app-patch-composite')).toBeVisible({timeout: 20_000});

    const editBtn = page.locator('app-edit-fab button', {hasText: /^Edit$/i}).first();
    const editingHeading = page.getByRole('heading', {name: /Patch editing/i}).first();

    await Promise.any([
      editingHeading.waitFor({state: 'visible', timeout: 12_000}),
      editBtn.waitFor({state: 'visible', timeout: 12_000})
    ]).catch(() => undefined);

    if (await editBtn.isVisible().catch(() => false)) {
      await editBtn.click();
      await expect(editingHeading).toBeVisible({timeout: 20_000});
    }

    // Switch to linked rack mode
    const linkedRackButton = page.getByRole('radio', {name: /^Rack$/i}).first();
    await expect(linkedRackButton).toBeVisible({timeout: 15_000});
    if (!(await linkedRackButton.isChecked())) {
      await linkedRackButton.click();
    }

    // Wait for the rack visual to render
    const rackScreen = page.locator('.patch-editor-rack-visual__screen');
    await expect(rackScreen).toBeVisible({timeout: 15_000});

    // Verify rows
    const rows = page.locator('.patch-editor-rack-visual__row');
    const rowCount = await rows.count();
    expect(rowCount).toBeGreaterThan(0);

    // Verify modules rendered inside rows
    const modules = page.locator('.patch-editor-rack-visual__row app-module-realistic');
    await expect(modules.first()).toBeVisible({timeout: 10_000});
    const moduleCount = await modules.count();
    expect(moduleCount).toBeGreaterThan(0);

    // Verify first module has non-zero bounding box
    const box = await modules.first().boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThan(0);
    expect(box!.height).toBeGreaterThan(0);

    // Check no DI errors
    const injectorErrors = consoleErrors.filter(e =>
      e.includes('NullInjectorError') || e.includes('No provider')
    );
    if (injectorErrors.length > 0) {
      console.log('DI Errors:', injectorErrors.join('\n'));
    }
    expect(injectorErrors).toHaveLength(0);
  });

  test('clicking a module opens its CV panel', async ({page}) => {
    test.setTimeout(60_000);

    await page.goto(scenario.patchUrl);
    await expect(page.locator('app-patch-composite')).toBeVisible({timeout: 20_000});

    // Enter edit mode
    const editBtn = page.locator('app-edit-fab button', {hasText: /^Edit$/i}).first();
    const editingHeading = page.getByRole('heading', {name: /Patch editing/i}).first();

    await Promise.any([
      editingHeading.waitFor({state: 'visible', timeout: 12_000}),
      editBtn.waitFor({state: 'visible', timeout: 12_000})
    ]).catch(() => undefined);

    if (await editBtn.isVisible().catch(() => false)) {
      await editBtn.click();
      await expect(editingHeading).toBeVisible({timeout: 20_000});
    }

    // Switch to linked rack mode
    const linkedRackButton = page.getByRole('radio', {name: /^Rack$/i}).first();
    await expect(linkedRackButton).toBeVisible({timeout: 15_000});
    if (!(await linkedRackButton.isChecked())) {
      await linkedRackButton.click();
    }

    // Wait for modules
    const moduleWrappers = page.locator('.patch-editor-rack-visual__module-wrapper');
    await expect(moduleWrappers.first()).toBeVisible({timeout: 15_000});

    // Click the first module wrapper
    await moduleWrappers.first().click();

    // Verify the CV panel opens (now inline beside the module)
    const cvPanel = page.locator('.patch-editor-rack-visual__cv-inline');
    await expect(cvPanel).toBeVisible({timeout: 10_000});

    // Verify CV panel shows module name
    const cvPanelName = cvPanel.locator('.patch-editor-rack-visual__cv-panel-name');
    await expect(cvPanelName).toBeVisible();
    const nameText = await cvPanelName.textContent();
    expect(nameText!.trim().length).toBeGreaterThan(0);

    // Verify app-module-cvs is rendered
    const moduleCvs = cvPanel.locator('app-module-cvs');
    await expect(moduleCvs).toBeVisible({timeout: 10_000});

    // Click same module again — panel should disappear (deselect)
    await moduleWrappers.first().click();
    await expect(cvPanel).toBeHidden({timeout: 5_000});
  });

  test('clicking outside the linked-rack component clears the selected module panel', async ({page}) => {
    test.setTimeout(60_000);

    await page.goto(scenario.patchUrl);
    await expect(page.locator('app-patch-composite')).toBeVisible({timeout: 20_000});

    const editBtn = page.locator('app-edit-fab button', {hasText: /^Edit$/i}).first();
    const editingHeading = page.getByRole('heading', {name: /Patch editing/i}).first();

    await Promise.any([
      editingHeading.waitFor({state: 'visible', timeout: 12_000}),
      editBtn.waitFor({state: 'visible', timeout: 12_000})
    ]).catch(() => undefined);

    if (await editBtn.isVisible().catch(() => false)) {
      await editBtn.click();
      await expect(editingHeading).toBeVisible({timeout: 20_000});
    }

    const linkedRackButton = page.getByRole('radio', {name: /^Rack$/i}).first();
    await expect(linkedRackButton).toBeVisible({timeout: 15_000});
    if (!(await linkedRackButton.isChecked())) {
      await linkedRackButton.click();
    }

    const moduleWrappers = page.locator('.patch-editor-rack-visual__module-wrapper');
    await expect(moduleWrappers.first()).toBeVisible({timeout: 15_000});
    await moduleWrappers.first().click();

    const cvPanel = page.locator('.patch-editor-rack-visual__cv-inline');
    await expect(cvPanel).toBeVisible({timeout: 10_000});

    await editingHeading.click();

    await expect(cvPanel).toBeHidden({timeout: 5_000});
  });
});
