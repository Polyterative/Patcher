import fs from 'node:fs';
import path from 'node:path';
import {
  expect,
  Page,
  test
} from '@playwright/test';
import { openOwnedPatchDetailsInEditMode } from '../helpers/user-owned-entities';


const TABLET_VIEWPORT = {width: 820, height: 1180} as const;
const OUTPUT_DIR = path.resolve(process.cwd(), 'output/floating-surface-review');

type Rect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

test.describe('Tablet floating surface review', () => {
  test.use({
    viewport: TABLET_VIEWPORT,
    hasTouch: true,
    isMobile: true
  });

  test('user area keeps the floating search inset-safe on tablet', async ({page}) => {
    ensureOutputDir();
    await page.goto('/user/area');
    await expect(page.locator('.user-area-floating-search').first()).toBeVisible({timeout: 20_000});

    const searchBox = await readBox(page.locator('.user-area-floating-search').first());

    expect(searchBox.x).toBeGreaterThanOrEqual(0);
    expect(searchBox.x + searchBox.width).toBeLessThanOrEqual(TABLET_VIEWPORT.width + 1);
    expect(searchBox.y + searchBox.height).toBeLessThanOrEqual(TABLET_VIEWPORT.height + 1);
    expect(await readBackdropFilter(page.locator('.user-area-floating-search').first())).toMatch(/^(none|blur\(0px\))$/);
    expect(await readCssProperty(page.locator('.user-area-floating-search').first(), 'transitionDuration')).toBe('0s');
    expect(await readBackdropFilter(page.locator('.sticky').first())).toMatch(/(^none$|blur\(0px\))/);

    await page.screenshot({
      path: path.join(OUTPUT_DIR, 'user-area-tablet-floating.png'),
      type: 'png'
    });
  });

  test('patch editor keeps close button and selection panel de-conflicted on tablet', async ({page}) => {
    ensureOutputDir();
    await openOwnedPatchDetailsInEditMode(page);
    await showSelectionPanel(page);

    const closeFabBox = await readBox(page.getByRole('button', {name: /close editor/i}).first());
    const selectionBox = await readBox(page.locator('app-selection-panel-outlet .panel-card').first());
    const search = page.locator('.patch-editor-floating-search').first();

    expect(overlaps(closeFabBox, selectionBox)).toBe(false);
    expect(selectionBox.x + selectionBox.width).toBeLessThanOrEqual(closeFabBox.x + 1);
    expect(await readBackdropFilter(page.locator('app-selection-panel-outlet .panel-card').first())).toMatch(/^(none|blur\(0px\))$/);
    expect(await readCssProperty(page.locator('app-selection-panel-outlet .panel-card').first(), 'animationDuration')).toBe('0s');

    if (await search.isVisible().catch(() => false)) {
      const searchBox = await readBox(search);
      expect(overlaps(closeFabBox, searchBox)).toBe(false);
      expect(overlaps(searchBox, selectionBox)).toBe(false);
      expect(await readBackdropFilter(search)).toMatch(/^(none|blur\(0px\))$/);
      expect(await readCssProperty(search, 'transitionDuration')).toBe('0s');
    }

    await page.screenshot({
      path: path.join(OUTPUT_DIR, 'patch-editor-tablet-floating.png'),
      type: 'png'
    });
  });
});

function ensureOutputDir(): void {
  fs.mkdirSync(OUTPUT_DIR, {recursive: true});
}

async function showSelectionPanel(page: Page): Promise<void> {
  await page.evaluate(() => {
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
      b: null
    });
  });

  await expect(page.locator('app-selection-panel-outlet .panel-card').first()).toBeVisible({timeout: 20_000});
}

async function readBox(locator: ReturnType<Page['locator']>): Promise<Rect> {
  await expect(locator).toBeVisible({timeout: 20_000});
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  return box as Rect;
}

function overlaps(a: Rect, b: Rect): boolean {
  return !(
    a.x + a.width <= b.x
    || b.x + b.width <= a.x
    || a.y + a.height <= b.y
    || b.y + b.height <= a.y
  );
}

async function readBackdropFilter(locator: ReturnType<Page['locator']>): Promise<string> {
  await expect(locator).toBeVisible({timeout: 20_000});
  return locator.evaluate((element) => getComputedStyle(element).backdropFilter);
}

async function readCssProperty(locator: ReturnType<Page['locator']>, property: keyof CSSStyleDeclaration): Promise<string> {
  await expect(locator).toBeVisible({timeout: 20_000});
  return locator.evaluate((element, cssProperty) => getComputedStyle(element)[cssProperty], property);
}
