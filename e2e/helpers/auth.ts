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
  const loginInputs = page.locator('app-login-email input');
  const loginButton = page.locator('app-login-email a.brand-button').first();

  await loginInputs.first().fill(credentials.email);
  await loginInputs.nth(1).fill(credentials.password);
  await loginButton.click();

  await expect(page).toHaveURL(/\/user\/area/, {timeout: 20_000});
  await expect(page.getByRole('link', {name: /my profile/i})).toBeVisible({timeout: 15_000});
}

export async function loginAndSaveStorageState(baseURL: string, storageStatePath = AUTH_STORAGE_STATE_PATH): Promise<void> {
  const credentials = getE2EAuthCredentialsOrThrow();

  fs.mkdirSync(path.dirname(storageStatePath), {recursive: true});

  const browser = await chromium.launch({headless: true});
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await loginWithCredentials(page, credentials, baseURL);
    await context.storageState({path: storageStatePath});
  } finally {
    await context.close();
    await browser.close();
  }
}
