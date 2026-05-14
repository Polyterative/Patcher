import {
  expect,
  test
} from '@playwright/test';


/**
 * Info Pages — smoke tests
 *
 * Covers:
 *  - Changelog page loads with heading, link to release notes, and CHANGELOG.md link
 *  - Insights page loads and either shows data or a loader without crashing
 *  - API failure on insights handled gracefully
 */

test.describe('Changelog Page', () => {
  test.beforeEach(async ({page}) => {
    await page.goto('/info/changelog');
  });

  test('page loads without error', async ({page}) => {
    await expect(page).not.toHaveURL(/404/);
    await expect(page).toHaveURL(/info\/changelog/);
  });

  test('hero heading "Changelog" is visible', async ({page}) => {
    await expect(page.locator('lib-hero-content-card.changelogBG')).toBeVisible({timeout: 10_000});
  });

  test('"View release notes" link is visible and has an external href', async ({page}) => {
    const link = page.getByRole('link', {name: /view release notes/i});
    await expect(link).toBeVisible({timeout: 10_000});
    const href = await link.getAttribute('href');
    expect(href).toBeTruthy();
    // External link — should point outside the app
    expect(href).toMatch(/github\.com|patcher\.xyz|CHANGELOG/i);
  });
});

test.describe('Insights Page', () => {
  test.beforeEach(async ({page}) => {
    await page.goto('/insights');
  });

  test('page loads without error', async ({page}) => {
    await expect(page).not.toHaveURL(/404/);
    await expect(page).toHaveURL(/insights/);
  });

  test('insights hero card is visible (loading or loaded)', async ({page}) => {
    // The hero card must appear regardless of whether data has arrived
    await expect(page.locator('lib-hero-content-card').first()).toBeVisible({timeout: 10_000});
  });

  test('insights page settles without crash after data loads', async ({page}) => {
    const pageErrors: string[] = [];
    page.on('pageerror', error => pageErrors.push(error.message));

    // Wait for either the data chips or the loading state to appear
    await expect(page.locator('lib-hero-content-card').first()).toBeVisible({timeout: 10_000});
    await page.waitForTimeout(5_000);

    expect(pageErrors).toEqual([]);
    await expect(page).not.toHaveURL(/404/);
  });

  test('handles API failure gracefully — no crash', async ({page}) => {
    await page.route('**/rest/v1/**', route =>
      route.fulfill({status: 500, body: JSON.stringify({message: 'forced failure'})})
    );
    await page.goto('/insights');
    await expect(page.locator('lib-hero-content-card').first()).toBeVisible({timeout: 10_000});
    await expect(page).not.toHaveURL(/404/);
  });
});
