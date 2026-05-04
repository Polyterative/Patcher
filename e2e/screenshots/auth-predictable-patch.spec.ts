import {
  expect,
  test
} from '@playwright/test';
import { openOwnedPatchDetailsInEditMode } from '../helpers/user-owned-entities';

test.describe('Authenticated predictable patch detail', () => {
  test('opens a user-owned patch and can enter edit mode', async ({page}) => {
    await openOwnedPatchDetailsInEditMode(page);

    await expect(page.getByRole('heading', {name: /Patch editing/i}).first()).toBeVisible({timeout: 20_000});
    await expect(page.getByRole('button', {name: /Close editor/i}).first()).toBeVisible({timeout: 20_000});
  });
});
