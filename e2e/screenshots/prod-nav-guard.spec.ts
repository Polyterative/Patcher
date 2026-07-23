import {
  expect,
  test
} from '@playwright/test';


test('production docs screenshot navigation excludes dev-only surfaces', async ({page}) => {
  await page.goto('/home');
  await expect(page.locator('app-toolbar').first()).toBeVisible({timeout: 20_000});

  await expect(page.getByRole('link', {name: /^Home$/i}).first()).toBeVisible();
  await expect(page.getByRole('link', {name: /^Modules$/i}).first()).toBeVisible();
  await expect(page.getByRole('link', {name: /^Racks$/i}).first()).toBeVisible();
  await expect(page.getByRole('link', {name: /^Patches$/i}).first()).toBeVisible();
  await expect(page.getByRole('link', {name: /^Manufacturers$/i}).first()).toBeVisible();

  await expect(page.getByRole('link', {name: /^Collections$/i})).toHaveCount(0);
  await expect(page.getByRole('link', {name: /^Insights$/i})).toHaveCount(0);
  await expect(page.getByRole('link', {name: /^Marketplace$/i})).toHaveCount(0);
  await expect(page.locator('[data-feature="cool-button"]')).toHaveCount(0);
});
