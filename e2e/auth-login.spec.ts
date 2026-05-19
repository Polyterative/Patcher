import {
  expect,
  test
} from '@playwright/test';


test.describe('Authenticated Login', () => {
  test('authenticated session shows user menu link', async ({page}) => {
    await page.goto('/home');

    // On /home the embedded wide-shell nav is active (regular toolbar is hidden).
    // buildWideShellAccountLinks replaces "My profile" with the username for /user/area.
    // Guests see /auth/login here instead, so a /user/area link inside the section-targets
    // nav is the stable auth indicator, unaffected by the dynamic username label.
    await expect(
      page.locator('nav[aria-label="Section targets"] a[href="/user/area"]')
    ).toBeVisible({timeout: 15_000});
  });
});
