import {
  expect,
  test
} from '@playwright/test';

/**
 * ATP-RT-08 — reduced-motion emulation for the recovery "Checking" state's
 * `.loading-message` pulse (I-25). Playwright-native; not testable in the
 * Karma/ChromeHeadlessCI unit harness (no `prefers-reduced-motion` emulation
 * flag configured there) — see `AcceptanceTestPlanAuthResilience.md` §17
 * Gap 4 for why this is intentionally E2E-only.
 */
test.describe('Reset-password recovery — reduced motion (ATP-RT-08)', () => {
  test('.loading-message icon animation is disabled or frozen under prefers-reduced-motion: reduce', async ({page}) => {
    await page.emulateMedia({reducedMotion: 'reduce'});

    // Hold the Checking state visible: never resolve the verification
    // request so the loading spinner stays on screen for the assertion.
    await page.route('**/auth/v1/verify**', () => {
      // Intentionally left pending — no continue/fulfill/abort.
    });

    await page.goto('/auth/reset-password?token_hash=e2e-rt08-token&type=recovery');
    await page.waitForLoadState('domcontentloaded');

    const icon = page.locator('.loading-message mat-icon');
    await expect(icon).toBeVisible();

    const animation = await icon.evaluate(el => {
      const style = getComputedStyle(el);
      return {
        name: style.animationName,
        playState: style.animationPlayState,
        duration: style.animationDuration
      };
    });

    const isDisabledOrFrozen =
      animation.name === 'none' ||
      animation.playState === 'paused' ||
      animation.duration === '0s';

    expect(
      isDisabledOrFrozen,
      `expected the pulse animation to be disabled or frozen under prefers-reduced-motion, got ${ JSON.stringify(animation) }`
    ).toBeTruthy();
  });
});
