import {
  expect,
  test
} from '@playwright/test';


/**
 * Module Browser — smoke tests
 *
 * Verifies that the module browser page loads and displays content
 * without requiring authentication.
 */
test.describe('Module Browser', () => {
  test.beforeEach(async ({page}) => {
    await page.goto('/modules/browser');
  });
  
  test('page loads without error', async ({page}) => {
    // No JS error dialog, no 404
    await expect(page).not.toHaveURL(/404/);
    await expect(page).toHaveURL(/modules\/browser/);
  });
  
  test('shows at least one module card', async ({page}) => {
    // lib-clean-card renders as <div class="card">; wait for the first one
    await expect(page.locator('div.card').first()).toBeVisible({timeout: 15_000});
  });
  
  test('paginator shows total item count greater than zero', async ({page}) => {
    // mat-paginator renders a status element: "1 – 20 of 4001"
    const status = page.getByRole('status');
    await expect(status).toBeVisible({timeout: 15_000});
    // Match "X – Y of Z" where Z is a positive number (at least one non-zero digit)
    await expect(status).toHaveText(/\d+ \u2013 \d+ of [1-9]\d*/);
  });
  
  test('page title / heading is visible', async ({page}) => {
    // The toolbar title or a heading on the page must be present
    await expect(page.getByRole('heading', {name: /modules/i})).toBeVisible({timeout: 10_000});
  });
});