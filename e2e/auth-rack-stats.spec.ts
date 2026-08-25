import {
  expect,
  Page,
  test,
  TestInfo,
} from '@playwright/test';


// Regression coverage for two rack bugs caused by an incomplete optimistic
// module shape coming out of getCurrentUserModules:
//   1. 1U modules rendered at full 3U height once added to a rack because the
//      collection module carried `standard` as a raw FK number instead of the
//      joined {id,name} object (standard?.id was undefined -> 3U fallback).
//   2. Rack stats showed "NaN mm" / "NaN kg" after adding a module "out of any
//      row" because the optimistic module lacked depth/weight and the totals
//      filtered with `!== null` (which lets `undefined` leak into Math.max/sum).
//
// Both are exercised through the *real* fixed pipeline: the collection module is
// read from `userAreaDataService.modulesData$` (fed by getCurrentUserModules)
// and pushed into `dataService.addModuleToRack$`, which runs the optimistic
// out-of-row insert (insertOptimisticModule row:null/column:null) and updates
// `rowedRackedModules$` -> stats + DOM render. We deliberately do NOT use the
// picker's backend bypass (which re-fetches canonical data and would mask both
// regressions).

const DESKTOP_VIEWPORT = {width: 1280, height: 960} as const;

const SUPABASE_URL = (process.env['SUPABASE_URL'] ?? 'https://sozmatmywjpstwidzlss.supabase.co').replace(/\/+$/, '');
const SUPABASE_ANON_KEY =
  process.env['SUPABASE_ANON_KEY'] ?? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlhdCI6MTYxODA4NDU1OCwiZXhwIjoxOTMzNjYwNTU4fQ.3pSLsqyaCAGgISvOrHMt2CIX9hQowty2r8etzMwlpy8';

// Standard ids that represent 1U formats (see module-format-geometry.constants).
// 0 & 1000 are 3U; 1 = Intellijel 1U; 2 = Pulp Logic 1U.
const ONE_U_STANDARD_IDS = [1, 2] as const;
// 3U renders at 25.4rem; 1U formats render well below ~9rem. This threshold is
// scale-independent because it reads the inline host `style.height` (rem),
// which is immune to rack zoom transforms.
const ONE_U_MAX_HEIGHT_REM = 15;
const MODULE_MIN_HEIGHT_REM = 3;

type SeededModule = {
  id: number;
  name: string;
  standard: number | null;
  seededModuleId: number | null;
};

type MinimalModuleLike = {
  id: number;
  name?: string | null;
  standard?: unknown;
  depth?: number | null;
  weight?: number | null;
};

type AngularDebugApi<Component> = {
  getComponent(element: Element): Component;
};

type AngularDebugWindow<Component> = Window & typeof globalThis & {
  ng?: AngularDebugApi<Component>;
};

type RackStatsDataService = {
  addModuleToRack$: {next(module: MinimalModuleLike): void};
  singleRackData$: {value: {id: number} | null | undefined};
  rowedRackedModules$: {value: unknown};
};

type UserAreaDataServiceLike = {
  modulesData$: {value: MinimalModuleLike[] | undefined};
};

type RackStatsComponent = {
  dataService: RackStatsDataService;
  userAreaDataService: UserAreaDataServiceLike;
};

type ModuleRealisticComponent = {
  data?: {id?: number; standard?: unknown} | null;
};

test.describe('Authenticated Rack Stats', () => {
  test.describe.configure({mode: 'serial'});

  let rackUrl = '';
  let seededModuleId: number | null = null;

  test.beforeEach(async ({page}) => {
    test.setTimeout(120_000);
    rackUrl = await createEmptyRack(page, test.info());
  });

  test.afterEach(async ({page}) => {
    await page.setViewportSize(DESKTOP_VIEWPORT);
    await deleteTestRack(page, rackUrl);
    if (seededModuleId !== null) {
      await removeOwnedModule(page, seededModuleId);
      seededModuleId = null;
    }
  });

  test('adding a module out of any row keeps rack stats finite (no NaN)', async ({page}) => {
    const owned = await ensureOwnedModule(page);
    seededModuleId = owned.seededModuleId;

    await openRackInEditMode(page, rackUrl);
    await pushOptimisticAdd(page, owned.id);

    const statCard = page.locator('app-entity-stat-card').first();
    await expect(statCard).toBeVisible({timeout: 20_000});

    // The regression rendered "NaN mm" / "NaN kg"; assert the depth/weight
    // units are present with finite numbers instead.
    await expect(statCard).toContainText('mm', {timeout: 15_000});
    await expect(statCard).toContainText('kg', {timeout: 15_000});
    const statText = (await statCard.innerText()).trim();
    expect(statText, `stat card should not contain NaN: ${ statText }`).not.toContain('NaN');
  });

  test('adding a 1U module out of any row keeps 1U proportions (not 3U height)', async ({page}) => {
    const owned = await ensureOwned1UModule(page);
    test.skip(owned === null, 'No approved 1U module available to seed in this environment');
    if (!owned) {
      return;
    }
    seededModuleId = owned.seededModuleId;

    await openRackInEditMode(page, rackUrl);
    await pushOptimisticAdd(page, owned.id);

    const heightRem = await readOptimisticModuleHeightRem(page, owned.id);
    expect(heightRem, 'optimistic 1U module should render with a real height').not.toBeNull();
    // A 3U fallback (the regression) would be 25.4rem; a 1U format is < ~9rem.
    expect(heightRem as number).toBeGreaterThan(MODULE_MIN_HEIGHT_REM);
    expect(heightRem as number).toBeLessThan(ONE_U_MAX_HEIGHT_REM);
  });
});

/**
 * Pushes a real collection module (from getCurrentUserModules via
 * userAreaDataService.modulesData$) into the optimistic add pipeline, exactly
 * as the app does internally, and waits for the resulting rack_modules POST.
 */
async function pushOptimisticAdd(page: Page, moduleId: number): Promise<void> {
  const addRequest = page.waitForResponse((response) =>
    response.url().includes('/rest/v1/rack_modules')
    && response.request().method() === 'POST'
    && response.ok(), {timeout: 20_000});

  const pushed = await page.evaluate(({mId}) => {
    const ng = (window as AngularDebugWindow<RackStatsComponent>).ng;
    if (!ng?.getComponent) {
      throw new Error('Angular debug API unavailable');
    }

    const rackDetail = document.querySelector('app-rack-browser-rack-detail');
    if (!rackDetail) {
      throw new Error('Rack detail view not found');
    }

    const component = ng.getComponent(rackDetail);
    const modules = component.userAreaDataService.modulesData$.value ?? [];
    const module = modules.find((m) => m.id === mId) ?? modules[0];
    if (!module) {
      return {ok: false, reason: 'no-collection-module'};
    }

    component.dataService.addModuleToRack$.next(module);
    return {ok: true, addedId: module.id};
  }, {mId: moduleId});

  if (!pushed.ok) {
    throw new Error(`Optimistic add failed: ${ pushed.reason }`);
  }

  await addRequest;
}

/**
 * Reads the rendered inline host height (rem) of the optimistically-added
 * module by matching the module id on its Angular component instance. Reading
 * `style.height` avoids rack zoom transforms and is unit-stable.
 */
async function readOptimisticModuleHeightRem(page: Page, moduleId: number): Promise<number | null> {
  const moduleRealistic = page.locator('app-module-realistic').first();
  await expect(moduleRealistic).toBeVisible({timeout: 20_000});

  return page.evaluate(({mId}) => {
    const ng = (window as AngularDebugWindow<ModuleRealisticComponent>).ng;
    if (!ng?.getComponent) {
      throw new Error('Angular debug API unavailable');
    }

    const elements = Array.from(document.querySelectorAll('app-module-realistic'));
    for (const element of elements) {
      const component = ng.getComponent(element);
      if (component?.data?.id === mId) {
        const rawHeight = (element as HTMLElement).style.height;
        const parsed = Number.parseFloat(rawHeight);
        return Number.isFinite(parsed) ? parsed : null;
      }
    }

    return null;
  }, {mId: moduleId});
}

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

async function openRackInEditMode(page: Page, rackUrl: string): Promise<void> {
  await page.setViewportSize(DESKTOP_VIEWPORT);
  // Clear stale app cache so Angular re-fetches user modules fresh on load.
  await page.evaluate(() => localStorage.removeItem('CACHE_STORAGE'));
  await page.goto(rackUrl);
  await waitForRackDetail(page);
  await enterEditMode(page);
}

async function waitForRackDetail(page: Page): Promise<void> {
  await expect(page.locator('app-rack-editor')).toBeVisible({timeout: 20_000});
  await expect(page.locator('app-rack-composite')).toBeVisible({timeout: 20_000});
}

async function enterEditMode(page: Page): Promise<void> {
  const moduleBrowser = page.locator('app-module-browser-root');
  const modeToggle = page.locator('[role="group"][aria-label="Rack module browser mode"]');

  if (!await moduleBrowser.isVisible().catch(() => false)) {
    const editRackButton = page.getByRole('button', {name: /^Edit rack$/i}).first();
    await expect(editRackButton).toBeVisible({timeout: 10_000});
    await editRackButton.click();
    await expect(moduleBrowser).toBeVisible({timeout: 20_000});
  }

  // Wait for the browse-mode toggle (needs owned-modules data to load).
  await expect(modeToggle).toBeVisible({timeout: 30_000});
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

function buildRackName(testInfo: TestInfo): string {
  const titleSlug = testInfo.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 10);

  return `[E2E] ${ titleSlug } ${ Date.now().toString().slice(-6) }`;
}

/**
 * Ensures the logged-in user owns at least one module (any format), seeding one
 * from the public catalogue if needed. Returns the module plus the seeded id
 * (null if the user already owned a valid module, so afterEach won't remove a
 * pre-existing collection module).
 */
async function ensureOwnedModule(page: Page): Promise<SeededModule> {
  const result = await seedOwnedModule(page, null);
  if (!result.module) {
    throw new Error(`Unable to prepare an owned module for auth rack stats tests: ${ result.status }`);
  }
  return {...result.module, seededModuleId: result.seededModuleId};
}

/**
 * Ensures the user owns an approved 1U module (standard in {1,2}). Returns null
 * (so the caller can skip) when the catalogue has no seedable 1U module.
 */
async function ensureOwned1UModule(page: Page): Promise<SeededModule | null> {
  const result = await seedOwnedModule(page, [...ONE_U_STANDARD_IDS]);
  if (!result.module) {
    return null;
  }
  return {...result.module, seededModuleId: result.seededModuleId};
}

/**
 * Shared REST seeding used by both ensure* helpers. When `standardIds` is
 * provided, only modules whose `standard` FK is in that set are considered.
 * Must run on an authenticated page (localStorage holds the Supabase token).
 */
async function seedOwnedModule(
  page: Page,
  standardIds: number[] | null,
): Promise<{status: string; module: {id: number; name: string; standard: number | null} | null; seededModuleId: number | null}> {
  return page.evaluate(
    async ({supabaseUrl, anonKey, standardFilterIds}) => {
      const lsKey = Object.keys(localStorage).find(k => k.includes('auth-token'));
      if (!lsKey) { return {status: 'no-lskey', module: null, seededModuleId: null}; }

      const authData = JSON.parse(localStorage.getItem(lsKey) ?? '{}') as {
        access_token?: string;
        currentSession?: {access_token?: string};
        session?: {access_token?: string};
      };
      const accessToken = authData?.access_token
        ?? authData?.currentSession?.access_token
        ?? authData?.session?.access_token;
      if (!accessToken) { return {status: 'no-token', module: null, seededModuleId: null}; }

      const headers: Record<string, string> = {
        apikey: anonKey,
        Authorization: `Bearer ${ accessToken }`,
        'Content-Type': 'application/json',
      };

      let profileId: string | null = null;
      try {
        const payload = JSON.parse(atob(accessToken.split('.')[1])) as {sub?: string};
        profileId = payload?.sub ?? null;
      } catch {
        return {status: 'jwt-decode-error', module: null, seededModuleId: null};
      }
      if (!profileId) { return {status: 'no-profile-id', module: null, seededModuleId: null}; }

      const matchesStandard = (standard: number | null | undefined): boolean =>
        standardFilterIds === null
        || (standard != null && standardFilterIds.includes(standard));

      // Reuse the same join Angular's getCurrentUserModules performs, plus the
      // standard FK, to check for an already-owned module that satisfies the
      // requested format.
      const fullJoin =
        'kind,module:modules!user_modules_moduleid_fkey(id,name,standard,manufacturer:manufacturerId(id,name))';
      const existingResp = await fetch(
        `${ supabaseUrl }/rest/v1/user_modules?select=${ encodeURIComponent(fullJoin) }&profileid=eq.${ profileId }&limit=25`,
        {headers},
      );
      const existing = (await existingResp.json()) as Array<{
        kind: string | null;
        module: {id: number; name: string; standard: number | null; manufacturer: {id: number} | null} | null;
      }>;
      const existingOwnedModule = Array.isArray(existing)
        ? existing.find(r =>
          (r.kind === 'HAS' || r.kind === 'SELLS')
          && r.module?.id != null
          && r.module?.manufacturer != null
          && matchesStandard(r.module?.standard),
        )
        : undefined;
      if (existingOwnedModule?.module?.id) {
        return {
          status: 'already-has-valid-modules',
          module: {
            id: existingOwnedModule.module.id,
            name: existingOwnedModule.module.name,
            standard: existingOwnedModule.module.standard ?? null,
          },
          seededModuleId: null,
        };
      }

      // Find an approved module with a valid manufacturer (Angular's full JOIN
      // excludes modules without a manufacturer), matching the requested format.
      const standardQuery = standardFilterIds === null
        ? ''
        : `&standard=in.(${ standardFilterIds.join(',') })`;
      const modulesResp = await fetch(
        `${ supabaseUrl }/rest/v1/modules?select=id,name,standard,manufacturer:manufacturerId(id)&isApproved=eq.true${ standardQuery }&limit=10`,
        {headers},
      );
      const modulesBody = await modulesResp.text();
      let candidateModules: Array<{id: number; name: string; standard: number | null; manufacturer: {id: number} | null}> = [];
      try { candidateModules = JSON.parse(modulesBody); } catch { candidateModules = []; }
      const validModule = Array.isArray(candidateModules)
        ? candidateModules.find(m => m.manufacturer?.id != null && matchesStandard(m.standard))
        : undefined;
      if (!validModule) {
        return {status: `no-valid-module-found:${ modulesResp.status }:${ modulesBody.slice(0, 100) }`, module: null, seededModuleId: null};
      }

      const addResp = await fetch(`${ supabaseUrl }/rest/v1/user_modules?on_conflict=profileid,moduleid`, {
        method: 'POST',
        headers: {...headers, Prefer: 'return=minimal,resolution=merge-duplicates'},
        body: JSON.stringify({moduleid: validModule.id, profileid: profileId, kind: 'HAS'}),
      });
      const addBody = await addResp.text();
      if (!addResp.ok) {
        return {status: `insert-failed:${ addResp.status }:${ addBody.slice(0, 200) }`, module: null, seededModuleId: null};
      }
      return {
        status: 'seeded',
        module: {id: validModule.id, name: validModule.name, standard: validModule.standard ?? null},
        seededModuleId: validModule.id,
      };
    },
    {supabaseUrl: SUPABASE_URL, anonKey: SUPABASE_ANON_KEY, standardFilterIds: standardIds},
  );
}

/** Removes a previously seeded module from the user's collection. */
async function removeOwnedModule(page: Page, moduleId: number): Promise<void> {
  await page.evaluate(
    async ({supabaseUrl, anonKey, mId}) => {
      const lsKey = Object.keys(localStorage).find(k => k.includes('auth-token'));
      if (!lsKey) { return; }

      const authData = JSON.parse(localStorage.getItem(lsKey) ?? '{}') as {
        access_token?: string;
        currentSession?: {access_token?: string};
        session?: {access_token?: string};
      };
      const accessToken = authData?.access_token
        ?? authData?.currentSession?.access_token
        ?? authData?.session?.access_token;
      if (!accessToken) { return; }

      let profileId: string | null = null;
      try {
        const payload = JSON.parse(atob(accessToken.split('.')[1])) as {sub?: string};
        profileId = payload?.sub ?? null;
      } catch {
        profileId = null;
      }
      if (!profileId) { return; }

      await fetch(`${ supabaseUrl }/rest/v1/user_modules?moduleid=eq.${ mId }&profileid=eq.${ profileId }`, {
        method: 'DELETE',
        headers: {apikey: anonKey, Authorization: `Bearer ${ accessToken }`},
      });
    },
    {supabaseUrl: SUPABASE_URL, anonKey: SUPABASE_ANON_KEY, mId: moduleId},
  );
}
