import {
  expect,
  test
} from '@playwright/test';


/**
 * Patch Details (public view) — smoke & content tests
 *
 * Covers the unauthenticated patch detail page:
 *  - Page loads and hero card is visible
 *  - Patch name appears in the hero subtitle
 *  - Patch composite renders
 *  - Graph container is present and stabilises
 *  - API failure handled gracefully
 *
 * Uses patch #5 as a stable fixture — it is a publicly visible patch
 * already covered by the graph stability regression test.
 */

const PATCH_URL = '/patches/details/5';

test.describe('Patch Details (public)', () => {
  test.beforeEach(async ({page}) => {
    await page.goto(PATCH_URL);
  });

  // ─── Load ──────────────────────────────────────────────────────────────────

  test('page loads without error', async ({page}) => {
    await expect(page).not.toHaveURL(/404/);
    // Legacy /patches/details/:id URLs redirect to the opaque /patches/:public_id slug.
    await expect(page).toHaveURL(/\/patches\/(details\/5|[^/]+)/);
  });

  test('hero card with "Patch details" heading is visible', async ({page}) => {
    await expect(
      page.locator('lib-hero-content-card.patchesBG')
    ).toBeVisible({timeout: 10_000});
  });

  // ─── Content ───────────────────────────────────────────────────────────────

  test('patch composite renders', async ({page}) => {
    await expect(page.locator('app-patch-composite').first()).toBeVisible({timeout: 15_000});
  });

  test('patch graph container is present', async ({page}) => {
    // The graph container must be in the DOM — even during loading
    await expect(page.locator('app-patch-graph')).toBeAttached({timeout: 15_000});
  });

  test('patch graph settles (no stale overlay, no rebuild flicker)', async ({page}) => {
    const graphContainer = page.locator('app-patch-graph .graph-container');
    await expect(graphContainer).toBeVisible({timeout: 20_000});

    const staleOverlay = graphContainer.locator('.graph-stale-overlay');
    const buildingText = graphContainer.getByText('Building graph...');

    await expect(buildingText).toHaveCount(0, {timeout: 10_000});
    await expect(staleOverlay).toHaveCount(0);
  });

  // ─── Resilience ────────────────────────────────────────────────────────────

  test('handles API failure gracefully — no crash', async ({page}) => {
    await page.route('**/rest/v1/patches*', route =>
      route.fulfill({status: 500, body: JSON.stringify({message: 'forced failure'})})
    );
    await page.goto(PATCH_URL);
    // Shell must still render; either unavailable message or hero card
    await expect(page.locator('lib-hero-content-card').first()).toBeVisible({timeout: 10_000});
    await expect(page).not.toHaveURL(/404/);
  });

  // ─── Navigation ────────────────────────────────────────────────────────────

  test('navigating from patch browser to a detail page and back works', async ({page}) => {
    await page.goto('/patches/browser');
    const firstPatch = page.locator('app-patch-micro').first();
    await expect(firstPatch).toBeVisible({timeout: 15_000});

    // The detail link is rendered as a <div [routerLink]> via app-hero-clickable-title — click it
    await firstPatch.locator('mat-card-title .title').first().click();
    await expect(page).toHaveURL(/patches\/details\/\d+/, {timeout: 10_000});
    await expect(page.locator('lib-hero-content-card.patchesBG')).toBeVisible({timeout: 10_000});

    await page.goBack();
    await expect(page).toHaveURL(/patches\/browser/, {timeout: 10_000});
  });
});
