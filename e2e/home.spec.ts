import {
  expect,
  Page,
  test
} from '@playwright/test';


/**
 * Home page — smoke & content tests
 *
 * Covers:
 *  - Page loads and hero heading renders
 *  - Auth entry-point CTAs are present and navigate correctly
 *  - System tour tabs, ModularGrid anchor, API section, community rankings and
 *    closing CTA render and behave
 *  - Mobile viewport: hero heading remains visible and readable
 */
test.describe('Home Page', () => {
  test.beforeEach(async ({page}) => {
    await page.goto('/home');
  });

  // ─── Load ──────────────────────────────────────────────────────────────────

  test('page loads without error', async ({page}) => {
    await expect(page).not.toHaveURL(/404/);
    await expect(page).toHaveURL(/home/);
  });

  test('main hero heading is visible', async ({page}) => {
    const heroHeading = page.locator('div.home-page h1').first();
    await expect(heroHeading).toBeVisible({timeout: 10_000});
    await expect(heroHeading).toContainText(/operating system.*modular/i);
  });

  // ─── Auth CTAs ─────────────────────────────────────────────────────────────

  test('login and sign-up CTA links are visible', async ({page}) => {
    await expect(page.getByRole('link', {name: /log in/i}).first()).toBeVisible({timeout: 10_000});
    await expect(page.locator('a[href="/auth/signup"]').first()).toBeVisible({timeout: 10_000});
  });

  test('"Browse modules" CTA navigates to module browser', async ({page}) => {
    const browseLink = page.locator('a[href="/modules/browser"]').first();
    await expect(browseLink).toBeVisible({timeout: 10_000});
    await browseLink.click();
    await expect(page).toHaveURL(/modules\/browser/, {timeout: 10_000});
  });

  test('"Sign up" CTA navigates to signup page', async ({page}) => {
    const signupLink = page.locator('a[href="/auth/signup"]').first();
    await expect(signupLink).toBeVisible({timeout: 10_000});
    await signupLink.click();
    await expect(page).toHaveURL(/auth\/signup/, {timeout: 10_000});
  });

  test('"Log in" CTA navigates to login page', async ({page}) => {
    const loginLink = page.getByRole('link', {name: /log in/i}).first();
    await expect(loginLink).toBeVisible({timeout: 10_000});
    await loginLink.click();
    await expect(page).toHaveURL(/auth\/login/, {timeout: 10_000});
  });

  // ─── Sections ──────────────────────────────────────────────────────────────

  test('system tour switches panels from the tab list', async ({page}) => {
    const tablist = page.getByRole('tablist', {name: /what patcher keeps track of/i});
    await tablist.scrollIntoViewIfNeeded();
    await expect(page.getByRole('tabpanel')).toHaveCount(1);
    await tablist.getByRole('tab', {name: /patches/i}).click();
    await expect(page.locator('#home-tour-panel-patches')).toBeVisible();
    await expect(page.locator('#home-tour-panel-library')).toBeHidden();
  });

  test('ModularGrid hook in the hero scrolls to the switch section', async ({page}) => {
    await page.getByRole('link', {name: /bring your racks/i}).click();
    await expect(page.locator('#switch')).toBeInViewport({timeout: 5_000});
    await expect(page.locator('#switch h2')).toContainText(/ModularGrid/);
  });

  test('developer API section links to the public API reference', async ({page}) => {
    const api = await scrollUntilVisible(page, 'app-home-api-section');
    await expect(api.locator('a[href*="docs.patcher.xyz/reference/public-open-api"]')).toBeVisible();
  });

  test('community rankings load on scroll', async ({page}) => {
    await scrollUntilVisible(page, 'app-home-discovery-section');
  });

  test('closing CTA exposes sign-up and browse actions', async ({page}) => {
    const cta = await scrollUntilVisible(page, 'app-home-closing-cta');
    await expect(cta.locator('a[href="/auth/signup"]')).toBeVisible();
    await expect(cta.locator('a[href="/modules/browser"]')).toBeVisible();
  });

  // ─── Responsive ────────────────────────────────────────────────────────────

  test('hero heading stays visible on mobile viewport (360 × 740)', async ({page}) => {
    await page.setViewportSize({width: 360, height: 740});
    await page.goto('/home');
    const heroHeading = page.locator('div.home-page h1').first();
    await expect(heroHeading).toBeVisible({timeout: 10_000});
    // Heading must not overflow its container horizontally
    const metrics = await heroHeading.evaluate((el: HTMLElement) => ({
      clientWidth: el.clientWidth,
      scrollWidth: el.scrollWidth,
    }));
    expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth + 2);
  });
});

async function scrollUntilVisible(page: Page, selector: string) {
  const target = page.locator(selector).first();

  for (const ratio of [0, 0.2, 0.4, 0.6, 0.8, 1]) {
    await page.evaluate((scrollRatio) => {
      window.scrollTo(0, document.body.scrollHeight * scrollRatio);
    }, ratio);
    await page.waitForTimeout(500);

    if (await target.isVisible().catch(() => false)) {
      return target;
    }
  }

  await expect(target).toBeVisible({timeout: 15_000});
  return target;
}
