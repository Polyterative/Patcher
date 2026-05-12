import {
  expect,
  test
} from '@playwright/test';


/**
 * Patch Browser — smoke tests
 *
 * Verifies that the patch browser page loads and displays content
 * without requiring authentication.
 */
test.describe('Patch Browser', () => {
  test.beforeEach(async ({page}) => {
    await page.goto('/patches/browser');
  });
  
  test('page loads without error', async ({page}) => {
    await expect(page).not.toHaveURL(/404/);
    await expect(page).toHaveURL(/patches\/browser/);
  });
  
  test('shows at least one patch card', async ({page}) => {
    await expect(page.locator('app-patch-list app-patch-micro').first()).toBeVisible({timeout: 15_000});
  });
  
  test('paginator shows total item count greater than zero', async ({page}) => {
    const rangeLabel = page.locator('mat-paginator .mat-mdc-paginator-range-label');
    await expect(rangeLabel).toBeVisible({timeout: 15_000});
    await expect(rangeLabel).toHaveText(/\d+ \u2013 \d+ of [1-9]\d*/);
  });
  
  test('page heading is visible', async ({page}) => {
    await expect(page.getByRole('heading', {name: /patches/i})).toBeVisible({timeout: 10_000});
  });

  test('shows a single loader while a patch search request is pending', async ({page}) => {
    await expect(page.locator('app-patch-list app-patch-micro').first()).toBeVisible({timeout: 15_000});

    await page.route('**/rest/v1/patches*', async route => {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      await route.continue();
    });

    const searchRequest = page.waitForRequest((request) =>
      request.url().includes('/rest/v1/patches')
      && request.method() === 'GET'
    );

    await page.getByLabel('Search patch...').fill('rack');
    await searchRequest;

    await expect(page.locator('.browser-content-area .update-loading-shell')).toBeVisible();
    await expect(page.locator('.browser-content-area .update-loading-shell, .browser-content-area .loading-shell')).toHaveCount(1);
    await expect(page.locator('.browser-content-area .update-loading-shell')).toBeHidden({timeout: 15_000});
  });
});
