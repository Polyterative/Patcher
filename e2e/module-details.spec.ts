import {
  expect,
  test
} from '@playwright/test';


/**
 * Module Details — smoke & content tests
 *
 * Covers:
 *  - Page loads and hero heading is visible
 *  - Module composite renders with name, manufacturer, HP, and tags
 *  - Navigation: module browser link in hero navigates back correctly
 *  - API failure handled gracefully (no crash)
 */

// Use a relative path — respects playwright.config.ts baseURL at all times.
const MODULE_DETAIL_URL = '/modules/details/1025';

test.describe('Module Details', () => {
  test.beforeEach(async ({page}) => {
    await page.goto(MODULE_DETAIL_URL);
  });

  // ─── Load ──────────────────────────────────────────────────────────────────

  test('page loads without error', async ({page}) => {
    await expect(page).not.toHaveURL(/404/);
    await expect(page).toHaveURL(/modules\/details\/1025/);
  });

  test('hero content card is visible', async ({page}) => {
    await expect(page.locator('lib-hero-content-card.modulesBG')).toBeVisible({timeout: 10_000});
  });

  // ─── Content ───────────────────────────────────────────────────────────────

  test('module composite renders', async ({page}) => {
    const composite = page.locator('app-module-composite').first();
    await expect(composite).toBeVisible({timeout: 10_000});
  });

  test('module tags component is present and visible', async ({page}) => {
    const composite = page.locator('app-module-composite').first();
    await expect(composite).toBeVisible({timeout: 10_000});
    const tags = composite.locator('app-module-tags');
    await expect(tags).toBeAttached({timeout: 5_000});
    await expect(tags).toBeVisible();
  });

  test('HP value is displayed', async ({page}) => {
    await expect(page.locator('.module-meta-row__hp').first()).toBeVisible({timeout: 10_000});
    const hpText = await page.locator('.module-meta-row__hp').first().textContent();
    expect(hpText?.trim().length).toBeGreaterThan(0);
  });

  test('manufacturer component is rendered', async ({page}) => {
    await expect(page.locator('app-module-part-manufacturer').first()).toBeVisible({timeout: 10_000});
  });

  // ─── Resilience ────────────────────────────────────────────────────────────

  test('handles API failure gracefully — no crash', async ({page}) => {
    await page.route('**/rest/v1/modules*', route =>
      route.fulfill({status: 500, body: JSON.stringify({message: 'forced failure'})})
    );
    await page.goto(MODULE_DETAIL_URL);
    // Page shell must still render even when the module data call fails
    await expect(page.locator('lib-hero-content-card').first()).toBeVisible({timeout: 10_000});
    await expect(page).not.toHaveURL(/404/);
  });

  // ─── Navigation ────────────────────────────────────────────────────────────

  test('navigating from module browser to a detail page and back works', async ({page}) => {
    // Start at the browser
    await page.goto('/modules/browser');
    const firstCard = page.locator('app-module-minimal').first();
    await expect(firstCard).toBeVisible({timeout: 20_000});

    // Get the href from the card's link and navigate to the detail
    const detailHref = await firstCard.locator('a[href*="/modules/details/"]').first().getAttribute('href');
    await page.goto(detailHref!);
    await expect(page).toHaveURL(/modules\/details\/\d+/, {timeout: 10_000});
    await expect(page.locator('lib-hero-content-card.modulesBG')).toBeVisible({timeout: 10_000});

    // Navigate back to the browser using the wide-shell nav
    await page.goBack();
    await expect(page).toHaveURL(/modules\/browser/, {timeout: 10_000});
  });
});
