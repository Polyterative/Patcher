<!-- Section: INFRA (independent; pick any time a product task is blocked) -->

#### HIGH: Security — Audit Remediation

**Why:** A read-only audit on 2026-06-17 found no clear malware injection indicators, but it did identify credential hygiene, production source exposure, dependency, and Supabase/RLS issues that should be fixed before lower-priority feature work.

**Scope:** Remediate the important security findings from the audit. Do not bundle unrelated refactors, product changes, or schema/RLS writes without explicit approval.

## Emergency / credential hygiene

- [ ] Rotate the E2E test account password and replace any personal/shared test account usage with a dedicated test account.
- [ ] Treat tracked `.env` values as exposed: replace committed `.env` with placeholders or `.env.example`, add `.env` itself to `.gitignore`, and coordinate history cleanup (`git filter-repo`/BFG + force-push) before pushing.
- [ ] Rotate the local Sentry token if `.sentryclirc` contains an active token; keep Sentry auth in `SENTRY_AUTH_TOKEN` via local shell/CI secrets, not a repo file.
- [ ] Add secret-scanning prevention for future commits, either via GitHub secret scanning, gitleaks/detect-secrets, or a pre-commit check.

## Build and supply chain

- [ ] Disable public production source maps and named chunks in `angular.json`; if Sentry needs maps, upload them privately and remove `.map` files from deploy output.
- [ ] Upgrade/pin `ws >= 8.21.0` to clear the production Supabase realtime vulnerability path.
- [ ] Update Angular build tooling enough to pull fixed `vite`/`esbuild` versions; rerun `pnpm audit`, `pnpm lint`, and targeted tests after the dependency changes.
- [ ] Remove stale/duplicated dependency override configuration if it no longer affects pnpm, keeping the authoritative overrides in one place.

## Supabase and access control

- [ ] Before any database work, reread `internaldocs/patterns/BACKEND_METHODS.md` schema/RLS preflight and get explicit user approval for RLS/policy/migration changes.
- [ ] Redesign `profiles` access so authenticated users cannot directly select all profile rows including `email`; use own-row policies plus a public profile view/RPC for public fields.
- [ ] Add RLS policies for `module_collections` and `module_collection_entries`; keep SECURITY DEFINER RPC checks as a convenience layer, not the only guard.
- [ ] Increase future private/share `public_id` token length to 24+ base64url characters and add a rotation/regeneration path for shared links.
- [ ] Replace backend `.select('*')` calls on standards/tags with explicit column lists.

## Browser hardening

- [ ] Centralize a safe internal redirect helper for login/signup `returnUrl`; only accept normalized same-origin app paths and fall back to `/user/area`.
- [ ] Add `rel="noopener noreferrer"` to all `target="_blank"` links, including footer and ProductHunt surfaces.
- [ ] Remove `unsafe-inline` from `script-src` in CSP, using nonces/hashes only if inline scripts are truly required.
- [ ] Replace the bootstrap error fallback `innerHTML` + inline `onclick` with DOM APIs.
- [ ] Revisit `bypassSecurityTrustHtml` in the keyword highlight pipe; prefer sanitizer-backed output or structured rendering so future refactors do not accidentally bypass escaping.
- [ ] Redact client/SSR logs so UUIDs, raw errors, and request headers are not written to production console/Sentry without scrubbing.

---

## Decision log

- 2026-06-17T12:03+02:00 — Captured only the important audit findings in one HIGH infra plan after checking the workflow docs: thin TODO index, detailed `plans/` file, and explicit approval required before RLS/migration work.
