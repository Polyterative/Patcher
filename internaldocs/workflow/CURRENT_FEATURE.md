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

### LOW: Angular — Replace deprecated Flex Layout

- **Plan:** [`plans/angular-replace-deprecated-flex-layout.md`](./plans/angular-replace-deprecated-flex-layout.md)
- **Status:** Staged for next loop — replace a coherent slice of deprecated `@angular/flex-layout` usage with native CSS/layout helpers, starting from small shared atoms and rack-image surfaces.
- **Started:** 2026-06-18T09:03+02:00
- **Coordinator:** coordinator-loop

#### Layer checklist

- [ ] MVP — Inventory current `@angular/flex-layout` imports/templates and choose a small removable slice.
- [ ] Structural — Replace the selected slice with native CSS/flex/grid while preserving responsive behavior.
- [ ] Polish — Add or update focused tests where behavior can regress and run targeted validation plus lint.

#### Decision log

- 2026-06-18T09:03+02:00 — Staged after completing the safe dependency batch. Higher-priority open tasks remain skipped for explicit approval/credential/tooling reasons; among remaining LOW Angular maintenance tasks, Flex Layout appears first in TODO order and can be advanced through a scoped non-schema code slice.
