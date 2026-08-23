import {
  expect,
  type Locator,
  type Page,
  type Request,
  test
} from '@playwright/test';


/**
 * Production-bundle smoke tests.
 *
 * Runs against the *real* prod artefact (served from dist/Patcher/browser via
 * scripts/build/serve-dist.cjs), not `ng serve`. The dev server's permissive injector
 * + HMR-cached module graph + LazySentryErrorHandler swallow boot-time DI
 * failures that the optimized AOT bundle escalates to a blank page — those
 * regressions only surface here.
 *
 * Each route asserts:
 *   - No `pageerror` (uncaught exception) during initial render
 *   - Critical shell elements are present (footer with non-empty text)
 *   - URL didn't bounce to /404
 *
 * Keep this spec routes-shallow and assertions-strict. The point is "the cold
 * boot of the shipped bundle paints something", not feature coverage.
 */

const ROUTES = [
  '/',
  '/home',
  '/modules/browser',
  '/racks/browser',
  '/patches/browser',
  '/info/changelog'
];

/**
 * Ignore noise that always appears in headless prod boots and never indicates
 * a real regression:
 *   - Sentry envelope POSTs blocked by ad-block-like network rules
 *   - Permissions-Policy headers Chromium doesn't recognise
 *   - WebGL context init failures from offscreen lottie/canvas
 *   - Supabase Navigator LockManager contention on cold start
 */
const IGNORED_ERROR_PATTERNS = [
  /BLOCKED_BY_CLIENT/i,
  /ingest\..*sentry\.io/i,
  /Permissions-Policy/i,
  /blendFunc/i,
  /Navigator LockManager/i,
  /ERR_CONNECTION_REFUSED/i
];

const isSignificant = (msg: string) => !IGNORED_ERROR_PATTERNS.some(re => re.test(msg));

const TEST_MANUFACTURER = {id: 884, name: '1010 Music'} as const;
const OTHER_MANUFACTURER = {id: 7, name: 'Other Maker'} as const;
const TEST_MANUFACTURER_QUERY = '1010';
const TEST_TIMESTAMP = '2026-01-01T00:00:00.000Z';

function waitForManufacturerModuleRequest(page: Page, manufacturerId: number): Promise<Request> {
  return page.waitForRequest((request) => {
    const url = new URL(request.url());
    if (request.method() !== 'GET' || !url.pathname.endsWith('/rest/v1/modules')) {
      return false;
    }

    return url.searchParams.get('manufacturerId') === `eq.${ manufacturerId }`
      && url.searchParams.get('offset') === '0';
  }, {timeout: 20_000});
}

async function installModuleBrowserFixtures(page: Page): Promise<void> {
  const moduleFixture = (
    id: number,
    name: string,
    manufacturer: typeof TEST_MANUFACTURER | typeof OTHER_MANUFACTURER
  ) => ({
    id,
    name,
    description: '',
    hp: 8,
    public: true,
    created: TEST_TIMESTAMP,
    updated: TEST_TIMESTAMP,
    manufacturer,
    manufacturerId: manufacturer.id,
    standard: {id: 0, name: '3U'},
    tags: [],
    panels: []
  });
  const unfilteredModules = [
    moduleFixture(101, 'Fixture Module', OTHER_MANUFACTURER),
    moduleFixture(102, 'Bitbox Fixture', TEST_MANUFACTURER)
  ];
  const filteredModules = [
    moduleFixture(102, 'Bitbox Fixture', TEST_MANUFACTURER),
    moduleFixture(103, 'Toolbox Fixture', TEST_MANUFACTURER)
  ];

  await page.route('**/rest/v1/**', async route => {
    const request = route.request();
    const url = new URL(request.url());
    let body: unknown[] = [];

    if (request.method() === 'GET' && url.pathname.endsWith('/rest/v1/manufacturers')) {
      body = [TEST_MANUFACTURER, OTHER_MANUFACTURER];
    } else if (request.method() === 'GET' && url.pathname.endsWith('/rest/v1/modules')) {
      body = url.searchParams.get('manufacturerId') === `eq.${ TEST_MANUFACTURER.id }`
        ? filteredModules
        : unfilteredModules;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: {
        'access-control-allow-origin': '*',
        'access-control-expose-headers': 'content-range',
        'content-range': body.length > 0 ? `0-${ body.length - 1 }/${ body.length }` : '*/0'
      },
      body: JSON.stringify(body)
    });
  });
}

async function expectVisibleModuleManufacturers(page: Page, manufacturerName: string): Promise<void> {
  const manufacturerLabels = page.locator('app-module-list app-module-minimal app-module-part-manufacturer .manufacturer-link');
  await expect.poll(async () => {
    const labels = (await manufacturerLabels.allTextContents()).map(label => label.trim());
    return labels.length > 0 && labels.every(label => label === manufacturerName);
  }, {
    message: `expected every visible module row to belong to ${ manufacturerName }`,
    timeout: 20_000
  }).toBe(true);
}

async function expectActiveAutocompleteOption(
  input: Locator,
  option: Locator,
  optionName: string
): Promise<void> {
  await expect(option).toBeVisible({timeout: 10_000});
  const optionId = await option.getAttribute('id');
  expect(optionId, `option id missing for ${ optionName }`).toBeTruthy();
  await expect.poll(
    () => input.getAttribute('aria-activedescendant'),
    {message: `${ optionName } should be the active autocomplete option before pressing Enter`}
  ).toBe(optionId);
}

test.describe('Production bundle smoke', () => {
  for (const route of ROUTES) {
    test(`cold boot of ${ route } renders without uncaught errors`, async ({page}) => {
      const pageErrors: string[] = [];
      page.on('pageerror', err => pageErrors.push(err.message));

      await page.goto(route, {waitUntil: 'load', timeout: 20_000});

      // Footer is rendered on every shell route. If a DI failure aborted the
      // AppComponent view tree (as in the ngx-timeago / TimeagoFormatter
      // regression), the footer will be missing or empty — that's our canary.
      const footer = page.locator('app-footer').first();
      await expect(footer).toBeVisible({timeout: 10_000});
      const footerText = (await footer.textContent())?.trim() ?? '';
      expect(footerText.length, `footer text empty on ${ route }`).toBeGreaterThan(50);

      await expect(page).not.toHaveURL(/404/);

      const significantErrors = pageErrors.filter(isSignificant);
      expect(
        significantErrors,
        `unexpected uncaught errors on ${ route }:\n${ significantErrors.join('\n') }`
      ).toEqual([]);
    });
  }

  test('module browser manufacturer autocomplete sends a numeric filter after partial option selection', async ({page}) => {
    const pageErrors: string[] = [];
    page.on('pageerror', err => pageErrors.push(err.message));
    await installModuleBrowserFixtures(page);

    await page.goto('/modules/browser', {waitUntil: 'load', timeout: 20_000});
    await expect(page.locator('app-module-list app-module-minimal').first()).toBeVisible({timeout: 20_000});

    const manufacturerId = TEST_MANUFACTURER.id;
    const manufacturerName = TEST_MANUFACTURER.name;
    const manufacturerInput = page.getByRole('combobox', {name: /made by/i}).first();
    await expect(manufacturerInput).toBeVisible({timeout: 10_000});

    await manufacturerInput.fill(TEST_MANUFACTURER_QUERY);
    const option = page.getByRole('option', {name: manufacturerName, exact: true}).first();
    await expect(option).toBeVisible({timeout: 10_000});

    const clickFilteredRequest = waitForManufacturerModuleRequest(page, manufacturerId);
    await option.click();
    const clickRequestUrl = new URL((await clickFilteredRequest).url());

    expect(clickRequestUrl.searchParams.get('manufacturerId')).toMatch(/^eq\.\d+$/);
    await expect(manufacturerInput).toHaveValue(manufacturerName);
    await expectVisibleModuleManufacturers(page, manufacturerName);

    await page.getByRole('button', {name: /reset filters/i}).click();
    await expect(manufacturerInput).toHaveValue('', {timeout: 10_000});

    await manufacturerInput.fill(TEST_MANUFACTURER_QUERY);
    const enterOption = page.getByRole('option', {name: manufacturerName, exact: true}).first();
    await expectActiveAutocompleteOption(manufacturerInput, enterOption, manufacturerName);

    const enterFilteredRequest = waitForManufacturerModuleRequest(page, manufacturerId);
    await manufacturerInput.press('Enter');
    const enterRequestUrl = new URL((await enterFilteredRequest).url());

    expect(enterRequestUrl.searchParams.get('manufacturerId')).toBe(`eq.${ manufacturerId }`);
    await expect(manufacturerInput).toHaveValue(manufacturerName);
    await expectVisibleModuleManufacturers(page, manufacturerName);

    const significantErrors = pageErrors.filter(isSignificant);
    expect(
      significantErrors,
      `unexpected uncaught errors during manufacturer filter smoke:\n${ significantErrors.join('\n') }`
    ).toEqual([]);
  });
});
