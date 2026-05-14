import {
  expect,
  test
} from '@playwright/test';


/**
 * Home page — smoke & content tests
 *
 * Covers:
 *  - Page loads and hero heading renders
 *  - Auth entry-point CTAs are present and navigate correctly
 *  - Deferred content sections appear on scroll (proof showcase, statistics,
 *    open principles, workflow rail, invitation CTA)
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
    const heroHeading = page.locator('main.home-page h1').first();
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

  // ─── Deferred sections ─────────────────────────────────────────────────────

  test('at least one proof-showcase section is visible', async ({page}) => {
    // The proof-list section contains deferred app-home-proof-showcase items.
    // Scroll to trigger the viewport trigger.
    await page.locator('section[aria-label="product walkthrough"]').scrollIntoViewIfNeeded();
    const firstShowcase = page.locator('app-home-proof-showcase').first();
    await expect(firstShowcase).toBeVisible({timeout: 15_000});
  });

  test('statistics section loads with a heading', async ({page}) => {
    // Scroll to the statistics section to trigger @defer (on viewport)
    await page.evaluate(() => window.scrollBy(0, document.body.scrollHeight / 2));
    await page.waitForTimeout(500);
    const statsCard = page.locator('app-statistics').first();
    await expect(statsCard).toBeVisible({timeout: 15_000});
  });

  test('open principles section is visible', async ({page}) => {
    await page.evaluate(() => window.scrollBy(0, document.body.scrollHeight * 0.65));
    await page.waitForTimeout(500);
    const principles = page.locator('app-home-open-principles').first();
    await expect(principles).toBeVisible({timeout: 15_000});
  });

  test('workflow rail section is visible', async ({page}) => {
    // app-home-workflow-rail is inside @defer (on viewport) — scroll the section into view
    // so Angular's IntersectionObserver fires, then wait for the component to render
    const workflowSection = page.locator('section.section-enter').nth(3);
    await workflowSection.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1000);
    const workflow = page.locator('app-home-workflow-rail').first();
    await expect(workflow).toBeVisible({timeout: 15_000});
  });

  test('invitation CTA section contains a second set of action links', async ({page}) => {
    // app-home-invitation-cta is inside @defer (on viewport) — scroll the section into view
    const ctaSection = page.locator('section.section-enter').nth(4);
    await ctaSection.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1000);
    const cta = page.locator('app-home-invitation-cta').first();
    await expect(cta).toBeVisible({timeout: 15_000});
    // The invitation CTA must expose at least one action link
    await expect(cta.locator('a[href]').first()).toBeVisible({timeout: 5_000});
  });

  // ─── Responsive ────────────────────────────────────────────────────────────

  test('hero heading stays visible on mobile viewport (360 × 740)', async ({page}) => {
    await page.setViewportSize({width: 360, height: 740});
    await page.goto('/home');
    const heroHeading = page.locator('main.home-page h1').first();
    await expect(heroHeading).toBeVisible({timeout: 10_000});
    // Heading must not overflow its container horizontally
    const metrics = await heroHeading.evaluate((el: HTMLElement) => ({
      clientWidth: el.clientWidth,
      scrollWidth: el.scrollWidth,
    }));
    expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth + 2);
  });
});
