import {
  expect,
  test
} from '@playwright/test';

/**
 * Covers the already-authenticated branch of LoginPageComponent: visiting
 * /auth/login while signed in must honor a safe `returnUrl` query param
 * (set by UserAuthGuard when it bounces an unauthenticated visit) instead of
 * always landing on /user/area, and must still fall back to /user/area when
 * no returnUrl is present. No third-party OAuth and no destructive data —
 * this only exercises client-side redirect behavior for an already
 * authenticated session.
 */
test.describe('Authenticated login page — returnUrl handling', () => {
  test('redirects to a safe returnUrl instead of the default destination', async ({page}) => {
    const visitedPaths: string[] = [];
    page.on('framenavigated', frame => {
      if (frame === page.mainFrame()) {
        visitedPaths.push(new URL(frame.url()).pathname);
      }
    });

    await page.goto('/auth/login?returnUrl=%2Fhome');
    await page.waitForURL(/\/home$/, {timeout: 15_000});

    await expect(page).toHaveURL(/\/home$/);
    // No wrong-destination flash: /user/area must never have been visited en route.
    expect(visitedPaths).not.toContain('/user/area');
  });

  test('falls back to /user/area when no returnUrl is present', async ({page}) => {
    await page.goto('/auth/login');
    await page.waitForURL(/\/user\/area$/, {timeout: 15_000});

    await expect(page).toHaveURL(/\/user\/area$/);
  });
});
