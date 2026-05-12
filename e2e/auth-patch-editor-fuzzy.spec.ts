import {
  expect,
  type Locator,
  type Page,
  test
} from '@playwright/test';
import {
  cleanupLinkedRackScenario,
  ensureLinkedRackScenario,
  type PreparedLinkedRackScenario
} from './helpers/linked-rack-scenario';


const DESKTOP_VIEWPORT = {width: 1280, height: 960} as const;

test.describe('Authenticated patch editor fuzzy stress', () => {
  test.describe.configure({mode: 'serial'});

  let scenario: PreparedLinkedRackScenario;

  test.beforeAll(async ({browser}) => {
    const context = await browser.newContext({
      storageState: 'playwright/.auth/user.json',
      viewport: DESKTOP_VIEWPORT
    });
    const page = await context.newPage();
    scenario = await ensureLinkedRackScenario(page);
    await context.close();
  });

  test.afterAll(async ({browser}) => {
    if (!scenario) return;
    const context = await browser.newContext({
      storageState: 'playwright/.auth/user.json',
      viewport: DESKTOP_VIEWPORT
    });
    const page = await context.newPage();
    await cleanupLinkedRackScenario(page, scenario);
    await context.close();
  });

  test('survives a deterministic rack-module click storm without losing the editor', async ({page}) => {
    test.setTimeout(90_000);
    const errors = collectCriticalErrors(page);
    const random = seededRandom(0x5eed01);

    await openLinkedRackEditor(page, scenario);

    const modules = page.locator('.patch-editor-rack-visual__module-wrapper');
    const moduleCount = await modules.count();
    expect(moduleCount).toBeGreaterThan(0);

    for (let step = 0; step < 24; step++) {
      const index = Math.floor(random() * moduleCount) % moduleCount;
      const module = modules.nth(index);
      const panelOpened = await openRackModulePanel(module);

      if (panelOpened && random() > 0.45) {
        await clickOptionalCv(module, random() > 0.5 ? 'out' : 'in');
      }

      if (random() > 0.7) {
        await clearSelectionIfPresent(page);
      }

      await expect(page.locator('app-patch-composite').first()).toBeVisible();
      await expect(page.locator('.patch-editor-rack-visual__screen')).toBeVisible();
    }

    await clearSelectionIfPresent(page);
    expect(errors()).toEqual([]);
  });

  test('survives rapid mode, search, and clear-search transitions', async ({page}) => {
    test.setTimeout(90_000);
    const errors = collectCriticalErrors(page);

    await openLinkedRackEditor(page, scenario);

    const rackMode = page.getByRole('radio', {name: /^Rack$/i}).first();
    const collectionMode = page.getByRole('radio', {name: /^Collection$/i}).first();
    const searchInput = page.getByRole('textbox', {name: /find module in collection/i}).first();

    for (const query of ['zz-fuzzy-no-match', '', 'dual', 'zz-fuzzy-no-match-again', '']) {
      await collectionMode.click();
      await expect(page.locator('.patch-editor-controls')).toBeVisible({timeout: 10_000});
      await searchInput.fill(query);

      if (query) {
        const clearSearch = page.getByRole('button', {name: /clear search/i}).first();
        if (await clearSearch.isVisible({timeout: 2_000}).catch(() => false)) {
          await clearSearch.click();
        }
      }

      await rackMode.click();
      await expect(page.locator('.patch-editor-rack-visual__screen')).toBeVisible({timeout: 10_000});
      await expect(page.locator('.patch-editor-rack-visual__module-wrapper').first()).toBeVisible({timeout: 10_000});
    }

    expect(errors()).toEqual([]);
  });

  test('handles available CV wiring or CV-less rack modules during repeated deselection', async ({page}) => {
    test.setTimeout(90_000);
    const errors = collectCriticalErrors(page);

    await openLinkedRackEditor(page, scenario);

    const clickedInput = await clickFirstRackCv(page, 'in');
    if (!clickedInput) {
      await clearSelectionIfPresent(page);
      await expect(page.locator('.patch-editor-rack-visual__screen')).toBeVisible();
      expect(errors()).toEqual([]);
      return;
    }

    await expect(page.getByText(/Input selected — now pick an output/i)).toBeVisible({timeout: 10_000});

    const clickedOutput = await clickFirstRackCv(page, 'out');
    if (!clickedOutput) {
      await clearSelectionIfPresent(page);
      await expect(page.locator('.patch-editor-rack-visual__screen')).toBeVisible();
      expect(errors()).toEqual([]);
      return;
    }

    const confirm = page.getByText(/^Confirm connection$/i).first();
    await expect(confirm).toBeVisible({timeout: 10_000});

    await clearConnectionSide(page, 'output');
    await expect(page.getByText(/Input selected — now pick an output/i)).toBeVisible({timeout: 10_000});

    expect(await clickFirstRackCv(page, 'out')).toBeTruthy();
    await expect(confirm).toBeVisible({timeout: 10_000});

    await confirm.click();
    await expect(page.getByText(/^Recorded$/i).first()).toBeVisible({timeout: 10_000});
    await expect(page.getByText(/Patch connections \(/i).first()).toBeVisible({timeout: 10_000});

    await clearSelectionIfPresent(page);
    expect(errors()).toEqual([]);
  });
});

async function openLinkedRackEditor(page: Page, preparedScenario: PreparedLinkedRackScenario): Promise<void> {
  await page.setViewportSize(DESKTOP_VIEWPORT);
  await page.goto(preparedScenario.patchUrl);
  await expect(page.locator('app-patch-composite').first()).toBeVisible({timeout: 20_000});

  const editingHeading = page.getByRole('heading', {name: /Patch editing/i}).first();
  const editButton = page.locator('app-edit-fab button', {hasText: /^Edit$/i}).first();

  await Promise.any([
    editingHeading.waitFor({state: 'visible', timeout: 12_000}),
    editButton.waitFor({state: 'visible', timeout: 12_000})
  ]).catch(() => undefined);

  if (!(await editingHeading.isVisible().catch(() => false))) {
    await expect(editButton).toBeVisible({timeout: 10_000});
    await editButton.click();
    await expect(editingHeading).toBeVisible({timeout: 20_000});
  }

  const rackMode = page.getByRole('radio', {name: /^Rack$/i}).first();
  await expect(rackMode).toBeVisible({timeout: 15_000});
  if (!(await rackMode.isChecked())) {
    await rackMode.click();
  }

  await expect(page.locator('.patch-editor-rack-visual__screen')).toBeVisible({timeout: 15_000});
  await expect(page.locator('.patch-editor-rack-visual__module-wrapper').first()).toBeVisible({timeout: 15_000});
}

async function clickFirstRackCv(page: Page, kind: 'in' | 'out'): Promise<boolean> {
  const modules = page.locator('.patch-editor-rack-visual__module-wrapper');
  const moduleCount = await modules.count();

  for (let index = 0; index < moduleCount; index++) {
    const module = modules.nth(index);
    const panelOpened = await openRackModulePanel(module);
    const didClick = panelOpened && await clickOptionalCv(module, kind);
    if (didClick) {
      return true;
    }
  }

  return false;
}

async function openRackModulePanel(module: Locator): Promise<boolean> {
  await module.scrollIntoViewIfNeeded();

  for (const force of [false, true]) {
    await module.click({force});
    const panel = module.locator('.patch-editor-rack-visual__cv-inline');
    if (await panel.isVisible({timeout: 1_500}).catch(() => false)) {
      return true;
    }
  }

  return false;
}

async function clickOptionalCv(module: Locator, kind: 'in' | 'out'): Promise<boolean> {
  const panel = module.locator('.patch-editor-rack-visual__cv-inline');
  if (!(await panel.isVisible({timeout: 2_000}).catch(() => false))) {
    return false;
  }

  const cv = panel.locator(`app-module-cvitem .${ kind }, app-module-cvitem .item-cvitem.${ kind }`).first();
  if (!(await cv.isVisible({timeout: 1_000}).catch(() => false))) {
    return false;
  }

  await cv.click();
  return true;
}

async function clearConnectionSide(page: Page, side: 'input' | 'output'): Promise<void> {
  const button = page.getByRole('button', {name: new RegExp(`^Deselect ${ side }$`, 'i')}).first();
  await expect(button).toBeVisible({timeout: 10_000});
  await button.click();
}

async function clearSelectionIfPresent(page: Page): Promise<void> {
  const clearButton = page.getByRole('button', {name: /^Clear selection$/i}).first();
  if (await clearButton.isVisible({timeout: 1_000}).catch(() => false)) {
    await clearButton.click();
    return;
  }

  const creatorDelete = page.locator('.panel-card button[mattooltip="Clear selection"]').first();
  if (await creatorDelete.isVisible({timeout: 1_000}).catch(() => false)) {
    await creatorDelete.click();
  }
}

function collectCriticalErrors(page: Page): () => string[] {
  const errors: string[] = [];
  const criticalPattern = /(TypeError|ReferenceError|NullInjectorError|ExpressionChangedAfterItHasBeenCheckedError|PAGE_ERROR)/i;

  page.on('pageerror', error => errors.push(`PAGE_ERROR: ${ error.message }`));
  page.on('console', message => {
    if (message.type() !== 'error') return;
    const text = message.text();
    if (criticalPattern.test(text)) {
      errors.push(text);
    }
  });

  return () => errors;
}

function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}
