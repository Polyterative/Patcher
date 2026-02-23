import {
  expect,
  test
} from '@playwright/test';


/**
 * Module Details — smoke tests
 *
 * Verifies that the module details page loads and displays tags
 * for a specific module without requiring authentication.
 */
test.describe('Module Details', () => {
  test.beforeEach(async ({page}) => {
    await page.goto('http://localhost:5556/modules/details/1025');
  });
  
  test('page loads without error', async ({page}) => {
    // No JS error dialog, no 404
    await expect(page).not.toHaveURL(/404/);
    await expect(page).toHaveURL(/modules\/details\/1025/);
  });
  
  test('module tags are visible in the main module details card', async ({page}) => {
    // Wait for the page to load
    await page.waitForLoadState('domcontentloaded');
    
    // The details layout no longer uses `fixed-width32`; target the main module composite directly.
    const moduleComposite = page.locator('app-module-composite').first();
    await expect(moduleComposite).toBeVisible({timeout: 5_000});
    
    // The tags component MUST be present in the main module details
    // This will fail if hideTags is true in viewConfig
    const tagsComponent = moduleComposite.locator('app-module-tags');
    await expect(tagsComponent).toBeAttached({timeout: 5_000});
    await expect(tagsComponent).toBeVisible({timeout: 5_000});
  });
});
