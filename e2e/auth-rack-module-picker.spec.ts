import {
  expect,
  Page,
  test,
  TestInfo,
} from '@playwright/test';


const DESKTOP_VIEWPORT = {width: 1280, height: 960} as const;
const TABLET_VIEWPORT = {width: 820, height: 1180} as const;

type OwnedModule = {
  id: number;
  name: string;
};

type Rect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

test.describe('Authenticated Rack Module Picker', () => {
  test.describe.configure({mode: 'serial'});

  let rackUrl = '';

  test.beforeEach(async ({page}, testInfo) => {
    test.setTimeout(120_000);
    rackUrl = await createEmptyRack(page, testInfo);
    await openRackInEditMode(page, rackUrl, DESKTOP_VIEWPORT);
  });

  test.afterEach(async ({page}) => {
    await page.setViewportSize(DESKTOP_VIEWPORT);
    await deleteTestRack(page, rackUrl);
  });

  test('hides comments while editing and restores them after locking', async ({page}) => {
    await expect(page.locator('app-comments-root')).toHaveCount(0);

    await lockRack(page);

    await expect(page.locator('app-comments-root')).toBeVisible({timeout: 10_000});
  });

  test('available mode hides a racked owned module while collection still shows it', async ({page}) => {
    const ownedModule = await readFirstOwnedModule(page);

    await addRackModuleToRack(page, ownedModule);
    await searchForModule(page, ownedModule.name);

    await setBrowseMode(page, 'Collection');
    await expect(page.locator('app-module-list')).toContainText(ownedModule.name, {timeout: 10_000});

    await setBrowseMode(page, 'Available');
    await expect(page.locator('app-module-list')).not.toContainText(ownedModule.name);
    await expect(page.locator('.module-browser-mode__heading')).toHaveText('Available to add');

    await setBrowseMode(page, 'Collection');
    await expect(page.locator('app-module-list')).toContainText(ownedModule.name, {timeout: 10_000});
  });

  test('keeps the browse mode buttons anchored on tablet while switching modes', async ({page}) => {
    const ownedModule = await readFirstOwnedModule(page);

    await addRackModuleToRack(page, ownedModule);
    await openRackInEditMode(page, rackUrl, TABLET_VIEWPORT);

    const toggle = page.locator('.module-browser-mode__toggle');
    const positions: number[] = [];

    for (const label of ['Available', 'Collection', 'All modules'] as const) {
      await setBrowseMode(page, label);
      positions.push((await readBox(toggle)).y);
    }

    expect(Math.max(...positions) - Math.min(...positions)).toBeLessThanOrEqual(2);
  });
});

async function createEmptyRack(page: Page, testInfo: TestInfo): Promise<string> {
  const rackName = buildRackName(testInfo);

  await page.setViewportSize(DESKTOP_VIEWPORT);
  await page.goto('/user/area');
  await expect(page).toHaveURL(/\/user\/area/, {timeout: 20_000});

  const createRackButton = page.locator('app-user-racks app-brand-primary-button', {hasText: /create rack/i}).first();
  await expect(createRackButton).toBeVisible({timeout: 15_000});
  await createRackButton.click();

  const dialog = page.locator('mat-dialog-container').last();
  await expect(dialog).toBeVisible({timeout: 10_000});
  await dialog.locator('input').first().fill(rackName);
  await setCreateRackDialogPrivacy(page, false);

  const createRackResponse = page.waitForResponse(async (response) => {
    if (!response.url().includes('/rest/v1/racks') || response.request().method() !== 'POST') {
      return false;
    }

    return response.ok();
  }, {timeout: 15_000});

  const confirmCreateButton = page.locator('mat-dialog-actions app-brand-primary-button', {hasText: /create/i}).first();
  await expect(confirmCreateButton).toBeVisible({timeout: 10_000});
  await confirmCreateButton.click();

  const rackCreatePayload = await (await createRackResponse).json();
  const createdRackId = Array.isArray(rackCreatePayload)
    ? rackCreatePayload[0]?.id
    : rackCreatePayload?.id;
  expect(createdRackId).toBeTruthy();

  return `/racks/details/${ createdRackId }`;
}

async function openRackInEditMode(page: Page, rackUrl: string, viewport: {width: number; height: number}): Promise<void> {
  await page.setViewportSize(viewport);
  await page.goto(rackUrl);
  await waitForRackDetail(page);
  await enterEditMode(page);
}

async function waitForRackDetail(page: Page): Promise<void> {
  await expect(page.locator('app-rack-editor')).toBeVisible({timeout: 20_000});
  await expect(page.locator('app-rack-composite')).toBeVisible({timeout: 20_000});
}

async function enterEditMode(page: Page): Promise<void> {
  const editingHeading = page.getByRole('heading', {name: /Rack Editing/i}).first();
  if (await editingHeading.isVisible().catch(() => false)) {
    return;
  }

  const editRackButton = page.getByRole('button', {name: /^Edit rack$/i}).first();
  await expect(editRackButton).toBeVisible({timeout: 10_000});
  await editRackButton.click();
  await expect(editingHeading).toBeVisible({timeout: 20_000});
  await expect(page.locator('app-module-browser-root')).toBeVisible({timeout: 20_000});
  await expect(page.locator('.module-browser-mode__toggle')).toBeVisible({timeout: 20_000});
}

async function lockRack(page: Page): Promise<void> {
  const lockRackButton = page.getByRole('button', {name: /^(Lock rack|Discard changes)$/i}).first();
  await expect(lockRackButton).toBeVisible({timeout: 10_000});
  await lockRackButton.click();
  await expect(page.getByRole('button', {name: /^Edit rack$/i}).first()).toBeVisible({timeout: 20_000});
}

async function readFirstOwnedModule(page: Page): Promise<OwnedModule> {
  await setBrowseMode(page, 'Collection');

  const ownedModule = await page.waitForFunction(() => {
    const ng = (window as any).ng;
    const browserRoot = document.querySelector('app-module-browser-root');
    if (!ng?.getComponent || !browserRoot) {
      return null;
    }

    const component = ng.getComponent(browserRoot);
    const modules = component.ownedModules;
    if (!Array.isArray(modules) || modules.length === 0) {
      return null;
    }

    return {
      id: modules[0].id,
      name: modules[0].name,
    };
  }, undefined, {timeout: 20_000});

  const value = await ownedModule.jsonValue() as OwnedModule | null;
  expect(value).not.toBeNull();
  return value!;
}

async function setBrowseMode(page: Page, label: 'Available' | 'Collection' | 'All modules'): Promise<void> {
  const button = page.locator('.module-browser-mode__button', {hasText: new RegExp(`^${ escapeForRegExp(label) }$`, 'i')}).first();
  await expect(button).toBeVisible({timeout: 10_000});
  await button.click();
  await expect(button).toHaveAttribute('aria-pressed', 'true');
}

async function searchForModule(page: Page, name: string): Promise<void> {
  const searchInput = page.locator('app-module-browser-root input').first();
  await expect(searchInput).toBeVisible({timeout: 10_000});
  await searchInput.fill(name);
}

async function addRackModuleToRack(page: Page, module: OwnedModule): Promise<void> {
  const addRequest = page.waitForResponse((response) =>
    response.url().includes('/rest/v1/rack_modules')
    && response.request().method() === 'POST'
    && response.ok(), {timeout: 15_000});

  await page.evaluate(({moduleId, moduleName}) => {
    const ng = (window as any).ng;
    if (!ng?.getComponent) {
      throw new Error('Angular debug API unavailable');
    }

    const rackDetail = document.querySelector('app-rack-browser-rack-detail');
    if (!rackDetail) {
      throw new Error('Rack detail view not found');
    }

    const component = ng.getComponent(rackDetail);
    component.dataService.addModuleToRack$.next({id: moduleId, name: moduleName});
  }, {
    moduleId: module.id,
    moduleName: module.name
  });

  await addRequest;
  await expect(page.locator('.module-browser-mode__button', {hasText: /^Available$/i})).toBeVisible({timeout: 15_000});
}

async function deleteTestRack(page: Page, rackUrl: string): Promise<void> {
  if (!rackUrl) {
    return;
  }

  try {
    await page.goto(rackUrl, {timeout: 15_000});
    await waitForRackDetail(page);
    await enterEditMode(page);

    const deleteButton = page.locator('app-rack-minimal button[mattooltip="Delete rack"]').first();
    await expect(deleteButton).toBeVisible({timeout: 8_000});
    await deleteButton.click();

    const confirmDelete = page.locator('mat-dialog-actions button, mat-dialog-actions app-brand-primary-button')
      .filter({hasText: /delete|confirm|yes/i})
      .first();
    await expect(confirmDelete).toBeVisible({timeout: 8_000});
    await confirmDelete.click();

    await expect(page).not.toHaveURL(rackUrl, {timeout: 10_000});
  } catch {
    // Best-effort cleanup for dedicated test racks.
  }
}

async function setCreateRackDialogPrivacy(page: Page, shouldBePublic: boolean): Promise<void> {
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

  await expect(actions.locator('mat-icon', {hasText: shouldBePublic ? 'public' : 'lock'}).first()).toBeVisible({
    timeout: 5_000
  });
}

async function readBox(locator: ReturnType<Page['locator']>): Promise<Rect> {
  await expect(locator).toBeVisible({timeout: 10_000});
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  return box as Rect;
}

function buildRackName(testInfo: TestInfo): string {
  const titleSlug = testInfo.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 10);

  return `[E2E] ${ titleSlug } ${ Date.now().toString().slice(-6) }`;
}

function escapeForRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
