import {
  expect,
  test
} from '@playwright/test';


test.describe('Authenticated Rack Detail UX', () => {
  test('rack details never shows module submit FAB', async ({page}) => {
    await page.goto('/user/area');
    let createdRack = false;
    
    const rackDetailCards = page.locator('app-user-racks app-hero-clickable-title .title');
    const createRackButton = page.locator('app-user-racks app-brand-primary-button', {hasText: /create rack/i}).first();
    
    if ((await rackDetailCards.count()) === 0) {
      await expect(createRackButton).toBeVisible({timeout: 15_000});
      await createRackButton.click();
      
      await expect(page.getByRole('heading', {name: /create new rack/i})).toBeVisible({timeout: 10_000});
      const createRackDialog = page.locator('mat-dialog-container').last();
      await setCreateRackDialogPrivacy(page, createRackDialog, false);
      const confirmCreateButton = page.getByRole('button', {name: /create/i}).last();
      if (await confirmCreateButton.isVisible().catch(() => false)) {
        await confirmCreateButton.click();
      } else {
        const fallbackConfirmCreateButton = page.locator('mat-dialog-actions app-brand-primary-button', {hasText: /create/i}).first();
        await expect(fallbackConfirmCreateButton).toBeVisible({timeout: 10_000});
        await fallbackConfirmCreateButton.click();
      }
      
      await expect(rackDetailCards.first()).toBeVisible({timeout: 15_000});
      createdRack = true;
    }
    
    await rackDetailCards.first().click();
    await expect(page).toHaveURL(/\/racks\/details\/\d+/, {timeout: 15_000});
    if (createdRack) {
      await expect(page.locator('app-rack-minimal mat-icon', {hasText: 'lock'}).first()).toBeVisible({timeout: 20_000});
    }
    
    const editRackButton = page.getByRole('button', {name: /^Edit rack$/i}).first();
    if (await editRackButton.isVisible().catch(() => false)) {
      await editRackButton.click();
    }
    await expect(page.getByRole('button', {name: /^(Lock rack|Discard changes)$/i}).first()).toBeVisible({timeout: 10_000});
    
    await expect(page.locator('app-module-browser-root')).toBeVisible({timeout: 10_000});
    await expect(page.locator('.module-browser-submit-fab')).toHaveCount(0);
  });
});

async function setCreateRackDialogPrivacy(page: any, dialog: any, shouldBePublic: boolean): Promise<void> {
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

  await expect(actions.locator('mat-icon', {hasText: shouldBePublic ? 'public' : 'lock'}).first()).toBeVisible({timeout: 5_000});
}
