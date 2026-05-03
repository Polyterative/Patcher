import {
  expect,
  Page,
  test,
  TestInfo,
} from '@playwright/test';


const DESKTOP_VIEWPORT = {width: 1280, height: 960} as const;
const MOBILE_VIEWPORT = {width: 390, height: 844} as const;
const NARROW_MOBILE_VIEWPORT = {width: 360, height: 740} as const;
const TABLET_VIEWPORT = {width: 820, height: 1180} as const;
const TABLET_LANDSCAPE_VIEWPORT = {width: 1024, height: 768} as const;

type Rect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

test.describe('Authenticated Rack Editor layout regressions', () => {
  test.describe.configure({mode: 'serial'});

  let rackUrl = '';

  test.beforeEach(async ({page}, testInfo) => {
    test.setTimeout(120_000);
    rackUrl = await createPreparedRack(page, testInfo);
  });

  test.afterEach(async ({page}) => {
    await page.setViewportSize(DESKTOP_VIEWPORT);
    await deleteTestRack(page, rackUrl);
  });

  test('mobile keeps Options and Edit rack together in one action row while locked', async ({page}) => {
    await openRackAtViewport(page, rackUrl, MOBILE_VIEWPORT);
    await lockRack(page);

    const actions = page.locator('app-rack-editor .rackEditorResponsiveActions');
    const optionsButton = actions.getByRole('button', {name: /^Options$/i});
    const editButton = actions.getByRole('button', {name: /^Edit rack$/i});

    const actionsBox = await readBox(actions);
    const optionsBox = await readBox(optionsButton);
    const editBox = await readBox(editButton);

    expect(Math.abs(optionsBox.y - editBox.y)).toBeLessThanOrEqual(6);
    expect(optionsBox.width).toBeLessThan(actionsBox.width);
    expect(editBox.width).toBeLessThan(actionsBox.width);
  });

  test('mobile keeps Options in the same action slot after entering edit mode', async ({page}) => {
    await openRackAtViewport(page, rackUrl, MOBILE_VIEWPORT);

    const actions = page.locator('app-rack-editor .rackEditorResponsiveActions');
    await actions.getByRole('button', {name: /^Edit rack$/i}).click();

    const optionsBox = await readBox(actions.getByRole('button', {name: /^Options$/i}));
    const lockBox = await readBox(actions.getByRole('button', {name: /^Lock rack$/i}));

    expect(Math.abs(optionsBox.y - lockBox.y)).toBeLessThanOrEqual(6);
  });

  test('mobile opens the options panel below the action strip without overlap', async ({page}) => {
    await openRackAtViewport(page, rackUrl, MOBILE_VIEWPORT);
    await lockRack(page);

    const actions = page.locator('app-rack-editor .rackEditorResponsiveActions');
    await actions.getByRole('button', {name: /^Options$/i}).click();

    const actionsBox = await readBox(actions);
    const optionsPanel = page.locator('app-rack-editor .rackEditorFloatingOptions__panel').filter({
      has: page.getByText(/Use images/i)
    }).first();
    const panelBox = await readBox(optionsPanel);

    expect(panelBox.y).toBeGreaterThanOrEqual(actionsBox.y + actionsBox.height - 1);
    expect(overlaps(actionsBox, panelBox)).toBe(false);
  });

  test('narrow mobile keeps action strip and options panel within the viewport width', async ({page}) => {
    await openRackAtViewport(page, rackUrl, NARROW_MOBILE_VIEWPORT);
    await lockRack(page);

    const actions = page.locator('app-rack-editor .rackEditorResponsiveActions');
    await actions.getByRole('button', {name: /^Options$/i}).click();

    const optionsBox = await readBox(actions.getByRole('button', {name: /^Close$/i}));
    const lockBox = await readBox(actions.getByRole('button', {name: /^Edit rack$/i}));
    const panelBox = await readBox(page.locator('app-rack-editor .rackEditorFloatingOptions__panel').filter({
      has: page.getByText(/Use images/i)
    }).first());

    assertFitsViewport(optionsBox, NARROW_MOBILE_VIEWPORT.width);
    assertFitsViewport(lockBox, NARROW_MOBILE_VIEWPORT.width);
    assertFitsViewport(panelBox, NARROW_MOBILE_VIEWPORT.width);
  });

  test('mobile places download and update actions below the rack without overflowing', async ({page}) => {
    await openRackAtViewport(page, rackUrl, MOBILE_VIEWPORT);
    await lockRack(page);

    const viewport = page.locator('app-rack-editor .scroll').first();
    const actions = page.locator('app-rack-editor .rackEditorResponsiveActions');
    const downloadButton = actions.getByRole('button', {name: /download jpeg/i});
    const updateButton = actions.getByRole('button', {name: /update preview/i});

    const viewportBox = await readBox(viewport);
    const downloadBox = await readBox(downloadButton);
    const updateBox = await readBox(updateButton);

    expect(downloadBox.y).toBeGreaterThan(viewportBox.y + viewportBox.height - 1);
    expect(updateBox.y).toBeGreaterThan(viewportBox.y + viewportBox.height - 1);
    assertFitsViewport(downloadBox, MOBILE_VIEWPORT.width);
    assertFitsViewport(updateBox, MOBILE_VIEWPORT.width);
  });

  test('mobile uses dense control rows with evenly sized buttons and a full-width power toggle', async ({page}) => {
    await openRackAtViewport(page, rackUrl, MOBILE_VIEWPORT);
    await lockRack(page);

    const actions = page.locator('app-rack-editor .rackEditorResponsiveActions');
    const quickToggle = page.locator('app-rack-editor .rackEditorFloatingOptions__quickToggle');

    const actionsBox = await readBox(actions);
    const optionsBox = await readBox(actions.getByRole('button', {name: /^Options$/i}));
    const editBox = await readBox(actions.getByRole('button', {name: /^Edit rack$/i}));
    const downloadBox = await readBox(actions.getByRole('button', {name: /download jpeg/i}));
    const updateBox = await readBox(actions.getByRole('button', {name: /update preview/i}));
    const quickToggleBox = await readBox(quickToggle);

    expect(optionsBox.width).toBeGreaterThanOrEqual(actionsBox.width * 0.45);
    expect(editBox.width).toBeGreaterThanOrEqual(actionsBox.width * 0.45);
    expect(downloadBox.width).toBeGreaterThanOrEqual(actionsBox.width * 0.45);
    expect(updateBox.width).toBeGreaterThanOrEqual(actionsBox.width * 0.45);
    expect(quickToggleBox.width).toBeGreaterThanOrEqual(actionsBox.width - 2);
  });

  test('mobile hides the desktop floating action panel and composite edit FAB', async ({page}) => {
    await openRackAtViewport(page, rackUrl, MOBILE_VIEWPORT);
    await lockRack(page);

    await expect(page.locator('app-rack-editor .rackEditorFloatingOptions__panel--actions')).toBeHidden();
    await expect(page.locator('app-rack-composite app-edit-fab')).toBeHidden();
  });

  test('tablet keeps the floating options dock separate from the right-side edit FAB while locked', async ({page}) => {
    await openRackAtViewport(page, rackUrl, TABLET_VIEWPORT);
    await lockRack(page);

    const quickToggleBox = await readBox(page.locator('app-rack-editor .rackEditorFloatingOptions__quickToggle'));
    const editFabBox = await readBox(page.getByRole('button', {name: /^Edit rack$/i}).first());

    expect(overlaps(quickToggleBox, editFabBox)).toBe(false);
  });

  test('tablet keeps the floating options panel separate from the right-side lock FAB while editing', async ({page}) => {
    await openRackAtViewport(page, rackUrl, TABLET_VIEWPORT);
    await enterEditMode(page);

    await page.getByRole('button', {name: /^Options$/i}).first().click();

    const panelBox = await readBox(page.locator('app-rack-editor .rackEditorFloatingOptions__panel').filter({
      has: page.getByText(/Use images/i)
    }).first());
    const lockFabBox = await readBox(page.getByRole('button', {name: /^Lock rack$/i}).first());

    expect(overlaps(panelBox, lockFabBox)).toBe(false);
  });

  test('tablet keeps the compact action strip visible while hiding the docked image actions', async ({page}) => {
    await openRackAtViewport(page, rackUrl, TABLET_LANDSCAPE_VIEWPORT);
    await lockRack(page);

    await expect(page.locator('app-rack-editor .rackEditorResponsiveActions')).toBeVisible();
    await expect(page.locator('app-rack-editor .rackEditorFloatingOptions__panel--actions')).toBeHidden();
  });

  test('desktop keeps floating action controls and the edit FAB separated while hiding the compact action strip', async ({page}) => {
    await openRackAtViewport(page, rackUrl, DESKTOP_VIEWPORT);
    await lockRack(page);

    const actionsBox = await readBox(page.locator('app-rack-editor .rackEditorFloatingOptions__panel--actions'));
    const editFabBox = await readBox(page.getByRole('button', {name: /^Edit rack$/i}).first());

    expect(overlaps(actionsBox, editFabBox)).toBe(false);
    await expect(page.locator('app-rack-editor .rackEditorResponsiveActions')).toBeHidden();
  });

  test('desktop keeps the rack template capped to the rack HP when a row overflows', async ({page}) => {
    await openRackAtViewport(page, rackUrl, DESKTOP_VIEWPORT);
    await enterEditMode(page);
    await addBelgradToRack(page, 7);

    const metrics = await readRackOverflowTemplateMetrics(page);

    expect(metrics.moduleCount).toBeGreaterThanOrEqual(8);
    expect(metrics.maxModuleRight).toBeGreaterThan(metrics.screenRight + 1);
    expect(Math.abs(metrics.screenRight - metrics.rulerRight)).toBeLessThanOrEqual(2);
  });
});

async function createPreparedRack(page: Page, testInfo: TestInfo): Promise<string> {
  const rackName = buildRackName(testInfo);

  await page.setViewportSize(DESKTOP_VIEWPORT);
  await page.goto('/user/area');
  await expect(page).toHaveURL(/\/user\/area/, {timeout: 20_000});

  const createRackBtn = page.locator('app-user-racks app-brand-primary-button', {hasText: /create rack/i}).first();
  await expect(createRackBtn).toBeVisible({timeout: 15_000});
  await createRackBtn.click();

  const createRackDialog = page.locator('mat-dialog-container').last();
  await expect(createRackDialog).toBeVisible({timeout: 10_000});
  await createRackDialog.locator('input').first().fill(rackName);
  await setCreateRackDialogPrivacy(page, createRackDialog, false);

  const createRackResponse = page.waitForResponse(async response => {
    if (!response.url().includes('/rest/v1/racks') || response.request().method() !== 'POST') {
      return false;
    }

    return response.ok();
  }, {timeout: 15_000});
  const confirmBtn = page.locator('mat-dialog-actions app-brand-primary-button', {hasText: /create/i}).first();
  await expect(confirmBtn).toBeVisible({timeout: 10_000});
  await confirmBtn.click();

  const rackCreatePayload = await (await createRackResponse).json();
  const createdRackId = Array.isArray(rackCreatePayload)
    ? rackCreatePayload[0]?.id
    : rackCreatePayload?.id;
  expect(createdRackId).toBeTruthy();

  const createdRackUrl = `/racks/details/${ createdRackId }`;
  await page.goto(createdRackUrl);
  await expect(page).toHaveURL(new RegExp(`/racks/details/${ createdRackId }(?:$|[?#])`), {timeout: 15_000});

  await enterEditMode(page);
  await addBelgradToRack(page);
  await lockRack(page);

  return createdRackUrl;
}

async function addBelgradToRack(page: Page, count = 1): Promise<void> {
  const browser = page.locator('app-module-browser-root');
  await expect(browser).toBeVisible({timeout: 10_000});

  const searchInput = browser.locator('input').first();
  await searchInput.fill('Belgrad');

  const belgradCard = browser.locator('app-module-minimal', {hasText: /Belgrad/i}).first();
  await expect(belgradCard).toBeVisible({timeout: 15_000});

  for (let index = 0; index < count; index += 1) {
    const previousCount = await page.locator('app-rack-visual-model .module').count();
    await belgradCard.locator('button').last().click();
    await page.waitForFunction(
      expectedCount => document.querySelectorAll('app-rack-visual-model .module').length >= expectedCount,
      previousCount + 1,
      {timeout: 15_000}
    );
  }

  await page.waitForTimeout(1_200);
}

async function enterEditMode(page: Page): Promise<void> {
  const mobileLockButton = page.locator('app-rack-editor .rackEditorResponsiveActions button', {hasText: /^Lock rack$/i}).first();
  const mobileEditButton = page.locator('app-rack-editor .rackEditorResponsiveActions button', {hasText: /^Edit rack$/i}).first();
  const desktopLockButton = page.getByRole('button', {name: /^(Lock rack|Discard changes)$/i}).first();
  const desktopEditButton = page.getByRole('button', {name: /^Edit rack$/i}).first();

  if (await mobileLockButton.isVisible().catch(() => false) || await desktopLockButton.isVisible().catch(() => false)) {
    return;
  }

  if (await desktopEditButton.isVisible().catch(() => false)) {
    await desktopEditButton.click();
  } else if (await mobileEditButton.isVisible().catch(() => false)) {
    await mobileEditButton.click();
  }

  await expect(page.getByRole('button', {name: /^(Lock rack|Discard changes)$/i}).first()).toBeVisible({timeout: 10_000});
}

async function lockRack(page: Page): Promise<void> {
  const generalEditButton = page.getByRole('button', {name: /^Edit rack$/i}).first();
  const mobileLockButton = page.locator('app-rack-editor .rackEditorResponsiveActions button', {hasText: /^Lock rack$/i}).first();
  const desktopLockButton = page.getByRole('button', {name: /^(Lock rack|Discard changes)$/i}).first();

  if (await generalEditButton.isVisible().catch(() => false)) {
    return;
  }

  if (await mobileLockButton.isVisible().catch(() => false)) {
    await mobileLockButton.click();
    await expect(page.locator('app-rack-editor .rackEditorResponsiveActions button', {hasText: /^Edit rack$/i}).first()).toBeVisible({timeout: 10_000});
    return;
  }

  if (await desktopLockButton.isVisible().catch(() => false)) {
    await desktopLockButton.click();
  }

  await expect(page.getByRole('button', {name: /^Edit rack$/i}).first()).toBeVisible({timeout: 10_000});
}

async function deleteTestRack(page: Page, rackUrl: string): Promise<void> {
  if (!rackUrl) {
    return;
  }

  try {
    await page.goto(rackUrl, {timeout: 15_000});
    await waitForRackEditor(page);
    await enterEditMode(page);

    const deleteBtn = page.locator('app-rack-minimal button[mattooltip="Delete rack"]').first();
    await expect(deleteBtn).toBeVisible({timeout: 8_000});
    await deleteBtn.click();

    const confirmDelete = page.locator('mat-dialog-actions button, mat-dialog-actions app-brand-primary-button')
      .filter({hasText: /delete|confirm|yes/i}).first();
    await expect(confirmDelete).toBeVisible({timeout: 8_000});
    await confirmDelete.click();

    await expect(page).not.toHaveURL(rackUrl, {timeout: 10_000});
  } catch {
    // Best-effort cleanup.
  }
}

async function openRackAtViewport(page: Page, rackUrl: string, viewport: { width: number; height: number }): Promise<void> {
  await page.setViewportSize(viewport);
  await page.goto(rackUrl);
  await waitForRackEditor(page);
}

async function waitForRackEditor(page: Page): Promise<void> {
  await expect(page.locator('app-rack-editor')).toBeVisible({timeout: 15_000});
  await expect(page.locator('app-rack-editor .scroll').first()).toBeVisible({timeout: 15_000});
  await expect(page.locator('#screen').first()).toBeVisible({timeout: 15_000});
  await page.waitForFunction(() => document.querySelectorAll('app-rack-visual-model .module').length > 0, {timeout: 15_000});
  await page.waitForTimeout(500);
}

async function readBox(locator: ReturnType<Page['locator']>): Promise<Rect> {
  await expect(locator).toBeVisible({timeout: 10_000});
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  return box as Rect;
}

async function readRackOverflowTemplateMetrics(page: Page): Promise<{
  screenRight: number;
  rulerRight: number;
  maxModuleRight: number;
  moduleCount: number;
}> {
  const metrics = await page.evaluate(() => {
    const screen = document.querySelector<HTMLElement>('app-rack-visual-model #screen');
    const ruler = document.querySelector<HTMLElement>('app-rack-visual-model .widthRuler');
    const modules = Array.from(document.querySelectorAll<HTMLElement>('app-rack-visual-model .module'));

    if (!screen || !ruler || modules.length === 0) {
      return null;
    }

    const screenRight = Math.round(screen.getBoundingClientRect().right);
    const rulerRight = Math.round(ruler.getBoundingClientRect().right);
    const maxModuleRight = Math.max(...modules.map(module => Math.round(module.getBoundingClientRect().right)));

    return {
      screenRight,
      rulerRight,
      maxModuleRight,
      moduleCount: modules.length
    };
  });

  expect(metrics).not.toBeNull();
  return metrics!;
}

function overlaps(a: Rect, b: Rect): boolean {
  return !(
    a.x + a.width <= b.x
    || b.x + b.width <= a.x
    || a.y + a.height <= b.y
    || b.y + b.height <= a.y
  );
}

function assertFitsViewport(rect: Rect, viewportWidth: number): void {
  expect(rect.x).toBeGreaterThanOrEqual(0);
  expect(rect.x + rect.width).toBeLessThanOrEqual(viewportWidth + 1);
}

function buildRackName(testInfo: TestInfo): string {
  const titleSlug = testInfo.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 10);

  return `[E2E] ${ titleSlug } ${ Date.now().toString().slice(-6) }`;
}

async function setCreateRackDialogPrivacy(page: Page, dialog: ReturnType<Page['locator']>, shouldBePublic: boolean): Promise<void> {
  const actions = page.locator('mat-dialog-actions').last();
  await expect(actions).toBeVisible({timeout: 5_000});

  const toggle = actions.locator('mat-slide-toggle').first();
  await expect(toggle).toBeVisible({timeout: 5_000});

  const icon = actions.locator('mat-icon').first();
  await expect(icon).toBeVisible({timeout: 5_000});

  const currentIcon = ((await icon.textContent()) ?? '').trim();
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
