<!-- Section: INFRA (independent; pick any time a product task is blocked) -->

# HIGH: Security — Audit Remediation

## Problem

A read-only audit on 2026-06-17 found no clear malware injection indicators, but it did identify credential hygiene, production source exposure, dependency, browser-hardening, and Supabase/RLS issues that should be fixed before lower-priority feature work.

## Goals

- Remove exposed values from committed repo-owned config and prevent future accidental `.env` commits.
- Stop publishing production source maps and named chunks from the normal Angular production build.
- Close low-risk browser hardening gaps in templates and bootstrap fallback code.
- Normalize password login/signup `returnUrl` handling so redirects stay inside the app.
- Keep RLS/policy/migration, credential rotation, third-party service, CSP, and history-rewrite work explicit manual/approval-only follow-ups.

## Assumptions and constraints

- Safe repo-code changes only for coordinator-loop round 3.
- No credential rotation, Supabase RLS/policy/migration, CSP header deployment, history rewrite, or external service access in this round.
- Do not print or reveal old `.env` values.
- Package manager is `pnpm` only.

## Layers

### MVP — credential template and production build hardening

- [x] Remove `.env` from version control after sanitizing the local file to placeholders.
- [x] Add `.env` to `.gitignore` and allow `.env.example` as the committed template.
- [x] Add `.env.example` with placeholder-only local-development keys.
- [x] Disable production `sourceMap` in `angular.json`.
- [x] Disable production `namedChunks` in `angular.json`.

### Structural — browser hardening

- [x] Add `rel="noopener noreferrer"` to every app `<a target="_blank">` missing it.
- [x] Replace the `src/main.ts` bootstrap fallback `innerHTML` and inline `onclick` with DOM node creation and an event listener.
- [x] Add centralized `normalizeInternalReturnUrl` helper for auth redirects.
- [x] Use the helper for password login redirect handling.
- [x] Use the helper for password signup redirect handling.

### Polish — validation and follow-up documentation

- [x] Add focused specs for the safe return-url helper and unsafe login/signup return URLs.
- [x] Run targeted login/signup/redirect specs.
- [x] Run `node scripts/checks/check-docs.cjs`.
- [x] Run `pnpm lint`.
- [x] Coordinate manual/approval-only follow-ups before release by splitting them into `security-manual-approval-followups.md`.

## File checklist

- [x] `.env` — removed from version control; local ignored copy sanitized to placeholders.
- [x] `.env.example`
- [x] `.gitignore`
- [x] `angular.json`
- [x] `src/main.ts`
- [x] `src/app/features/backbone/footer/footer.component.html`
- [x] `src/app/features/backbone/footer/producthunt-badge/producthunt-badge.component.html`
- [x] `src/app/features/backbone/login/safe-return-url.ts`
- [x] `src/app/features/backbone/login/safe-return-url.spec.ts`
- [x] `src/app/features/backbone/login/login-page/user-login-data.service.ts`
- [x] `src/app/features/backbone/login/login-page/user-login-data.service.spec.ts`
- [x] `src/app/features/backbone/login/signup/user-signup-data.service.ts`
- [x] `src/app/features/backbone/login/signup/user-signup-data.service.spec.ts`
- [x] `src/app/features/backend/supabase.types.ts`

## Acceptance criteria

- [x] `.env` is no longer tracked; committed `.env.example` contains placeholders only.
- [x] `.gitignore` ignores `.env` and permits `.env.example`.
- [x] Production Angular config does not emit public source maps or named chunk names by default.
- [x] No app template `<a target="_blank">` is missing `rel="noopener noreferrer"`.
- [x] Bootstrap error fallback avoids `innerHTML` and inline event handlers.
- [x] Password login/signup redirects accept only normalized same-origin app paths and fall back to `/user/area`.
- [x] Focused tests and required docs/lint validation pass.

## Validation

- 2026-06-18 — `pnpm test-headless --include="**/safe-return-url.spec.ts" --include="**/user-login-data.service.spec.ts" --include="**/user-signup-data.service.spec.ts"` passed.
- 2026-06-18 — `node scripts/checks/check-docs.cjs` passed.
- 2026-06-18 — `pnpm lint` passed.

## Remaining manual / approval-only items

### Emergency / credential hygiene

- [ ] Rotate the E2E test account password and replace any personal/shared test account usage with a dedicated test account.
- [ ] Coordinate `.env` history cleanup (`git filter-repo`/BFG + force-push) before pushing sanitized history.
- [ ] Rotate the local Sentry token if `.sentryclirc` contains an active token; keep Sentry auth in `SENTRY_AUTH_TOKEN` via local shell/CI secrets, not a repo file.
- [ ] Add secret-scanning prevention for future commits, either via GitHub secret scanning, gitleaks/detect-secrets, or a pre-commit check.

### Build and supply chain

- [ ] Upgrade/pin `ws >= 8.21.0` to clear the production Supabase realtime vulnerability path if dependency audit still reports it.
- [ ] Update Angular build tooling enough to pull fixed `vite`/`esbuild` versions if dependency audit still reports them.
- [ ] Remove stale/duplicated dependency override configuration if it no longer affects pnpm, keeping the authoritative overrides in one place.
- [ ] If Sentry needs production source maps, upload them privately and remove `.map` files from deploy output.

### Supabase and access control

- [ ] Before any database work, reread `internaldocs/patterns/BACKEND_METHODS.md` schema/RLS preflight and get explicit user approval for RLS/policy/migration changes.
- [ ] Redesign `profiles` access so authenticated users cannot directly select all profile rows including `email`; use own-row policies plus a public profile view/RPC for public fields.
- [ ] Add RLS policies for `module_collections` and `module_collection_entries`; keep SECURITY DEFINER RPC checks as a convenience layer, not the only guard.
- [ ] Increase future private/share `public_id` token length to 24+ base64url characters and add a rotation/regeneration path for shared links.
- [ ] Replace backend `.select('*')` calls on standards/tags with explicit column lists.

### Browser and runtime hardening

- [ ] Remove `unsafe-inline` from `script-src` in CSP, using nonces/hashes only if inline scripts are truly required.
- [ ] Revisit `bypassSecurityTrustHtml` in the keyword highlight pipe; prefer sanitizer-backed output or structured rendering so future refactors do not accidentally bypass escaping.
- [ ] Redact client/SSR logs so UUIDs, raw errors, and request headers are not written to production console/Sentry without scrubbing.

## Decision log

- 2026-06-17T12:03+02:00 — Captured only the important audit findings in one HIGH infra plan after checking the workflow docs: thin TODO index, detailed `plans/` file, and explicit approval required before RLS/migration work.
- 2026-06-18T09:48+02:00 — Scoped round 3 to safe repo-code remediations only: env placeholders/ignore, production build exposure, noopener, bootstrap fallback, and auth return-url normalization.
- 2026-06-18T10:15+02:00 — Removed `.env` from version control after sanitizing the local ignored copy to placeholders for `generate-env.js` compatibility, and added `.env.example` as the committed template; real credential rotation and history cleanup remain manual.
- 2026-06-18T10:20+02:00 — Chose a small auth-local `normalizeInternalReturnUrl` helper that accepts relative/same-origin app paths via `URL` normalization and falls back to `/user/area` for external, malformed, empty, or non-string values.

- 2026-06-18T10:25+02:00 — Archived safe repo-code slice after security review approval and green validation. Manual/approval-only items were split into `security-manual-approval-followups.md` and left on hold.
