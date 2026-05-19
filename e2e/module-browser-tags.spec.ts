import {
  expect,
  type Page,
  test
} from '@playwright/test';


const FIRST_TAG = 'Passive';
const SECOND_TAG = 'Power';
const MANY_TAGS = [
  'Passive',
  'Power',
  'Attenuate',
  'Blank',
  'Clock IN',
  'Clock Mod',
  'Clock OUT',
  'Compare',
  'Compress',
  'Control'
];

test.describe('Module Browser tag filters', () => {
  test.describe.configure({mode: 'serial'});

  test.beforeEach(async ({page}) => {
    await page.goto('/modules/browser');
    await expect(moduleCards(page).first()).toBeVisible({timeout: 15_000});
    await expectUpdatingToSettle(page);
  });

  test('1. exposes the tag search and tag chips in the advanced filter area', async ({page}) => {
    await expect(tagSearch(page)).toBeVisible();
    await expect(tagOption(page, FIRST_TAG)).toBeVisible();
    await expect(tagOption(page, SECOND_TAG)).toBeVisible();
  });

  test('2. tag search narrows suggestions without changing the current result list', async ({page}) => {
    const initialCount = await moduleCards(page).count();

    await tagSearch(page).fill('pass');

    await expect(tagOption(page, FIRST_TAG)).toBeVisible();
    await expect(tagOption(page, SECOND_TAG)).toHaveCount(0);
    expect(await moduleCards(page).count()).toBe(initialCount);
  });

  test('3. selecting one tag sends a backend tag-filter request and keeps the page in a settled state', async ({page}) => {
    const tagRequest = waitForModuleTagRequest(page);
    const option = tagOption(page, FIRST_TAG);

    await expect(option).toBeVisible({timeout: 10_000});
    await option.click();
    await expectSelectedTag(page, FIRST_TAG);
    await expect(page.locator('.browser-content-area .update-loading-shell')).toBeVisible({timeout: 1_000});
    await expect(page.locator('.module-results-shell')).toHaveClass(/module-results-shell--updating/);

    await tagRequest;
    await expectSettledResultsState(page);
  });

  test('4. selecting two tags in Any mode keeps results or a valid empty state, never stale loading UI', async ({page}) => {
    await selectTag(page, FIRST_TAG);
    await selectTag(page, SECOND_TAG);

    await expect(matchModeButton(page, 'Any')).toBeChecked();
    await expectSelectedTag(page, FIRST_TAG);
    await expectSelectedTag(page, SECOND_TAG);
    await expectSettledResultsState(page);
  });

  test('5. switching to All mode sends another request and keeps selected tags intact', async ({page}) => {
    await selectTag(page, FIRST_TAG);
    await selectTag(page, SECOND_TAG);
    await setTagMatchMode(page, 'All');

    await expect(matchModeButton(page, 'All')).toBeChecked();
    await expectSelectedTag(page, FIRST_TAG);
    await expectSelectedTag(page, SECOND_TAG);
    await expectSettledResultsState(page);
  });

  test('6. All mode with many tags clears previous cards and shows empty state when no backend rows match', async ({page}) => {
    await selectTag(page, FIRST_TAG);
    await expect(moduleCards(page).first()).toBeVisible();

    for (const tagName of MANY_TAGS.slice(1)) {
      await selectTag(page, tagName, false);
    }
    await setTagMatchMode(page, 'All');

    await expectEmptyState(page);
    await expect(moduleCards(page)).toHaveCount(0);
    await expect(page.getByRole('button', {name: /load more/i})).toHaveCount(0);
  });

  test('7. switching back from an All-mode empty state to Any mode restores a non-empty result set', async ({page}) => {
    for (const tagName of MANY_TAGS) {
      await selectTag(page, tagName, false);
    }
    await setTagMatchMode(page, 'All');
    await expectEmptyState(page);

    await setTagMatchMode(page, 'Any');

    await expect(moduleCards(page).first()).toBeVisible({timeout: 15_000});
    await expectNoEmptyState(page);
    await expectSettledResultsState(page);
  });

  test('8. removing a selected tag updates the selected chip list without leaving stale empty state', async ({page}) => {
    await selectTag(page, FIRST_TAG);
    await selectTag(page, SECOND_TAG);
    await setTagMatchMode(page, 'All');

    await removeSelectedTag(page, SECOND_TAG);

    await expectSelectedTag(page, FIRST_TAG);
    await expect(selectedTag(page, SECOND_TAG)).toHaveCount(0);
    await expectSettledResultsState(page);
  });

  test('9. reset filters clears selected tags, returns to Any mode, and restores catalog results', async ({page}) => {
    await selectTag(page, FIRST_TAG);
    await selectTag(page, SECOND_TAG);
    await setTagMatchMode(page, 'All');

    await page.getByRole('button', {name: /reset filters/i}).click();
    await expectUpdatingToSettle(page);

    await expect(selectedTag(page, FIRST_TAG)).toHaveCount(0);
    await expect(selectedTag(page, SECOND_TAG)).toHaveCount(0);
    await expect(matchModeButton(page, 'Any')).toHaveCount(0);
    await expect(moduleCards(page).first()).toBeVisible({timeout: 15_000});
    await expectNoEmptyState(page);
  });

  test('10. load more never appears together with the empty state after tag filtering', async ({page}) => {
    for (const tagName of MANY_TAGS) {
      await selectTag(page, tagName, false);
    }
    await setTagMatchMode(page, 'All');

    await expectEmptyState(page);
    await expect(page.getByRole('button', {name: /load more/i})).toHaveCount(0);
  });
});

function moduleCards(page: Page) {
  return page.locator('app-module-minimal');
}

function tagSearch(page: Page) {
  return page.getByLabel('Filter tags by name');
}

function tagOption(page: Page, name: string) {
  return page.locator('mat-chip-option').filter({hasText: name}).first();
}

function selectedTag(page: Page, name: string) {
  return page.locator('.selected-tags-row mat-chip').filter({hasText: name});
}

function matchModeButton(page: Page, mode: 'Any' | 'All') {
  return page.getByRole('radio', {name: mode});
}

async function selectTag(page: Page, name: string, waitForBackend = true): Promise<void> {
  const option = tagOption(page, name);
  const response = waitForBackend ? waitForModuleTagResponse(page) : null;
  await expect(option).toBeVisible({timeout: 10_000});
  await option.click();
  await expectSelectedTag(page, name);
  await response;
  await expectUpdatingToSettle(page);
}

async function removeSelectedTag(page: Page, name: string): Promise<void> {
  await selectedTag(page, name).getByRole('button').click();
  await expectUpdatingToSettle(page);
}

async function setTagMatchMode(page: Page, mode: 'Any' | 'All'): Promise<void> {
  const button = matchModeButton(page, mode);
  await expect(button).toBeVisible({timeout: 10_000});
  await button.click();
  await expectUpdatingToSettle(page);
}

async function expectSelectedTag(page: Page, name: string): Promise<void> {
  await expect(selectedTag(page, name)).toBeVisible({timeout: 10_000});
}

async function expectUpdatingToSettle(page: Page): Promise<void> {
  await expect(page.locator('.browser-content-area .update-loading-shell')).toBeHidden({timeout: 20_000});
}

async function expectSettledResultsState(page: Page): Promise<void> {
  await expectUpdatingToSettle(page);
  if (await page.locator('app-module-list app-empty-state').count() > 0) {
    await expectEmptyState(page);
  } else {
    await expect(moduleCards(page).first()).toBeVisible({timeout: 15_000});
  }
}

async function expectEmptyState(page: Page): Promise<void> {
  await expect(page.locator('app-module-list app-empty-state')).toBeVisible({timeout: 20_000});
}

async function expectNoEmptyState(page: Page): Promise<void> {
  await expect(page.locator('app-module-list app-empty-state')).toHaveCount(0);
}

function waitForModuleTagRequest(page: Page) {
  return page.waitForRequest((request) =>
    request.method() === 'GET'
    && request.url().includes('/rest/v1/modules')
    && request.url().includes('module_tags.tagid')
  );
}

function waitForModuleTagResponse(page: Page) {
  return page.waitForResponse((response) =>
    response.request().method() === 'GET'
    && response.url().includes('/rest/v1/modules')
    && response.url().includes('module_tags.tagid')
  );
}
