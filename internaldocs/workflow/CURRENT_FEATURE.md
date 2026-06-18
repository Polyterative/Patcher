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

### Bug — Rack list image load fade

Plan: [`plans/bug-rack-list-image-load-pop-in.md`](./plans/bug-rack-list-image-load-pop-in.md)

Status: **Active — selected for loop 5.** Frontend image-load/motion fix; no backend, schema, migration, RLS, or Supabase data changes.

#### Why this is next

After the comments composer fix, this is the next bounded visible UI regression not blocked by approvals. It improves the core `/racks` browse surface and can be validated with component tests plus runtime snapshots.

#### Layer checklist

- [ ] MVP: make `<app-rack-image>` fade the bitmap in on actual load/error state instead of element insertion.
- [ ] Structural: add component regression coverage for load/reset/error state.
- [ ] Polish: preserve reduced-motion and fallback tile behavior without changing rack preview generation.

#### Validation strategy

- `pnpm test-headless --include="**/rack-image.component.spec.ts"`
- `pnpm lint`
- `node scripts/checks/check-docs.cjs`
- Runtime `/racks` snapshot if dev server is available.

#### Decision log

- 2026-06-18T18:18+02:00 — Coordinator selected this task for loop 5 as the next bounded visible UI regression after comments width; schema/RLS/manual-approval tasks remain skipped.
