import { test } from '@playwright/test';
import { readFileSync, mkdirSync } from 'fs';
import path from 'path';

const OUT = '/tmp/cropper-debug';

test('screenshot module editor with panel image', async ({ browser }) => {
  mkdirSync(OUT, { recursive: true });
  const storageState = JSON.parse(readFileSync('./playwright/.auth/user.json', 'utf8'));
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, storageState });
  const page = await ctx.newPage();

  await page.goto('http://localhost:5556/user/area');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: path.join(OUT, '01-user-area.png') });

  const editLinks = page.locator('a[href*="/modules/details/"]');
  const count = await editLinks.count();
  console.log('module links:', count);
  if (count > 0) {
    const href = await editLinks.first().getAttribute('href');
    console.log('href:', href);
    await page.goto('http://localhost:5556' + href);
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: path.join(OUT, '02-module-details.png') });
  }
  await ctx.close();
});
