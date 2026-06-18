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

### LOW: Maintenance — Dependency deprecation audit

- **Plan:** [`plans/maintenance-dependency-deprecation-audit.md`](./plans/maintenance-dependency-deprecation-audit.md)
- **Status:** Staged for next loop — audit remaining deprecated/direct dependency warnings after the safe update batch, categorize replace/defer/accept, and remove unused deprecated packages if any are proven unused.
- **Started:** 2026-06-18T09:29+02:00
- **Coordinator:** coordinator-loop

#### Layer checklist

- [ ] MVP — Run `pnpm outdated` / deprecation inventory and identify direct deprecated packages.
- [ ] Structural — Categorize each as replace, defer, or accept; remove only proven-unused dependencies.
- [ ] Polish — Validate manifest/lock/doc changes with install, lint/build/docs checks.

#### Decision log

- 2026-06-18T09:29+02:00 — Staged after completing five requested loops. Higher-priority open tasks remain skipped for approval/credential/tooling reasons; this dependency audit is next in TODO order and follows naturally after the completed safe dependency update and Angular deprecation slices.
