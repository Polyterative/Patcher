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

> The root `.env` is the **only** canonical credential location — `e2e/helpers/auth.ts`,
> `playwright.config.ts`, and the `scripts/ops/run-e2e-*.mjs` runners all load it.
> Agents: if these keys are missing, ask the user once and write the values into `.env`
> (gitignored) rather than exporting them in a shell — shell env does not persist across
> sessions and is the historical cause of repeated "missing credentials" skips.
> `pnpm loop:health` reports whether the keys are present.

3. Run authenticated tests:

```bash
pnpm test:e2e:auth
```

## Module CREATE safety

Authenticated E2E currently targets the configured Supabase instance unless a
test explicitly mocks network traffic. Do not create publicly visible modules in
E2E. Browser submissions to `POST /rest/v1/modules` must be intercepted with
`page.route(...).fulfill(...)`, and direct Supabase `modules` fixtures must stay
private and unapproved (`public:false`, `isApproved:false`). `pnpm test:e2e`,
`pnpm test:e2e:auth`, CI E2E, and screenshot E2E run
`pnpm check:e2e-module-create-safety` before Playwright to enforce this.

## About `playwright/.auth/`

- `e2e/global-setup.ts` logs in and writes Playwright storage state to `playwright/.auth/user.json`.
- This folder is intentionally gitignored and should never be committed.
- If auth state gets stale, delete `playwright/.auth/user.json` and rerun tests.
