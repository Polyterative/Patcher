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
  test('page loads without error', async ({page}) => {
    await page.goto('/racks/browser');
    await expect(page).not.toHaveURL(/404/);
    await expect(page).toHaveURL(/racks\/browser/);
  });
  
  test('shows at least one rack card', async ({page}) => {
    await page.goto('/racks/browser');
    await expect(page.locator('app-rack-micro').first()).toBeVisible({timeout: 15_000});
  });
  
  test('paginator shows total item count greater than zero', async ({page}) => {
    await page.goto('/racks/browser');
    const status = page.locator('mat-paginator .mat-mdc-paginator-range-label');
    await expect(status).toBeVisible({timeout: 15_000});
    await expect(status).toHaveText(/\d+ \u2013 \d+ of [1-9]\d*/);
  });
  
  test('initial loader stops after list data is rendered', async ({page}) => {
    await page.goto('/racks/browser');
    const listCard = page.locator('app-rack-micro').first();
    const listSkeleton = page.locator('app-rack-list .skeleton').first();
    
    await expect(listCard).toBeVisible({timeout: 15_000});
    await expect(listSkeleton).toBeHidden({timeout: 15_000});
    await page.waitForTimeout(3_000);
    await expect(listSkeleton).toBeHidden({timeout: 5_000});
  });
  
  test('loader stops even when rack request fails', async ({page}) => {
    await page.route('**/rest/v1/racks*', route => route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({message: 'forced e2e failure'})
    }));
    
    await page.goto('/racks/browser');
    
    const listSkeleton = page.locator('app-rack-list .skeleton').first();
    const emptyState = page.locator('app-empty-state');
    
    await expect(listSkeleton).toBeHidden({timeout: 15_000});
    await expect(emptyState).toBeVisible({timeout: 15_000});
  });
  
  test('loader settles within 2s when rack request hangs', async ({page}) => {
    await page.route('**/rest/v1/racks*', async route => {
      await new Promise(resolve => setTimeout(resolve, 5_000));
      await route.abort('timedout');
    });
    
    await page.goto('/racks/browser');
    
    const listSkeleton = page.locator('app-rack-list .skeleton').first();
    await expect(listSkeleton).toBeHidden({timeout: 3_000});
  });
  
  test('next-page loader settles within 2s after paginator navigation', async ({page}) => {
    await page.goto('/racks/browser');
    await expect(page.locator('app-rack-micro').first()).toBeVisible({timeout: 15_000});
    
    const nextPageButton = page.getByRole('button', {name: /next page/i});
    await expect(nextPageButton).toBeEnabled({timeout: 15_000});
    
    await nextPageButton.click();
    
    const pageLoader = page.locator('lib-auto-update-loading-indicator app-lottie-container');
    await expect(pageLoader).toBeHidden({timeout: 3_000});
  });

  test('shows an update loader while a rack search request is pending', async ({page}) => {
    await page.goto('/racks/browser');
    await expect(page.locator('app-rack-micro').first()).toBeVisible({timeout: 15_000});

    await page.route('**/rest/v1/racks*', async route => {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      await route.continue();
    });

    const searchRequest = page.waitForRequest((request) =>
      request.url().includes('/rest/v1/racks')
      && request.method() === 'GET'
    );

    await page.getByLabel('Search rack...').fill('performance');
    await searchRequest;

    await expect(page.locator('.browser-content-area .update-loading-shell')).toBeVisible();
    await expect(page.locator('app-rack-micro').first()).toBeVisible();
    await expect(page.locator('.browser-content-area .update-loading-shell')).toBeHidden({timeout: 15_000});
  });
  
  test('page heading is visible', async ({page}) => {
    await page.goto('/racks/browser');
    await expect(page.getByRole('heading', {name: /racks/i})).toBeVisible({timeout: 10_000});
  });
});
