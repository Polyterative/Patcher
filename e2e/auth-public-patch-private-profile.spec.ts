import {
  expect,
  test,
  type Browser,
  type Page
} from '@playwright/test';


test.describe('Public patch visibility with private profile', () => {
  test('public patch detail stays accessible when the author profile is private', async ({page, browser, baseURL}) => {
    let username = '';
    let patchId: number | null = null;
    let patchName = '';
    let profileWasPublic = false;
    let patchWasPrivate = false;

    await page.goto('/user/area');
    await expect(page).toHaveURL(/\/user\/area/, {timeout: 20_000});
    await expect(page.locator('app-user-patches')).toBeVisible({timeout: 20_000});

    username = await readUsername(page);
    profileWasPublic = await isProfilePublic(page);

    const firstPatchTitle = page.locator('app-user-patches app-hero-clickable-title .title').first();
    await expect(firstPatchTitle).toBeVisible({timeout: 20_000});
    patchName = ((await firstPatchTitle.textContent()) ?? '').trim();
    expect(patchName.length).toBeGreaterThan(0);
    await firstPatchTitle.click();

    await expect(page).toHaveURL(/\/patches\/details\/\d+/, {timeout: 20_000});
    patchId = extractPatchId(page.url());
    await expect(page.locator('app-patch-composite').first()).toBeVisible({timeout: 20_000});

    patchWasPrivate = await isPatchPrivate(page);

    try {
      if (patchWasPrivate) {
        await setPatchPrivacy(page, false);
      }

      if (profileWasPublic) {
        await page.goto('/user/area');
        await expect(page).toHaveURL(/\/user\/area/, {timeout: 20_000});
        await setProfileVisibility(page, false);
      }

      const visitorPage = await openVisitorPage(browser, baseURL ?? 'http://localhost:5556');

      try {
        await visitorPage.goto(`/u/${ username }`);
        await expect(visitorPage.getByText('This profile is private.')).toBeVisible({timeout: 20_000});

        await visitorPage.goto(`/patches/details/${ patchId }`);
        await expect(visitorPage).toHaveURL(new RegExp(`/patches/details/${ patchId }$`), {timeout: 20_000});
        await expect(visitorPage.locator('app-patch-composite').first()).toBeVisible({timeout: 20_000});
        await expect(visitorPage.getByText(patchName, {exact: true}).first()).toBeVisible({timeout: 20_000});
      } finally {
        await visitorPage.context().close();
      }
    } finally {
      if (patchId !== null) {
        await page.goto(`/patches/details/${ patchId }`);
        await expect(page).toHaveURL(new RegExp(`/patches/details/${ patchId }$`), {timeout: 20_000});

        if (patchWasPrivate !== await isPatchPrivate(page)) {
          await setPatchPrivacy(page, patchWasPrivate);
        }
      }

      await page.goto('/user/area');
      await expect(page).toHaveURL(/\/user\/area/, {timeout: 20_000});

      if (profileWasPublic !== await isProfilePublic(page)) {
        await setProfileVisibility(page, profileWasPublic);
      }
    }
  });
});

async function readUsername(page: Page): Promise<string> {
  const userCard = page.locator('app-label-value-showcase', {hasText: /User/i}).first();
  await expect(userCard).toBeVisible({timeout: 10_000});
  const text = (await userCard.textContent())?.trim() ?? '';
  const username = text.replace(/^User\s*/i, '').trim();
  expect(username.length).toBeGreaterThan(0);
  return username;
}

function extractPatchId(url: string): number {
  const match = url.match(/\/patches\/details\/(\d+)/);
  expect(match).not.toBeNull();
  return Number(match![1]);
}

async function isProfilePublic(page: Page): Promise<boolean> {
  const makePrivateButton = page.locator('app-brand-primary-button', {hasText: /make profile private/i}).first();
  if (await makePrivateButton.isVisible().catch(() => false)) {
    return true;
  }

  const makePublicButton = page.locator('app-brand-primary-button', {hasText: /make profile public/i}).first();
  await expect(makePublicButton).toBeVisible({timeout: 10_000});
  return false;
}

async function setProfileVisibility(page: Page, shouldBePublic: boolean): Promise<void> {
  const targetButton = page.locator('app-brand-primary-button', {
    hasText: shouldBePublic ? /make profile public/i : /make profile private/i
  }).first();
  await expect(targetButton).toBeVisible({timeout: 10_000});
  await targetButton.click();
  await expect(page.locator('app-brand-primary-button', {
    hasText: shouldBePublic ? /make profile private/i : /make profile public/i
  }).first()).toBeVisible({timeout: 20_000});
}

async function isPatchPrivate(page: Page): Promise<boolean> {
  const lockButton = page.locator('button:has(mat-icon:has-text("lock"))').first();
  if (await lockButton.isVisible().catch(() => false)) {
    return true;
  }

  const publicButton = page.locator('button:has(mat-icon:has-text("public"))').first();
  await expect(publicButton).toBeVisible({timeout: 10_000});
  return false;
}

async function setPatchPrivacy(page: Page, shouldBePrivate: boolean): Promise<void> {
  const targetButton = page.locator(`button:has(mat-icon:has-text("${ shouldBePrivate ? 'public' : 'lock' }"))`).first();
  await expect(targetButton).toBeVisible({timeout: 10_000});
  await targetButton.click();
  await expect(page.locator(`button:has(mat-icon:has-text("${ shouldBePrivate ? 'lock' : 'public' }"))`).first())
    .toBeVisible({timeout: 20_000});
}

async function openVisitorPage(browser: Browser, baseURL: string): Promise<Page> {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(baseURL);
  return page;
}
