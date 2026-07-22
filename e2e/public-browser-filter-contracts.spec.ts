import {
  expect,
  type Locator,
  type Page,
  type Request,
  test
} from '@playwright/test';


type BrowserTable = 'modules' | 'racks' | 'patches' | 'manufacturers';

function isSupabaseTableRequest(request: Request, table: BrowserTable): boolean {
  if (request.method() !== 'GET') return false;

  const url = new URL(request.url());
  return url.pathname.endsWith(`/rest/v1/${ table }`);
}

function waitForTableRequest(
  page: Page,
  table: BrowserTable,
  predicate: (url: URL) => boolean
): Promise<Request> {
  return page.waitForRequest((request) => {
    if (!isSupabaseTableRequest(request, table)) return false;
    return predicate(new URL(request.url()));
  }, {timeout: 20_000});
}

async function selectMatOption(page: Page, label: string | RegExp, option: string | RegExp): Promise<void> {
  const field = page.getByRole('combobox', {name: label}).first();
  await expect(field).toBeVisible({timeout: 10_000});
  await field.click();
  await page.getByRole('option', {name: option}).click();
}

async function expectResetClears(page: Page, input: Locator): Promise<void> {
  await page.getByRole('button', {name: /reset filters/i}).click();
  await expect(input).toHaveValue('');
}

test.describe('Public browser filter contracts', () => {
  test('module name and description filters request both predicates and reset to a populated catalog', async ({page}) => {
    await page.goto('/modules/browser');
    await expect(page.locator('app-module-list app-module-minimal').first()).toBeVisible({timeout: 20_000});

    const filteredRequest = waitForTableRequest(page, 'modules', url =>
      (url.searchParams.get('name') ?? '').includes('rings')
      && (url.searchParams.get('description') ?? '').includes('resonator')
      && url.searchParams.get('offset') === '0'
    );

    await page.getByLabel('Search module...').fill('rings');
    await page.getByLabel('Description').fill('resonator');
    await filteredRequest;

    await expectResetClears(page, page.getByLabel('Search module...'));
    await expect(page.getByLabel('Description')).toHaveValue('');
    await expect(page.locator('app-module-list app-module-minimal').first()).toBeVisible({timeout: 20_000});
  });

  test('module HP and standard filters request bounded catalog rows and reset the numeric filter', async ({page}) => {
    await page.goto('/modules/browser');
    await expect(page.locator('app-module-list app-module-minimal').first()).toBeVisible({timeout: 20_000});

    await selectMatOption(page, /^Standard$/, /^1U Intellijel$/);
    const filteredRequest = waitForTableRequest(page, 'modules', url =>
      url.searchParams.get('hp') === 'eq.8'
      && url.searchParams.get('standard') === 'eq.1'
      && url.searchParams.get('offset') === '0'
    );
    await page.getByRole('combobox', {name: /^HP$/}).fill('8');
    await filteredRequest;

    await expectResetClears(page, page.getByRole('combobox', {name: /^HP$/}));
    await expect(page.locator('app-module-list app-module-minimal').first()).toBeVisible({timeout: 20_000});
  });

  test('module order changes sort by name while keeping catalog results visible', async ({page}) => {
    await page.goto('/modules/browser');
    await expect(page.locator('app-module-list app-module-minimal').first()).toBeVisible({timeout: 20_000});

    const sortRequest = waitForTableRequest(page, 'modules', url =>
      url.searchParams.getAll('order').some(value => value.startsWith('name.asc'))
    );

    await selectMatOption(page, /^Order by$/, /^Name ↑$/);
    await sortRequest;

    await expect(page.locator('app-module-list app-module-minimal').first()).toBeVisible({timeout: 20_000});
  });

  test('module load more appends additional cards without clearing the first page', async ({page}) => {
    await page.goto('/modules/browser');
    const cards = page.locator('app-module-list app-module-minimal');
    await expect(cards.first()).toBeVisible({timeout: 20_000});
    const firstPageCount = await cards.count();
    const firstTitle = (await cards.first().locator('a.title').textContent())?.trim();

    const nextPageRequest = waitForTableRequest(page, 'modules', url => Number(url.searchParams.get('offset') ?? '0') >= firstPageCount);
    await page.locator('button.loadMore__btn').click();
    await nextPageRequest;

    await expect(cards.nth(firstPageCount)).toBeVisible({timeout: 20_000});
    await expect(cards.first().locator('a.title')).toContainText(firstTitle ?? '');
    expect(await cards.count()).toBeGreaterThan(firstPageCount);
  });

  test('rack search requests a filtered first page and reset restores public rack cards', async ({page}) => {
    await page.goto('/racks/browser');
    await expect(page.locator('app-rack-micro').first()).toBeVisible({timeout: 20_000});

    const filteredRequest = waitForTableRequest(page, 'racks', url => !url.searchParams.has('offset'));

    await page.getByLabel('Search rack...').fill('performance');
    await filteredRequest;

    await expectResetClears(page, page.getByLabel('Search rack...'));
    await expect(page.locator('app-rack-micro').first()).toBeVisible({timeout: 20_000});
  });

  test('rack order changes sort by name and keeps the browser usable', async ({page}) => {
    await page.goto('/racks/browser');
    await expect(page.locator('app-rack-micro').first()).toBeVisible({timeout: 20_000});

    const sortRequest = waitForTableRequest(page, 'racks', url =>
      url.searchParams.getAll('order').some(value => value.startsWith('name.asc'))
    );

    await selectMatOption(page, /^Order by$/, /^Name ↑$/);
    await sortRequest;

    await expect(page.locator('app-rack-micro a.title').first()).toBeVisible({timeout: 20_000});
  });

  test('rack load more increases visible racks and preserves remaining-count affordance', async ({page}) => {
    await page.goto('/racks/browser');
    const cards = page.locator('app-rack-micro');
    await expect(cards.first()).toBeVisible({timeout: 20_000});
    const firstPageCount = await cards.count();

    const nextPageRequest = waitForTableRequest(page, 'racks', url => Number(url.searchParams.get('offset') ?? '0') >= firstPageCount);
    await page.locator('button.loadMore__btn').click();
    await nextPageRequest;

    await expect(cards.nth(firstPageCount)).toBeVisible({timeout: 20_000});
    expect(await cards.count()).toBeGreaterThan(firstPageCount);
    await expect(page.locator('.loadMore__count')).toContainText(/remaining/);
  });

  test('patch search requests a filtered first page and reset restores public patch cards', async ({page}) => {
    await page.goto('/patches/browser');
    await expect(page.locator('app-patch-list app-patch-micro').first()).toBeVisible({timeout: 20_000});

    const filteredRequest = waitForTableRequest(page, 'patches', url => !url.searchParams.has('offset'));

    await page.getByLabel('Search patch...').fill('demo');
    await filteredRequest;

    await expectResetClears(page, page.getByLabel('Search patch...'));
    await expect(page.locator('app-patch-list app-patch-micro').first()).toBeVisible({timeout: 20_000});
  });

  test('patch order changes sort by name and leaves detail links reachable', async ({page}) => {
    await page.goto('/patches/browser');
    await expect(page.locator('app-patch-list app-patch-micro').first()).toBeVisible({timeout: 20_000});

    const sortRequest = waitForTableRequest(page, 'patches', url =>
      url.searchParams.getAll('order').some(value => value.startsWith('name.asc'))
    );

    await selectMatOption(page, /^Order by$/, /^Name ↑$/);
    await sortRequest;

    const firstLink = page.locator('app-patch-list app-patch-micro a.title').first();
    await expect(firstLink).toBeVisible({timeout: 20_000});
    await expect(firstLink).toHaveAttribute('href', /\/patches\//);
  });

  test('manufacturer order changes sort direction and keeps manufacturer rows navigable', async ({page}) => {
    await page.goto('/manufacturers/browser');
    await expect(page.locator('app-manufacturer-row').first()).toBeVisible({timeout: 20_000});

    const sortRequest = waitForTableRequest(page, 'manufacturers', url =>
      url.searchParams.getAll('order').some(value => value.startsWith('name.desc'))
    );

    await selectMatOption(page, /^Order by$/, /^Name Z→A$/);
    await sortRequest;

    const firstLink = page.locator('app-manufacturer-row .manufacturer-row-link').first();
    await expect(firstLink).toBeVisible({timeout: 20_000});
    await expect(firstLink).toHaveAttribute('href', /\/manufacturers\/details\/\d+/);
  });
});
