import {
  expect,
  type Page
} from '@playwright/test';


export async function openOwnedPatchDetails(page: Page): Promise<void> {
  await page.goto('/user/area');
  await expect(page).toHaveURL(/\/user\/area/, {timeout: 20_000});
  await expect(page.locator('app-user-patches')).toBeVisible({timeout: 20_000});

  let patchTitle = page.locator('app-user-patches app-hero-clickable-title .title').first();
  const hasPatch = await patchTitle.isVisible({timeout: 20_000}).catch(() => false);

  if (!hasPatch) {
    const createPatchButton = page.locator('app-user-patches app-brand-primary-button', {hasText: /create patch/i}).first();
    await expect(createPatchButton).toBeVisible({timeout: 10_000});
    await createPatchButton.click();

    const createPatchDialog = page.locator('mat-dialog-container').last();
    await expect(page.getByRole('heading', {name: /create new patch/i})).toBeVisible({timeout: 10_000});

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

    await expect(createPatchDialog).toBeHidden({timeout: 20_000});
    patchTitle = page.locator('app-user-patches app-hero-clickable-title .title').first();
    await expect(patchTitle).toBeVisible({timeout: 20_000});
  }

  await patchTitle.click();

  await expect(page).toHaveURL(/\/patches\/details\/\d+/, {timeout: 20_000});
  await expect(page.getByRole('heading', {name: /Patch (details|editing)/i}).first()).toBeVisible({timeout: 20_000});
  await expect(page.locator('app-patch-composite').first()).toBeVisible({timeout: 20_000});
}

export async function openOwnedPatchDetailsInEditMode(page: Page): Promise<void> {
  await openOwnedPatchDetails(page);

  const editingHeading = page.getByRole('heading', {name: /Patch editing/i}).first();
  const editPatchButton = page.locator('app-edit-fab button', {hasText: /^Edit$/i}).first();

  await Promise.any([
    editingHeading.waitFor({state: 'visible', timeout: 10_000}),
    editPatchButton.waitFor({state: 'visible', timeout: 10_000})
  ]).catch(() => undefined);

  if (await editingHeading.isVisible().catch(() => false)) {
    return;
  }

  await expect(editPatchButton).toBeVisible({timeout: 10_000});
  await editPatchButton.click();

  await expect(editingHeading).toBeVisible({timeout: 20_000});
  await expect(page.getByRole('button', {name: /Close editor/i}).first()).toBeVisible({timeout: 20_000});
}

export async function openOwnedRackDetailsInEditMode(page: Page): Promise<void> {
  await page.goto('/user/area');
  await expect(page).toHaveURL(/\/user\/area/, {timeout: 20_000});
  await expect(page.locator('app-user-racks')).toBeVisible({timeout: 20_000});

  let rackTitle = page.locator('app-user-racks app-hero-clickable-title .title').first();
  const hasRack = await rackTitle.isVisible({timeout: 20_000}).catch(() => false);

  if (!hasRack) {
    const createRackButton = page.locator('app-user-racks app-brand-primary-button', {hasText: /create rack/i}).first();
    await expect(createRackButton).toBeVisible({timeout: 10_000});
    await createRackButton.click();

    const dialog = page.locator('mat-dialog-container').last();
    await expect(page.getByRole('heading', {name: /create new rack/i})).toBeVisible({timeout: 10_000});

    await setCreateRackDialogPrivacy(page, false);

    const confirmByRole = dialog.getByRole('button', {name: /^Create$/i}).first();
    if (await confirmByRole.isVisible({timeout: 5_000}).catch(() => false)) {
      await confirmByRole.click();
    } else {
      await dialog.locator('app-brand-primary-button', {hasText: /create/i}).first().click();
    }

    await expect(dialog).toBeHidden({timeout: 20_000});
    rackTitle = page.locator('app-user-racks app-hero-clickable-title .title').first();
    await expect(rackTitle).toBeVisible({timeout: 20_000});
  }

  await rackTitle.click();

  await expect(page).toHaveURL(/\/racks\/details\/\d+/, {timeout: 20_000});
  await expect(page.getByRole('heading', {name: /Rack (Details|Editing)/i}).first()).toBeVisible({timeout: 20_000});
  await expect(page.locator('app-rack-composite').first()).toBeVisible({timeout: 20_000});

  const editingHeading = page.getByRole('heading', {name: /Rack Editing/i}).first();
  const editRackButton = page.getByRole('button', {name: /^Edit rack$/i}).first();
  const editFabRackButton = page.locator('app-edit-fab button', {hasText: /^Edit rack$/i}).first();
  const genericEditFabButton = page.locator('app-edit-fab button', {hasText: /^Edit$/i}).first();

  await Promise.any([
    editingHeading.waitFor({state: 'visible', timeout: 10_000}),
    editRackButton.waitFor({state: 'visible', timeout: 10_000}),
    editFabRackButton.waitFor({state: 'visible', timeout: 10_000}),
    genericEditFabButton.waitFor({state: 'visible', timeout: 10_000})
  ]).catch(() => undefined);

  if (await editingHeading.isVisible().catch(() => false)) {
    return;
  }

  if (await editRackButton.isVisible().catch(() => false)) {
    await editRackButton.click();
  } else {
    if (await editFabRackButton.isVisible().catch(() => false)) {
      await editFabRackButton.click();
    } else {
      await expect(genericEditFabButton).toBeVisible({timeout: 10_000});
      await genericEditFabButton.click();
    }
  }

  await expect(editingHeading).toBeVisible({timeout: 20_000});
}

async function setCreateRackDialogPrivacy(page: Page, shouldBePublic: boolean): Promise<void> {
  const actions = page.locator('mat-dialog-actions').last();
  await expect(actions).toBeVisible({timeout: 5_000});

  const toggle = actions.locator('mat-slide-toggle').first();
  await expect(toggle).toBeVisible({timeout: 5_000});

  const currentIcon = ((await actions.locator('mat-icon').first().textContent()) ?? '').trim();
  const isCurrentlyPublic = currentIcon === 'public';

  if (isCurrentlyPublic !== shouldBePublic) {
    const toggleInput = actions.locator('input[type="checkbox"]').first();
    if (await toggleInput.isVisible().catch(() => false)) {
      await toggleInput.click({force: true});
    } else {
      await toggle.click();
    }
  }

  await expect(actions.locator('mat-icon', {hasText: shouldBePublic ? 'public' : 'lock'}).first()).toBeVisible({
    timeout: 5_000
  });
}
