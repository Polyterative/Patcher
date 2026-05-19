import {
  expect,
  test
} from '@playwright/test';


/**
 * Module Browser — "Load more" loader regression
 *
 * Verifies the lottie / update-loading-shell does NOT stay stuck after:
 *   • initial page render
 *   • clicking "Load more"
 *   • a name-filter change followed by a filter reset
 *
 * Replaces the old paginator (first/last page) tests — the app moved from
 * a paginator to an infinite-scroll "Load more" pattern.
 *
 * Regression for: lottie animation persisting after navigation.
 */
test.describe('Module Browser load-more loader', () => {
  /** Lottie inside the Load more update indicator — only in DOM while loading. */
  const LOAD_MORE_LOTTIE = 'lib-auto-update-loading-indicator app-lottie-container';
  /** The update-loading-shell rendered by lib-auto-update-loading-indicator. */
  const SETTLE_SHELL = '.browser-content-area .update-loading-shell';
  const TIMEOUT = 15_000;
  const SETTLE = 20_000;

  test.beforeEach(async ({page}) => {
    await page.goto('/modules/browser');
    await expect(page.locator('app-module-minimal').first()).toBeVisible({timeout: TIMEOUT});
    await expect(page.locator(SETTLE_SHELL)).toBeHidden({timeout: TIMEOUT});
  });

  test('initial loader is hidden once data has rendered', async ({page}) => {
    await expect(page.locator(LOAD_MORE_LOTTIE)).toBeHidden();
  });

  test('Load more button is visible once initial data loads', async ({page}) => {
    await expect(page.getByRole('button', {name: /load more/i})).toBeVisible({timeout: TIMEOUT});
  });

  test('lottie loader does not stay stuck after clicking Load more', async ({page}) => {
    const loadMoreBtn = page.getByRole('button', {name: /load more/i});
    await expect(loadMoreBtn).toBeVisible({timeout: TIMEOUT});
    await loadMoreBtn.click();

    // After the additional page arrives the lottie must disappear
    await expect(page.locator(LOAD_MORE_LOTTIE)).toBeHidden({timeout: SETTLE});
  });

  test('loader settles after a name-filter change followed by filter reset', async ({page}) => {
    await page.getByLabel('Search module...').fill('moog');
    await expect(page.locator(SETTLE_SHELL)).toBeHidden({timeout: SETTLE});

    await page.getByRole('button', {name: /reset filters/i}).click();
    await expect(page.locator(SETTLE_SHELL)).toBeHidden({timeout: SETTLE});
    await expect(page.locator('app-module-minimal').first()).toBeVisible({timeout: SETTLE});
    await expect(page.locator(LOAD_MORE_LOTTIE)).toBeHidden();
  });
});
