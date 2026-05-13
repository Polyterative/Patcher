import fs from 'node:fs';
import path from 'node:path';
import {
  expect,
  Page,
  test
} from '@playwright/test';
import { openOwnedPatchDetailsInEditMode } from '../helpers/user-owned-entities';


const TABLET_VIEWPORT = {width: 820, height: 1180} as const;
const OUTPUT_DIR = path.resolve(process.cwd(), 'output/touch-target-review');

test.describe('Tablet touch target review', () => {
  test.use({
    viewport: TABLET_VIEWPORT,
    hasTouch: true,
    isMobile: true
  });

  test('module CV ports stay comfortably tappable on tablet', async ({page}) => {
    ensureOutputDir();
    await page.goto('/modules/details/1025');

    const firstPort = page.locator('app-module-cvitem .item-cvitem').first();
    await expect(firstPort).toBeVisible({timeout: 20_000});

    const box = await firstPort.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.height).toBeGreaterThanOrEqual(44);

    await page.screenshot({
      path: path.join(OUTPUT_DIR, 'tablet-module-cv-ports.png'),
      type: 'png'
    });
  });

  test('selection dismiss stays explicit and thumb-sized on tablet', async ({page}) => {
    ensureOutputDir();
    await openOwnedPatchDetailsInEditMode(page);
    await showSelectionPanel(page);

    const clearButton = page.getByRole('button', {name: /clear selection/i}).first();
    await expect(clearButton).toBeVisible({timeout: 20_000});

    const box = await clearButton.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.height).toBeGreaterThanOrEqual(44);

    await page.screenshot({
      path: path.join(OUTPUT_DIR, 'tablet-selection-clear-button.png'),
      type: 'png'
    });
  });

  test('panel crop nudge buttons stay thumb-sized on tablet', async ({page}) => {
    ensureOutputDir();
    await page.goto('/modules/details/1423');

    const editorTitle = page.getByRole('heading', {name: 'Module Editor'});
    if (!(await editorTitle.isVisible().catch(() => false))) {
      await page.getByRole('button', {name: /^Edit$/i}).first().click();
    }

    await expect(editorTitle).toBeVisible({timeout: 20_000});

    await page.locator('lib-file-drag-host input[type="file"]').first().setInputFiles(
      '/Users/polyterative/Code/Patcher/src/assets/favicon/android-chrome-512x512.png'
    );

    const nudgeButton = page.getByRole('button', {name: /nudge crop up/i}).first();
    await expect(nudgeButton).toBeVisible({timeout: 20_000});

    const box = await nudgeButton.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.height).toBeGreaterThanOrEqual(44);
    expect(box!.width).toBeGreaterThanOrEqual(44);

    await page.screenshot({
      path: path.join(OUTPUT_DIR, 'tablet-panel-crop-nudges.png'),
      type: 'png'
    });
  });

  test('module editor row actions stay thumb-sized on tablet', async ({page}) => {
    ensureOutputDir();
    await page.goto('/modules/details/1423');

    const editorTitle = page.getByRole('heading', {name: 'Module Editor'});
    if (!(await editorTitle.isVisible().catch(() => false))) {
      await page.getByRole('button', {name: /^Edit$/i}).first().click();
    }

    await expect(editorTitle).toBeVisible({timeout: 20_000});

    const inAdder = page.locator('app-module-editor-adder-line').first();
    await expect(inAdder).toBeVisible({timeout: 20_000});
    await inAdder.getByRole('button', {name: /add cv/i}).click();
    await expect(page.locator('[role="menuitem"]').first()).toBeVisible({timeout: 20_000});
    await page.locator('[role="menuitem"]').first().click();

    const rowAction = page.locator('app-module-editor-cv-form-line button.cv-row-action.cv-row-action--removable').first();
    await expect(rowAction).toBeVisible({timeout: 20_000});

    const box = await rowAction.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.height).toBeGreaterThanOrEqual(44);
    expect(box!.width).toBeGreaterThanOrEqual(44);

    await page.screenshot({
      path: path.join(OUTPUT_DIR, 'tablet-module-editor-row-action.png'),
      type: 'png'
    });
  });

  test('two-sided connection deselect buttons stay thumb-sized on tablet', async ({page}) => {
    ensureOutputDir();
    await openOwnedPatchDetailsInEditMode(page);
    await showSelectionPanel(page, true);

    const outputDeselect = page.getByRole('button', {name: /deselect output/i}).first();
    const inputDeselect = page.getByRole('button', {name: /deselect input/i}).first();
    await expect(outputDeselect).toBeVisible({timeout: 20_000});
    await expect(inputDeselect).toBeVisible({timeout: 20_000});

    for (const locator of [outputDeselect, inputDeselect]) {
      const box = await locator.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.height).toBeGreaterThanOrEqual(44);
      expect(box!.width).toBeGreaterThanOrEqual(44);
    }

    await page.screenshot({
      path: path.join(OUTPUT_DIR, 'tablet-connection-slot-deselects.png'),
      type: 'png'
    });
  });
});

function ensureOutputDir(): void {
  fs.mkdirSync(OUTPUT_DIR, {recursive: true});
}

async function showSelectionPanel(page: Page, includeBothSides = false): Promise<void> {
  await page.evaluate(({showBothSides}) => {
    const ng = (window as {
      ng?: {
        getComponent?: (element: Element) => {
          bridge?: {
            selectionState$?: {
              next: (value: unknown) => void;
            };
          };
        };
      };
    }).ng;
    const outlet = document.querySelector('app-selection-panel-outlet');
    if (!ng?.getComponent || !outlet) {
      throw new Error('Selection panel outlet unavailable');
    }

    ng.getComponent(outlet)?.bridge?.selectionState$?.next({
      a: {
        cv: {
          name: 'Out',
          module: {name: 'Oscillator'}
        },
        kind: 'output'
      },
      b: showBothSides ? {
        cv: {
          name: 'In',
          module: {name: 'Filter'}
        },
        kind: 'input'
      } : null
    });
  }, {showBothSides: includeBothSides});

  await expect(page.locator('app-selection-panel-outlet .panel-card').first()).toBeVisible({timeout: 20_000});
}
