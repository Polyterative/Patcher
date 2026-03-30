# E2E Test Setup

This folder contains Playwright end-to-end tests.

## Run Public Smoke Tests

```bash
pnpm test:e2e
```

These tests do not require login credentials.

## Run Authenticated Tests

1. Copy the env template:

```bash
cp .env.example .env
```

2. Set a dedicated test account in `.env`:

- `E2E_TEST_EMAIL`
- `E2E_TEST_PASSWORD`

3. Run authenticated tests:

```bash
pnpm test:e2e:auth
```

## About `playwright/.auth/`

- `e2e/global-setup.ts` logs in and writes Playwright storage state to `playwright/.auth/user.json`.
- This folder is intentionally gitignored and should never be committed.
- If auth state gets stale, delete `playwright/.auth/user.json` and rerun tests.
