import {
  expect,
  type Page,
  type Request,
  type Route,
  type Response
} from '@playwright/test';


type BrowserTable = 'modules' | 'racks' | 'patches';

export interface BrowserDataContract {
  readonly entryRoute: string;
  readonly expectedRoute: string;
  readonly listSelector: string;
  readonly recordSelector: string;
  readonly table: BrowserTable;
  readonly requiredSearchParams: Readonly<Record<string, string>>;
  readonly requiredSelectFragments: readonly string[];
}

export const BROWSER_DATA_CONTRACTS = {
  modules: {
    entryRoute: '/modules',
    expectedRoute: '/modules/browser',
    listSelector: 'app-module-list',
    recordSelector: 'app-module-list app-module-minimal',
    table: 'modules',
    requiredSearchParams: {
      public: 'eq.true',
      offset: '0',
      limit: '25'
    },
    requiredSelectFragments: [
      'manufacturer:manufacturerId',
      'standard:standards',
      'module_panels',
      'module_tags'
    ]
  },
  racks: {
    entryRoute: '/racks',
    expectedRoute: '/racks/browser',
    listSelector: 'app-rack-list',
    recordSelector: 'app-rack-list app-rack-micro',
    table: 'racks',
    requiredSearchParams: {
      public: 'eq.true',
      'author_profile_gate.public': 'eq.true',
      offset: '0',
      limit: '25'
    },
    requiredSelectFragments: [
      'author:authorid',
      'author_profile_gate:authorid!inner',
      'rack_modules!inner'
    ]
  },
  patches: {
    entryRoute: '/patches',
    expectedRoute: '/patches/browser',
    listSelector: 'app-patch-list',
    recordSelector: 'app-patch-list app-patch-micro',
    table: 'patches',
    requiredSearchParams: {
      public: 'eq.true',
      offset: '0',
      limit: '25'
    },
    requiredSelectFragments: [
      'author:authorid',
      'patch_connections!inner'
    ]
  }
} as const satisfies Record<BrowserTable, BrowserDataContract>;

let navigationSequence = 0;

export async function expectBrowserDataPage(page: Page, contract: BrowserDataContract): Promise<void> {
  const unroutePrimaryList = await routeFirstPrimaryListRequest(page, contract, route => route.continue());
  const dataResponse = waitForSuccessfulPrimaryListResponse(page, contract);

  try {
    await gotoBrowserEntryRoute(page, contract);
    const response = await dataResponse;

    await expectSupabaseArrayResponse(response);
    await expectBrowserRecords(page, contract);
  } finally {
    await unroutePrimaryList();
  }
}

export async function expectBrowserRecordsPage(page: Page, contract: BrowserDataContract): Promise<void> {
  await gotoBrowserEntryRoute(page, contract);
  await expectBrowserRecords(page, contract);
}

export async function expectBrowserTransientRecovery(page: Page, contract: BrowserDataContract): Promise<void> {
  let failedPrimaryListRequest = false;
  const unroutePrimaryList = await routeFirstPrimaryListRequest(page, contract, async route => {
    failedPrimaryListRequest = true;
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
  });
  const dataResponse = waitForSuccessfulPrimaryListResponse(page, contract);

  try {
    await gotoBrowserEntryRoute(page, contract);
    const response = await dataResponse;

    expect(failedPrimaryListRequest).toBeTruthy();
    await expectSupabaseArrayResponse(response);
    await expectBrowserRecords(page, contract);
  } finally {
    await unroutePrimaryList();
  }
}

export async function expectBrowserLoadMoreData(page: Page, contract: BrowserDataContract): Promise<void> {
  const loadMoreButton = page.locator('.loadMore__btn');
  await expect(loadMoreButton).toBeVisible({timeout: 10_000});
  const dataResponse = page.waitForResponse(response => isAdditionalBrowserDataResponse(response, contract), {timeout: 20_000});

  await loadMoreButton.click();
  const response = await dataResponse;

  await expectSupabaseArrayResponse(response);
  await expectBrowserRecords(page, contract);
}

async function expectBrowserRecords(page: Page, contract: BrowserDataContract): Promise<void> {
  await expect(page).not.toHaveURL(/404/);
  await expect(page).toHaveURL(new RegExp(contract.expectedRoute));
  await expect(page.locator(contract.recordSelector).first()).toBeVisible({timeout: 20_000});
  await expect(page.locator(`${ contract.listSelector } app-empty-state`)).toBeHidden({timeout: 10_000});
}

async function gotoBrowserEntryRoute(page: Page, contract: BrowserDataContract): Promise<void> {
  navigationSequence++;
  await page.goto(`${ contract.entryRoute }?e2eDataSourceContract=${ navigationSequence }`);
}

function waitForSuccessfulPrimaryListResponse(page: Page, contract: BrowserDataContract): Promise<Response> {
  return page.waitForResponse(response => isSuccessfulPrimaryListResponse(response, contract), {timeout: 20_000});
}

async function routeFirstPrimaryListRequest(
  page: Page,
  contract: BrowserDataContract,
  handlePrimaryRequest: (route: Route) => Promise<void>
): Promise<() => Promise<void>> {
  const pattern = `**/rest/v1/${ contract.table }*`;
  let handledPrimaryRequest = false;
  const handler = async (route: Route): Promise<void> => {
    if (handledPrimaryRequest || !isPrimaryListRequest(route.request(), contract)) {
      await route.continue();
      return;
    }

    handledPrimaryRequest = true;
    await handlePrimaryRequest(route);
    await page.unroute(pattern, handler);
  };

  await page.route(pattern, handler);
  return () => page.unroute(pattern, handler).catch(() => undefined);
}

function isSuccessfulPrimaryListResponse(response: Response, contract: BrowserDataContract): boolean {
  if (response.status() < 200 || response.status() >= 300) return false;
  return isPrimaryListResponse(response, contract);
}

function isPrimaryListResponse(response: Response, contract: BrowserDataContract): boolean {
  return isPrimaryBrowserListRequest(response.request().method(), response.url(), contract);
}

function isPrimaryListRequest(request: Request, contract: BrowserDataContract): boolean {
  return isPrimaryBrowserListRequest(request.method(), request.url(), contract);
}

function isPrimaryBrowserListRequest(method: string, urlString: string, contract: BrowserDataContract): boolean {
  if (method !== 'GET') return false;

  const url = new URL(urlString);
  if (!url.pathname.endsWith(`/rest/v1/${ contract.table }`)) return false;

  const select = url.searchParams.get('select') ?? '';
  if (!contract.requiredSelectFragments.every(fragment => select.includes(fragment))) return false;

  return Object.entries(contract.requiredSearchParams)
    .every(([key, value]) => url.searchParams.get(key) === value);
}

function isAdditionalBrowserDataResponse(response: Response, contract: BrowserDataContract): boolean {
  if (response.request().method() !== 'GET') return false;

  const url = new URL(response.url());
  if (!url.pathname.endsWith(`/rest/v1/${ contract.table }`)) return false;

  const select = url.searchParams.get('select') ?? '';
  if (!contract.requiredSelectFragments.every(fragment => select.includes(fragment))) return false;

  const offset = Number(url.searchParams.get('offset') ?? '0');
  return url.searchParams.get('public') === 'eq.true' && Number.isFinite(offset) && offset > 0;
}

async function expectSupabaseArrayResponse(response: Response): Promise<void> {
  expect(response.ok()).toBeTruthy();

  const contentType = response.headers()['content-type'] ?? '';
  expect(contentType).toContain('application/json');

  const body = await response.json();
  expect(Array.isArray(body)).toBeTruthy();
  expect(body.length).toBeGreaterThan(0);
}
