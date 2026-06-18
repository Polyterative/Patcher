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

### LOW: Angular — Migrate deprecated animations package usage

- **Plan:** [`plans/angular-migrate-deprecated-animations-package-usage.md`](./plans/angular-migrate-deprecated-animations-package-usage.md)
- **Status:** Staged for next loop — inventory Angular animation triggers and migrate simple enter/leave cases where current primitives are safe; defer complex animation-package dependencies if needed.
- **Started:** 2026-06-18T09:10+02:00
- **Coordinator:** coordinator-loop

#### Layer checklist

- [ ] MVP — Inventory `@angular/animations` imports/triggers and classify simple vs complex usages.
- [ ] Structural — Migrate simple enter/leave usage or document blockers for cases that cannot safely move yet.
- [ ] Polish — Run targeted animation/component tests plus lint/build/docs checks.

#### Decision log

- 2026-06-18T09:10+02:00 — Staged after completing Flex Layout removal. Higher-priority open tasks remain skipped for approval/credential/tooling reasons; among remaining LOW Angular maintenance tasks, animation deprecation is next in TODO order and can be approached as a code-only migration/audit.
