import fs from 'node:fs';
import path from 'node:path';
import {
  expect,
  Page,
  test
} from '@playwright/test';
import { openOwnedRackDetailsInEditMode } from '../helpers/user-owned-entities';


const TABLET_VIEWPORT = {width: 820, height: 1180} as const;
const OUTPUT_DIR = path.resolve(process.cwd(), 'output/rack-editor-touch-review');
const TEST_MODULE = {id: 2674, name: 'Afterneath'} as const;

test.describe('Rack editor tablet screenshot review', () => {
  test.use({
    viewport: TABLET_VIEWPORT,
    hasTouch: true,
    isMobile: true
  });

  test('captures the touch-first rack editing states', async ({page}) => {
    ensureOutputDir();
    await openOwnedRackDetailsInEditMode(page);
    await waitForRackEditor(page);
    await ensureAtLeastOneModule(page);
    await centerRackEditor(page);

    const actions = page.locator('app-rack-editor .rackEditorResponsiveActions');
    const floatingPanel = page.locator('.rackEditorFloatingOptions__quickToggle').first();
    await expect(actions).toBeVisible({timeout: 20_000});
    await expect(page.getByText(/tap a module to show edit actions/i)).toBeVisible({timeout: 20_000});
    expect(await readComputedStyle(floatingPanel, 'backdropFilter')).toMatch(/^(none|blur\(0px\))$/);
    expect(await readComputedStyle(floatingPanel, 'transitionDuration')).toMatch(/^0s(?:, 0s)*$/);
    expect(await readComputedStyle(floatingPanel, 'opacity')).toBe('1');

    await page.screenshot({
      path: path.join(OUTPUT_DIR, 'tablet-rack-touch-idle.png'),
      type: 'png'
    });

    await tapModuleWithTouch(page);

    await expect(page.getByRole('button', {name: /row \/ panel/i}).first()).toBeVisible({timeout: 20_000});
    await page.screenshot({
      path: path.join(OUTPUT_DIR, 'tablet-rack-touch-selected.png'),
      type: 'png'
    });
  });
});

function ensureOutputDir(): void {
  fs.mkdirSync(OUTPUT_DIR, {recursive: true});
}

async function waitForRackEditor(page: Page): Promise<void> {
  await expect(page.locator('app-rack-editor')).toBeVisible({timeout: 20_000});
  await expect(page.locator('app-rack-editor .scroll').first()).toBeVisible({timeout: 20_000});
  await page.waitForTimeout(800);
}

async function ensureAtLeastOneModule(page: Page): Promise<void> {
  const existingModules = page.locator('app-rack-visual-model .module');
  if (await existingModules.count() > 0) {
    return;
  }

  await page.evaluate(({moduleId, moduleName}) => {
    const ng = (window as {
      ng?: {
        getComponent?: (element: Element) => {
          dataService?: {
            addModuleToRack$?: {
              next: (value: {id: number; name: string}) => void;
            };
          };
        };
      };
    }).ng;
    if (!ng?.getComponent) {
      throw new Error('Angular debug API unavailable');
    }

    const rackDetail = document.querySelector('app-rack-browser-rack-detail');
    if (!rackDetail) {
      throw new Error('Rack detail view not found');
    }

    ng.getComponent(rackDetail)?.dataService?.addModuleToRack$?.next({
      id: moduleId,
      name: moduleName
    });
  }, {
    moduleId: TEST_MODULE.id,
    moduleName: TEST_MODULE.name
  });

  await page.waitForFunction(() => document.querySelectorAll('app-rack-visual-model .module').length > 0, {timeout: 20_000});
  await page.waitForTimeout(1_000);
}

async function centerRackEditor(page: Page): Promise<void> {
  await page.evaluate(() => {
    const element = document.querySelector('app-rack-composite');
    if (!element) {
      return;
    }

    const rect = element.getBoundingClientRect();
    window.scrollTo({
      top: Math.max(0, window.scrollY + rect.top - 80),
      behavior: 'auto'
    });
  });
}

async function tapModuleWithTouch(page: Page): Promise<void> {
  const module = page.locator('app-rack-visual-model .module').first();
  await expect(module).toBeVisible({timeout: 20_000});

  await module.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const clientX = rect.left + (rect.width / 2);
    const clientY = rect.top + (rect.height / 2);

    element.dispatchEvent(new PointerEvent('pointerdown', {
      bubbles: true,
      cancelable: true,
      pointerType: 'touch',
      clientX,
      clientY
    }));
    element.dispatchEvent(new PointerEvent('pointerup', {
      bubbles: true,
      cancelable: true,
      pointerType: 'touch',
      clientX,
      clientY
    }));
  });

  await expect(page.locator('app-rack-editor .rackEditorResponsiveActions__selection')).toBeVisible({timeout: 20_000});
}

async function readComputedStyle(locator: ReturnType<Page['locator']>, property: keyof CSSStyleDeclaration): Promise<string> {
  await expect(locator).toBeVisible({timeout: 20_000});
  return locator.evaluate((element, cssProperty) => getComputedStyle(element)[cssProperty] as string, property);
}
