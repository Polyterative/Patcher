import {
  defineConfig,
  devices
} from '@playwright/test';


/**
 * Playwright configuration for production-bundle smoke tests.
 *
 * Separate from playwright.config.ts because:
 *   - It points at the static-served dist (port 5557), not `ng serve` (port 5556)
 *   - It runs only e2e/prod-smoke.spec.ts — the boot regression canary
 *   - It must run *after* `pnpm build` so dist/Patcher/browser exists
 *
 * Local: `pnpm test:e2e:prod` builds + serves + runs.
 * CI:    invoked as its own matrix entry in .github/workflows/angular-tests.yml.
 */

const PORT = 5557;
const BASE_URL = `http://localhost:${ PORT }`;

export default defineConfig({
  testDir: './e2e',
  testMatch: ['**/prod-smoke.spec.ts'],
  tsconfig: './e2e/tsconfig.json',
  timeout: 30_000,
  expect: {timeout: 5_000},
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 1 : 0,
  workers: process.env['CI'] ? 1 : undefined,
  reporter: 'list',
  webServer: {
    command: `node scripts/serve-dist.cjs`,
    url: BASE_URL,
    env: {PORT: String(PORT)},
    reuseExistingServer: !process.env['CI'],
    timeout: 60_000
  },
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    headless: true
  },
  projects: [
    {
      name: 'chromium',
      use: {...devices['Desktop Chrome']}
    }
  ]
});
