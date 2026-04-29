import {
  expect,
  test
} from '@playwright/test';


test.describe('Authenticated rack edit flow', () => {
  test('can open a user-owned rack and enter edit mode', async ({page}) => {
    await page.goto('/user/area');
    await expect(page).toHaveURL(/\/user\/area/, {timeout: 20_000});
    await expect(page.locator('app-user-racks')).toBeVisible({timeout: 20_000});
    let createdRack = false;
    
    const rackTitle = page.locator('app-user-racks app-hero-clickable-title .title').first();
    const hasRack = await rackTitle.isVisible({timeout: 20_000}).catch(() => false);
    
    if (!hasRack) {
      // Create a rack so the test can proceed
      const createRackButton = page.locator('app-user-racks app-brand-primary-button', {hasText: /create rack/i}).first();
      await expect(createRackButton).toBeVisible({timeout: 10_000});
      await createRackButton.click();
      
      await expect(page.getByRole('heading', {name: /create new rack/i})).toBeVisible({timeout: 10_000});
      
      // Try multiple selectors for the confirm button
      const dialog = page.locator('mat-dialog-container').last();
      await expect(dialog.locator('mat-icon', {hasText: 'lock'}).first()).toBeVisible({timeout: 5_000});
      const confirmByRole = dialog.getByRole('button', {name: /^Create$/i}).first();
      if (await confirmByRole.isVisible({timeout: 5_000}).catch(() => false)) {
        await confirmByRole.click();
      } else {
        await dialog.locator('app-brand-primary-button', {hasText: /create/i}).first().click();
      }
      
      await expect(dialog).toBeHidden({timeout: 20_000});
      await expect(rackTitle).toBeVisible({timeout: 20_000});
      createdRack = true;
    }
    
    await rackTitle.click();
    
    await expect(page).toHaveURL(/\/racks\/details\/\d+/, {timeout: 20_000});
    await expect(page.getByRole('heading', {name: /Rack (Details|Editing)/i}).first()).toBeVisible({timeout: 20_000});
    if (createdRack) {
      await expect(page.locator('app-rack-minimal mat-icon', {hasText: 'lock'}).first()).toBeVisible({timeout: 20_000});
    }
    
    // Wait for rack data and ownership state to settle
    await page.waitForTimeout(3_000);

    const rackComposite = page.locator('app-rack-composite').first();
    await expect(rackComposite).toBeVisible({timeout: 20_000});
    
    const alreadyEditing = await page.getByRole('heading', {name: /Rack Editing/i}).first().isVisible().catch(() => false);
    if (!alreadyEditing) {
      const editRackButton = page.getByRole('button', {name: /^Edit rack$/i}).first();
      await expect(editRackButton).toBeVisible({timeout: 10_000});
      await editRackButton.click();
    }
    
    await expect(page.getByRole('heading', {name: /Rack Editing/i}).first()).toBeVisible({timeout: 20_000});
    await expect(page.locator('app-rack-composite').first()).toBeVisible({timeout: 20_000});
  });
});
