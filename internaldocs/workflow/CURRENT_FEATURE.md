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

Patch SVG previews — proposal-only storage/RLS checkpoint

Plan: [patch-svg-previews.md](./plans/patch-svg-previews.md)
Status: **Staged for next coordinator-loop. Do not apply storage/RLS/migrations autonomously.**
Staged: 2026-06-18T22:15+02:00

#### Why this is next

- Marketplace Purchase Price History MVP implementation is complete in repo and archived.
- Patch SVG previews already has backend/storage direction and simple visibility decisions recorded, but its plan still requires an exact migration/storage-policy proposal checkpoint before maintainer approval to apply anything.
- This next slice can safely draft/review exact SQL and storage policy text without mutating production.

#### Safety gate

- Read `internaldocs/patterns/BACKEND_METHODS.md` schema-change preflight before drafting SQL.
- Do not apply migrations, create buckets, or change storage/RLS policies. Draft exact SQL/policy only and record any approval question in the plan.

#### Layer checklist

- [x] Re-read `internaldocs/workflow/plans/patch-svg-previews.md` approval queue.
- [x] Draft exact additive `patches.image` migration and `patches` bucket/storage policy proposal.
- [x] Record maintainer approval questions clearly; stop before any remote/storage/RLS mutation.

#### Approval queue

- **Approval requested 2026-06-18T22:17+02:00:** May the next implementation checkpoint apply the proposal-only SQL/storage shape in the plan: nullable `public.patches.image`, public `patches` SVG bucket, authenticated owner/admin write/delete policies, and link-readable preview access?

#### Validation strategy

- `node scripts/checks/check-docs.cjs` after docs/proposal updates.
- No app tests required for proposal-only docs unless code is changed.

#### Decision log

- 2026-06-18T22:17+02:00 — Completed the proposal-only storage/RLS checkpoint in the plan and recorded the remaining approval question; no migrations, storage buckets, or RLS policies were applied.
- 2026-06-18T22:15+02:00 — Staged Patch SVG previews as the next safe checkpoint because the next step is proposal-only exact SQL/storage-policy drafting, not applying migrations/RLS.
