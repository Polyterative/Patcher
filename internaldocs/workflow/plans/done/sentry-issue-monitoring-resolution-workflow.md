<!-- Auto-split from TODO.md by scripts/dev/split-todo.cjs. -->
<!-- Section: INFRA (independent; pick any time a product task is blocked) -->

# MEDIUM: Sentry — Issue Monitoring & Resolution Workflow

## Problem

Sentry is already integrated and collecting production/runtime errors, but Patcher does not yet have a durable, credential-safe process for reviewing issues, converting them into actionable backlog work, fixing the highest-impact defects, and closing issues only after validation. Without that process, unresolved issues can accumulate and future agents may either ignore live telemetry or risk exposing credentials while trying to inspect it.

## Goals

- Establish a repo-owned Sentry triage and resolution workflow that future agents can follow without rediscovering access rules.
- Make credential handling explicit: never print tokens, prefer Sentry MCP, and only use CLI/API fallbacks through environment variables.
- Provide a safe local helper that checks whether required Sentry environment variables are present without making network calls or exposing values.
- Split live issue audit/resolution into an on-hold follow-up when live Sentry access is not available in the current agent session.

## Assumptions

- Sentry auth may exist locally, but agents must treat it as sensitive and must not print `.sentryclirc`, environment values, CI secrets, or config-derived tokens.
- Live issue inspection should use repo-approved tooling only: Sentry MCP when available, or `sentry-cli`/API commands that reference environment variables and do not echo credentials.
- This autonomous round can complete repository documentation/tooling even if live Sentry access is blocked.
- Live issue fixes should follow the established persona flow: bug-hunter for diagnosis, executor for implementation, reviewer for independent verification.

## MVP / Structural / Polish layers

### Layer 1 — MVP

- [x] Create a concrete Sentry triage workflow/checklist.
- [x] Document credential-safe access rules and live-access blockers.
- [x] Define cadence, prioritization, issue-to-backlog handling, fix flow, and close/skip criteria.

### Layer 2 — Structural

- [x] Add a durable operations doc for future agents: [`../../../ops/SENTRY_TRIAGE.md`](../../../ops/SENTRY_TRIAGE.md).
- [x] Add a safe no-network helper script for local readiness checks: `scripts/ops/sentry-triage-check.mjs`.
- [x] Split blocked live audit/resolution work into [`sentry-live-issue-audit.md`](../sentry-live-issue-audit.md).

### Layer 3 — Polish

- [x] Update `CURRENT_FEATURE.md` with completed repo-owned checklist state and decisions.
- [x] Keep `TODO.md` thin by adding only a one-line on-hold live-audit follow-up.
- [x] Validate documentation links and script dry-run behavior.

## File-level checklist

- [x] `internaldocs/workflow/plans/sentry-issue-monitoring-resolution-workflow.md` — expand into coordinator-loop-ready plan sections.
- [x] `internaldocs/ops/SENTRY_TRIAGE.md` — add durable workflow instructions.
- [x] `scripts/ops/sentry-triage-check.mjs` — add safe local readiness helper with no network calls and no secret output.
- [x] `internaldocs/workflow/CURRENT_FEATURE.md` — update active checkboxes and Decision log.
- [x] `internaldocs/workflow/plans/sentry-live-issue-audit.md` — capture blocked live Sentry audit/resolution tasks.
- [x] `internaldocs/workflow/TODO.md` — add a thin on-hold follow-up entry.

## Acceptance criteria

- Future agents can run a documented Sentry triage workflow without reading or printing secrets.
- The workflow explains triage cadence, severity/frequency prioritization, issue-to-backlog routing, fix ownership, validation, and closing criteria.
- A local helper can verify presence/absence of expected environment variables without network access or token disclosure.
- Live issue audit/resolution is not mixed with repository setup when Sentry MCP/CLI access is unavailable; it is tracked in a separate on-hold plan.
- `node scripts/checks/check-docs.cjs` passes.

## Validation strategy

- Run `node scripts/ops/sentry-triage-check.mjs` to confirm it exits successfully without requiring tokens or network access.
- Run `node scripts/checks/check-docs.cjs` to verify links, plan Decision logs, and active feature layer structure.
- Run `pnpm lint` only if code/script changes need the broader repository lint gate; this slice changes docs plus a standalone no-dependency ops helper, so docs check plus helper execution is sufficient.

## Decision log

- 2026-06-18T10:35+02:00 — Staged after dev-utils merge. Higher-priority remaining items need schema/RLS approval, credentials, or blocked dependencies; this Sentry plan has an autonomous repo-owned workflow slice even if live issue resolution requires external access.
- 2026-06-18T10:21+02:00 — Chose `internaldocs/ops/SENTRY_TRIAGE.md` for the durable workflow because the work is operational triage rather than an Angular/backend implementation pattern.
- 2026-06-18T10:21+02:00 — Added a no-network helper that checks only environment variable presence and prints commands with `$SENTRY_*` placeholders; it deliberately does not read or display `.sentryclirc` contents.
- 2026-06-18T10:21+02:00 — Split live Sentry issue audit/resolution into an on-hold follow-up because no Sentry MCP tool is available in this session and live CLI/API access should not be attempted without safe configured credentials.

- 2026-06-18T10:40+02:00 — Archived after reviewer approval of the repo-owned workflow setup and successful helper/docs/lint validation; live issue audit remains in `sentry-live-issue-audit.md` on hold.
