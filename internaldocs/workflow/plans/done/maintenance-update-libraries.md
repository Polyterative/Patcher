# Maintenance — Update libraries

## Problem

**Why:** Dependencies drift. We're already seeing the symptom — Sentry warned that
`@sentry/angular ^10.38.0` is below the minimum needed for agent monitoring (irrelevant
to us, but a sign the SDK is stale), and `@sentry/browser ^10.45.0` is on a different
minor than `@sentry/angular`. Other libraries (Angular, RxJS, Material, Supabase,
Playwright, etc.) likely have similar drift. A periodic, batched update keeps the
upgrade cost predictable instead of accumulating into a painful "everything at once"
sweep.

## Goals

- Keep Sentry packages aligned on the same current 10.x line.
- Apply low-risk patch/minor dependency bumps that do not require framework or API rewrites.
- Refresh the pnpm lockfile and remove stale duplicate override configuration that pnpm ignores.
- Defer major-version upgrades for separate review.

## Assumptions

- Patch/minor updates are acceptable when existing lint/tests/build pass.
- Major updates such as `@sentry/cli` 3.x, Express 5, Jasmine 6, and Node 25 are intentionally
  deferred unless a security advisory forces them.
- The authoritative pnpm override location is `pnpm-workspace.yaml`; the duplicate `package.json`
  `pnpm.overrides` block is ignored by current pnpm.

## Layers

### MVP

- [x] Align `@sentry/angular` and `@sentry/browser` on the latest compatible 10.x.
- [x] Update security-relevant overrides such as `ws` / `qs` to current non-major versions.

### Structural

- [x] Apply safe patch/minor bumps for Angular 22 patch packages, TypeScript ESLint, PostHog,
      GSAP, `modern-screenshot`, and other low-risk direct dependencies.
- [x] Remove ignored duplicate `package.json` override configuration while preserving
      `pnpm-workspace.yaml` overrides.
- [x] Run `pnpm install` so `pnpm-lock.yaml` matches the updated manifests.

### Polish

- [x] Document deferred major updates in the Decision log.
- [x] Validate with lint, build, targeted tests, and docs checks.

## File-level checklist

- [x] `package.json`
- [x] `pnpm-workspace.yaml`
- [x] `pnpm-lock.yaml`
- [x] `internaldocs/workflow/CURRENT_FEATURE.md`

## Acceptance criteria

- [x] Sentry browser/angular packages are aligned on the same 10.x version.
- [x] Current pnpm no longer warns about ignored `package.json` `pnpm.overrides`.
- [x] Lockfile is refreshed with `pnpm install`.
- [x] Major-version upgrades are not bundled without a specific reason.
- [x] Validation passes.

## Validation strategy

- `pnpm install`
- `pnpm test-headless --include="**/analytics.service.spec.ts"`
- `pnpm lint`
- `pnpm build`
- `node scripts/checks/check-docs.cjs`

## Scope

Bump dependencies in `package.json` to current stable versions, prioritising:

- [x] `@sentry/angular` and `@sentry/browser` to the same latest 10.x (clears the agent-monitoring warning)
- [x] Audit other `@sentry/*` packages (`@sentry/cli`)
- [x] Patch / minor bumps across all dependencies (low risk, batch into one PR)
- [x] Major bumps reviewed individually (Angular, RxJS, Material, Supabase, Playwright) — only when there is a concrete reason
- [x] After this batch: `pnpm lint`, `pnpm build`, and targeted `pnpm test-headless`; auth E2E smoke deferred because current test-account cleanup is a separate credential-rotation task
- [x] Update `internaldocs/` if any pattern docs reference deprecated APIs (none found for this patch/minor batch)

**Cadence:** Aim for one batched update PR per quarter unless a security advisory or
needed feature forces an earlier bump.

**Out of scope:** Framework rewrites or large refactors triggered by the upgrade —
file those as separate plan entries.

---

## Decision log

<!-- Append timestamped one-liners as the plan progresses. -->

- 2026-06-18T09:03+02:00 — Completed coordinator validation with targeted analytics spec, `pnpm lint`, production `pnpm build`, docs check, and `git diff --check`. Auth E2E smoke stays deferred to the dedicated test-account cleanup task because credentials/secrets are explicitly out of scope.
- 2026-06-18T09:00+02:00 — Implemented the safe batch: Angular 22.0.2 patch family, Sentry browser/angular 10.58.0 alignment, TypeScript ESLint 8.61.1, Playwright 1.61.0, DOMPurify 3.4.11, qs 6.15.2, ws 8.21.0, GSAP 3.15.0, modern-screenshot 4.7.0, and PostHog 1.390.2. Removed the ignored `package.json` pnpm overrides block and kept authoritative overrides in `pnpm-workspace.yaml`. Deferred major/API-risk updates (`@sentry/cli` 3.x, Express/body-parser/fast-uri/Jasmine/types majors, graphology/sigma majors, Angular deprecation rewrites) plus the broader Supabase client minor sweep for a separate focused pass.
