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

### Bug — Comments composer input width

Plan: [`plans/bug-comments-composer-input-narrow-width.md`](./plans/bug-comments-composer-input-narrow-width.md)

Status: **Active — selected for loop 4.** Pure component-level SCSS/spec visual polish; no backend, schema, migration, RLS, or Supabase data changes.

#### Why this is next

The HIGH actionable rack regressions are complete. Remaining HIGH/product tasks are blocked by manual schema/RLS approval or upstream dependencies; this comments composer bug is the next visible, bounded, non-schema backlog item with a clear plan and regression-test path.

#### Layer checklist

- [ ] MVP: make the Add a comment textarea/form-field fill the comments rail on desktop and stay contained on mobile.
- [ ] Structural: add regression coverage for composer field width without global form primitive regressions.
- [ ] Polish: verify submit row/autosize/clear button remain visually coherent.

#### Validation strategy

- `pnpm test-headless --include="**/comments-root.component.spec.ts"`
- `pnpm lint`
- `node scripts/checks/check-docs.cjs`
- Runtime snapshot with `scripts/dev/agent-snapshot.mjs` if dev server is available.

#### Decision log

- 2026-06-18T18:05+02:00 — Coordinator selected this task for loop 4 as the next bounded visible UI regression not blocked by schema/RLS/manual approval.
