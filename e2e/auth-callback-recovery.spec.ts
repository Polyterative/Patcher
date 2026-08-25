import {
  expect,
  test
} from '@playwright/test';

/**
 * Covers `AuthCallbackComponent`'s Failed-state journey through a real
 * browser/router/DOM. `auth-callback.component.ts`/`.spec.ts` already fully
 * unit-test this behavior (17 passing specs, including the late-success
 * latch race guard) — this file adds no production change, only
 * journey-level characterization coverage (JE-CHAR-1): expected to pass
 * immediately against already-correct behavior.
 *
 * Trigger: navigate straight to `/auth/callback` with no OAuth hash, the
 * same way `handleOAuthCallback()` already handles a failed/missing session
 * in production. No third-party OAuth handshake, no backend mutation — a
 * fresh, unauthenticated context with nothing to exchange settles
 * deterministically to Failed via the backend's own bounded null-session
 * timeout (measured ~12-14s in this dev environment; generous margins below
 * account for slower CI-like conditions). This trigger needs no network
 * call to Supabase at all (a fresh, empty context determines "no session"
 * from local state alone), so blocking every cross-origin/mutating request
 * below does not change the deterministic-failure behavior being tested.
 *
 * The `chromium-auth`/`webkit-auth` projects apply an authenticated
 * `storageState` by default to contexts created from the `browser` fixture,
 * even when only `baseURL` is passed to `newContext()` — an explicit empty
 * `storageState` is required to get a genuinely logged-out context here.
 *
 * RR-2b-F1 repair: requests used to be merely *recorded* via `page.on(
 * 'request', ...)` after Playwright had already let them proceed — a
 * regression could have reached Supabase or another external origin before
 * the final assertion ever ran. Requests are now intercepted and decided
 * *before transmission* via `context.route()`, registered before the page
 * even exists, using an explicit allowlist: same-origin, read-only (GET)
 * requests (the app's own bundle/assets and the callback logic itself), plus
 * a short, explicitly named list of third-party hosts this app's own
 * chrome/header always loads on every page regardless of route (Google
 * Fonts, the Patreon badge) — also GET-only. Everything else (Supabase,
 * every OAuth provider, any other origin, and any mutating method
 * regardless of origin) is aborted before it ever leaves the browser. The
 * blocked-request ledger assertion below is an observability check on this
 * test's *intended* behavior, not the safety mechanism itself — safety comes
 * from the abort, which fires unconditionally regardless of that assertion.
 *
 * RR-2b-F2 repair (rereview round 2): the Patreon allowance was a wildcard
 * suffix match (`patreon.com` or any `*.patreon.com` subdomain), broader than
 * the single host this test actually observes. Narrowed to the exact
 * observed hostname (`c5.patreon.com`) — no other Patreon subdomain is
 * allowed through, even read-only.
 */
// Third-party hosts this app's own global header/footer chrome legitimately
// loads on *every* page (including /auth/callback) for cosmetic rendering
// only — unrelated to auth/session logic. Named explicitly by exact
// hostname (no wildcard/suffix matching) so the allowlist stays precise;
// still GET-only, still excludes Supabase, every OAuth provider, and any
// other origin by default.
const KNOWN_SAFE_EXTERNAL_HOSTNAMES = new Set([
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  'c5.patreon.com'
]);

function isKnownSafeExternalHost(hostname: string): boolean {
  return KNOWN_SAFE_EXTERNAL_HOSTNAMES.has(hostname);
}

test.describe('Auth callback recovery', () => {
  test('an unauthenticated callback that never settles renders Failed, focuses the heading, and Back to login navigates exactly once', async ({browser, baseURL}) => {
    test.setTimeout(45_000);

    const resolvedBaseURL = baseURL ?? 'http://localhost:5556';
    const allowedOrigin = new URL(resolvedBaseURL).origin;

    const context = await browser.newContext({
      baseURL: resolvedBaseURL,
      storageState: {cookies: [], origins: []}
    });

    // Observability only (see file header) — the abort below is what
    // actually enforces "no external/Supabase/OAuth/mutating traffic ever
    // leaves the browser," independent of whether this ledger is asserted.
    const blockedRequests: string[] = [];

    try {
      // Registered before any page exists, so every request from the very
      // first navigation onward is decided before transmission.
      await context.route('**/*', async route => {
        const request = route.request();
        const url = new URL(request.url());
        const isReadOnly = request.method() === 'GET';
        const isAllowedOrigin = url.origin === allowedOrigin || isKnownSafeExternalHost(url.hostname);

        if (isReadOnly && isAllowedOrigin) {
          await route.continue();
          return;
        }

        blockedRequests.push(`${ request.method() } ${ request.url() }`);
        await route.abort('blockedbyclient');
      });

      const page = await context.newPage();

      await page.goto('/auth/callback');

      // Loading renders and stays stable before the callback settles.
      const loadingRegion = page.locator('.spinner-container');
      await expect(loadingRegion).toBeVisible();
      await expect(page.getByText('Completing sign in...')).toBeVisible();

      // No hash/session ever arrives for this fresh, unauthenticated
      // context, so the callback settles to Failed (bounded by the
      // backend's own null-session timeout).
      const failedRegion = page.locator('.error-message[role="alert"]');
      await expect(failedRegion).toBeVisible({timeout: 25_000});
      await expect(loadingRegion).toBeHidden();

      const heading = failedRegion.locator('h2');
      await expect(heading).toHaveText('Sign-in didn\'t complete');
      await expect(heading).toBeFocused();

      // Count real "Back to login" navigations in a real browser — must
      // land on /auth/login exactly once, not zero or duplicate times.
      const loginNavigations: string[] = [];
      page.on('framenavigated', frame => {
        if (frame === page.mainFrame() && new URL(frame.url()).pathname === '/auth/login') {
          loginNavigations.push(frame.url());
        }
      });

      await page.locator('.back-to-login-button').click();

      await expect(page).toHaveURL(/\/auth\/login/);
      expect(loginNavigations).toHaveLength(1);
      expect(blockedRequests).toEqual([]);
    } finally {
      await context.close();
    }
  });
});
