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

### Bug — Rack module sizing and analysis-overlay regressions

Plan: [`plans/bug-new-modules-stretched-vertically-in-mixed-format-row.md`](./plans/bug-new-modules-stretched-vertically-in-mixed-format-row.md)

Status: **Active — selected for loop 3.** Frontend-only rack visual/blank/analysis overlay regression work; no backend, schema, migration, RLS, or Supabase data changes.

#### Why this is next

After the arrangement-count regression, this is the remaining HIGH actionable INFRA bug that is not blocked by manual approval. It is production-visible rack accuracy work and should land before screenshot refresh so generated docs do not capture stretched modules or leaked analysis overlays.

#### Layer checklist

- [ ] MVP: prevent module-realistic hosts from stretching in rack rows and patch/editor contexts.
- [ ] Structural: add regression tests for natural module heights, quick-blank majority standard, and analysis-overlay gating.
- [ ] Polish: document/finalize alignment/fallback decisions without redesigning mixed-format rows.

#### Validation strategy

- `pnpm test-headless --include="**/rack-visual-model.component.spec.ts"`
- `pnpm test-headless --include="**/module-realistic.component.spec.ts"`
- Targeted quick-blank / rack-editor spec found during implementation
- `pnpm lint`
- `node scripts/checks/check-docs.cjs`

#### Decision log

- 2026-06-18T17:35+02:00 — Coordinator selected this task for loop 3 as the highest-priority actionable backlog item after the count fix; schema/RLS/manual-approval tasks remain skipped.
