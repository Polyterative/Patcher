import {
  expect,
  type Page,
  test
} from '@playwright/test';


const WEIRD_QUERY = '   __ % Ω≈ç√∫˜µ≤≥÷ " \' ; <script>nope</script>   ';

test.describe('Authenticated application monkey flows', () => {
  test('survives a route storm with browser back and forward', async ({page}) => {
    const errors = collectCriticalErrors(page);

    for (const route of ['/home', '/modules/browser', '/racks/browser', '/patches/browser', '/manufacturers/browser', '/user/area']) {
      await page.goto(route);
      await expect(page).not.toHaveURL(/404/);
      await expect(page.locator('body')).toBeVisible();
    }

    await page.goBack();
    await expect(page).not.toHaveURL(/404/);
    await page.goForward();
    await expect(page).not.toHaveURL(/404/);
    expect(errors()).toEqual([]);
  });

  test('handles hostile module search input and repeated clear gestures', async ({page}) => {
    const errors = collectCriticalErrors(page);

    await page.goto('/modules/browser');
    await expect(page.locator('app-module-list')).toBeVisible({timeout: 20_000});

    const search = page.getByLabel('Search module...');
    await search.fill(WEIRD_QUERY);
    await page.keyboard.press('Meta+A');
    await page.keyboard.press('Backspace');
    await search.fill('rings');
    await expect(page.locator('.browser-content-area .update-loading-shell')).toBeHidden({timeout: 20_000});
    await search.fill('');

    await expect(page.locator('app-module-browser-root')).toBeVisible();
    expect(errors()).toEqual([]);
  });

  test('handles patch browser search, paginator, and reload churn', async ({page}) => {
    const errors = collectCriticalErrors(page);

    await page.goto('/patches/browser');
    await expect(page.locator('app-patch-list')).toBeVisible({timeout: 20_000});

    await page.getByLabel('Search patch...').fill(WEIRD_QUERY);
    await expect(page.locator('.browser-content-area .update-loading-shell')).toBeHidden({timeout: 20_000});

    const nextPage = page.getByRole('button', {name: /next page/i});
    if (await nextPage.isEnabled().catch(() => false)) {
      await nextPage.click();
      await expect(page.locator('app-patch-list')).toBeVisible({timeout: 20_000});
    }

    await page.reload();
    await expect(page).toHaveURL(/patches\/browser/);
    expect(errors()).toEqual([]);
  });

  test('handles rack browser viewport changes during active filtering', async ({page}) => {
    const errors = collectCriticalErrors(page);

    await page.goto('/racks/browser');
    await expect(page.locator('app-rack-list')).toBeVisible({timeout: 20_000});

    await page.getByLabel('Search rack...').fill('performance');
    await page.setViewportSize({width: 390, height: 844});
    await expect(page.locator('app-rack-browser-root')).toBeVisible();
    await page.setViewportSize({width: 1440, height: 900});
    await expect(page.locator('app-rack-browser-root')).toBeVisible();

    expect(errors()).toEqual([]);
  });

  test('handles manufacturer weird search and reset without losing rows', async ({page}) => {
    const errors = collectCriticalErrors(page);

    await page.goto('/manufacturers/browser');
    await expect(page.locator('app-manufacturer-row').first()).toBeVisible({timeout: 20_000});

    await page.getByLabel(/search manufacturer/i).fill(WEIRD_QUERY);
    await page.waitForTimeout(800);

    const reset = page.getByRole('button', {name: /reset filters/i});
    if (await reset.isEnabled().catch(() => false)) {
      await reset.click();
    }

    await expect(page.getByLabel(/search manufacturer/i)).toHaveValue('', {timeout: 10_000});
    await expect(page.locator('app-manufacturer-row').first()).toBeVisible({timeout: 20_000});
    expect(errors()).toEqual([]);
  });

  test('does not create a patch from an invalid overlong create-dialog name', async ({page}) => {
    const errors = collectCriticalErrors(page);
    let patchPostCount = 0;
    page.on('request', request => {
      if (request.url().includes('/rest/v1/patches') && request.method() === 'POST') {
        patchPostCount++;
      }
    });

    await page.goto('/user/area');
    await expect(page.locator('app-user-patches')).toBeVisible({timeout: 20_000});
    await page.locator('app-user-patches app-brand-primary-button', {hasText: /create patch/i}).first().click();

    const dialog = page.locator('mat-dialog-container').last();
    await expect(page.getByRole('heading', {name: /create new patch/i})).toBeVisible({timeout: 10_000});
    await dialog.getByRole('textbox', {name: /name/i}).fill('[E2E] this patch name is intentionally far too long for validation');
    await dialog.getByRole('textbox', {name: /name/i}).press('Enter');
    await page.waitForTimeout(750);

    expect(patchPostCount).toBe(0);
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden({timeout: 10_000});
    expect(errors()).toEqual([]);
  });

  test('opens create-rack dialog, toggles privacy repeatedly, then cancels cleanly', async ({page}) => {
    const errors = collectCriticalErrors(page);
    let rackPostCount = 0;
    page.on('request', request => {
      if (request.url().includes('/rest/v1/racks') && request.method() === 'POST') {
        rackPostCount++;
      }
    });

    await page.goto('/user/area');
    await expect(page.locator('app-user-racks')).toBeVisible({timeout: 20_000});
    await page.locator('app-user-racks app-brand-primary-button', {hasText: /create rack/i}).first().click();

    const dialog = page.locator('mat-dialog-container').last();
    await expect(page.getByRole('heading', {name: /create new rack/i})).toBeVisible({timeout: 10_000});
    await dialog.locator('input').first().fill(WEIRD_QUERY.slice(0, 24));

    const privacyToggle = dialog.locator('mat-slide-toggle').first();
    if (await privacyToggle.isVisible().catch(() => false)) {
      await privacyToggle.click();
      await privacyToggle.click();
      await privacyToggle.click();
    }

    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden({timeout: 10_000});
    expect(rackPostCount).toBe(0);
    expect(errors()).toEqual([]);
  });

  test('survives patch detail reload, resize, comments typing, and browser history', async ({page}) => {
    const errors = collectCriticalErrors(page);

    await page.goto('/patches/details/5');
    await expect(page.locator('app-patch-composite').first()).toBeVisible({timeout: 20_000});
    await page.setViewportSize({width: 412, height: 915});
    await expect(page.locator('app-patch-composite').first()).toBeVisible();

    const commentBox = page.getByRole('textbox', {name: /add a comment/i}).first();
    if (await commentBox.isVisible({timeout: 5_000}).catch(() => false)) {
      await commentBox.fill(`${ WEIRD_QUERY }\n\nmore text`);
      await commentBox.press('Escape');
      await commentBox.fill('');
    }

    await page.goto('/home');
    await page.goBack();
    await expect(page).toHaveURL(/patches\/details\/5/);
    await expect(page.locator('app-patch-composite').first()).toBeVisible({timeout: 20_000});
    expect(errors()).toEqual([]);
  });

  test('survives module detail reloads and viewport churn around CV/tag content', async ({page}) => {
    const errors = collectCriticalErrors(page);

    await page.goto('/modules/details/1025');
    await expect(page.locator('app-module-composite').first()).toBeVisible({timeout: 20_000});
    await expect(page.locator('app-module-tags').first()).toBeAttached({timeout: 10_000});

    for (const size of [{width: 360, height: 800}, {width: 1024, height: 768}, {width: 1440, height: 900}]) {
      await page.setViewportSize(size);
      await expect(page.locator('app-module-composite').first()).toBeVisible();
    }

    await page.reload();
    await expect(page.locator('app-module-composite').first()).toBeVisible({timeout: 20_000});
    expect(errors()).toEqual([]);
  });

  test('handles submit-module invalid text, keyboard navigation, and reset-by-navigation', async ({page}) => {
    const errors = collectCriticalErrors(page);
    let modulePostCount = 0;
    page.on('request', request => {
      if (request.url().includes('/rest/v1/modules') && request.method() === 'POST') {
        modulePostCount++;
      }
    });

    await page.goto('/modules/add');
    await expect(page.getByRole('heading', {name: /submit|module/i}).first()).toBeVisible({timeout: 20_000});

    await fillIfVisible(page, /^Name$/i, WEIRD_QUERY.slice(0, 120));
    await fillIfVisible(page, /^HP$/i, '-999');
    await fillIfVisible(page, /manual url/i, 'not-a-url');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Shift+Tab');
    await page.goto('/modules/browser');

    expect(modulePostCount).toBe(0);
    await expect(page).toHaveURL(/modules\/browser/);
    expect(errors()).toEqual([]);
  });

  test('abandons a delayed module search by navigating away mid-request', async ({page}) => {
    const errors = collectCriticalErrors(page);

    await page.goto('/modules/browser');
    await expect(page.locator('app-module-list')).toBeVisible({timeout: 20_000});
    await page.route('**/rest/v1/modules*', async route => {
      await new Promise(resolve => setTimeout(resolve, 1_500));
      await route.continue();
    });

    await page.getByLabel('Search module...').fill('abandoned request');
    await page.goto('/racks/browser');
    await expect(page).toHaveURL(/racks\/browser/);
    await expect(page.locator('app-rack-browser-root')).toBeVisible({timeout: 20_000});
    expect(errors()).toEqual([]);
  });

  test('abandons a delayed rack search by navigating away mid-request', async ({page}) => {
    const errors = collectCriticalErrors(page);

    await page.goto('/racks/browser');
    await expect(page.locator('app-rack-list')).toBeVisible({timeout: 20_000});
    await page.route('**/rest/v1/racks*', async route => {
      await new Promise(resolve => setTimeout(resolve, 1_500));
      await route.continue();
    });

    await page.getByLabel('Search rack...').fill('abandoned rack request');
    await page.goto('/patches/browser');
    await expect(page).toHaveURL(/patches\/browser/);
    await expect(page.locator('app-patch-list')).toBeVisible({timeout: 20_000});
    expect(errors()).toEqual([]);
  });

  test('abandons a delayed patch search by navigating away mid-request', async ({page}) => {
    const errors = collectCriticalErrors(page);

    await page.goto('/patches/browser');
    await expect(page.locator('app-patch-list')).toBeVisible({timeout: 20_000});
    await page.route('**/rest/v1/patches*', async route => {
      await new Promise(resolve => setTimeout(resolve, 1_500));
      await route.continue();
    });

    await page.getByLabel('Search patch...').fill('abandoned patch request');
    await page.goto('/manufacturers/browser');
    await expect(page).toHaveURL(/manufacturers\/browser/);
    await expect(page.locator('app-manufacturer-row').first()).toBeVisible({timeout: 20_000});
    expect(errors()).toEqual([]);
  });

  test('survives keyboard spam while module search and filters have focus', async ({page}) => {
    const errors = collectCriticalErrors(page);

    await page.goto('/modules/browser');
    await expect(page.locator('app-module-browser-root')).toBeVisible({timeout: 20_000});

    await page.getByLabel('Search module...').focus();
    for (const key of ['Tab', 'Shift+Tab', 'Escape', 'ArrowDown', 'ArrowUp', 'Enter', 'Meta+A', 'Backspace']) {
      await page.keyboard.press(key);
    }
    await page.getByLabel('Description').fill(WEIRD_QUERY);
    await page.keyboard.press('Escape');
    await expect(page.locator('app-module-browser-root')).toBeVisible();
    expect(errors()).toEqual([]);
  });

  test('opens manufacturer detail from a row, resizes, then rides history repeatedly', async ({page}) => {
    const errors = collectCriticalErrors(page);

    await page.goto('/manufacturers/browser');
    await expect(page.locator('app-manufacturer-row').first()).toBeVisible({timeout: 20_000});
    const href = await page.locator('app-manufacturer-row .manufacturer-row-link').first().getAttribute('href');
    expect(href).toBeTruthy();

    await page.goto(href!);
    await expect(page).toHaveURL(/manufacturers\/details\/\d+/, {timeout: 20_000});
    await page.setViewportSize({width: 375, height: 812});
    await expect(page.locator('lib-hero-content-card.manufacturersBG')).toBeVisible({timeout: 20_000});
    await page.goBack();
    await expect(page).toHaveURL(/manufacturers\/browser/, {timeout: 20_000});
    await page.goForward();
    await expect(page).toHaveURL(/manufacturers\/details\/\d+/, {timeout: 20_000});
    expect(errors()).toEqual([]);
  });

  test('spams rack paginator directions and viewport flips', async ({page}) => {
    const errors = collectCriticalErrors(page);

    await page.goto('/racks/browser');
    await expect(page.locator('app-rack-list')).toBeVisible({timeout: 20_000});

    const nextPage = page.getByRole('button', {name: /next page/i});
    const previousPage = page.getByRole('button', {name: /previous page/i});
    for (const size of [{width: 360, height: 780}, {width: 1366, height: 850}, {width: 768, height: 1024}]) {
      await page.setViewportSize(size);
      if (await nextPage.isEnabled().catch(() => false)) {
        await nextPage.click();
      }
      if (await previousPage.isEnabled().catch(() => false)) {
        await previousPage.click();
      }
      await expect(page.locator('app-rack-browser-root')).toBeVisible();
    }
    expect(errors()).toEqual([]);
  });

  test('opens and escapes the create-patch dialog repeatedly without posting', async ({page}) => {
    const errors = collectCriticalErrors(page);
    let patchPostCount = 0;
    page.on('request', request => {
      if (request.url().includes('/rest/v1/patches') && request.method() === 'POST') {
        patchPostCount++;
      }
    });

    await page.goto('/user/area');
    await expect(page.locator('app-user-patches')).toBeVisible({timeout: 20_000});
    for (let i = 0; i < 3; i++) {
      await page.locator('app-user-patches app-brand-primary-button', {hasText: /create patch/i}).first().click();
      const dialog = page.locator('mat-dialog-container').last();
      await expect(page.getByRole('heading', {name: /create new patch/i})).toBeVisible({timeout: 10_000});
      await dialog.getByRole('textbox', {name: /name/i}).fill(`[E2E] escape ${ i }`);
      await page.keyboard.press('Escape');
      await expect(dialog).toBeHidden({timeout: 10_000});
    }

    expect(patchPostCount).toBe(0);
    expect(errors()).toEqual([]);
  });

  test('opens and escapes the create-rack dialog repeatedly without posting', async ({page}) => {
    const errors = collectCriticalErrors(page);
    let rackPostCount = 0;
    page.on('request', request => {
      if (request.url().includes('/rest/v1/racks') && request.method() === 'POST') {
        rackPostCount++;
      }
    });

    await page.goto('/user/area');
    await expect(page.locator('app-user-racks')).toBeVisible({timeout: 20_000});
    for (let i = 0; i < 3; i++) {
      await page.locator('app-user-racks app-brand-primary-button', {hasText: /create rack/i}).first().click();
      const dialog = page.locator('mat-dialog-container').last();
      await expect(page.getByRole('heading', {name: /create new rack/i})).toBeVisible({timeout: 10_000});
      await dialog.locator('input').first().fill(`[E2E] escape ${ i }`);
      await page.keyboard.press('Escape');
      await expect(dialog).toBeHidden({timeout: 10_000});
    }

    expect(rackPostCount).toBe(0);
    expect(errors()).toEqual([]);
  });

  test('survives weird module-detail query strings, hash changes, reload, and history', async ({page}) => {
    const errors = collectCriticalErrors(page);

    await page.goto(`/modules/details/1025?monkey=${ encodeURIComponent(WEIRD_QUERY) }#${ encodeURIComponent(WEIRD_QUERY) }`);
    await expect(page.locator('app-module-composite').first()).toBeVisible({timeout: 20_000});
    await page.evaluate(() => {
      location.hash = '#another-weird-fragment';
    });
    await page.reload();
    await expect(page.locator('app-module-composite').first()).toBeVisible({timeout: 20_000});
    await page.goto('/modules/browser');
    await page.goBack();
    await expect(page).toHaveURL(/modules\/details\/1025/, {timeout: 20_000});
    expect(errors()).toEqual([]);
  });

  test('survives submit-module autocomplete typing and immediate route changes', async ({page}) => {
    const errors = collectCriticalErrors(page);
    let modulePostCount = 0;
    page.on('request', request => {
      if (request.url().includes('/rest/v1/modules') && request.method() === 'POST') {
        modulePostCount++;
      }
    });

    await page.goto('/modules/add');
    await expect(page.getByRole('heading', {name: /submit|module/i}).first()).toBeVisible({timeout: 20_000});
    await fillIfVisible(page, /^Name$/i, 'Monkey Immediate Route');
    await fillIfVisible(page, /manufacturer/i, WEIRD_QUERY.slice(0, 40));
    await page.keyboard.press('Escape');
    await page.goto('/patches/browser');
    await expect(page).toHaveURL(/patches\/browser/);

    expect(modulePostCount).toBe(0);
    expect(errors()).toEqual([]);
  });
});

async function fillIfVisible(page: Page, label: RegExp, value: string): Promise<void> {
  const input = page.getByRole('textbox', {name: label}).first();
  if (await input.isVisible({timeout: 5_000}).catch(() => false)) {
    await input.fill(value);
  }
}

function collectCriticalErrors(page: Page): () => string[] {
  const errors: string[] = [];
  const criticalPattern = /(TypeError|ReferenceError|NullInjectorError|ExpressionChangedAfterItHasBeenCheckedError|PAGE_ERROR)/i;

  page.on('pageerror', error => errors.push(`PAGE_ERROR: ${ error.message }`));
  page.on('console', message => {
    if (message.type() !== 'error') return;
    const text = message.text();
    if (text.includes('Failed to fetch')) return;
    if (criticalPattern.test(text)) {
      errors.push(text);
    }
  });

  return () => errors;
}
