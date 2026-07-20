import {
  expect,
  type Page,
  type Route,
  test
} from '@playwright/test';


const CREATED = '2026-07-18T12:00:00.000Z';
const MODULE_ID = 9_000_101;
const RACK_ID = 9_000_102;
const PATCH_ID = 9_000_103;
const LEGACY_CACHE_STORAGE_KEY = 'CACHE_STORAGE';

test.describe('Authenticated user area data recovery', () => {
  test('retries cached user-area reads and keeps recovered records visible', async ({page}) => {
    const quotaErrors: string[] = [];
    page.on('console', message => {
      if (message.text().includes('QuotaExceededError')) {
        quotaErrors.push(message.text());
      }
    });
    await page.addInitScript((cacheStorageKey) => {
      localStorage.setItem(cacheStorageKey, 'x'.repeat(3_000_000));
    }, LEGACY_CACHE_STORAGE_KEY);

    const identity = await readAuthIdentityFromStorageState(page);
    expect(identity.email).toBe(process.env['E2E_TEST_EMAIL']?.trim());

    const calls = await routeUserAreaRecoveryFixtures(page, identity.userId);

    await page.goto('/user/area?e2eUserAreaRecovery=1');
    await expect(page).toHaveURL(/\/user\/area/);
    await expect(page.locator('app-user-area-root')).toBeVisible({timeout: 20_000});

    await expect(page.getByText('E2E Recovery Module').first()).toBeVisible({timeout: 20_000});
    await expect(page.getByText('E2E Recovery Rack').first()).toBeVisible({timeout: 20_000});
    await expect(page.getByText('E2E Recovery Patch').first()).toBeVisible({timeout: 20_000});

    await page.locator('app-user-modules mat-button-toggle', {hasText: /cool/i}).first().click();
    await expect(page.locator('app-user-modules app-user-cool-collection').getByText('E2E Recovery Module')).toBeVisible({
      timeout: 20_000
    });

    expect(calls.userModules).toBeGreaterThanOrEqual(2);
    expect(calls.racks).toBeGreaterThanOrEqual(2);
    expect(calls.patches).toBeGreaterThanOrEqual(2);
    expect(calls.reactions.module).toBeGreaterThanOrEqual(2);
    expect(await page.evaluate(
      (cacheStorageKey) => localStorage.getItem(cacheStorageKey),
      LEGACY_CACHE_STORAGE_KEY
    )).toBeNull();
    expect(quotaErrors).toEqual([]);
    await expect(page.getByText('Cool collection could not be loaded.')).toBeHidden();
  });
});

interface AuthIdentity {
  email: string;
  userId: string;
}

interface RecoveryCalls {
  userModules: number;
  racks: number;
  patches: number;
  reactions: Record<ReactionFixtureType, number>;
}

type ReactionFixtureType = 'module' | 'rack' | 'patch' | 'unknown';

async function readAuthIdentityFromStorageState(page: Page): Promise<AuthIdentity> {
  const storageState = await page.context().storageState();
  const authOrigin = storageState.origins.find(origin => origin.localStorage.some(item => item.name.includes('auth-token')));
  const authToken = authOrigin?.localStorage.find(item => item.name.includes('auth-token'))?.value;
  expect(authToken, 'authenticated storage state is missing the Supabase auth token').toBeTruthy();

  const session = JSON.parse(authToken!);
  const token = session?.access_token as string | undefined;
  expect(token, 'authenticated storage state is missing an access token').toBeTruthy();

  const payload = JSON.parse(Buffer.from(token!.split('.')[1], 'base64url').toString('utf8'));
  return {
    email: payload.email,
    userId: payload.sub
  };
}

async function routeUserAreaRecoveryFixtures(page: Page, userId: string): Promise<RecoveryCalls> {
  const calls: RecoveryCalls = {
    userModules: 0,
    racks: 0,
    patches: 0,
    reactions: {
      module: 0,
      rack: 0,
      patch: 0,
      unknown: 0
    }
  };

  await page.route('**/rest/v1/user_modules*', async route => {
    if (!hasSearchParam(route, 'profileid', `eq.${ userId }`)) {
      await route.continue();
      return;
    }

    calls.userModules++;
    if (calls.userModules === 1) {
      await fulfillTransientFailure(route);
      return;
    }

    await route.fulfill(jsonResponse([{
      kind: 'HAS',
      collectionUpdated: CREATED,
      module: moduleFixture()
    }]));
  });

  await page.route('**/rest/v1/racks*', async route => {
    if (!hasSearchParam(route, 'authorid', `eq.${ userId }`)) {
      await route.fulfill(jsonResponse([rackFixture(userId)]));
      return;
    }

    calls.racks++;
    if (calls.racks === 1) {
      await fulfillTransientFailure(route);
      return;
    }

    await route.fulfill(jsonResponse([rackFixture(userId)]));
  });

  await page.route('**/rest/v1/patches*', async route => {
    if (!hasSearchParam(route, 'authorid', `eq.${ userId }`)) {
      await route.fulfill(jsonResponse([patchFixture(userId)]));
      return;
    }

    calls.patches++;
    if (calls.patches === 1) {
      await fulfillTransientFailure(route);
      return;
    }

    await route.fulfill(jsonResponse([patchFixture(userId)]));
  });

  await page.route('**/rest/v1/reactions*', async route => {
    if (!hasSearchParam(route, 'user_id', `eq.${ userId }`)) {
      await route.continue();
      return;
    }

    const entityType = getReactionFixtureType(route);
    calls.reactions[entityType]++;
    if (entityType === 'module' && calls.reactions.module === 1) {
      await fulfillTransientFailure(route);
      return;
    }

    await route.fulfill(jsonResponse(reactionFixturesFor(entityType, userId)));
  });

  await page.route('**/rest/v1/modules*', async route => {
    if (!hasInSearchParam(route, 'id', MODULE_ID)) {
      await route.continue();
      return;
    }

    await route.fulfill(jsonResponse([moduleFixture()]));
  });

  return calls;
}

function hasSearchParam(route: Route, key: string, expectedValue: string): boolean {
  return new URL(route.request().url()).searchParams.get(key) === expectedValue;
}

function hasInSearchParam(route: Route, key: string, expectedValue: number): boolean {
  const value = new URL(route.request().url()).searchParams.get(key);
  return value === `in.(${ expectedValue })`;
}

function getReactionFixtureType(route: Route): ReactionFixtureType {
  const entityType = new URL(route.request().url()).searchParams.get('entity_type');
  if (entityType === 'eq.1') return 'module';
  if (entityType === 'eq.2') return 'rack';
  if (entityType === 'eq.3') return 'patch';
  return 'unknown';
}

function reactionFixturesFor(entityType: ReactionFixtureType, userId: string) {
  if (entityType !== 'module') {
    return [];
  }

  return [{
    user_id: userId,
    entity_type: 1,
    entity_id: MODULE_ID,
    kind: 'COOL',
    created_at: CREATED
  }];
}

function jsonResponse(body: unknown) {
  return {
    status: 200,
    contentType: 'application/json',
    headers: {
      'access-control-allow-origin': '*',
      'access-control-expose-headers': 'content-range',
      'content-range': '0-0/1'
    },
    body: JSON.stringify(body)
  };
}

async function fulfillTransientFailure(route: Route): Promise<void> {
  await route.fulfill({
    status: 503,
    contentType: 'application/json',
    headers: {
      'access-control-allow-origin': '*',
      'access-control-expose-headers': 'content-range'
    },
    body: JSON.stringify({
      code: 'PGRST003',
      details: null,
      hint: null,
      message: 'Service temporarily unavailable'
    })
  });
}

function moduleFixture() {
  return {
    id: MODULE_ID,
    name: 'E2E Recovery Module',
    hp: 8,
    description: 'Recovered module fixture',
    public: true,
    created: CREATED,
    updated: CREATED,
    manufacturerId: 1,
    manufacturer: {id: 1, name: 'E2E Maker'},
    standard: {id: 1, name: 'Eurorack'},
    tags: [],
    panels: [],
    module_tags: [],
    module_panels: [],
    module_ins: [],
    module_outs: [],
    isApproved: true,
    manualURL: 'https://example.com/manual.pdf'
  };
}

function rackFixture(userId: string) {
  return {
    id: RACK_ID,
    name: 'E2E Recovery Rack',
    description: 'Recovered rack fixture',
    hp: 104,
    rows: 1,
    public: true,
    locked: false,
    authorid: userId,
    author: {id: userId, username: 'e2e-user'},
    created: CREATED,
    updated: CREATED,
    public_id: 'e2e-recovery-rack'
  };
}

function patchFixture(userId: string) {
  return {
    id: PATCH_ID,
    name: 'E2E Recovery Patch',
    description: 'Recovered patch fixture',
    public: true,
    authorid: userId,
    author: {id: userId, username: 'e2e-user'},
    created: CREATED,
    updated: CREATED,
    public_id: 'e2e-recovery-patch',
    tags: ['e2e']
  };
}
