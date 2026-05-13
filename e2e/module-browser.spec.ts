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
    const status = page.locator('mat-paginator .mat-mdc-paginator-range-label');
    await expect(status).toBeVisible({timeout: 15_000});
    // Match "X – Y of Z" where Z is a positive number (at least one non-zero digit)
    await expect(status).toHaveText(/\d+ \u2013 \d+ of [1-9]\d*/);
  });
  
  test('page title / heading is visible', async ({page}) => {
    // The toolbar title or a heading on the page must be present
    await expect(page.getByRole('heading', {name: /modules/i})).toBeVisible({timeout: 10_000});
  });

  test('shows a visible update loader while a module search request is pending', async ({page}) => {
    await expect(page.locator('div.card').first()).toBeVisible({timeout: 15_000});

    await page.route('**/rest/v1/modules*', async route => {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      await route.continue();
    });

    const searchRequest = page.waitForRequest((request) =>
      request.url().includes('/rest/v1/modules')
      && request.url().includes('name=ilike.')
      && request.method() === 'GET'
    );

    await page.getByLabel('Search module...').fill('rings');
    await searchRequest;

    await expect(page.locator('.browser-content-area .update-loading-shell')).toBeVisible();
    await expect(page.locator('div.card').first()).toBeVisible();
    await expect(page.locator('.browser-content-area .update-loading-shell')).toBeHidden({timeout: 15_000});
  });

  test('sends a backend-backed request when the description search field changes', async ({page}) => {
    await expect(page.locator('div.card').first()).toBeVisible({timeout: 15_000});

    const descriptionRequest = page.waitForRequest((request) =>
      request.url().includes('/rest/v1/modules')
      && request.url().includes('description=ilike.')
      && request.method() === 'GET'
    );

    await page.getByLabel('Description').fill('filter');
    await descriptionRequest;
  });

  test('shows the empty state for a search with no matches', async ({page}) => {
    await expect(page.locator('div.card').first()).toBeVisible({timeout: 15_000});

    await page.getByLabel('Search module...').fill('zzqxvjklm');

    await expect(page.locator('.browser-content-area .update-loading-shell')).toBeHidden({timeout: 20_000});
    await expect(page.locator('app-module-list app-empty-state')).toBeVisible({timeout: 20_000});
    await expect(page.locator('div.card')).toHaveCount(0);
  });
});
