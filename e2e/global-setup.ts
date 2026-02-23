import type { FullConfig } from '@playwright/test';
import {
  hasE2EAuthCredentials,
  loadE2EEnvFromDotEnv,
  loginAndSaveStorageState
} from './helpers/auth';

const DEFAULT_BASE_URL = 'http://localhost:5556';

export default async function globalSetup(config: FullConfig): Promise<void> {
  loadE2EEnvFromDotEnv();

  if (!hasE2EAuthCredentials()) {
    console.warn('[e2e-auth] Missing E2E_TEST_EMAIL/E2E_TEST_PASSWORD. Authenticated E2E project will be skipped.');
    return;
  }

  const authProject = config.projects.find(project => project.name === 'chromium-auth');
  const baseURL = String(authProject?.use?.baseURL ?? DEFAULT_BASE_URL);

  await loginAndSaveStorageState(baseURL);
}
