import {
  expect,
  type Locator,
  type Page,
  test
} from '@playwright/test';


async function firstDetailHref(page: Page, route: string, cardSelector: string): Promise<string> {
  await page.goto(route);
  const firstCard = page.locator(cardSelector).first();
  await expect(firstCard).toBeVisible({timeout: 20_000});
  const href = await firstCard.locator('a.title').first().getAttribute('href');
  expect(href, `Expected first ${ cardSelector } card to expose a detail href`).toMatch(/^\/.+/);
  return href!;
}

async function openFirstModuleDetail(page: Page): Promise<void> {
  await page.goto(await firstDetailHref(page, '/modules/browser', 'app-module-list app-module-minimal'));
  await expect(page).toHaveURL(/\/modules\/details\/\d+/, {timeout: 15_000});
  await expect(page.locator('app-module-composite').first()).toBeVisible({timeout: 20_000});
}

async function openFirstPatchDetail(page: Page): Promise<void> {
  await page.goto(await firstDetailHref(page, '/patches/browser', 'app-patch-list app-patch-micro'));
  await expect(page).toHaveURL(/\/patches\/(details\/\d+|[A-Za-z0-9_-]+)/, {timeout: 15_000});
  await expect(page.locator('app-patch-composite').first()).toBeVisible({timeout: 20_000});
}

async function openFirstRackDetail(page: Page): Promise<void> {
  await page.goto(await firstDetailHref(page, '/racks/browser', 'app-rack-micro'));
  await expect(page).toHaveURL(/\/racks\/(details\/\d+|[A-Za-z0-9_-]+)/, {timeout: 15_000});
  await expect(page.locator('app-rack-composite').first()).toBeVisible({timeout: 20_000});
}

async function expectNoVisibleControls(page: Page, controls: Locator): Promise<void> {
  expect(await controls.count()).toBe(0);
}

test.describe('Public navigation and anonymous affordance contracts', () => {
  test('anonymous user-area deep link redirects to the login form', async ({page}) => {
    await page.goto('/user/area');

    await expect(page).toHaveURL(/\/auth\/login(?:$|\?)/, {timeout: 20_000});
    await expect(page.locator('app-login-email input').first()).toBeVisible({timeout: 15_000});
  });

  test('legacy login path redirects to the canonical login route', async ({page}) => {
    await page.goto('/login');

    await expect(page).toHaveURL(/\/auth\/login$/, {timeout: 10_000});
    await expect(page.locator('app-login-email input').first()).toBeVisible({timeout: 15_000});
  });

  test('legacy signup path redirects to the canonical signup route', async ({page}) => {
    await page.goto('/signup');

    await expect(page).toHaveURL(/\/auth\/signup$/, {timeout: 10_000});
    const signupRegion = page.getByRole('region', {name: /email signup/i});
    await expect(signupRegion).toBeVisible({timeout: 15_000});
    await expect(signupRegion.getByRole('textbox', {name: /^Email$/})).toBeVisible();
  });

  test('legacy reset-password path redirects to the canonical reset route', async ({page}) => {
    await page.goto('/reset-password');

    await expect(page).toHaveURL(/\/auth\/reset-password$/, {timeout: 10_000});
    await expect(page.getByRole('heading', {name: /set a new password/i})).toBeVisible({timeout: 15_000});
  });

  test('unknown routes render the not-found state without losing browser recovery', async ({page}) => {
    await page.goto('/definitely-not-a-real-patcher-route');

    await expect(page).toHaveURL(/\/404$/, {timeout: 10_000});
    await expect(page.getByText('Page not found!')).toBeVisible({timeout: 10_000});

    await page.goto('/modules/browser');
    await expect(page.locator('app-module-list app-module-minimal').first()).toBeVisible({timeout: 20_000});
  });

  test('retired share-link page lets anonymous users recover to rack browsing', async ({page}) => {
    await page.goto('/links/retired');
    await expect(page.getByText('This share link has been retired.')).toBeVisible({timeout: 10_000});

    await page.getByRole('link', {name: /browse racks/i}).click();

    await expect(page).toHaveURL(/\/racks\/browser/, {timeout: 10_000});
    await expect(page.locator('app-rack-micro').first()).toBeVisible({timeout: 20_000});
  });

  test('module detail opens its related manufacturer and browser back restores the module', async ({page}) => {
    await openFirstModuleDetail(page);
    const moduleUrl = page.url();

    const manufacturerLink = page.locator('app-module-detail-data-card a.entityStatGrid__link').first();
    await expect(manufacturerLink).toHaveAttribute('href', /\/manufacturers\/details\/\d+/, {timeout: 15_000});
    await manufacturerLink.click();

    await expect(page).toHaveURL(/\/manufacturers\/details\/\d+/, {timeout: 15_000});
    await expect(page.locator('lib-hero-content-card.manufacturersBG')).toBeVisible({timeout: 15_000});

    await page.goBack();
    await expect(page).toHaveURL(moduleUrl, {timeout: 15_000});
    await expect(page.locator('app-module-composite').first()).toBeVisible({timeout: 20_000});
  });

  test('manufacturer detail submit-module action opens the submission guide and returns via browser back', async ({page}) => {
    await page.goto('/manufacturers/browser');
    await expect(page.locator('app-manufacturer-row').first()).toBeVisible({timeout: 20_000});
    const href = await page.locator('app-manufacturer-row .manufacturer-row-link').first().getAttribute('href');
    expect(href).toMatch(/\/manufacturers\/details\/\d+/);
    const manufacturerId = href!.match(/\/manufacturers\/details\/(\d+)/)![1];

    await page.goto(href!);
    await expect(page.locator('lib-hero-content-card.manufacturersBG')).toBeVisible({timeout: 15_000});
    // Scoped to the manufacturer-detail submit FAB specifically — the app footer
    // also has a "Submit a module" link with the same accessible name, and the FAB
    // only renders once the manufacturer's own data has actually loaded (unlike the
    // hero card above, which renders immediately from a truthy object literal).
    // An unscoped getByRole('link', {name: /submit a module/i}) intermittently
    // strict-mode-violates once both are in the DOM.
    const submitModuleFab = page.locator('a.manufacturer-detail-submit-fab');
    await expect(submitModuleFab).toBeVisible({timeout: 15_000});
    await submitModuleFab.click();

    // The FAB deliberately carries the manufacturer forward as a query param (see
    // its matTooltip: "Submit a new module for this manufacturer") so the
    // submission form can pre-fill it — assert on that value, not a bare URL.
    await expect(page).toHaveURL(new RegExp(`/modules/add\\?manufacturer=${ manufacturerId }$`), {timeout: 15_000});
    await expect(page.getByRole('heading', {name: /submit a module/i})).toBeVisible({timeout: 20_000});

    await page.goBack();
    await expect(page).toHaveURL(new RegExp(`${ href }$`), {timeout: 15_000});
    await expect(page.locator('lib-hero-content-card.manufacturersBG')).toBeVisible({timeout: 15_000});
  });

  test('anonymous patch detail exposes viewing affordances but no edit or delete controls', async ({page}) => {
    await openFirstPatchDetail(page);

    await expect(page.getByRole('heading', {name: /patch details/i}).first()).toBeVisible({timeout: 20_000});
    await expectNoVisibleControls(page, page.getByRole('button', {name: /^(edit|delete|close editor|save)/i}));
    await expect(page.locator('app-patch-graph, app-patch-composite').first()).toBeVisible({timeout: 20_000});
  });

  test('anonymous rack detail exposes the rack composite but no edit or delete controls', async ({page}) => {
    await openFirstRackDetail(page);

    await expect(page.getByRole('heading', {name: /rack details/i}).first()).toBeVisible({timeout: 20_000});
    await expectNoVisibleControls(page, page.getByRole('button', {name: /^(edit rack|delete rack|lock rack|save)/i}));
    await expect(page.locator('app-rack-composite').first()).toBeVisible({timeout: 20_000});
  });
});
