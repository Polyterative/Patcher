import {
  expect,
  Page,
  test,
  TestInfo,
} from '@playwright/test';


const DESKTOP_VIEWPORT = {width: 1280, height: 960} as const;
const TABLET_VIEWPORT = {width: 820, height: 1180} as const;

const SUPABASE_URL = (process.env['SUPABASE_URL'] ?? 'https://sozmatmywjpstwidzlss.supabase.co').replace(/\/+$/, '');
const SUPABASE_ANON_KEY =
  process.env['SUPABASE_ANON_KEY'] ?? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlhdCI6MTYxODA4NDU1OCwiZXhwIjoxOTMzNjYwNTU4fQ.3pSLsqyaCAGgISvOrHMt2CIX9hQowty2r8etzMwlpy8';

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
  let seededModuleId: number | null = null;

  test.beforeEach(async ({page}, testInfo) => {
    test.setTimeout(120_000);
    rackUrl = await createEmptyRack(page, testInfo);
    // Ensure the user has at least one owned module before navigating to the
    // rack (the full page reload clears in-memory cache, making the seeded
    // module visible to Angular's data service on load).
    seededModuleId = await ensureOwnedModule(page);
    await openRackInEditMode(page, rackUrl, DESKTOP_VIEWPORT);
  });

  test.afterEach(async ({page}) => {
    await page.setViewportSize(DESKTOP_VIEWPORT);
    await deleteTestRack(page, rackUrl);
    if (seededModuleId !== null) {
      await removeOwnedModule(page, seededModuleId);
      seededModuleId = null;
    }
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
  const firstRack = Array.isArray(rackCreatePayload) ? rackCreatePayload[0] : rackCreatePayload;
  const createdRackPublicId = firstRack?.public_id;
  expect(createdRackPublicId).toBeTruthy();

  return `/racks/${ createdRackPublicId }`;
}

async function openRackInEditMode(page: Page, rackUrl: string, viewport: {width: number; height: number}): Promise<void> {
  await page.setViewportSize(viewport);
  // Intercept user_modules API calls for debugging
  const userModulesRequests: string[] = [];
  page.on('response', async (resp) => {
    if (resp.url().includes('/rest/v1/user_modules') && resp.request().method() === 'GET') {
      try {
        const body = await resp.text();
        userModulesRequests.push(`url=${resp.url().split('?')[1]?.slice(0, 100)} status=${resp.status()} body=${body.slice(0, 150)}`);
      } catch {}
    }
  });
  await page.goto(rackUrl);
  await waitForRackDetail(page);
  await enterEditMode(page);
  if (userModulesRequests.length > 0) {
    console.log(`[openRackInEditMode] user_modules calls: ${userModulesRequests.join(' | ')}`);
  }
}

async function waitForRackDetail(page: Page): Promise<void> {
  await expect(page.locator('app-rack-editor')).toBeVisible({timeout: 20_000});
  await expect(page.locator('app-rack-composite')).toBeVisible({timeout: 20_000});
}

async function enterEditMode(page: Page): Promise<void> {
  const moduleBrowser = page.locator('app-module-browser-root');
  const modeToggle = page.locator('[role="group"][aria-label="Rack module browser mode"]');

  // If the module browser is not yet visible, click the "Edit rack" button first.
  if (!await moduleBrowser.isVisible().catch(() => false)) {
    const editRackButton = page.getByRole('button', {name: /^Edit rack$/i}).first();
    await expect(editRackButton).toBeVisible({timeout: 10_000});
    await editRackButton.click();
    await expect(moduleBrowser).toBeVisible({timeout: 20_000});
  }

  // Always wait for the browse-mode toggle (needs owned-modules data to load).
  await expect(modeToggle).toBeVisible({timeout: 30_000});
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
  const toggle = page.locator('[role="group"][aria-label="Rack module browser mode"]');
  await expect(toggle).toBeVisible({timeout: 20_000});
  const button = toggle.getByRole('button', {name: label});
  await expect(button).toBeVisible({timeout: 20_000});
  await button.click();
  await expect(button).toHaveAttribute('aria-pressed', 'true', {timeout: 10_000});
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

/**
 * Ensures the logged-in user has at least one owned module by seeding one
 * from the public catalogue if none exist.  Must be called while an
 * authenticated page is loaded (localStorage has the Supabase auth token).
 * Returns the seeded module id, or null if the user already had modules.
 */
async function ensureOwnedModule(page: Page): Promise<number | null> {
  const result = await page.evaluate(
    async ({supabaseUrl, anonKey}) => {
      const lsKey = Object.keys(localStorage).find(k => k.includes('auth-token'));
      if (!lsKey) { return {status: 'no-lskey', moduleId: null}; }

      const authData = JSON.parse(localStorage.getItem(lsKey) ?? '{}') as {access_token?: string};
      const accessToken = authData?.access_token;
      if (!accessToken) { return {status: 'no-token', moduleId: null}; }

      const headers: Record<string, string> = {
        apikey: anonKey,
        Authorization: `Bearer ${ accessToken }`,
        'Content-Type': 'application/json',
      };

      // Use the same complex JOIN that Angular's getCurrentUserModules uses,
      // including manufacturer join (which uses INNER JOIN semantics in PostgREST
      // for NOT-NULL FK columns), to check for truly valid owned modules.
      const fullJoin =
        'kind,updated,module:modules!user_modules_moduleid_fkey(id,name,manufacturer:manufacturerId(id,name))';
      const existingResp = await fetch(
        `${ supabaseUrl }/rest/v1/user_modules?select=${ encodeURIComponent(fullJoin) }&limit=5`,
        {headers},
      );
      const existing = (await existingResp.json()) as Array<{
        module: {id: number; name: string; manufacturer: {id: number} | null} | null;
      }>;
      const hasValidModules =
        Array.isArray(existing) && existing.some(r => r.module?.id != null && r.module?.manufacturer != null);
      if (hasValidModules) { return {status: 'already-has-valid-modules', moduleId: null}; }

      // Decode JWT to get user ID.
      let profileId: string | null = null;
      try {
        const payload = JSON.parse(atob(accessToken.split('.')[1])) as {sub?: string};
        profileId = payload?.sub ?? null;
      } catch {
        return {status: 'jwt-decode-error', moduleId: null};
      }
      if (!profileId) { return {status: 'no-profile-id', moduleId: null}; }

      // Find an approved module that also has a valid manufacturer (required by Angular's
      // full JOIN query — modules without a manufacturer are excluded from results).
      const modulesResp = await fetch(
        `${ supabaseUrl }/rest/v1/modules?select=id,name,manufacturer:manufacturers!modules_manufacturerid_fkey(id)&isApproved=eq.true&limit=5`,
        {headers},
      );
      const modulesBody = await modulesResp.text();
      let candidateModules: Array<{id: number; manufacturer: {id: number} | null}> = [];
      try { candidateModules = JSON.parse(modulesBody); } catch { candidateModules = []; }
      const validModule = Array.isArray(candidateModules)
        ? candidateModules.find(m => m.manufacturer?.id != null)
        : undefined;
      if (!validModule) {
        return {status: `no-valid-module-found:${modulesResp.status}:${modulesBody.slice(0, 100)}`, moduleId: null};
      }
      const moduleId = validModule.id;

      // Remove any phantom records for this profile before inserting.
      await fetch(`${ supabaseUrl }/rest/v1/user_modules?profileid=eq.${ profileId }`, {
        method: 'DELETE',
        headers,
      });

      const addResp = await fetch(`${ supabaseUrl }/rest/v1/user_modules`, {
        method: 'POST',
        headers: {...headers, Prefer: 'return=minimal'},
        body: JSON.stringify({moduleid: moduleId, profileid: profileId}),
      });
      const addBody = await addResp.text();
      if (!addResp.ok) {
        return {status: `insert-failed:${addResp.status}:${addBody.slice(0, 200)}`, moduleId: null};
      }
      return {status: 'seeded', moduleId};
    },
    {supabaseUrl: SUPABASE_URL, anonKey: SUPABASE_ANON_KEY},
  );
  return result.moduleId;
}

/** Removes a previously seeded module from the user's collection. */
async function removeOwnedModule(page: Page, moduleId: number): Promise<void> {
  await page.evaluate(
    async ({supabaseUrl, anonKey, mId}) => {
      const lsKey = Object.keys(localStorage).find(k => k.includes('auth-token'));
      if (!lsKey) { return; }

      const authData = JSON.parse(localStorage.getItem(lsKey) ?? '{}') as {access_token?: string};
      const accessToken = authData?.access_token;
      if (!accessToken) { return; }

      await fetch(`${ supabaseUrl }/rest/v1/user_modules?moduleid=eq.${ mId }`, {
        method: 'DELETE',
        headers: {apikey: anonKey, Authorization: `Bearer ${ accessToken }`},
      });
    },
    {supabaseUrl: SUPABASE_URL, anonKey: SUPABASE_ANON_KEY, mId: moduleId},
  );
}
