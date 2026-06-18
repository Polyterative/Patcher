<!-- Auto-split from TODO.md by scripts/dev/split-todo.cjs. -->
<!-- Section: INFRA (independent; pick any time a product task is blocked) -->

#### MEDIUM: Bug — Rack Preview Not Loading / Updating on Specific Rack

## Problem

**Why:** Repro case: `http://localhost:5556/racks/TSHX38-bjQJS` — the rack preview image does not
load and does not refresh after edits.

**Investigation completed 15-05-2026 (confidence: HIGH, root cause confirmed against live DB):**

- The bug is **NOT data-specific to this rack** — it's a systemic regression in the
  "Update preview" persistence flow.
- DB row for `public_id = 'TSHX38-bjQJS'` (id=336):
  - `racks.image` column: `336_2024-10-2813-20-39290.jpeg` (stale)
  - Actual storage object in bucket `racks`: `336_2026-05-1509-54-15073.jpeg` (uploaded today
    2026-05-15 09:54 — user clicked "Update preview")
  - Direct HTTP GET of the `racks.image` value → **404 Object not found**
- Root cause: the "Update preview" flow uploads a new object + deletes the old one, but **does
  not write the new filename back to `racks.image`**. Likely a missing `update.rack({ image })`
  call after the storage upload completes, or a silent error in that call.
- Preview generation is **manual-only** (the editor's "Update preview" button) — no automatic
  refresh on rack/module edits. That's a separate, deferred concern.
- Render path: `RackImageComponent` reads `data.image`, prefixes `StorageUrls.racks`, no
  fallback. (`src/app/components/rack-parts/rack-image/`)
- Upload path: `src/app/features/backend/supabase-storage.ts:54-87` + trigger in
  `rack-detail-data.service.ts:351-394`.

## Goals

- Keep the already-completed persistence fix intact: a generated preview must persist the uploaded
  filename to `racks.image`.
- Finish the code-only follow-up by making the UI expose stale previews after rack edits, so users
  know when to refresh the manual JPEG preview.
- Avoid Supabase schema, RLS, policy, migration, or destructive data repair work without explicit
  human approval.

## Assumptions

- The remaining actionable scope is the optional code-only stale-preview follow-up; live DB repair
  stays out of scope.
- `rack.updated` is the best available freshness signal for edits that can make a generated preview
  out of date.
- Legacy preview filenames that do not encode a timestamp cannot be reliably classified as stale.

## Layers

### MVP

- [ ] Reconcile the existing persistence fix with the remaining optional auto-refresh/stale-preview
      behavior.
- [ ] Keep manual preview generation as-is; do not add automatic storage writes on rack edits.

### Structural

- [ ] Implement a scoped code-only stale-preview signal that avoids schema, RLS, policy, migration,
      or destructive data changes.
- [ ] Ensure the signal resets once the refreshed preview filename is reflected locally.

### Polish

- [ ] Add focused coverage for preview freshness behavior.
- [ ] Validate the touched rack-image / rack-detail tests plus lint and docs checks.

## File-level checklist

- [x] `src/app/components/rack-parts/rack-image/rack-image.component.ts`
- [x] `src/app/components/rack-parts/rack-image/rack-image.component.html`
- [x] `src/app/components/rack-parts/rack-image/rack-image.component.scss`
- [x] `src/app/components/rack-parts/rack-image/rack-image.component.spec.ts`
- [x] `src/app/components/rack-parts/rack-detail-data.service.media-duplicate.spec.ts`
- [x] `internaldocs/workflow/CURRENT_FEATURE.md`

## Acceptance criteria

- [x] A rack preview whose encoded filename timestamp predates `rack.updated` is surfaced as stale
      in the UI.
- [x] Missing or legacy filenames do not produce false stale warnings.
- [x] A successful manual preview update persists the filename and refreshes local rack state.
- [x] No Supabase schema/RLS/policy/migration/destructive data changes are made.

## Validation strategy

- `pnpm test-headless --include="**/rack-image.component.spec.ts"`
- `pnpm test-headless --include="**/rack-detail-data.service.media-duplicate.spec.ts"`
- `pnpm lint`
- `node scripts/checks/check-docs.cjs`

## Completed implementation notes

- [x] Inspect the "Update preview" flow in `rack-detail-data.service.ts:351-394` and
      `supabase-storage.ts:54-87` — found that preview uploads/deletes could complete before a
      failed `update.rack(...)` surfaced, leaving `racks.image` stale.
- [x] Fix: ensure `backend.update.rack({ id, image: newFilename })` (or the equivalent
      single-column update) runs after upload succeeds, before the storage delete of the old
      object — so a failure to persist the column doesn't orphan the new object.
- [x] Add a unit test: "Update preview persists the new filename to `racks.image`".

## Out of scope without explicit approval

- [x] Data repair for this rack (and any other affected racks): write a one-off query — list
      racks whose `racks.image` references a non-existent storage object, and for each, either
      find the latest matching `<id>_*.jpeg` in storage and update the column, or null it out
      with a flag for re-generation. Run with explicit user approval per AGENTS.md §5.

---

## Decision log

<!-- Append timestamped one-liners as the plan progresses. -->

- 2026-06-18T08:49+02:00 — Completed the code-only follow-up by treating generated preview filenames as UTC timestamps and keeping the stale update affordance visible even when the stored image fails to load.
