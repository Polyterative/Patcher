<!-- Auto-split from TODO.md by scripts/split-todo.cjs. -->
<!-- Section: INFRA (independent; pick any time a product task is blocked) -->

#### MEDIUM: Bug — Rack Preview Not Loading / Updating on Specific Rack

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

**Implementation (next agent):**

- [x] Inspect the "Update preview" flow in `rack-detail-data.service.ts:351-394` and
      `supabase-storage.ts:54-87` — found that preview uploads/deletes could complete before a
      failed `update.rack(...)` surfaced, leaving `racks.image` stale.
- [x] Fix: ensure `backend.update.rack({ id, image: newFilename })` (or the equivalent
      single-column update) runs after upload succeeds, before the storage delete of the old
      object — so a failure to persist the column doesn't orphan the new object.
- [x] Add a unit test: "Update preview persists the new filename to `racks.image`".
- [x] Data repair for this rack (and any other affected racks): write a one-off query — list
      racks whose `racks.image` references a non-existent storage object, and for each, either
      find the latest matching `<id>_*.jpeg` in storage and update the column, or null it out
      with a flag for re-generation. Run with explicit user approval per AGENTS.md §5.
- [ ] Optional follow-up (separate task): auto-refresh preview on rack/module edits instead of
      requiring the manual button.

---

## Decision log

<!-- Append timestamped one-liners as the plan progresses. -->

