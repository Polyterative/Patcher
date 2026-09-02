import {
  expect,
  test
} from '@playwright/test';

const CHUNK_RECOVERY_QUERY = '__patcher_chunk_reload';

test('recovers from one failed lazy chunk and loads the intended destination', async ({page}) => {
  await page.goto('/home');
  await expect(page.locator('div.home-page h1').first()).toBeVisible({timeout: 15_000});

  let abortedChunk = false;
  await page.route('**/*.js**', async route => {
    const request = route.request();
    if (!abortedChunk
      && request.resourceType() === 'script'
      && /\/chunk-[^/]+\.js(?:\?|$)/.test(request.url())) {
      abortedChunk = true;
      await route.abort('failed');
      return;
    }

    await route.continue();
  });

  await page.getByRole('link', {name: /browse modules/i}).first().click();

  await expect(page).toHaveURL(/\/modules\/browser(?:\?.*)?$/, {timeout: 30_000});
  await expect.poll(() => abortedChunk).toBe(true);
  await expect(page.locator('app-module-browser-root')).toBeAttached({timeout: 30_000});
  await expect(page).toHaveURL(/\/modules\/browser$/, {timeout: 30_000});
  expect(new URL(page.url()).searchParams.has(CHUNK_RECOVERY_QUERY)).toBe(false);
});
