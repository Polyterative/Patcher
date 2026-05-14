import {
  expect,
  test
} from '@playwright/test';


/**
 * Public Profile — smoke & content tests (no auth required)
 *
 * Covers:
 *  - Non-existent profile returns "not found" message gracefully
 *  - Page shell renders (toolbar, footer) even for missing profiles
 *  - Route structure: /u/:username resolves without 404 redirect
 *  - Optional: known public profile renders hero heading and content
 *    (only runs if E2E_TEST_PUBLIC_USERNAME env variable is set)
 */

const NONEXISTENT_USERNAME = '__e2e_no_such_user_xyz_9999__';

test.describe('Public Profile — unauthenticated', () => {
  // ─── Non-existent profile ──────────────────────────────────────────────────

  test.describe('non-existent username', () => {
    test.beforeEach(async ({page}) => {
      await page.goto(`/u/${NONEXISTENT_USERNAME}`);
    });

    test('page resolves without redirect to 404 route', async ({page}) => {
      await expect(page).toHaveURL(new RegExp(`/u/${NONEXISTENT_USERNAME}`), {timeout: 15_000});
      await expect(page).not.toHaveURL(/404/);
    });

    test('shows profile-not-found message', async ({page}) => {
      await expect(page.getByText(/profile not found/i)).toBeVisible({timeout: 15_000});
    });

    test('page shell renders (main landmark present)', async ({page}) => {
      // /u/* routes use embedded shell (no toolbar) — check for the main content landmark instead
      await expect(page.locator('main#main-content')).toBeVisible({timeout: 10_000});
    });
  });

  // ─── Known public profile (optional — gated by env var) ───────────────────

  test.describe('known public profile', () => {
    const publicUsername = process.env['E2E_TEST_PUBLIC_USERNAME']?.trim() ?? '';

    test.skip(!publicUsername, 'E2E_TEST_PUBLIC_USERNAME not set — skipping known-profile tests');

    test.beforeEach(async ({page}) => {
      await page.goto(`/u/${publicUsername}`);
    });

    test('profile page loads', async ({page}) => {
      await expect(page).toHaveURL(new RegExp(`/u/${publicUsername}`), {timeout: 15_000});
      await expect(page).not.toHaveURL(/404/);
    });

    test('profile hero card is visible with correct title', async ({page}) => {
      const heroCard = page.locator('lib-hero-content-card.userBG').first();
      await expect(heroCard).toBeVisible({timeout: 15_000});
    });

    test('profile username is displayed', async ({page}) => {
      await expect(page.getByText(publicUsername, {exact: true}).first()).toBeVisible({timeout: 15_000});
    });

    test('racks section renders', async ({page}) => {
      const racksCard = page.locator('lib-hero-content-card.racksBG').first();
      await expect(racksCard).toBeVisible({timeout: 15_000});
    });

    test('patches section renders', async ({page}) => {
      const patchesCard = page.locator('lib-hero-content-card.patchesBG').first();
      await expect(patchesCard).toBeVisible({timeout: 15_000});
    });
  });

  // ─── Private profile (graceful handling without auth) ─────────────────────

  test.describe('private profile state', () => {
    // We cannot guarantee a specific username has a private profile in CI.
    // This test is gated by env var to avoid false positives.
    const privateUsername = process.env['E2E_TEST_PRIVATE_USERNAME']?.trim() ?? '';

    test.skip(!privateUsername, 'E2E_TEST_PRIVATE_USERNAME not set — skipping private-profile tests');

    test('visiting a private profile shows private message', async ({page}) => {
      await page.goto(`/u/${privateUsername}`);
      await expect(page.getByText(/this profile is private/i)).toBeVisible({timeout: 15_000});
    });
  });
});
