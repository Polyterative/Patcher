import fs from 'node:fs';
import path from 'node:path';
import {
  expect,
  test
} from '@playwright/test';
import { openOwnedPatchDetailsInEditMode } from '../helpers/user-owned-entities';


const OUTPUT_DIR = path.resolve(process.cwd(), 'output/patch-detail-review');

test.describe('Authenticated predictable patch detail', () => {
  test('opens a user-owned patch and can enter edit mode', async ({page}) => {
    fs.mkdirSync(OUTPUT_DIR, {recursive: true});
    await openOwnedPatchDetailsInEditMode(page);

    await expect(page.getByRole('heading', {name: /Patch editing/i}).first()).toBeVisible({timeout: 20_000});
    await expect(page.getByRole('button', {name: /Close editor/i}).first()).toBeVisible({timeout: 20_000});
    await expect(page.getByText(/^Linked rack$/).first()).toBeVisible({timeout: 20_000});
    await expect(page.getByLabel(/Choose linked rack/i).first()).toBeVisible({timeout: 20_000});

    await page.screenshot({
      path: path.join(OUTPUT_DIR, 'patch-detail-linked-rack-edit.png'),
      type: 'png',
      fullPage: true
    });
  });
});
