<!-- Section: INFRA (independent; pick any time a product task is blocked) -->

# ON HOLD: MEDIUM: Sentry — Live Issue Audit

## Problem

The repository-owned Sentry triage workflow is documented, but live Sentry issue audit and resolution requires safe authenticated access through Sentry MCP or credentialed CLI/API commands. The current agent session does not expose a Sentry MCP tool, and credentials must not be printed or probed unsafely.

## Goals

- Audit current unresolved Sentry issues once safe live access is available.
- Categorize issues by severity, frequency, affected users, surface area, and recency.
- Resolve or backlog the highest-impact actionable issues using the workflow in [`../../operations/SENTRY_TRIAGE.md`](../../operations/SENTRY_TRIAGE.md).

## Assumptions

- This plan remains on hold until Sentry MCP is available or the owner confirms safe environment-based CLI/API access.
- Agents must not read aloud or print `.sentryclirc`, `SENTRY_AUTH_TOKEN`, CI secrets, or credential-bearing config.
- Browser-extension noise, duplicate issues, and unactionable events should be documented as skipped rather than converted into TODO entries.

## MVP / Structural / Polish layers

### MVP

- [ ] Use Sentry MCP, or safe environment-variable CLI/API access, to list unresolved production issues.
- [ ] Categorize the top issues by severity/frequency/user impact and identify the highest-impact actionable item.

### Structural

- [ ] Create or update focused backlog plans for actionable issues that cannot be fixed immediately.
- [ ] Apply the bug-hunter → executor → reviewer workflow for any selected fix.

### Polish

- [ ] Validate fixes locally and after deployment where applicable.
- [ ] Resolve, merge, or skip Sentry issues only after the validation/closing checklist is satisfied.

## File-level checklist

- [ ] Sentry MCP / environment — confirm safe live access without printing secrets.
- [ ] Sentry issue list — record metadata, not tokens or sensitive payloads.
- [ ] `internaldocs/workflow/TODO.md` — add only thin one-line entries for actionable follow-up plans.
- [ ] Relevant fix plan(s) — add Decision log entries for triage and root-cause decisions.

## Acceptance criteria

- Current unresolved Sentry issues are audited with no credential leakage.
- At least the highest-impact actionable issue is fixed or converted into a focused backlog plan.
- Skipped issues have a documented reason such as duplicate, third-party noise, no recent events, or insufficient evidence.
- Sentry closing actions happen only after deployment/validation or confirmed duplicate/noise status.

## Validation strategy

- Start with `node scripts/ops/sentry-triage-check.mjs` to verify local readiness without network calls.
- Use the checklist in [`../../operations/SENTRY_TRIAGE.md`](../../operations/SENTRY_TRIAGE.md) for live access, triage, fixing, validation, and closing.
- Run targeted code tests for any fix, then broader `pnpm lint` / `pnpm test-headless` when the changed surface warrants it.

## Decision log

- 2026-06-18T10:21+02:00 — Split from `sentry-issue-monitoring-resolution-workflow.md` because repository workflow setup is complete, while live audit/resolution is blocked on safe Sentry MCP or environment-based authenticated access.
