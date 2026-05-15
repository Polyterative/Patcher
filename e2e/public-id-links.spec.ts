import {
  expect,
  Page,
  test
} from '@playwright/test';


type Fixture = {
  id: number;
  publicId: string;
  name: string;
};

const PRIVATE_RACK: Fixture = {
  id: 406,
  publicId: '63JHUYBwNqmC',
  name: 'Bleh'
};
const PUBLIC_RACK: Fixture = {
  id: 72,
  publicId: '_Y8tAMRRc16v',
  name: 'My new rack'
};
const PRIVATE_PATCH: Fixture = {
  id: 186,
  publicId: 'KtgoYgs0qyaX',
  name: 'Artificial Azure'
};
const PUBLIC_PATCH: Fixture = {
  id: 5,
  publicId: 'o6BNUDeXEhWo',
  name: 'Demo Patch'
};

async function expectRetiredLinkPage(page: Page): Promise<void> {
  await expect(page).toHaveURL(/\/links\/retired(?:$|[?#])/, {timeout: 15_000});
  await expect(page.getByText('This share link has been retired.')).toBeVisible({timeout: 10_000});
}

async function expectRackDetailRendered(page: Page, rack: Fixture): Promise<void> {
  await expect(page).toHaveURL(new RegExp(`/racks/${ rack.publicId }(?:$|[?#])`), {timeout: 15_000});
  await expect(page.locator('lib-hero-content-card.racksBG')).toBeVisible({timeout: 15_000});
  await expect(page.locator('app-rack-composite').first()).toBeVisible({timeout: 15_000});
  await expect(page.getByText(rack.name, {exact: true}).first()).toBeVisible({timeout: 15_000});
}

async function expectPatchDetailRendered(page: Page, patch: Fixture): Promise<void> {
  await expect(page).toHaveURL(new RegExp(`/patches/${ patch.publicId }(?:$|[?#])`), {timeout: 15_000});
  await expect(page.locator('lib-hero-content-card.patchesBG')).toBeVisible({timeout: 15_000});
  await expect(page.locator('app-patch-composite').first()).toBeVisible({timeout: 15_000});
  await expect(page.getByText(patch.name, {exact: true}).first()).toBeVisible({timeout: 15_000});
}

/**
 * public_id fixtures are coupled to the live Supabase seed data until a local
 * deterministic E2E seed exists for tokenized private/public rack and patch links.
 */
test.describe('public_id rack links', () => {
  test('public_id opens a private rack anonymously without a blank page', async ({page}) => {
    await page.goto(`/racks/${ PRIVATE_RACK.publicId }`);

    await expectRackDetailRendered(page, PRIVATE_RACK);
  });

  test('public_id retires a private legacy numeric rack link anonymously', async ({page}) => {
    await page.goto(`/racks/details/${ PRIVATE_RACK.id }`);

    await expectRetiredLinkPage(page);
  });

  test('public_id redirects a public legacy numeric rack link to its token URL', async ({page}) => {
    await page.goto(`/racks/details/${ PUBLIC_RACK.id }`);

    await expectRackDetailRendered(page, PUBLIC_RACK);
  });
});

test.describe('public_id patch links', () => {
  test('public_id opens a private patch anonymously without a blank page', async ({page}) => {
    await page.goto(`/patches/${ PRIVATE_PATCH.publicId }`);

    await expectPatchDetailRendered(page, PRIVATE_PATCH);
  });

  test('public_id retires a private legacy numeric patch link anonymously', async ({page}) => {
    await page.goto(`/patches/details/${ PRIVATE_PATCH.id }`);

    await expectRetiredLinkPage(page);
  });

  test('public_id redirects a public legacy numeric patch link to its token URL', async ({page}) => {
    await page.goto(`/patches/details/${ PUBLIC_PATCH.id }`);

    await expectPatchDetailRendered(page, PUBLIC_PATCH);
  });
});
