import { expect, test, type Page } from '@playwright/test';

test.describe('Authenticated patch editor collection cards', () => {
  test.describe.configure({mode: 'serial'});

  test('keep image and CV chips visible after the first connection', async ({page}) => {
    test.setTimeout(120_000);

    await ensureModuleOwned(page, 1718);
    await ensureModuleOwned(page, 10247);

    const patchUrl = await createOwnedPatch(page);
    await openPatchEditor(page, patchUrl);
    await switchToCollectionMode(page);

    const sourceCard = findCollectionCard(page, 'Disting EX');
    const targetCard = findCollectionCard(page, 'VCF-1');

    await expect(targetCard.locator('app-module-part-image img, app-module-part-image .preview').first())
      .toBeVisible({timeout: 10_000});
    await expect(targetCard.locator('app-module-cvitem').first()).toBeVisible({timeout: 10_000});

    await targetCard.locator('app-module-cvitem .in').first().click();
    await expect(targetCard.locator('app-module-part-image img, app-module-part-image .preview').first())
      .toBeVisible({timeout: 10_000});
    await expect(targetCard.locator('app-module-cvitem').first()).toBeVisible({timeout: 10_000});

    await sourceCard.locator('app-module-cvitem .out').first().click();

    const confirmButton = page.locator('app-brand-primary-button', {hasText: /Confirm connection/i}).last();
    await expect(confirmButton).toBeVisible({timeout: 10_000});
    await confirmButton.click();

    await expect(targetCard.locator('app-module-part-image img, app-module-part-image .preview').first())
      .toBeVisible({timeout: 10_000});
    await expect(targetCard.locator('app-module-cvitem').first()).toBeVisible({timeout: 10_000});
  });
});

async function ensureModuleOwned(page: Page, moduleId: number): Promise<void> {
  await page.goto(`/modules/details/${ moduleId }`);
  await page.waitForTimeout(3000);

  const addButton = page.getByRole('button', {name: /Add module to your collection/i}).first();
  if (!(await addButton.isVisible().catch(() => false))) {
    return;
  }

  await addButton.click();
  await page.waitForTimeout(800);

  const radios = page.getByRole('radio');
  await expect(radios.first()).toBeVisible({timeout: 10_000});
  await radios.first().click();
  await page.waitForTimeout(250);

  const dialogButtons = page.locator('mat-dialog-actions app-brand-primary-button');
  await dialogButtons.nth(1).click();
  await page.waitForTimeout(1800);
}

async function createOwnedPatch(page: Page): Promise<string> {
  await page.goto('/user/area');
  await expect(page).toHaveURL(/\/user\/area/, {timeout: 20_000});
  await expect(page.locator('app-user-patches')).toBeVisible({timeout: 20_000});

  const createPatchButton = page.locator('app-user-patches app-brand-primary-button', {hasText: /create patch/i}).first();
  await expect(createPatchButton).toBeVisible({timeout: 20_000});
  await createPatchButton.click();

  const createPatchDialog = page.locator('mat-dialog-container').last();
  await expect(page.getByRole('heading', {name: /create new patch/i})).toBeVisible({timeout: 10_000});

  const patchNameInput = createPatchDialog.getByRole('combobox', {name: /name/i}).first();
  const patchName = `[E2E] collection collapse ${ Date.now().toString().slice(-6) }`;
  await patchNameInput.fill(patchName);

  const createResponsePromise = page.waitForResponse(response =>
    response.url().includes('/rest/v1/patches')
    && response.request().method() === 'POST'
    && response.status() >= 200
    && response.status() < 300
  );

  const confirmCreateByRole = createPatchDialog.getByRole('button', {name: /^Create$/i}).first();
  if (await confirmCreateByRole.isVisible().catch(() => false)) {
    await confirmCreateByRole.click();
  } else {
    const confirmCreateByComponent = createPatchDialog.locator('app-brand-primary-button', {hasText: /create/i}).first();
    if (await confirmCreateByComponent.isVisible().catch(() => false)) {
      await confirmCreateByComponent.click();
    } else {
      await createPatchDialog.getByText(/^Create$/i).last().click();
    }
  }

  const createResponse = await createResponsePromise;
  const createdRows = await createResponse.json() as Array<{id?: number; public_id?: string | null}>;
  const createdRow = createdRows.find(row => typeof row.id === 'number');
  const createdPatchId = createdRow?.id;
  const createdPatchPublicId = createdRow?.public_id;
  expect(createdPatchId).toBeTruthy();

  await expect(createPatchDialog).toBeHidden({timeout: 20_000});
  return createdPatchPublicId ? `/patches/${ createdPatchPublicId }` : `/patches/details/${ createdPatchId }`;
}

async function openPatchEditor(page: Page, patchUrl: string): Promise<void> {
  await page.goto(patchUrl);
  await expect(page.locator('app-patch-composite').first()).toBeVisible({timeout: 20_000});

  const editingHeading = page.getByRole('heading', {name: /Patch editing/i}).first();
  const editButton = page.locator('app-edit-fab button', {hasText: /^Edit$/i}).first();
  await Promise.any([
    editingHeading.waitFor({state: 'visible', timeout: 12_000}),
    editButton.waitFor({state: 'visible', timeout: 12_000})
  ]).catch(() => undefined);

  if (!(await editingHeading.isVisible().catch(() => false))) {
    await expect(editButton).toBeVisible({timeout: 10_000});
    await editButton.click();
    await expect(editingHeading).toBeVisible({timeout: 20_000});
  }
}

async function switchToCollectionMode(page: Page): Promise<void> {
  const collectionMode = page.getByRole('radio', {name: /^Collection$/i}).first();
  await expect(collectionMode).toBeVisible({timeout: 20_000});
  if (!(await collectionMode.isChecked().catch(() => false))) {
    await collectionMode.click();
  }
  await expect(page.locator('app-patch-editor .patch-editor-controls')).toBeVisible({timeout: 20_000});
}

function findCollectionCard(page: Page, title: string) {
  return page.locator('app-module-composite').filter({has: page.getByText(title, {exact: true})}).first();
}
