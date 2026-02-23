import {
  defineConfig,
  devices
} from '@playwright/test';
import {
  AUTH_STORAGE_STATE_PATH,
  hasE2EAuthCredentials,
  loadE2EEnvFromDotEnv
} from './e2e/helpers/auth';


/**
 * Playwright configuration for Patcher E2E tests.
 *
 * Run:
 *   yarn test:e2e          — local, list reporter
 *   yarn test:e2e:ci       — CI, single worker
 *
 * The dev server must be running at BASE_URL before tests are invoked.
 * Set BASE_URL env var to override (e.g. staging URL).
 */

const BASE_URL = process.env['BASE_URL'] ?? 'http://localhost:5556';
const AUTH_SPEC_GLOB = '**/auth-login.spec.ts';

loadE2EEnvFromDotEnv();

const hasAuthCredentials = hasE2EAuthCredentials();

if (!hasAuthCredentials) {
  console.warn('[e2e-auth] Authenticated tests are disabled until E2E_TEST_EMAIL and E2E_TEST_PASSWORD are set.');
}

export default defineConfig({
  testDir: './e2e',
  testMatch: [
    '**/module-browser.spec.ts',
    '**/module-details.spec.ts',
    '**/module-editor-ux-review.spec.ts',
    '**/patch-browser.spec.ts',
    '**/patch-graph-stability.spec.ts',
    '**/rack-browser.spec.ts',
    '**/home.spec.ts',
    '**/navigation.spec.ts',
    AUTH_SPEC_GLOB
  ],
  /* Use Node-compatible tsconfig — root tsconfig uses "bundler" which breaks Playwright */
  tsconfig: './e2e/tsconfig.json',
  globalSetup: './e2e/global-setup.ts',
  /* Each test gets its own timeout */
  timeout: 30_000,
  expect: {timeout: 5_000},
  /* Fail fast on first failure in CI */
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 2 : 0,
  workers: process.env['CI'] ? 1 : undefined,
  reporter: 'list',
  
  use: {
    baseURL: BASE_URL,
    /* Collect trace only when retrying a failed test */
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    headless: true,
  },
  
  projects: [
    {
      name: 'chromium',
      testIgnore: [AUTH_SPEC_GLOB],
      use: {...devices['Desktop Chrome']},
    },
    ...(hasAuthCredentials
      ? [{
        name: 'chromium-auth',
        testMatch: [AUTH_SPEC_GLOB],
        use: {
          ...devices['Desktop Chrome'],
          storageState: AUTH_STORAGE_STATE_PATH
        }
      }]
      : []),
  ],
});
