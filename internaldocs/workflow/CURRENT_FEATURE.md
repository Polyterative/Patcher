# Current Feature / AI RAM

> **Rules for AI agents:**
> 1. Read this file when the task is about the active in-flight feature or explicitly references the current plan.
> 2. Keep it updated — check off steps, add discoveries.
> 3. One feature at a time — archive to [COMPLETED.md](./COMPLETED.md) when done, then reset.
> 4. This file owns implementation detail; `TODO.md` owns the backlog index, `plans/` owns per-task detail.
> 5. **Every feature uses three layers** (MVP → Structural → Polish). Define all three before coding. Complete each layer before starting the next. Layout before interactions.
> 6. **Append to the Decision log** for any non-obvious choice (library pick, data shape, fallback policy, scope cut). Future agents read this to avoid relitigating settled questions.

---

## Active

### Bug — Rack layout arrangement count is sometimes negative / overflowed

Plan: [`plans/bug-rack-layout-arrangement-count-negative-or-overflowed.md`](./plans/bug-rack-layout-arrangement-count-negative-or-overflowed.md)

Status: **Active — selected for loop 2.** Pure frontend numeric/display hardening; no backend, schema, migration, RLS, or Supabase data changes.

#### Why this is next

The completed multi-instance E2E work unblocks the auth patch regression suite. The remaining HIGH product tasks are blocked by schema/RLS/manual approval or upstream dependencies; this rack-analysis bug is HIGH, production-visible, bounded to frontend utilities/editor copy plus specs, and requires no manual approval.

#### Layer checklist

- [ ] MVP: reproduce/fixture the high-cardinality sampled-count class and prevent negative/NaN/Infinity counts.
- [ ] Structural: encode exact/estimated/capped count handling in typed helpers and focused regression tests.
- [ ] Polish: keep user copy honest about exact vs sampled/capped values without redesigning the panel.

#### Validation strategy

- `pnpm test-headless --include="**/rack-layout-analysis.utils.spec.ts"`
- `pnpm test-headless --include="**/rack-editor.component.spec.ts"`
- `pnpm lint`
- `node scripts/checks/check-docs.cjs`

#### Decision log

- 2026-06-18T17:15+02:00 — Coordinator selected this task for loop 2 because it is the next highest-priority actionable item not blocked by schema/RLS/manual approval and is bounded to frontend numeric/display hardening with regression tests.
