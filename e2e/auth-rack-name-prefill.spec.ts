import {
  expect,
  Page,
  test,
} from '@playwright/test';


const RACK_NAME_PREFIX = '[E2E] name-prefill';

test.describe('Rack name field pre-fill on edit', () => {
  test.describe.configure({mode: 'serial'});

  let rackUrl = '';
  let rackName = '';

  test.beforeAll(async ({browser}) => {
    const page = await browser.newPage();
    rackName = `${RACK_NAME_PREFIX} ${Date.now().toString().slice(-6)}`;
    rackUrl = await createRack(page, rackName);
    await lockRack(page);
    await page.close();
  });

  test.afterAll(async ({browser}) => {
    if (!rackUrl) {
      return;
    }

    const page = await browser.newPage();
    try {
      await page.goto(rackUrl, {timeout: 15_000});
      await expect(page.locator('app-rack-editor')).toBeVisible({timeout: 15_000});
      await enterEditMode(page);

      const deleteBtn = page.locator('app-rack-minimal button[mattooltip="Delete rack"]').first();
      await expect(deleteBtn).toBeVisible({timeout: 8_000});
      await deleteBtn.click();

      const confirmDelete = page.locator('mat-dialog-actions button, mat-dialog-actions app-brand-primary-button')
        .filter({hasText: /delete|confirm|yes/i}).first();
      await expect(confirmDelete).toBeVisible({timeout: 8_000});
      await confirmDelete.click();
      await expect(page).not.toHaveURL(rackUrl, {timeout: 10_000});
    } catch {
      // Best-effort cleanup.
    }
    await page.close();
  });

  test('name input is pre-filled immediately when entering edit mode', async ({page}) => {
    test.setTimeout(60_000);

    await page.goto(rackUrl);
    await expect(page.locator('app-rack-editor')).toBeVisible({timeout: 15_000});

    await enterEditMode(page);

    const nameInput = page.locator('app-rack-minimal lib-mat-form-entity input').first();
    await expect(nameInput).toBeVisible({timeout: 8_000});
    await expect(nameInput).toHaveValue(rackName);
  });

  test('name input is pre-filled after navigating away and back', async ({page}) => {
    test.setTimeout(60_000);

    await page.goto(rackUrl);
    await expect(page.locator('app-rack-editor')).toBeVisible({timeout: 15_000});

    // Navigate away
    await page.goto('/modules');
    await expect(page).toHaveURL(/\/modules/, {timeout: 10_000});

    // Navigate back
    await page.goto(rackUrl);
    await expect(page.locator('app-rack-editor')).toBeVisible({timeout: 15_000});

    await enterEditMode(page);

    const nameInput = page.locator('app-rack-minimal lib-mat-form-entity input').first();
    await expect(nameInput).toBeVisible({timeout: 8_000});
    await expect(nameInput).toHaveValue(rackName);
  });
});


async function createRack(page: Page, rackName: string): Promise<string> {
  await page.goto('/user/area');
  await expect(page).toHaveURL(/\/user\/area/, {timeout: 20_000});

  const createRackBtn = page.locator('app-user-racks app-brand-primary-button', {hasText: /create rack/i}).first();
  await expect(createRackBtn).toBeVisible({timeout: 15_000});
  await createRackBtn.click();

  const createRackDialog = page.locator('mat-dialog-container').last();
  await expect(createRackDialog).toBeVisible({timeout: 10_000});
  await createRackDialog.locator('input').first().fill(rackName);

  const createRackResponse = page.waitForResponse(async response => {
    if (!response.url().includes('/rest/v1/racks') || response.request().method() !== 'POST') {
      return false;
    }

    return response.ok();
  }, {timeout: 15_000});

  const confirmBtn = page.locator('mat-dialog-actions app-brand-primary-button', {hasText: /create/i}).first();
  await expect(confirmBtn).toBeVisible({timeout: 10_000});
  await confirmBtn.click();

  const payload = await (await createRackResponse).json();
  const firstRack = Array.isArray(payload) ? payload[0] : payload;
  const publicId = firstRack?.public_id;
  expect(publicId).toBeTruthy();

  const url = `/racks/${publicId}`;
  await page.goto(url);
  await expect(page).toHaveURL(new RegExp(`/racks/${publicId}(?:$|[?#])`), {timeout: 15_000});

  return url;
}

function editFabEditButton(page: Page) {
  return page.locator('app-edit-fab').getByRole('button', {name: /^Edit rack$/i});
}

function editFabLockButton(page: Page) {
  return page.locator('app-edit-fab').getByRole('button', {name: /^(Lock rack|Discard changes)$/i});
}

async function enterEditMode(page: Page): Promise<void> {
  const moduleBrowser = page.locator('app-module-browser-root');
  const lockButton = editFabLockButton(page);

  if (
    await lockButton.isVisible().catch(() => false)
    || await moduleBrowser.isVisible().catch(() => false)
  ) {
    return;
  }

  const editButton = editFabEditButton(page);
  await expect(editButton).toBeVisible({timeout: 10_000});
  await editButton.click();
  await expect(moduleBrowser).toBeVisible({timeout: 10_000});
}

async function lockRack(page: Page): Promise<void> {
  const editButton = editFabEditButton(page);
  if (await editButton.isVisible().catch(() => false)) {
    return;
  }

  const lockButton = editFabLockButton(page);
  await expect(lockButton).toBeVisible({timeout: 10_000});
  await lockButton.click();

  await expect(editButton).toBeVisible({timeout: 10_000});
}
