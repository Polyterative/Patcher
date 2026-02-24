import {
  expect,
  test
} from '@playwright/test';


const PREDICTABLE_PATCH_ID = Number(process.env['E2E_PREDICTABLE_PATCH_ID'] ?? '156');

test.describe('Authenticated predictable patch detail', () => {
  test('opens predictable patch and can enter edit mode', async ({page}) => {
    await page.goto(`/patches/details/${ PREDICTABLE_PATCH_ID }`);
    await expect(page).toHaveURL(new RegExp(`/patches/details/${ PREDICTABLE_PATCH_ID }`), {timeout: 20_000});
    await expect(page.getByRole('heading', {name: /Patch (details|editing)/i}).first()).toBeVisible({timeout: 20_000});
    await expect(page.locator('app-patch-composite').first()).toBeVisible({timeout: 20_000});
    
    const alreadyEditing = await page.getByRole('heading', {name: /Patch editing/i}).first().isVisible().catch(() => false);
    if (!alreadyEditing) {
      const editPatchButton = page.locator('app-edit-fab button', {hasText: /^Edit$/i}).first();
      const canEdit = await editPatchButton.isVisible().catch(() => false);
      if (!canEdit) {
        throw new Error(
          `Predictable patch #${ PREDICTABLE_PATCH_ID } is not editable for this account. ` +
          `Prepare that patch manually and ensure /patches/details/${ PREDICTABLE_PATCH_ID } supports edit mode.`
        );
      }
      await editPatchButton.click();
    }
    
    const closeEditorButton = page.getByRole('button', {name: /Close editor/i}).first();
    const hasEditingState = await page.getByRole('heading', {name: /Patch editing/i}).first().isVisible().catch(() => false)
      || await closeEditorButton.isVisible().catch(() => false);
    if (!hasEditingState) {
      throw new Error(
        `Predictable patch #${ PREDICTABLE_PATCH_ID } is not editable for this account. ` +
        `Prepare that patch manually and ensure /patches/details/${ PREDICTABLE_PATCH_ID } supports edit mode.`
      );
    }
    
    await expect(page.getByRole('heading', {name: /Patch editing/i}).first()).toBeVisible({timeout: 20_000});
    await expect(closeEditorButton).toBeVisible({timeout: 20_000});
  });
});