import {
  expect,
  test
} from '@playwright/test';


test.describe('Authenticated Rack Detail UX', () => {
  test('rack details never shows module submit FAB', async ({page}) => {
    await page.goto('/user/area');
    
    const rackLinks = page.locator('a[href*="/racks/details/"]');
    const createRackButton = page.getByRole('button', {name: /create rack/i});
    
    if ((await rackLinks.count()) === 0) {
      await createRackButton.click();
      await expect(rackLinks.first()).toBeVisible({timeout: 15_000});
    }
    
    await rackLinks.first().click();
    await expect(page).toHaveURL(/\/racks\/details\/\d+/, {timeout: 15_000});
    
    const rackEditFab = page.getByRole('button', {name: /^(Edit rack|Lock rack)$/i}).first();
    await expect(rackEditFab).toBeVisible({timeout: 15_000});
    
    const rackEditFabLabel = (await rackEditFab.innerText()).trim();
    if (/^Edit rack$/i.test(rackEditFabLabel)) {
      await rackEditFab.click();
      await expect(page.getByRole('button', {name: /^Lock rack$/i})).toBeVisible({timeout: 10_000});
    }
    
    await expect(page.locator('app-module-browser-root')).toBeVisible({timeout: 10_000});
    await expect(page.locator('.module-browser-submit-fab')).toHaveCount(0);
  });
});