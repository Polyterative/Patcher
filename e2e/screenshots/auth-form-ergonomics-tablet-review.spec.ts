import fs from 'node:fs';
import path from 'node:path';
import {
  expect,
  test
} from '@playwright/test';


const TABLET_VIEWPORT = {width: 820, height: 1180} as const;
const OUTPUT_DIR = path.resolve(process.cwd(), 'output/form-ergonomics-review');

test.describe('Tablet form ergonomics review', () => {
  test.use({
    viewport: TABLET_VIEWPORT,
    hasTouch: true,
    isMobile: true,
    storageState: {
      cookies: [],
      origins: []
    }
  });

  test('captures login and reset-password tablet states with explicit keyboard hints', async ({page}) => {
    ensureOutputDir();
    await page.goto('/auth/login');

    const loginEmail = page.locator('app-login-email input').first();
    const loginPassword = page.locator('app-login-email input[type="password"]').first();

    await expect(loginEmail).toBeVisible({timeout: 20_000});
    await expect(loginEmail).toHaveAttribute('enterkeyhint', 'next');
    await expect(loginPassword).toHaveAttribute('enterkeyhint', 'send');

    await loginEmail.focus();
    await page.screenshot({
      path: path.join(OUTPUT_DIR, 'tablet-login-form.png'),
      type: 'png'
    });

    await page.locator('.action-link-wrapper.reset-link').click();

    const resetEmail = page.locator('.password-reset-container input').first();
    await expect(resetEmail).toBeVisible({timeout: 20_000});
    await expect(resetEmail).toHaveAttribute('enterkeyhint', 'send');

    await resetEmail.focus();
    await page.screenshot({
      path: path.join(OUTPUT_DIR, 'tablet-login-reset-form.png'),
      type: 'png'
    });
  });

  test('captures signup tablet state with next-to-done progression', async ({page}) => {
    ensureOutputDir();
    await page.goto('/auth/signup');

    const inputs = page.locator('app-signup-email input');
    await expect(inputs.nth(0)).toBeVisible({timeout: 20_000});
    await expect(inputs.nth(0)).toHaveAttribute('enterkeyhint', 'next');
    await expect(inputs.nth(1)).toHaveAttribute('enterkeyhint', 'next');
    await expect(inputs.nth(2)).toHaveAttribute('enterkeyhint', 'next');
    await expect(inputs.nth(3)).toHaveAttribute('enterkeyhint', 'done');

    await inputs.nth(0).focus();
    await page.screenshot({
      path: path.join(OUTPUT_DIR, 'tablet-signup-form.png'),
      type: 'png'
    });
  });
});

test.describe('Authenticated tablet search ergonomics review', () => {
  test.use({
    viewport: TABLET_VIEWPORT,
    hasTouch: true,
    isMobile: true
  });

  test('captures the user-area floating search with shared search keyboard hints', async ({page}) => {
    ensureOutputDir();
    await page.goto('/user/area');

    const searchInput = page.locator('.user-area-floating-search input').first();
    await expect(searchInput).toBeVisible({timeout: 20_000});
    await expect(searchInput).toHaveAttribute('inputmode', 'search');
    await expect(searchInput).toHaveAttribute('enterkeyhint', 'search');

    await searchInput.focus();
    await page.screenshot({
      path: path.join(OUTPUT_DIR, 'tablet-user-area-search.png'),
      type: 'png'
    });
  });
});

function ensureOutputDir(): void {
  fs.mkdirSync(OUTPUT_DIR, {recursive: true});
}
