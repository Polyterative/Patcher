import {
  expect,
  test
} from '@playwright/test';


test.describe('Authenticated Login', () => {
  test('authenticated session shows user menu link', async ({page}) => {
    await page.goto('/home');

    await expect(page.getByRole('link', {name: /my profile/i})).toBeVisible({timeout: 15_000});
  });
});
