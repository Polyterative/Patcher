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

### LOW: Angular — Audit migration-added eager change detection

- **Plan:** [`plans/angular-audit-migration-added-eager-change-detection.md`](./plans/angular-audit-migration-added-eager-change-detection.md)
- **Status:** Staged for next loop — audit Angular 22 migration-added `ChangeDetectionStrategy.Eager` usages, convert safe candidates to OnPush, and document cases that must stay eager.
- **Started:** 2026-06-18T09:22+02:00
- **Coordinator:** coordinator-loop

#### Layer checklist

- [ ] MVP — Inventory production and spec-only `ChangeDetectionStrategy.Eager` usages and choose safe candidates.
- [ ] Structural — Convert candidates to `OnPush` or document why they remain eager.
- [ ] Polish — Run targeted specs plus lint/build/docs checks.

#### Decision log

- 2026-06-18T09:22+02:00 — Staged after migrating the rack-image animation slice. Higher-priority open tasks remain skipped for approval/credential/tooling reasons; eager change detection audit is the next TODO-order low-risk Angular maintenance task.
