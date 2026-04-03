import {
  expect,
  test
} from '@playwright/test';


/**
 * Module Browser — pagination loader regression
 *
 * Verifies that the loading indicator is NOT visible after data has loaded
 * when navigating to the last page and back to the first page.
 *
 * Regression for: lottie animation persisting after paginator navigation.
 */
test.describe('Module Browser pagination loader', () => {
  const LOADER = 'lib-auto-update-loading-indicator app-lottie-container';
  const TIMEOUT = 15_000;
  const SETTLE = 15_000;
  
  test.beforeEach(async ({page}) => {
    await page.goto('/modules/browser');
    // Wait for initial data to render before doing anything
    await expect(page.locator('app-module-minimal').first()).toBeVisible({timeout: TIMEOUT});
    await expect(page.locator(LOADER)).toBeHidden({timeout: TIMEOUT});
  });
  
  test('loader is hidden after navigating to last page', async ({page}) => {
    const lastPageButton = page.getByRole('button', {name: /last page/i});
    await expect(lastPageButton).toBeEnabled({timeout: TIMEOUT});
    await lastPageButton.click();
    
    await expect(page.locator(LOADER)).toBeHidden({timeout: SETTLE});
  });
  
  test('loader is hidden after navigating last page then back to first page', async ({page}) => {
    const lastPageButton = page.getByRole('button', {name: /last page/i});
    const firstPageButton = page.getByRole('button', {name: /first page/i});
    
    await expect(lastPageButton).toBeEnabled({timeout: TIMEOUT});
    await lastPageButton.click();
    await expect(page.locator(LOADER)).toBeHidden({timeout: SETTLE});
    
    await expect(firstPageButton).toBeEnabled({timeout: TIMEOUT});
    await firstPageButton.click();
    await expect(page.locator(LOADER)).toBeHidden({timeout: SETTLE});
  });
});
