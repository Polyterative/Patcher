import {
  expect,
  test
} from '@playwright/test';


/**
 * Patch Graph Stability — regression tests
 *
 * Covers issue #121 ("Patch view sometimes glitches out").
 * The sample patch (107) has historically triggered prolonged graph wobble.
 */
test.describe('Patch Graph Stability', () => {
  test('self-referential graph settles without prolonged rebuild flicker', async ({page}) => {
    const pageErrors: string[] = [];
    page.on('pageerror', error => pageErrors.push(error.message));

    await page.goto('/patches/details/107');
    await expect(page).not.toHaveURL(/404/);
    await expect(page).toHaveURL(/patches\/details\/107/);

    const graphContainer = page.locator('app-patch-graph .graph-container');
    await expect(graphContainer).toBeVisible({timeout: 20_000});

    const graph = graphContainer.locator('lib-graph');
    await expect(graph).toBeVisible({timeout: 15_000});

    // Once built, the placeholder should not return repeatedly.
    const buildingText = graphContainer.getByText('Building graph...');
    await expect(buildingText).toHaveCount(0, {timeout: 8_000});

    const staleOverlay = graphContainer.locator('.graph-stale-overlay');
    await expect(staleOverlay).toHaveCount(0);

    // Hold the page long enough to catch regressions where graph rebuilds keep retriggering.
    await page.waitForTimeout(3500);
    await expect(graph).toBeVisible();
    await expect(buildingText).toHaveCount(0);
    await expect(staleOverlay).toHaveCount(0);
    expect(pageErrors).toEqual([]);
  });
});
