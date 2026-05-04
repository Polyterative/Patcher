import {
  expect,
  test
} from '@playwright/test';


test.describe('Authenticated patch creation', () => {
  test('creates a new patch from user area and opens it', async ({page}) => {
    await page.goto('/user/area');
    await expect(page).toHaveURL(/\/user\/area/, {timeout: 20_000});
    await expect(page.locator('app-user-patches')).toBeVisible({timeout: 20_000});
    
    const createPatchButton = page.locator('app-user-patches app-brand-primary-button', {hasText: /create patch/i}).first();
    await expect(createPatchButton).toBeVisible({timeout: 20_000});
    await createPatchButton.click();
    
    const createPatchDialog = page.locator('mat-dialog-container').last();
    await expect(page.getByRole('heading', {name: /create new patch/i})).toBeVisible({timeout: 10_000});
    const patchNameInput = createPatchDialog.getByRole('textbox', {name: /name/i}).first();
    const patchName = (await patchNameInput.inputValue()).trim();
    expect(patchName.length).toBeGreaterThan(0);
    
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
    await expect(page.locator('app-user-patches app-hero-clickable-title .title', {hasText: patchName}).first())
      .toBeVisible({timeout: 20_000});
    
    const createdPatchLink = page.locator('app-user-patches app-hero-clickable-title .title', {hasText: patchName}).first();
    await createdPatchLink.click();
    
    await expect(page).toHaveURL(/\/patches\/details\/\d+/, {timeout: 20_000});
    await expect(page.getByRole('heading', {name: /Patch (details|editing)/i}).first()).toBeVisible({timeout: 20_000});
    await expect(page.locator('app-patch-composite').first()).toBeVisible({timeout: 20_000});
    await expect(page.getByText(patchName, {exact: true}).first()).toBeVisible({timeout: 20_000});
  });
});
