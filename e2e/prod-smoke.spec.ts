import {
  expect,
  type Locator,
  type Page,
  type Request,
  type Response,
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

type ProdSmokeTable = 'manufacturers' | 'modules';

interface ManufacturerOption {
  readonly id: number | string;
  readonly name: string;
}

interface ManufacturerSelection {
  readonly manufacturer: ManufacturerOption;
  readonly query: string;
}

function isSupabaseTableUrl(url: string, table: ProdSmokeTable): boolean {
  return new URL(url).pathname.endsWith(`/rest/v1/${ table }`);
}

function isSupabaseTableRequest(request: Request, table: ProdSmokeTable): boolean {
  return request.method() === 'GET' && isSupabaseTableUrl(request.url(), table);
}

function isSupabaseTableResponse(response: Response, table: ProdSmokeTable): boolean {
  return response.request().method() === 'GET' && isSupabaseTableUrl(response.url(), table);
}

function isManufacturerOption(value: unknown): value is ManufacturerOption {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<Record<keyof ManufacturerOption, unknown>>;
  return (typeof candidate.id === 'number' || typeof candidate.id === 'string')
    && typeof candidate.name === 'string'
    && candidate.name.trim().length > 0;
}

function partialManufacturerQuery(name: string): string {
  const trimmedName = name.trim();
  const firstWord = trimmedName.split(/\s+/)[0];
  if (firstWord.length >= 3 && firstWord.length < trimmedName.length) {
    return firstWord;
  }

  return trimmedName.slice(0, Math.max(1, Math.min(4, trimmedName.length - 1)));
}

function normalizeAutocompleteQuery(value: string): string {
  return value
    .replace(/[ŁłØø]/g, character => ({
      'Ł': 'L',
      'ł': 'l',
      'Ø': 'O',
      'ø': 'o'
    })[character] ?? character)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function autocompleteQueryMatches(query: string, optionName: string): boolean {
  return normalizeAutocompleteQuery(optionName).includes(normalizeAutocompleteQuery(query));
}

function findUniqueManufacturerQuery(
  manufacturer: ManufacturerOption,
  manufacturers: ManufacturerOption[]
): string | undefined {
  const trimmedName = manufacturer.name.trim();
  const queryCandidates = new Set<string>([partialManufacturerQuery(trimmedName)]);

  for (let length = 3; length <= trimmedName.length; length += 1) {
    queryCandidates.add(trimmedName.slice(0, length).trim());
  }

  return Array.from(queryCandidates).find(query =>
    query.length > 0
    && manufacturers.filter(({name}) => autocompleteQueryMatches(query, name)).length === 1
  );
}

function waitForManufacturerModuleRequest(page: Page, manufacturerId: number): Promise<Request> {
  return page.waitForRequest((request) => {
    if (!isSupabaseTableRequest(request, 'modules')) {
      return false;
    }

    const url = new URL(request.url());
    return url.searchParams.get('manufacturerId') === `eq.${ manufacturerId }`
      && url.searchParams.get('offset') === '0';
  }, {timeout: 20_000});
}

async function expectVisibleModuleManufacturers(page: Page, manufacturerName: string): Promise<void> {
  const manufacturerLabels = page.locator('app-module-list app-module-minimal app-module-part-manufacturer .manufacturer-link');
  await expect(manufacturerLabels.first()).toHaveText(manufacturerName, {timeout: 20_000});

  const labelCount = await manufacturerLabels.count();
  expect(labelCount, `expected visible module rows for ${ manufacturerName }`).toBeGreaterThan(0);

  for (let index = 0; index < Math.min(labelCount, 10); index += 1) {
    await expect(manufacturerLabels.nth(index)).toHaveText(manufacturerName);
  }
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

async function chooseManufacturerOption(
  page: Page,
  manufacturers: ManufacturerOption[]
): Promise<ManufacturerSelection | undefined> {
  const selectManufacturer = (manufacturer: ManufacturerOption | undefined): ManufacturerSelection | undefined => {
    if (!manufacturer) {
      return undefined;
    }

    const query = findUniqueManufacturerQuery(manufacturer, manufacturers);
    return query ? {manufacturer, query} : undefined;
  };

  const preferredProductionFixture = manufacturers.find(({id, name}) => Number(id) === 884 && name === '1010 Music')
    ?? manufacturers.find(({name}) => /^1010\b/i.test(name));
  const preferredSelection = selectManufacturer(preferredProductionFixture);
  if (preferredSelection) {
    return preferredSelection;
  }

  const visibleManufacturers = page.locator('app-module-list app-module-minimal app-module-part-manufacturer .manufacturer-link');
  const visibleCount = await visibleManufacturers.count();
  for (let index = 0; index < Math.min(visibleCount, 10); index += 1) {
    const visibleName = (await visibleManufacturers.nth(index).textContent())?.trim();
    const visibleManufacturer = manufacturers.find(({name}) => name === visibleName);
    const visibleSelection = selectManufacturer(visibleManufacturer);
    if (visibleSelection) {
      return visibleSelection;
    }
  }

  for (const manufacturer of manufacturers) {
    const selection = selectManufacturer(manufacturer);
    if (selection) {
      return selection;
    }
  }

  return undefined;
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

    const manufacturersResponse = page.waitForResponse(response =>
      response.ok() && isSupabaseTableResponse(response, 'manufacturers')
    , {timeout: 20_000});

    await page.goto('/modules/browser', {waitUntil: 'load', timeout: 20_000});
    await expect(page.locator('app-module-list app-module-minimal').first()).toBeVisible({timeout: 20_000});

    const manufacturersBody: unknown = await (await manufacturersResponse).json();
    const manufacturers = Array.isArray(manufacturersBody)
      ? manufacturersBody.filter(isManufacturerOption)
      : [];
    const selectedManufacturer = await chooseManufacturerOption(page, manufacturers);
    expect(selectedManufacturer, 'expected a production manufacturer option with a partial query').toBeDefined();
    if (!selectedManufacturer) {
      throw new Error('expected a production manufacturer option with a partial query');
    }

    const manufacturerId = Number(selectedManufacturer.manufacturer.id);
    expect(Number.isFinite(manufacturerId), `manufacturer id should be numeric: ${ selectedManufacturer.manufacturer.id }`).toBe(true);

    const partialQuery = selectedManufacturer.query;
    const manufacturerName = selectedManufacturer.manufacturer.name;
    const manufacturerInput = page.getByRole('combobox', {name: /made by/i}).first();
    await expect(manufacturerInput).toBeVisible({timeout: 10_000});

    await manufacturerInput.fill(partialQuery);
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

    await manufacturerInput.fill(partialQuery);
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
