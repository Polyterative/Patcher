import {
  expect,
  test
} from '@playwright/test';


/**
 * Home page — smoke tests
 *
 * Verifies the home page loads, shows the main heading, and exposes
 * navigation links to the three main browsers.
 */
test.describe('Home Page', () => {
  test.beforeEach(async ({page}) => {
    await page.goto('/home');
  });
  
  test('page loads without error', async ({page}) => {
    await expect(page).not.toHaveURL(/404/);
    await expect(page).toHaveURL(/home/);
  });
  
  test('main heading PATCHER.XYZ is visible', async ({page}) => {
    await expect(page.getByRole('heading', {name: /patcher\.xyz/i})).toBeVisible({timeout: 10_000});
  });
  
  test('login and sign-up CTA links are visible', async ({page}) => {
    await expect(page.getByRole('link', {name: /login/i}).first()).toBeVisible({timeout: 10_000});
    await expect(page.getByRole('link', {name: /create an account/i}).first()).toBeVisible({timeout: 10_000});
  });
});