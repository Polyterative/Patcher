<!-- Section: INFRA (independent; pick any time a product task is blocked) -->

# ON HOLD: HIGH: Security — Manual Approval Follow-ups

## Problem

The safe repository-code security hardening slice is complete, but several audit findings require human credential rotation, external service access, production deployment coordination, Supabase approval, or history rewriting before they can be executed safely.

## Goals

- Keep manual security follow-ups visible without blocking autonomous code-only backlog loops.
- Require explicit user approval before any Supabase RLS/policy/migration work.
- Require credential rotation and history-cleanup coordination before any push that relies on sanitized env history.

## Assumptions

- Agents may inspect and propose, but must not rotate credentials, rewrite shared history, apply RLS/policy/migration changes, or change production CSP autonomously.
- This plan remains on hold until the user explicitly resumes one of the manual workstreams.

## MVP / Structural / Polish layers

### MVP

- [ ] Rotate the E2E test account password and replace personal/shared test account usage with a dedicated test account.
- [ ] Coordinate `.env` history cleanup (`git filter-repo`/BFG + force-push) before pushing sanitized history.
- [ ] Rotate the local Sentry token if `.sentryclirc` contains an active token; keep Sentry auth in `SENTRY_AUTH_TOKEN` via local shell/CI secrets.

### Structural

- [ ] Add secret-scanning prevention for future commits, either via GitHub secret scanning, gitleaks/detect-secrets, or a pre-commit check.
- [ ] Get explicit approval, then redesign `profiles` access and add missing RLS policies for module collections.
- [ ] Increase future private/share `public_id` token length and add a rotation/regeneration path.
- [ ] Replace backend `.select('*')` calls on standards/tags with explicit column lists.

### Polish

- [ ] Remove `unsafe-inline` from `script-src` in deployed CSP using nonces/hashes only if inline scripts are truly required.
- [ ] Revisit `bypassSecurityTrustHtml` in keyword highlighting and prefer sanitizer-backed/structured rendering.
- [ ] Redact client/SSR logs so UUIDs, raw errors, and request headers are not written to production console/Sentry without scrubbing.

## File-level checklist

- [ ] Production secrets / GitHub Actions secrets — rotate outside the repo.
- [ ] Supabase policies/RLS — inspect and apply only with explicit user approval.
- [ ] Deployment CSP config — coordinate with hosting configuration.
- [ ] Backend query helpers — update explicit select lists in a normal code slice.

## Acceptance criteria

- Manual credential/history work is complete and confirmed by the owner.
- Any Supabase RLS/policy/migration changes have explicit user approval and generated types are refreshed when applicable.
- Production deployment security settings are validated after rollout.

## Validation strategy

- Credential/history work: owner confirmation plus clean secret scan.
- Supabase work: read preflight in `internaldocs/patterns/BACKEND_METHODS.md`, approved migration/RLS review, `pnpm updateBackendTypes`, `pnpm lint`.
- Browser/runtime hardening: targeted unit tests, `pnpm lint`, and deployment smoke checks.

## Decision log

- 2026-06-18T10:25+02:00 — Split from `security-audit-remediation.md` after completing the autonomous safe repo-code slice; kept on hold because remaining items require human approval, external credentials, production deployment, or shared-history coordination.
