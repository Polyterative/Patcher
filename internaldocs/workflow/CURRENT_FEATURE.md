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

No active feature.

### Next-task staging decision

- 2026-06-18T10:30+02:00 — Round 1 selected `module-public-possession-statistics-trend-charts` because its Phase 1 query path exists but the public detail rendering/coverage still needs completion; Phase 2 is schema-approval blocked.
- 2026-06-18T10:34+02:00 — Implemented the Phase 1 stat row in `app-module-details`, passing counts from the detail data service through `app-module-composite`; removed the heavier Community data card so sub-threshold cohorts cannot leak through a second rendering path.
- 2026-06-18T10:40+02:00 — Round 1 completed and archived. Round 2 / 5 checked the remaining backlog and selected no task: all remaining open items are blocked by explicit Supabase/RLS/schema approval, credential/account setup, external service access, product-owner validation, or prerequisite manufacturer-account work.
