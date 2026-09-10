import {
  expect,
  type Page,
  test
} from '@playwright/test';


const RACK_NAME_PREFIX = '[E2E] reload rack';

test.describe('Authenticated user-area rack reload', () => {
  test.describe.configure({mode: 'serial'});

  let rackUrl = '';
  let rackName = '';

  test.beforeEach(async ({page}) => {
    rackName = `${ RACK_NAME_PREFIX } ${ Date.now().toString().slice(-6) }`;
    rackUrl = await createRack(page, rackName);
  });

  test.afterEach(async ({page}) => {
    await deleteRack(page, rackUrl);
  });

  test('keeps the created rack record visible after a full page reload', async ({page}) => {
    await page.goto('/user/area');
    await expectUserAreaRack(page, rackName);

    await page.reload();

    await expectUserAreaRack(page, rackName);
  });
});

async function createRack(page: Page, name: string): Promise<string> {
  await page.goto('/user/area');
  await expect(page.locator('app-user-racks')).toBeVisible({timeout: 20_000});

  await page.locator('app-user-racks app-brand-primary-button', {hasText: /create rack/i}).first().click();
  const dialog = page.locator('mat-dialog-container').last();
  await expect(dialog).toBeVisible({timeout: 10_000});
  await dialog.locator('input').first().fill(name);

  const createResponse = page.waitForResponse(response =>
    response.url().includes('/rest/v1/racks')
    && response.request().method() === 'POST'
    && response.ok(),
  {timeout: 15_000});

  await dialog.locator('mat-dialog-actions app-brand-primary-button', {hasText: /create/i}).first().click();
  const payload = await (await createResponse).json() as {public_id?: string | null}[] | {public_id?: string | null};
  const rack = Array.isArray(payload) ? payload[0] : payload;
  expect(rack?.public_id).toBeTruthy();

  await expect(dialog).toBeHidden({timeout: 20_000});
  return `/racks/${ rack.public_id }`;
}

async function expectUserAreaRack(page: Page, name: string): Promise<void> {
  await expect(page).toHaveURL(/\/user\/area/, {timeout: 20_000});
  await expect(page.locator('app-user-area-root')).toBeVisible({timeout: 20_000});

  const rackCard = page.locator('app-user-racks lib-clean-card', {hasText: name}).first();
  await expect(rackCard).toBeVisible({timeout: 20_000});
  await expect(rackCard).toContainText(name);
  await expect(rackCard).toContainText(/HP|rows/i);
}

async function deleteRack(page: Page, url: string): Promise<void> {
  if (!url) return;

  try {
    await page.goto(url, {timeout: 15_000});
    await expect(page.locator('app-rack-editor')).toBeVisible({timeout: 15_000});

    const editButton = page.getByRole('button', {name: /^Edit rack$/i}).first();
    if (await editButton.isVisible().catch(() => false)) {
      await editButton.click();
    }
    await expect(page.locator('app-module-browser-root')).toBeVisible({timeout: 15_000});

    const deleteButton = page.locator('app-rack-minimal button[mattooltip="Delete rack"]').first();
    await expect(deleteButton).toBeVisible({timeout: 8_000});
    await deleteButton.click();

    const confirmDelete = page.locator('mat-dialog-actions button, mat-dialog-actions app-brand-primary-button')
      .filter({hasText: /delete|confirm|yes/i}).first();
    await expect(confirmDelete).toBeVisible({timeout: 8_000});
    await confirmDelete.click();
    await expect(page).not.toHaveURL(url, {timeout: 10_000});
  } catch {
    // Best-effort cleanup for the dedicated E2E rack.
  }
}
