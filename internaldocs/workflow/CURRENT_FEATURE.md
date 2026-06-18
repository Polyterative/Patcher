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

### LOW: Dev utils — "Merge into target module" action

- **Plan:** [`plans/dev-utils-merge-into-target-module.md`](./plans/dev-utils-merge-into-target-module.md)
- **Status:** Staged for loop round 4 — implement the dev-only duplicate module merge action without schema/RLS changes or raw SQL.
- **Started:** 2026-06-18T10:25+02:00
- **Coordinator:** coordinator-loop

#### Layer checklist

- [ ] MVP — Add safe backend merge orchestration for common reference tables and abort on patch-port/instance blockers.
- [ ] Structural — Wire module-detail data service and dev-utils inline form with cache/error handling.
- [ ] Polish — Add focused tests, reviewer pass, lint/docs validation, and archive.

#### Decision log

- 2026-06-18T10:25+02:00 — Staged after the security safe-code slice. Higher-priority remaining items are blocked by credentials, explicit Supabase approval, or external services; this dev-only tool has a detailed no-migration plan and is actionable in repo code.
