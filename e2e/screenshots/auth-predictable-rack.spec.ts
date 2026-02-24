import {
  expect,
  test
} from '@playwright/test';


const PREDICTABLE_RACK_ID = Number(process.env['E2E_PREDICTABLE_RACK_ID'] ?? '644');

test.describe('Authenticated predictable rack detail', () => {
  test('opens predictable rack and can enter edit mode', async ({page}) => {
    await page.goto(`/racks/details/${ PREDICTABLE_RACK_ID }`);
    await expect(page).toHaveURL(new RegExp(`/racks/details/${ PREDICTABLE_RACK_ID }`), {timeout: 20_000});
    await expect(page.getByRole('heading', {name: /Rack (Details|Editing)/i}).first()).toBeVisible({timeout: 20_000});
    await page.waitForTimeout(5_000);
    
    const rackComposite = page.locator('app-rack-composite').first();
    const hasRenderableRack = await rackComposite.isVisible().catch(() => false);
    if (!hasRenderableRack) {
      throw new Error(
        `Predictable rack #${ PREDICTABLE_RACK_ID } is not renderable for this account. ` +
        `Prepare that rack manually and ensure /racks/details/${ PREDICTABLE_RACK_ID } shows full rack content.`
      );
    }
    
    const alreadyEditing = await page.getByText(/Rack Editing/i).first().isVisible().catch(() => false);
    if (!alreadyEditing) {
      const editRackButton = page.getByRole('button', {name: /^Edit rack$/i}).first();
      const canEdit = await editRackButton.isVisible().catch(() => false);
      if (!canEdit) {
        throw new Error(
          `Predictable rack #${ PREDICTABLE_RACK_ID } is not editable for this account. ` +
          `Prepare that rack manually and ensure /racks/details/${ PREDICTABLE_RACK_ID } supports edit mode.`
        );
      }
      await editRackButton.click();
    }
    
    await expect(page.getByText(/Rack Editing/i).first()).toBeVisible({timeout: 20_000});
    await expect(page.locator('app-rack-composite').first()).toBeVisible({timeout: 20_000});
  });
});