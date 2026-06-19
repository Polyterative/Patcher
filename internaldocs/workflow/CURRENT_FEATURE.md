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

Patch SVG previews — preview update semantics gate

Plan: [patch-svg-previews.md](./plans/patch-svg-previews.md)
Status: **Backend/storage checkpoint committed. Product owner approved maintainer reconciliation of remote migration/typegen drift only; preview UI/data-service wiring remains blocked pending separate approval for timestamp-preservation SQL.**
Staged: 2026-06-18T22:15+02:00
Approval recorded: 2026-06-18T22:43+02:00

#### Why this is next

- Patch SVG preview storage backend is now present locally in commit `31d7242b`.
- Remote Supabase migration history is behind/divergent from local repo migrations, so applying this migration remotely or regenerating backend types is unsafe until drift is reconciled.
- Read-only trigger inspection confirmed persisting `patches.image` through a normal row update would bump `patches.updated`; generation needs an approved timestamp-preservation SQL/update strategy before UI/data-service wiring.

#### Safety gate

- Read `internaldocs/patterns/BACKEND_METHODS.md` schema-change preflight before drafting SQL.
- Product owner approved the drafted SQL/storage shape at 2026-06-18T22:43+02:00.
- Do not apply the patch preview migration remotely or run `pnpm updateBackendTypes` until the linked remote migration drift is reconciled.
- Do not wire `updatePatchPreview$` until `patches.image` update semantics are verified; stale detection depends on preserving `patches.updated` as the graph edit timestamp.

#### Layer checklist

- [x] Re-read `internaldocs/workflow/plans/patch-svg-previews.md` approval queue.
- [x] Draft exact additive `patches.image` migration and `patches` bucket/storage policy proposal.
- [x] Record maintainer approval questions clearly; stop before any remote/storage/RLS mutation.
- [x] Record product approval to apply the drafted migration/storage policy checkpoint.
- [x] Add local migration for `patches.image` and the public `patches` SVG bucket policies.
- [x] Update local types/storage constants and patch preview storage API methods.
- [x] Validate and commit the verified checkpoint.
- [ ] Reconcile linked remote migration drift or switch typegen to a project with all local migrations applied.
- [x] Verify whether updating only `patches.image` changes `patches.updated`; propose an approved RPC/update strategy if needed.
- [ ] Only then wire patch preview generation through `PatchDetailDataService`.

#### Approval queue

- **Approval requested 2026-06-18T22:17+02:00:** May the next implementation checkpoint apply the proposal-only SQL/storage shape in the plan: nullable `public.patches.image`, public `patches` SVG bucket, authenticated owner/admin write/delete policies, and link-readable preview access?
- **Approved 2026-06-18T22:43+02:00:** Apply the drafted SQL/storage shape: nullable `public.patches.image`, public `patches` SVG bucket for link-readable SVG previews, and authenticated owner/admin insert/update/delete storage policies. No unrelated RLS/policy changes are approved.
- **Remote gate 2026-06-18T22:50+02:00:** Supabase MCP inspection showed the linked remote does not yet have the recent local migration history (`manufacturer_*`, module acquisitions, taxonomy corrections). Do not run remote typegen or apply this migration remotely until migration drift is reconciled; otherwise generated types could regress local schema. Local migration is staged in the working tree for the deploy/migration pipeline.
- **Approval requested 2026-06-19T09:05+02:00:** May a maintainer reconcile the linked Supabase migration history (repair/apply drift or switch typegen to a project with all local migrations) so `pnpm updateBackendTypes` and the patch preview migration can proceed safely?
- **Approved 2026-06-19T09:05+02:00:** Product owner approved maintainer reconciliation of the linked Supabase migration/typegen drift only, so the patch preview migration and `pnpm updateBackendTypes` can proceed safely after reconciliation. This does not approve unrelated RLS/policy changes, timestamp-preservation SQL, or pushing.
- **Approval requested 2026-06-19T09:05+02:00:** May the next SQL checkpoint add an image-only timestamp-preservation strategy for `public.patches` before `updatePatchPreview$` is wired? Default: keep preview generation blocked.

#### Validation strategy

- `node scripts/checks/check-docs.cjs` after docs/proposal updates.
- No app tests required for proposal-only docs unless code is changed.

#### Decision log

- 2026-06-18T22:17+02:00 — Completed the proposal-only storage/RLS checkpoint in the plan and recorded the remaining approval question; no migrations, storage buckets, or RLS policies were applied.
- 2026-06-18T22:15+02:00 — Staged Patch SVG previews as the next safe checkpoint because the next step is proposal-only exact SQL/storage-policy drafting, not applying migrations/RLS.
- 2026-06-18T22:43+02:00 — Product owner approved applying the drafted Patch SVG preview storage/RLS checkpoint. Scope is limited to additive `patches.image`, public `patches` SVG bucket, and owner/admin storage write/delete policies; remote application remains gated on migration-drift/advisor safety.
- 2026-06-18T22:50+02:00 — Added local migration `20260618224500_add_patch_svg_previews_storage.sql`, manually patched local generated types for `patches.image`, and skipped `pnpm updateBackendTypes`/remote apply because the linked remote migration history is behind local repo migrations.
- 2026-06-18T22:55+02:00 — Reviewer approved the backend/storage checkpoint after fixing test-suite nesting and docs wording. Validation passed: targeted storage specs, `pnpm lint`, docs check, and `git diff --check`. Supabase advisors were not run because no remote DDL/RLS was applied.
- 2026-06-19T09:05+02:00 — Read-only Supabase inspection confirmed the linked remote still has local/remote migration drift, no `patches.image` column, no `patches` bucket, and `public.patches.handle_updated_auto` uses `moddatetime('updated')`; image-only updates would bump `patches.updated`. Recorded approval gates for migration reconciliation and timestamp-preservation SQL; no remote changes were applied.
- 2026-06-19T09:05+02:00 — Product owner approved maintainer reconciliation of the linked Supabase migration/typegen drift only. Timestamp-preservation SQL remains a separate pending approval gate; no unrelated RLS/policy changes or push are approved.
