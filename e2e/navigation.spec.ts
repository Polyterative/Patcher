import {
  expect,
  test
} from '@playwright/test';


/**
 * Navigation smoke tests
 *
 * Verifies that clicking the main browser links from the home page
 * navigates to the correct routes without errors.
 */
test.describe('Navigation', () => {
  test('root path redirects to /home', async ({page}) => {
    await page.goto('/');
    await expect(page).toHaveURL(/home/, {timeout: 10_000});
  });
  
  test('navigating to modules/browser lands on the correct page', async ({page}) => {
    await page.goto('/modules/browser');
    await expect(page).toHaveURL(/modules\/browser/);
    await expect(page.getByRole('heading', {name: /modules/i})).toBeVisible({timeout: 10_000});
  });
  
  test('navigating to patches/browser lands on the correct page', async ({page}) => {
    await page.goto('/patches/browser');
    await expect(page).toHaveURL(/patches\/browser/);
    await expect(page.getByRole('heading', {name: /patches/i})).toBeVisible({timeout: 10_000});
  });
  
  test('navigating to racks/browser lands on the correct page', async ({page}) => {
    await page.goto('/racks/browser');
    await expect(page).toHaveURL(/racks\/browser/);
    await expect(page.getByRole('heading', {name: /racks/i})).toBeVisible({timeout: 10_000});
  });
});