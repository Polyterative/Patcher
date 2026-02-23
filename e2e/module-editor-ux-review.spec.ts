import fs from 'node:fs';
import path from 'node:path';
import {
  expect,
  test,
  type Page
} from '@playwright/test';

const MODULE_DETAILS_PATH = '/modules/details/4791';
const UNSAVED_MODULE_DETAILS_PATH = '/modules/details/1423';
const OUTPUT_DIR = path.resolve(process.cwd(), 'output/playwright/module-editor-ux');

function ensureOutputDir(): void {
  fs.mkdirSync(OUTPUT_DIR, {recursive: true});
}

async function login(page: Page): Promise<void> {
  const email = process.env['E2E_TEST_EMAIL']?.trim();
  const password = process.env['E2E_TEST_PASSWORD']?.trim();

  test.skip(!email || !password, 'Missing E2E_TEST_EMAIL or E2E_TEST_PASSWORD.');

  await page.goto('/auth/login');
  const loginInputs = page.locator('app-login-email input');
  const loginButton = page.locator('app-login-email a.brand-button').first();

  await loginInputs.first().fill(email as string);
  await loginInputs.nth(1).fill(password as string);
  await loginButton.click();

  await expect(page).toHaveURL(/\/user\/area/, {timeout: 20_000});
}

async function openModuleEditor(page: Page): Promise<void> {
  await page.goto(MODULE_DETAILS_PATH);
  await page.waitForLoadState('domcontentloaded');

  const editorTitle = page.getByRole('heading', {name: 'Module Editor'});
  if (!(await editorTitle.isVisible().catch(() => false))) {
    const toggleButton = page.getByRole('button', {name: /^(Edit|Close editor|Discard changes)$/i}).first();
    await expect(toggleButton).toBeVisible({timeout: 15_000});

    const buttonLabel = (await toggleButton.innerText()).trim();
    if (/^Edit$/i.test(buttonLabel)) {
      await toggleButton.click();
    }
  }

  await expect(editorTitle).toBeVisible({timeout: 15_000});

  await editorTitle.scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
}

async function openModuleEditorAtPath(page: Page, modulePath: string): Promise<void> {
  await page.goto(modulePath);
  await page.waitForLoadState('domcontentloaded');

  const editorTitle = page.getByRole('heading', {name: 'Module Editor'});
  if (!(await editorTitle.isVisible().catch(() => false))) {
    const toggleButton = page.getByRole('button', {name: /^(Edit|Close editor|Discard changes)$/i}).first();
    await expect(toggleButton).toBeVisible({timeout: 15_000});

    const buttonLabel = (await toggleButton.innerText()).trim();
    if (/^Edit$/i.test(buttonLabel)) {
      await toggleButton.click();
    }
  }

  await expect(editorTitle).toBeVisible({timeout: 15_000});
  await editorTitle.scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
}

async function collectDeleteButtonStats(page: Page): Promise<void> {
  const actionButtons = page.locator('app-module-editor-cv-form-line button.cv-row-action');
  const total = await actionButtons.count();
  const disabled = await page.locator('app-module-editor-cv-form-line button.cv-row-action:disabled').count();
  const removable = await page.locator('app-module-editor-cv-form-line button.cv-row-action.cv-row-action--removable').count();
  const dangerStyled = await page.locator('app-module-editor-cv-form-line .danger-action').count();
  const draftBadges = await page.locator('app-module-editor-cv-form-line .cv-row-status.cv-row-status--draft').count();
  const lockedBadges = await page.locator('app-module-editor-cv-form-line .cv-row-status.cv-row-status--locked').count();

  expect(total).toBeGreaterThan(0);
  expect(removable).toBe(total - disabled);
  expect(lockedBadges).toBe(disabled);
  expect(draftBadges).toBe(removable);
  expect(dangerStyled).toBe(0);

  console.log(
    `[module-editor-ux] action_buttons_total=${ total } action_buttons_disabled=${ disabled } removable=${ removable } danger_styled=${ dangerStyled }`
  );
}

async function addUnsavedDraftRows(page: Page): Promise<void> {
  const adders = page.locator('app-module-editor-adder-line');
  await expect(adders.first()).toBeVisible({timeout: 10_000});

  // INs: add one blank and one -10 to +10V preset row, then leave them unsaved.
  const inAdder = adders.first();
  await inAdder.getByRole('button', {name: /Add CV/i}).click();
  await page.getByRole('menuitem', {name: /^Blank$/i}).click();

  await inAdder.getByRole('button', {name: /Add CV/i}).click();
  await page.getByRole('menuitem', {name: /-10 to \+10V/i}).click();

  const draftStatuses = page.locator('app-module-editor-cv-form-line .cv-row-status--draft');
  await expect(draftStatuses).toHaveCount(2);
}

test.describe('Module editor UX review snapshots', () => {
  test('desktop snapshot', async ({page}) => {
    ensureOutputDir();
    await login(page);
    await openModuleEditor(page);

    const editor = page.locator('app-module-editor').first();
    await expect(editor).toBeVisible({timeout: 10_000});

    await collectDeleteButtonStats(page);

    await page.screenshot({
      path: path.join(OUTPUT_DIR, 'module-4791-editor-desktop-full.png'),
      fullPage: true
    });
    await editor.screenshot({
      path: path.join(OUTPUT_DIR, 'module-4791-editor-desktop-editor.png')
    });
  });

  test.describe('mobile viewport', () => {
    test.use({viewport: {width: 390, height: 844}});

    test('mobile snapshot', async ({page}) => {
      ensureOutputDir();
      await login(page);
      await openModuleEditor(page);

      const editor = page.locator('app-module-editor').first();
      await expect(editor).toBeVisible({timeout: 10_000});

      await collectDeleteButtonStats(page);

      await page.screenshot({
        path: path.join(OUTPUT_DIR, 'module-4791-editor-mobile-full.png'),
        fullPage: true
      });
      await editor.screenshot({
        path: path.join(OUTPUT_DIR, 'module-4791-editor-mobile-editor.png')
      });
    });
  });

  test('unsaved draft rows snapshot (no database writes)', async ({page}) => {
    ensureOutputDir();
    await login(page);
    await openModuleEditorAtPath(page, UNSAVED_MODULE_DETAILS_PATH);

    const editor = page.locator('app-module-editor').first();
    await expect(editor).toBeVisible({timeout: 10_000});

    await addUnsavedDraftRows(page);

    // Guardrail: verify we did not save.
    const saveAllChangesButton = page.locator('app-module-editor button.save-fab', {hasText: 'Save'});
    await expect(saveAllChangesButton).toBeVisible({timeout: 10_000});

    const removableButtons = page.locator('app-module-editor-cv-form-line button.cv-row-action.cv-row-action--removable');
    await expect(removableButtons).toHaveCount(2);

    await page.screenshot({
      path: path.join(OUTPUT_DIR, 'module-1423-editor-unsaved-drafts-full.png'),
      fullPage: true
    });
    await editor.screenshot({
      path: path.join(OUTPUT_DIR, 'module-1423-editor-unsaved-drafts-editor.png')
    });
  });
});
