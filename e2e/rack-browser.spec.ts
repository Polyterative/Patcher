import {
  expect,
  test
} from '@playwright/test';


/**
 * Rack Browser — smoke tests
 *
 * Verifies that the rack browser page loads and displays content
 * without requiring authentication.
 */
test.describe('Rack Browser', () => {
  test.beforeEach(async ({page}) => {
    await page.goto('/racks/browser');
  });
  
  test('page loads without error', async ({page}) => {
    await expect(page).not.toHaveURL(/404/);
    await expect(page).toHaveURL(/racks\/browser/);
  });
  
  test('shows at least one rack card', async ({page}) => {
    await expect(page.locator('div.card').first()).toBeVisible({timeout: 15_000});
  });
  
  test('paginator shows total item count greater than zero', async ({page}) => {
    const status = page.getByRole('status');
    await expect(status).toBeVisible({timeout: 15_000});
    await expect(status).toHaveText(/\d+ \u2013 \d+ of [1-9]\d*/);
  });
  
  test('page heading is visible', async ({page}) => {
    await expect(page.getByRole('heading', {name: /racks/i})).toBeVisible({timeout: 10_000});
  });
});