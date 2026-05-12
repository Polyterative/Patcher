import {
  expect,
  type Page,
  test
} from '@playwright/test';


type CreatedPatch = {
  id: number;
  url: string;
  initialName: string;
  renamedName: string;
  description: string;
  tag: string;
};

test.describe('Authenticated complete patch flow', () => {
  test.describe.configure({mode: 'serial'});

  let createdPatch: CreatedPatch | undefined;

  test.afterAll(async ({browser}) => {
    if (!createdPatch) return;

    const context = await browser.newContext({
      storageState: 'playwright/.auth/user.json'
    });
    const page = await context.newPage();
    await deletePatch(page, createdPatch);
    await context.close();
  });

  test('creates a named patch, edits metadata, flips privacy, and verifies reload persistence', async ({page}, testInfo) => {
    test.setTimeout(120_000);
    const errors = collectCriticalErrors(page);

    createdPatch = await createNamedPatch(page, testInfo.title);
    await openPatch(page, createdPatch);
    await expect(page.getByText(createdPatch.initialName, {exact: true}).first()).toBeVisible({timeout: 20_000});

    await enterPatchEditMode(page);

    const patchUpdate = waitForPatchMutation(page);
    await page.getByRole('textbox', {name: /^Patch name$/i}).fill(createdPatch.renamedName);
    await page.getByRole('textbox', {name: /^Patch description$/i}).fill(createdPatch.description);
    await patchUpdate;

    await addPatchTag(page, createdPatch.tag);

    const privacyUpdate = waitForPatchMutation(page);
    await togglePatchPrivacy(page);
    await privacyUpdate;

    await closePatchEditor(page);
    await expect(page.getByRole('heading', {name: /Patch details/i}).first()).toBeVisible({timeout: 20_000});
    await expect(page.getByText(createdPatch.renamedName, {exact: true}).first()).toBeVisible({timeout: 20_000});

    await page.reload();
    await expect(page.getByRole('heading', {name: /Patch (details|editing)/i}).first()).toBeVisible({timeout: 20_000});
    await closePatchEditor(page);
    await expect(page.getByText(createdPatch.renamedName, {exact: true}).first()).toBeVisible({timeout: 20_000});

    await enterPatchEditMode(page);
    await expect(page.getByRole('textbox', {name: /^Patch name$/i})).toHaveValue(createdPatch.renamedName);
    await expect(page.getByRole('textbox', {name: /^Patch description$/i})).toHaveValue(createdPatch.description);
    await expect(page.getByText(createdPatch.tag, {exact: true}).first()).toBeVisible({timeout: 10_000});
    await closePatchEditor(page);

    expect(errors()).toEqual([]);
  });

  test('reopens the created patch and survives a long edit/view/editor-control loop', async ({page}) => {
    test.setTimeout(120_000);
    expect(createdPatch).toBeDefined();
    const patch = createdPatch!;
    const errors = collectCriticalErrors(page);

    await openPatch(page, patch);

    for (let cycle = 0; cycle < 3; cycle++) {
      await enterPatchEditMode(page);
      await expect(page.locator('app-patch-editor')).toBeVisible({timeout: 20_000});

      const collectionMode = page.getByRole('radio', {name: /^Collection$/i}).first();
      await expect(collectionMode).toBeVisible({timeout: 15_000});
      if (!(await collectionMode.isChecked().catch(() => false))) {
        await collectionMode.click();
      }

      const searchInput = page.getByRole('textbox', {name: /find module in collection/i}).first();
      if (await searchInput.isVisible({timeout: 10_000}).catch(() => false)) {
        await searchInput.fill(`zz-complete-flow-${ cycle }`);
        await expect(
          page.getByText(new RegExp(`No modules match "zz-complete-flow-${ cycle }"|No modules in your collection yet`, 'i')).first()
        ).toBeVisible({timeout: 15_000});

        const clearSearch = page.getByRole('button', {name: /clear search/i}).first();
        if (await clearSearch.isVisible({timeout: 3_000}).catch(() => false)) {
          await clearSearch.click();
        }
      }

      await closePatchEditor(page);
      await expect(page.getByRole('heading', {name: /Patch details/i}).first()).toBeVisible({timeout: 20_000});
      await expect(page.getByText(patch.renamedName, {exact: true}).first()).toBeVisible({timeout: 20_000});
    }

    await page.goto('/user/area');
    await expect(page.locator('app-user-patches')).toBeVisible({timeout: 20_000});
    await expect(page.getByText(patch.renamedName, {exact: true}).first()).toBeVisible({timeout: 20_000});

    expect(errors()).toEqual([]);
  });
});

async function createNamedPatch(page: Page, title: string): Promise<CreatedPatch> {
  const suffix = `${ Date.now().toString().slice(-6) }-${ title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 4) }`;
  const initialName = `[E2E] patch ${ suffix }`;

  await page.goto('/user/area');
  await expect(page).toHaveURL(/\/user\/area/, {timeout: 20_000});
  await expect(page.locator('app-user-patches')).toBeVisible({timeout: 20_000});

  const createPatchButton = page.locator('app-user-patches app-brand-primary-button', {hasText: /create patch/i}).first();
  await expect(createPatchButton).toBeVisible({timeout: 20_000});
  await createPatchButton.click();

  const dialog = page.locator('mat-dialog-container').last();
  await expect(page.getByRole('heading', {name: /create new patch/i})).toBeVisible({timeout: 10_000});
  await dialog.getByRole('textbox', {name: /name/i}).first().fill(initialName);

  const createResponsePromise = page.waitForResponse(response =>
    response.url().includes('/rest/v1/patches')
    && response.request().method() === 'POST'
    && response.ok(), {timeout: 20_000});

  await clickCreatePatchDialog(dialog);
  const createPayload = await (await createResponsePromise).json();
  const id = Array.isArray(createPayload) ? createPayload[0]?.id : createPayload?.id;
  expect(id).toBeTruthy();

  await expect(dialog).toBeHidden({timeout: 20_000});

  return {
    id,
    url: `/patches/details/${ id }`,
    initialName,
    renamedName: `${ initialName } renamed`,
    description: `Long complete-flow description ${ suffix }`,
    tag: `flow-${ suffix.slice(0, 10) }`
  };
}

async function clickCreatePatchDialog(dialog: ReturnType<Page['locator']>): Promise<void> {
  const confirmCreateByRole = dialog.getByRole('button', {name: /^Create$/i}).first();
  if (await confirmCreateByRole.isVisible().catch(() => false)) {
    await confirmCreateByRole.click();
    return;
  }

  const confirmCreateByComponent = dialog.locator('app-brand-primary-button', {hasText: /create/i}).first();
  if (await confirmCreateByComponent.isVisible().catch(() => false)) {
    await confirmCreateByComponent.click();
    return;
  }

  await dialog.getByText(/^Create$/i).last().click();
}

async function openPatch(page: Page, patch: CreatedPatch): Promise<void> {
  await page.goto(patch.url);
  await expect(page).toHaveURL(new RegExp(`/patches/details/${ patch.id }`), {timeout: 20_000});
  await expect(page.locator('app-patch-composite').first()).toBeVisible({timeout: 20_000});
  await expect(page.getByRole('heading', {name: /Patch (details|editing)/i}).first()).toBeVisible({timeout: 20_000});
}

async function enterPatchEditMode(page: Page): Promise<void> {
  const editingHeading = page.getByRole('heading', {name: /Patch editing/i}).first();
  if (await editingHeading.isVisible().catch(() => false)) {
    return;
  }

  const editButton = page.getByRole('button', {name: /^Edit$/i}).first();
  await expect(editButton).toBeVisible({timeout: 20_000});
  await editButton.click();
  await expect(editingHeading).toBeVisible({timeout: 20_000});
  await expect(page.getByRole('button', {name: /Close editor/i}).first()).toBeVisible({timeout: 20_000});
}

async function closePatchEditor(page: Page): Promise<void> {
  const detailsHeading = page.getByRole('heading', {name: /Patch details/i}).first();
  if (await detailsHeading.isVisible().catch(() => false)) {
    return;
  }

  const closeButton = page.getByRole('button', {name: /Close editor/i}).first();
  await expect(closeButton).toBeVisible({timeout: 20_000});
  await closeButton.click();
  await expect(detailsHeading).toBeVisible({timeout: 20_000});
}

async function addPatchTag(page: Page, tag: string): Promise<void> {
  const tagInput = page.getByRole('textbox', {name: /^Tags$/i}).first();
  await expect(tagInput).toBeVisible({timeout: 10_000});

  const tagRequest = page.waitForResponse(response =>
    response.url().includes('/rest/v1/')
    && response.request().method() !== 'GET'
    && response.ok(), {timeout: 20_000}).catch(() => undefined);

  await tagInput.fill(tag);
  await tagInput.press('Enter');
  await tagRequest;
  await expect(page.getByText(tag, {exact: true}).first()).toBeVisible({timeout: 10_000});
}

async function togglePatchPrivacy(page: Page): Promise<void> {
  const privacyButton = page.locator('app-patch-minimal button')
    .filter({
      has: page.locator('mat-icon').filter({hasText: /^(public|lock)$/})
    })
    .first();

  await expect(privacyButton).toBeVisible({timeout: 10_000});
  await privacyButton.click();
}

async function deletePatch(page: Page, patch: CreatedPatch): Promise<void> {
  try {
    await page.goto(patch.url, {timeout: 20_000});
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

    await clickDeletePatchDialog(dialog);
    await deleteResponse;
  } catch {
    // Best-effort cleanup for a dedicated E2E patch.
  }
}

async function clickDeletePatchDialog(dialog: ReturnType<Page['locator']>): Promise<void> {
  const confirmByRole = dialog.getByRole('button', {name: /^Delete$/i}).first();
  if (await confirmByRole.isVisible({timeout: 2_000}).catch(() => false)) {
    await confirmByRole.click();
    return;
  }

  const confirmByComponent = dialog.locator('app-brand-primary-button', {hasText: /delete/i}).first();
  if (await confirmByComponent.isVisible({timeout: 2_000}).catch(() => false)) {
    await confirmByComponent.click();
    return;
  }

  await dialog.getByText(/^Delete$/i).last().click();
}

function waitForPatchMutation(page: Page): Promise<unknown> {
  return page.waitForResponse(response =>
    response.url().includes('/rest/v1/patches')
    && response.request().method() !== 'GET'
    && response.ok(), {timeout: 20_000});
}

function collectCriticalErrors(page: Page): () => string[] {
  const errors: string[] = [];
  const criticalPattern = /(TypeError|ReferenceError|NullInjectorError|ExpressionChangedAfterItHasBeenCheckedError|PAGE_ERROR)/i;

  page.on('pageerror', error => errors.push(`PAGE_ERROR: ${ error.message }`));
  page.on('console', message => {
    if (message.type() !== 'error') return;
    const text = message.text();
    if (criticalPattern.test(text)) {
      errors.push(text);
    }
  });

  return () => errors;
}
