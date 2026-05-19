import {
  expect,
  test,
  type Browser,
  type Page
} from '@playwright/test';


test.describe('Public patch visibility with private profile', () => {
  test('public patch detail stays accessible when the author profile is private', async ({page, browser, baseURL}) => {
    let username = '';
    let createdPatchId: number | null = null;
    let createdPatchUrl = '';
    let patchName = '';
    let profileWasPublic = false;
    let patchWasPrivate = false;

    await page.goto('/user/area');
    await expect(page).toHaveURL(/\/user\/area/, {timeout: 20_000});
    await expect(page.locator('app-user-patches')).toBeVisible({timeout: 20_000});

    username = await readUsername(page);
    profileWasPublic = await isProfilePublic(page);

    const testPatch = await createTestPatch(page);
    createdPatchId = testPatch.patchId;
    createdPatchUrl = testPatch.patchUrl;
    patchName = testPatch.patchName;
    await page.goto(createdPatchUrl);
    await expect(page.locator('app-patch-composite').first()).toBeVisible({timeout: 20_000});
    await expect(page.getByText(patchName, {exact: true}).first()).toBeVisible({timeout: 20_000});

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

        await visitorPage.goto(createdPatchUrl);
        await expect(visitorPage).toHaveURL(new RegExp(`${ escapeRegex(createdPatchUrl) }$`), {timeout: 20_000});
        await expect(visitorPage.locator('app-patch-composite').first()).toBeVisible({timeout: 20_000});
        await expect(visitorPage.getByText(patchName, {exact: true}).first()).toBeVisible({timeout: 20_000});
      } finally {
        await visitorPage.context().close();
      }
    } finally {
      if (createdPatchId !== null) {
        await page.goto(createdPatchUrl);
        await expect(page).toHaveURL(new RegExp(`${ escapeRegex(createdPatchUrl) }$`), {timeout: 20_000});

        if (patchWasPrivate !== await isPatchPrivate(page)) {
          await setPatchPrivacy(page, patchWasPrivate);
        }
      }

      await page.goto('/user/area');
      await expect(page).toHaveURL(/\/user\/area/, {timeout: 20_000});

      if (profileWasPublic !== await isProfilePublic(page)) {
        await setProfileVisibility(page, profileWasPublic);
      }

      if (createdPatchId !== null) {
        await deletePatch(page, createdPatchUrl);
      }
    }
  });
});

async function readUsername(page: Page): Promise<string> {
  const publicProfileLink = page.locator('a[href^="/u/"]').first();
  const href = await publicProfileLink.getAttribute('href').catch(() => null);
  const usernameFromLink = href?.match(/^\/u\/([^/?#]+)/)?.[1];
  if (usernameFromLink) {
    return decodeURIComponent(usernameFromLink);
  }

  const userCard = page.locator('app-label-value-showcase', {hasText: /User/i}).first();
  await expect(userCard).toBeVisible({timeout: 10_000});
  const text = (await userCard.textContent())?.trim() ?? '';
  const username = text.replace(/^User\s*/i, '').trim();
  expect(username.length).toBeGreaterThan(0);
  return username;
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
  const context = await browser.newContext({baseURL});
  const page = await context.newPage();
  await page.goto(baseURL);
  return page;
}

async function createTestPatch(page: Page): Promise<{patchId: number; patchUrl: string; patchName: string}> {
  const patchName = `[E2E] private-profile ${ Date.now().toString().slice(-6) }`;

  await page.goto('/user/area');
  await expect(page.locator('app-user-patches')).toBeVisible({timeout: 20_000});

  const createButton = page.locator('app-user-patches app-brand-primary-button', {hasText: /create patch/i}).first();
  await expect(createButton).toBeVisible({timeout: 20_000});
  await createButton.click();

  const dialog = page.locator('mat-dialog-container').last();
  await expect(page.getByRole('heading', {name: /create new patch/i})).toBeVisible({timeout: 10_000});
  await dialog.getByRole('combobox', {name: /name/i}).first().fill(patchName);

  const createResponse = page.waitForResponse(response =>
    response.url().includes('/rest/v1/patches')
    && response.request().method() === 'POST'
    && response.ok(), {timeout: 20_000});

  const createBtn = dialog.getByRole('button', {name: /^Create$/i}).first();
  if (await createBtn.isVisible().catch(() => false)) {
    await createBtn.click();
  } else {
    await dialog.locator('app-brand-primary-button', {hasText: /create/i}).first().click();
  }

  const payload = await (await createResponse).json();
  const row = Array.isArray(payload) ? payload[0] : payload;
  const patchId = row?.id;
  const patchPublicId = row?.public_id;
  expect(patchId).toBeTruthy();
  await expect(dialog).toBeHidden({timeout: 20_000});

  return {
    patchId,
    patchUrl: patchPublicId ? `/patches/${ patchPublicId }` : `/patches/details/${ patchId }`,
    patchName
  };
}

async function deletePatch(page: Page, patchUrl: string): Promise<void> {
  try {
    await page.goto(patchUrl, {timeout: 20_000});
    await expect(page.locator('app-patch-composite').first()).toBeVisible({timeout: 20_000});

    const deleteButton = page.locator('button[mattooltip="Delete patch"]').first();
    await expect(deleteButton).toBeVisible({timeout: 10_000});
    await deleteButton.click();

    const dialog = page.locator('mat-dialog-container').last();
    await expect(page.getByRole('heading', {name: /delete this patch/i}).first()).toBeVisible({timeout: 8_000});

    const deleteResponse = page.waitForResponse(response =>
      response.url().includes('/rest/v1/patches')
      && response.request().method() === 'DELETE'
      && response.ok(), {timeout: 8_000}).catch(() => undefined);

    const confirmButton = dialog.getByRole('button', {name: /^Delete$/i}).first();
    if (await confirmButton.isVisible({timeout: 2_000}).catch(() => false)) {
      await confirmButton.click();
    } else {
      await dialog.locator('app-brand-primary-button', {hasText: /delete/i}).first().click();
    }
    await deleteResponse;
  } catch {
    // Best-effort cleanup for the dedicated E2E patch.
  }
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
