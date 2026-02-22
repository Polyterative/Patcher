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
    
    // Target ONLY the main module card, not the "Others by same manufacturer" section
    // The main card is inside the first lib-screen-wrapper with fixed-width32 class
    const mainModuleSection = page.locator('lib-screen-wrapper.fixed-width32').first();
    await expect(mainModuleSection).toBeVisible({timeout: 15_000});
    
    // Within that section, get the module composite
    const moduleComposite = mainModuleSection.locator('app-module-composite');
    await expect(moduleComposite).toBeVisible({timeout: 5_000});
    
    // The tags component MUST be present in the main module details
    // This will fail if hideTags is true in viewConfig
    const tagsComponent = moduleComposite.locator('app-module-tags');
    await expect(tagsComponent).toBeAttached({timeout: 5_000});
    await expect(tagsComponent).toBeVisible({timeout: 5_000});
  });
});
