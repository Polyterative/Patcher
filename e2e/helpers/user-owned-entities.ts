import {
  expect,
  type Page
} from '@playwright/test';


const DEFAULT_SUPABASE_URL = 'https://sozmatmywjpstwidzlss.supabase.co';
const MINIMUM_RICH_PATCH_CONNECTIONS = 1;
const MINIMUM_RICH_PATCH_MODULES = 2;

interface AuthSession {
  accessToken: string;
  userId: string;
}

export interface PatchSummary {
  id: number;
  publicId: string | null;
  name: string | null;
  updated: string;
  created: string;
  connectionCount: number;
  moduleCount: number;
  visibility: 'owned' | 'public';
}

export interface BlockedScreenshotEvidence {
  selectionQuery?: string;
  observed?: string;
}

interface PatchSummaryBase {
  id: number;
  public_id: string | null;
  name: string | null;
  updated: string;
  created: string;
}

interface StorageAuthValue {
  access_token?: unknown;
  user?: {
    id?: unknown;
  };
  currentSession?: {
    access_token?: unknown;
    user?: {
      id?: unknown;
    };
  };
}

export class BlockedScreenshotError extends Error {
  constructor(message: string, readonly evidence: BlockedScreenshotEvidence = {}) {
    super(message);
    this.name = 'BlockedScreenshotError';
  }
}

export async function openOwnedPatchDetails(page: Page): Promise<void> {
  await page.goto('/user/area');
  await expect(page).toHaveURL(/\/user\/area/, {timeout: 20_000});
  await expect(page.locator('app-user-patches')).toBeVisible({timeout: 20_000});

  let patchTitle = page.locator('app-user-patches app-hero-clickable-title .title').first();
  const hasPatch = await patchTitle.isVisible({timeout: 20_000}).catch(() => false);

  if (!hasPatch) {
    const createPatchButton = page.locator('app-user-patches app-brand-primary-button', {hasText: /create patch/i}).first();
    await expect(createPatchButton).toBeVisible({timeout: 10_000});
    await createPatchButton.click();

    const createPatchDialog = page.locator('mat-dialog-container').last();
    await expect(page.getByRole('heading', {name: /create new patch/i})).toBeVisible({timeout: 10_000});

    const confirmCreateByRole = createPatchDialog.getByRole('button', {name: /^Create$/i}).first();
    if (await confirmCreateByRole.isVisible().catch(() => false)) {
      await confirmCreateByRole.click();
    } else {
      const confirmCreateByComponent = createPatchDialog.locator('app-brand-primary-button', {hasText: /create/i}).first();
      if (await confirmCreateByComponent.isVisible().catch(() => false)) {
        await confirmCreateByComponent.click();
      } else {
        await createPatchDialog.getByText(/^Create$/i).last().click();
      }
    }

    await expect(createPatchDialog).toBeHidden({timeout: 20_000});
    patchTitle = page.locator('app-user-patches app-hero-clickable-title .title').first();
    await expect(patchTitle).toBeVisible({timeout: 20_000});
  }

  await patchTitle.click();

  await expect(page).toHaveURL(/\/patches\/(details\/\d+|[A-Za-z0-9_-]+)/, {timeout: 20_000});
  await expect(page.getByRole('heading', {name: /Patch (details|editing)/i}).first()).toBeVisible({timeout: 20_000});
  await expect(page.locator('app-patch-composite').first()).toBeVisible({timeout: 20_000});
}

export async function openOwnedPatchDetailsInEditMode(page: Page): Promise<void> {
  await openOwnedPatchDetails(page);

  const editingHeading = page.getByRole('heading', {name: /Patch editing/i}).first();
  const editPatchButton = page.locator('app-edit-fab button', {hasText: /^Edit$/i}).first();

  await Promise.any([
    editingHeading.waitFor({state: 'visible', timeout: 10_000}),
    editPatchButton.waitFor({state: 'visible', timeout: 10_000})
  ]).catch(() => undefined);

  if (await editingHeading.isVisible().catch(() => false)) {
    return;
  }

  await expect(editPatchButton).toBeVisible({timeout: 10_000});
  await editPatchButton.click();

  await expect(editingHeading).toBeVisible({timeout: 20_000});
  await expect(page.getByRole('button', {name: /Close editor/i}).first()).toBeVisible({timeout: 20_000});
}

export async function pickBestOwnedPatch(
  page: Page,
  minimumConnections = MINIMUM_RICH_PATCH_CONNECTIONS
): Promise<PatchSummary> {
  const session = await readAuthSession(page);
  const supabaseUrl = (process.env['SUPABASE_URL'] || DEFAULT_SUPABASE_URL).replace(/\/+$/, '');
  const supabaseAnonKey = process.env['SUPABASE_ANON_KEY']?.trim();

  if (!supabaseAnonKey) {
    throw new BlockedScreenshotError('Cannot select a docs screenshot patch because SUPABASE_ANON_KEY is unavailable.', {
      selectionQuery: 'SUPABASE_ANON_KEY required for read-only REST selection'
    });
  }
  const patchesQuery = `patches?select=id,public_id,name,updated,created&authorid=eq.${ encodeURIComponent(session.userId) }&order=id.asc&limit=100`;

  const patches = await fetchRestRows<PatchSummaryBase>(
    supabaseUrl,
    supabaseAnonKey,
    session.accessToken,
    patchesQuery
  );

  if (!patches.length) {
    throw new BlockedScreenshotError('No existing owned patches were found for the docs patch-detail screenshot.', {
      selectionQuery: patchesQuery,
      observed: '0 owned patches'
    });
  }

  const patchIds = patches.map(patch => patch.id);
  const [connectionCounts, moduleCounts] = await Promise.all([
    countRowsByPatchId(supabaseUrl, supabaseAnonKey, session.accessToken, 'patch_connections', 'patchid', patchIds),
    countRowsByPatchId(supabaseUrl, supabaseAnonKey, session.accessToken, 'patch_module_instances', 'patch_id', patchIds)
  ]);
  const candidates = patches
    .map(patch => ({
      id: patch.id,
      publicId: patch.public_id,
      name: patch.name,
      updated: patch.updated,
      created: patch.created,
      connectionCount: connectionCounts.get(patch.id) ?? 0,
      moduleCount: moduleCounts.get(patch.id) ?? 0,
      visibility: 'owned' as const
    }));
  const best = rankRichPatchCandidates(candidates, minimumConnections)[0];

  if (!best) {
    const highestConnectionCount = Math.max(...candidates.map(candidate => candidate.connectionCount), 0);
    const highestModuleCount = Math.max(...candidates.map(candidate => candidate.moduleCount), 0);
    throw new BlockedScreenshotError(
      `No owned patch meets the ${ minimumConnections }-connection and ${ MINIMUM_RICH_PATCH_MODULES }-module docs screenshot threshold.`,
      {
        selectionQuery: [
          patchesQuery,
          `patch_connections?select=patchid&patchid=in.(${ patchIds.join(',') })`,
          `patch_module_instances?select=patch_id&patch_id=in.(${ patchIds.join(',') })`
        ].join('\n'),
        observed: `owned patches=${ candidates.length }, highest connections=${ highestConnectionCount }, highest modules=${ highestModuleCount }`
      }
    );
  }

  return best;
}

export async function pickBestPublicPatch(
  _page: Page,
  minimumConnections = MINIMUM_RICH_PATCH_CONNECTIONS,
  ownedEvidence?: BlockedScreenshotEvidence
): Promise<PatchSummary> {
  const supabaseUrl = (process.env['SUPABASE_URL'] || DEFAULT_SUPABASE_URL).replace(/\/+$/, '');
  const supabaseAnonKey = process.env['SUPABASE_ANON_KEY']?.trim();

  if (!supabaseAnonKey) {
    throw new BlockedScreenshotError('Cannot select a public docs screenshot patch because SUPABASE_ANON_KEY is unavailable.', {
      selectionQuery: 'SUPABASE_ANON_KEY required for read-only REST selection'
    });
  }

  const publicPatchesQuery = 'patches?select=id,public_id,name,updated,created&public=eq.true&public_id=not.is.null&order=id.asc&limit=200';
  const patches = await fetchRestRows<PatchSummaryBase>(
    supabaseUrl,
    supabaseAnonKey,
    supabaseAnonKey,
    publicPatchesQuery
  );
  const patchIds = patches.map(patch => patch.id);
  const [connectionCounts, moduleCounts] = await Promise.all([
    countRowsByPatchId(supabaseUrl, supabaseAnonKey, supabaseAnonKey, 'patch_connections', 'patchid', patchIds),
    countRowsByPatchId(supabaseUrl, supabaseAnonKey, supabaseAnonKey, 'patch_module_instances', 'patch_id', patchIds)
  ]);
  const candidates = patches
    .map(patch => ({
      id: patch.id,
      publicId: patch.public_id,
      name: patch.name,
      updated: patch.updated,
      created: patch.created,
      connectionCount: connectionCounts.get(patch.id) ?? 0,
      moduleCount: moduleCounts.get(patch.id) ?? 0,
      visibility: 'public' as const
    }));
  const best = rankRichPatchCandidates(candidates, minimumConnections)[0];

  if (!best) {
    const highestConnectionCount = Math.max(...candidates.map(candidate => candidate.connectionCount), 0);
    const highestModuleCount = Math.max(...candidates.map(candidate => candidate.moduleCount), 0);
    throw new BlockedScreenshotError(
      `No public patch meets the public ${ minimumConnections }-connection and ${ MINIMUM_RICH_PATCH_MODULES }-module docs screenshot fallback threshold.`,
      {
        selectionQuery: [
          ownedEvidence?.selectionQuery ? `owned-first:\n${ ownedEvidence.selectionQuery }` : undefined,
          publicPatchesQuery,
          patchIds.length ? `patch_connections?select=patchid&patchid=in.(${ patchIds.join(',') })` : 'patch_connections?select=patchid&patchid=in.()',
          patchIds.length ? `patch_module_instances?select=patch_id&patch_id=in.(${ patchIds.join(',') })` : 'patch_module_instances?select=patch_id&patch_id=in.()'
        ].filter(Boolean).join('\n'),
        observed: [
          ownedEvidence?.observed ? `owned-first: ${ ownedEvidence.observed }` : undefined,
          `public patches=${ candidates.length }, highest connections=${ highestConnectionCount }, highest modules=${ highestModuleCount }`
        ].filter(Boolean).join('; ')
      }
    );
  }

  return best;
}

export async function pickBestDocsPatch(page: Page): Promise<PatchSummary> {
  try {
    return await pickBestOwnedPatch(page);
  } catch (error) {
    if (error instanceof BlockedScreenshotError) {
      return await pickBestPublicPatch(page, MINIMUM_RICH_PATCH_CONNECTIONS, error.evidence);
    }
    throw error;
  }
}

export async function openBestPatchDetailsForDocs(page: Page): Promise<PatchSummary> {
  const patch = await pickBestDocsPatch(page);
  const patchPath = patch.publicId ? `/patches/${ patch.publicId }` : `/patches/details/${ patch.id }`;

  if (patch.visibility === 'public') {
    await page.goto(patchPath);
    await expect(page).toHaveURL(/\/patches\/[A-Za-z0-9_-]+/, {timeout: 20_000});
    await expect(page.getByRole('heading', {name: /Patch details/i}).first()).toBeVisible({timeout: 20_000});
    await expect(page.locator('app-patch-composite').first()).toBeVisible({timeout: 20_000});
    return patch;
  }

  return await openBestOwnedPatchDetailsInEditMode(page, patch);
}

export async function openBestOwnedPatchDetailsInEditMode(page: Page, selectedPatch?: PatchSummary): Promise<PatchSummary> {
  const patch = selectedPatch ?? await pickBestOwnedPatch(page);
  const patchPath = patch.publicId ? `/patches/${ patch.publicId }` : `/patches/details/${ patch.id }`;

  await page.goto(patchPath);
  await expect(page).toHaveURL(/\/patches\/(details\/\d+|[A-Za-z0-9_-]+)/, {timeout: 20_000});
  await expect(page.getByRole('heading', {name: /Patch (details|editing)/i}).first()).toBeVisible({timeout: 20_000});
  await expect(page.locator('app-patch-composite').first()).toBeVisible({timeout: 20_000});

  const editingHeading = page.getByRole('heading', {name: /Patch editing/i}).first();
  const editPatchButton = page.locator('app-edit-fab button', {hasText: /^Edit$/i}).first();

  await Promise.any([
    editingHeading.waitFor({state: 'visible', timeout: 10_000}),
    editPatchButton.waitFor({state: 'visible', timeout: 10_000})
  ]).catch(() => undefined);

  if (!(await editingHeading.isVisible().catch(() => false))) {
    await expect(editPatchButton).toBeVisible({timeout: 10_000});
    await editPatchButton.click();
  }

  await expect(editingHeading).toBeVisible({timeout: 20_000});
  await expect(page.getByRole('button', {name: /Close editor/i}).first()).toBeVisible({timeout: 20_000});

  return patch;
}

function rankRichPatchCandidates(
  candidates: PatchSummary[],
  minimumConnections: number
): PatchSummary[] {
  return candidates
    .filter(candidate => candidate.connectionCount >= minimumConnections && candidate.moduleCount >= MINIMUM_RICH_PATCH_MODULES)
    .sort((a, b) =>
      b.connectionCount - a.connectionCount
      || b.moduleCount - a.moduleCount
      || Date.parse(b.updated) - Date.parse(a.updated)
      || a.id - b.id
    );
}

export async function openOwnedRackDetailsInEditMode(page: Page): Promise<void> {
  await page.goto('/user/area');
  await expect(page).toHaveURL(/\/user\/area/, {timeout: 20_000});
  await expect(page.locator('app-user-racks')).toBeVisible({timeout: 20_000});

  let rackTitle = page.locator('app-user-racks app-hero-clickable-title .title').first();
  const hasRack = await rackTitle.isVisible({timeout: 20_000}).catch(() => false);

  if (!hasRack) {
    const createRackButton = page.locator('app-user-racks app-brand-primary-button', {hasText: /create rack/i}).first();
    await expect(createRackButton).toBeVisible({timeout: 10_000});
    await createRackButton.click();

    const dialog = page.locator('mat-dialog-container').last();
    await expect(page.getByRole('heading', {name: /create new rack/i})).toBeVisible({timeout: 10_000});

    await setCreateRackDialogPrivacy(page, false);

    const confirmByRole = dialog.getByRole('button', {name: /^Create$/i}).first();
    if (await confirmByRole.isVisible({timeout: 5_000}).catch(() => false)) {
      await confirmByRole.click();
    } else {
      await dialog.locator('app-brand-primary-button', {hasText: /create/i}).first().click();
    }

    await expect(dialog).toBeHidden({timeout: 20_000});
    rackTitle = page.locator('app-user-racks app-hero-clickable-title .title').first();
    await expect(rackTitle).toBeVisible({timeout: 20_000});
  }

  await rackTitle.click();

  await expect(page).toHaveURL(/\/racks\/[^/]+/, {timeout: 20_000});
  await expect(page.getByRole('heading', {name: /Rack (Details|Editing)/i}).first()).toBeVisible({timeout: 20_000});
  await expect(page.locator('app-rack-composite').first()).toBeVisible({timeout: 20_000});

  const editingHeading = page.getByRole('heading', {name: /Rack Editing/i}).first();
  const editRackButton = page.getByRole('button', {name: /^Edit rack$/i}).first();
  const editFabRackButton = page.locator('app-edit-fab button', {hasText: /^Edit rack$/i}).first();
  const genericEditFabButton = page.locator('app-edit-fab button', {hasText: /^Edit$/i}).first();

  await Promise.any([
    editingHeading.waitFor({state: 'visible', timeout: 10_000}),
    editRackButton.waitFor({state: 'visible', timeout: 10_000}),
    editFabRackButton.waitFor({state: 'visible', timeout: 10_000}),
    genericEditFabButton.waitFor({state: 'visible', timeout: 10_000})
  ]).catch(() => undefined);

  if (await editingHeading.isVisible().catch(() => false)) {
    return;
  }

  if (await editRackButton.isVisible().catch(() => false)) {
    await editRackButton.click();
  } else {
    if (await editFabRackButton.isVisible().catch(() => false)) {
      await editFabRackButton.click();
    } else {
      await expect(genericEditFabButton).toBeVisible({timeout: 10_000});
      await genericEditFabButton.click();
    }
  }

  await expect(editingHeading).toBeVisible({timeout: 20_000});
}

async function setCreateRackDialogPrivacy(page: Page, shouldBePublic: boolean): Promise<void> {
  const actions = page.locator('mat-dialog-actions').last();
  await expect(actions).toBeVisible({timeout: 5_000});

  const toggle = actions.locator('mat-slide-toggle').first();
  await expect(toggle).toBeVisible({timeout: 5_000});

  const currentIcon = ((await actions.locator('mat-icon').first().textContent()) ?? '').trim();
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

async function readAuthSession(page: Page): Promise<AuthSession> {
  const storageState = await page.context().storageState();

  for (const origin of storageState.origins) {
    for (const item of origin.localStorage) {
      if (!item.name.includes('auth-token')) {
        continue;
      }

      const parsed = safeParseAuthValue(item.value);
      const directToken = typeof parsed?.access_token === 'string' ? parsed.access_token : undefined;
      const directUserId = typeof parsed?.user?.id === 'string' ? parsed.user.id : undefined;
      const sessionToken = typeof parsed?.currentSession?.access_token === 'string'
        ? parsed.currentSession.access_token
        : undefined;
      const sessionUserId = typeof parsed?.currentSession?.user?.id === 'string'
        ? parsed.currentSession.user.id
        : undefined;
      const accessToken = directToken ?? sessionToken;
      const userId = directUserId ?? sessionUserId;

      if (accessToken && userId) {
        return {accessToken, userId};
      }
    }
  }

  throw new BlockedScreenshotError('Could not read the authenticated Supabase session for docs screenshot patch selection.');
}

function safeParseAuthValue(value: string): StorageAuthValue | null {
  try {
    const parsed = JSON.parse(value) as unknown;
    if (typeof parsed === 'object' && parsed !== null) {
      return parsed as StorageAuthValue;
    }
  } catch {
    return null;
  }

  return null;
}

async function fetchRestRows<T>(
  supabaseUrl: string,
  supabaseAnonKey: string,
  accessToken: string,
  path: string
): Promise<T[]> {
  const response = await fetch(`${ supabaseUrl }/rest/v1/${ path }`, {
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${ accessToken }`
    }
  });

  if (!response.ok) {
    throw new BlockedScreenshotError(`Supabase read failed for docs screenshot patch selection (${ response.status }).`);
  }

  return await response.json() as T[];
}

async function countRowsByPatchId(
  supabaseUrl: string,
  supabaseAnonKey: string,
  accessToken: string,
  table: string,
  patchIdColumn: string,
  patchIds: number[]
): Promise<Map<number, number>> {
  if (!patchIds.length) {
    return new Map<number, number>();
  }

  const rows = await fetchRestRows<Record<string, unknown>>(
    supabaseUrl,
    supabaseAnonKey,
    accessToken,
    `${ table }?select=${ patchIdColumn }&${ patchIdColumn }=in.(${ patchIds.join(',') })`
  );
  const counts = new Map<number, number>();

  for (const row of rows) {
    const patchId = row[patchIdColumn];
    if (typeof patchId !== 'number') {
      continue;
    }

    counts.set(patchId, (counts.get(patchId) ?? 0) + 1);
  }

  return counts;
}
