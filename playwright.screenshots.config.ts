import {
  defineConfig,
  devices
} from '@playwright/test';
import {
  AUTH_STORAGE_STATE_PATH,
  hasE2EAuthCredentials,
  loadE2EEnvFromDotEnv
} from './e2e/helpers/auth';


const PORT = 5557;
const BASE_URL = `http://localhost:${ PORT }`;
const SCREENSHOT_SPEC_GLOB = [
  '**/screenshots/prod-nav-guard.spec.ts',
  '**/screenshots/auth-major-area-screenshots.spec.ts'
];

loadE2EEnvFromDotEnv();

const hasAuthCredentials = hasE2EAuthCredentials();

if (!hasAuthCredentials) {
  console.warn('[e2e-screenshots] Authenticated screenshot tests are disabled until E2E_TEST_EMAIL and E2E_TEST_PASSWORD are set.');
}

export default defineConfig({
  testDir: './e2e',
  testMatch: SCREENSHOT_SPEC_GLOB,
  tsconfig: './e2e/tsconfig.json',
  globalSetup: './e2e/global-setup.ts',
  timeout: 45_000,
  expect: {timeout: 10_000},
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 1 : 0,
  reporter: 'list',
  webServer: {
    command: 'node generate-env.js && pnpm exec ng serve --configuration production --port 5557 --no-hmr',
    url: BASE_URL,
    reuseExistingServer: false,
    timeout: 180_000
  },
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    headless: true
  },
  projects: hasAuthCredentials
    ? [{
      name: 'chromium-screenshots',
      use: {
        ...devices['Desktop Chrome'],
        storageState: AUTH_STORAGE_STATE_PATH
      }
    }]
    : []
});
