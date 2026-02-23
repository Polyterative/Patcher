import {
  expect,
  test
} from '@playwright/test';


/**
 * Home page — smoke tests
 *
 * Verifies the home page loads, renders the primary hero heading,
 * and exposes auth entry points.
 */
test.describe('Home Page', () => {
  test.beforeEach(async ({page}) => {
    await page.goto('/home');
  });
  
  test('page loads without error', async ({page}) => {
    await expect(page).not.toHaveURL(/404/);
    await expect(page).toHaveURL(/home/);
  });
  
  test('main hero heading is visible', async ({page}) => {
    const heroHeading = page.locator('main.home-page h1').first();
    await expect(heroHeading).toBeVisible({timeout: 10_000});
    await expect(heroHeading).toContainText(/patch/i);
  });
  
  test('login and sign-up CTA links are visible', async ({page}) => {
    await expect(page.getByRole('link', {name: /log in/i}).first()).toBeVisible({timeout: 10_000});
    await expect(page.locator('a[href="/auth/signup"]').first()).toBeVisible({timeout: 10_000});
  });
});
