import fs from 'node:fs';
import path from 'node:path';
import {
  chromium,
  expect,
  type Page
} from '@playwright/test';

export const AUTH_STORAGE_STATE_PATH = path.resolve(process.cwd(), 'playwright/.auth/user.json');

const E2E_ENV_PATH = path.resolve(process.cwd(), '.env');

export interface E2EAuthCredentials {
  email: string;
  password: string;
}

export function loadE2EEnvFromDotEnv(): void {
  try {
    process.loadEnvFile(E2E_ENV_PATH);
  } catch (error: unknown) {
    const errorCode = (error as {
      code?: string;
    })?.code;

    if (errorCode !== 'ENOENT') {
      throw error;
    }
  }
}

export function hasE2EAuthCredentials(): boolean {
  return Boolean(process.env['E2E_TEST_EMAIL']?.trim()) && Boolean(process.env['E2E_TEST_PASSWORD']?.trim());
}

export function getE2EAuthCredentialsOrThrow(): E2EAuthCredentials {
  const email = process.env['E2E_TEST_EMAIL']?.trim();
  const password = process.env['E2E_TEST_PASSWORD']?.trim();

  if (!email || !password) {
    throw new Error(
      '[e2e-auth] Missing E2E_TEST_EMAIL or E2E_TEST_PASSWORD. Set them in environment variables or in .env.'
    );
  }

  return {
    email,
    password
  };
}

async function loginWithCredentials(page: Page, credentials: E2EAuthCredentials, baseURL: string): Promise<void> {
  const sanitizedBaseURL = baseURL.replace(/\/$/, '');

  await page.goto(`${ sanitizedBaseURL }/auth/login`);
  await page.waitForLoadState('networkidle');
  const loginInputs = page.locator('app-login-email input');
  const loginButton = page.locator('app-login-email a.brand-button').first();

  await loginInputs.first().fill(credentials.email);
  await loginInputs.nth(1).fill(credentials.password);
  await page.locator('vite-error-overlay').waitFor({state: 'hidden', timeout: 5_000}).catch(() => undefined);
  await loginButton.click({force: true});

  await expect(page).toHaveURL(/\/user\/area/, {timeout: 30_000});
  await page.waitForLoadState('networkidle');
  await expect(page.locator('app-user-area-root').first()).toBeVisible({timeout: 20_000});
}

export async function loginAndSaveStorageState(baseURL: string, storageStatePath = AUTH_STORAGE_STATE_PATH): Promise<void> {
  const credentials = getE2EAuthCredentialsOrThrow();

  fs.mkdirSync(path.dirname(storageStatePath), {recursive: true});
  const storageStateTempPath = `${ storageStatePath }.${ process.pid }.tmp`;

  const browser = await chromium.launch({headless: true});
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await loginWithCredentials(page, credentials, baseURL);
    const storageState = await context.storageState();
    fs.writeFileSync(storageStateTempPath, `${ JSON.stringify(storageState, null, 2) }\n`);
    fs.renameSync(storageStateTempPath, storageStatePath);
  } finally {
    fs.rmSync(storageStateTempPath, {force: true});
    await context.close();
    await browser.close();
  }
}
