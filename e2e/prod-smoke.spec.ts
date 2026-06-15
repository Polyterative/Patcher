import {
  expect,
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
});
