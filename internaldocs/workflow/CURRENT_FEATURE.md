# Current Feature / AI RAM

> **Rules for AI agents:**
> 1. Read this file when the task is about the active in-flight feature or explicitly references the current plan.
> 2. Keep it updated - check off steps, add discoveries.
> 3. One feature at a time - archive to [COMPLETED.md](./COMPLETED.md) when done, then reset.
> 4. This file owns implementation detail; `TODO.md` owns the backlog index, `plans/` owns per-task detail.
> 5. **Every feature uses three layers** (MVP -> Structural -> Polish). Define all three before coding. Complete each
>    layer before starting the next. Layout before interactions.
> 6. **Append to the Decision log** for any non-obvious choice (library pick, data shape, fallback policy, scope cut).
>    Future agents read this to avoid relitigating settled questions.

---

## Active

### MEDIUM: Sentry — Issue Monitoring & Resolution Workflow

- **Plan:** [`plans/sentry-issue-monitoring-resolution-workflow.md`](./plans/sentry-issue-monitoring-resolution-workflow.md)
- **Status:** Staged for loop round 5 — complete the repo-owned Sentry monitoring workflow documentation/tooling slice; if live Sentry access is unavailable, document that blocker and close only the autonomous repo-owned setup.
- **Started:** 2026-06-18T10:35+02:00
- **Coordinator:** coordinator-loop

#### Layer checklist

- [ ] MVP — Create a concrete Sentry triage workflow/checklist and identify available local/MCP access constraints.
- [ ] Structural — Add any safe repo-owned helper/check documentation that future agents can run without exposing credentials.
- [ ] Polish — Validate docs/lint as applicable, archive if live issue resolution is blocked by external Sentry access.

#### Decision log

- 2026-06-18T10:35+02:00 — Staged after dev-utils merge. Higher-priority remaining items need schema/RLS approval, credentials, or blocked dependencies; this Sentry plan has an autonomous repo-owned workflow slice even if live issue resolution requires external access.
