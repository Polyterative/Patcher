#### HIGH: Rack module orientation — 3U flip (180°)

**Status:** DONE — implemented 2026-07-17.

**Why:** Some 3U modules are physically useful upside-down in a rack. The rack editor
needs this as placement-instance state so one placed copy can flip without changing the
catalogue module or any other placement.

**Scope:**

- 3U Eurorack standards `0` and `1000` only.
- Orientation is stored on `rack_modules.orientation`, not on modules.
- Supported values are `normal` and `rot180`; fallback/default is `normal`.
- 1U, tile, and arbitrary rotation are intentionally excluded.

**Behaviour:**

- Editable owner rack placements can toggle eligible 3U modules from the desktop
  context menu or touch action grid.
- Non-3U, read-only, non-owner, and unsynced placements do not show the action.
- The physical module/panel surface rotates 180 degrees; overlays, action chrome,
  selection outlines, and readouts remain upright.
- Drag previews and public/patch linked-rack previews honor persisted orientation
  without exposing controls.
- Existing rack operations preserve orientation, and existing rows default to normal.

**Implementation notes:**

- Added an additive Supabase migration for `rack_modules.orientation text not null
  default 'normal'` with a check constraint for `normal` / `rot180`.
- No RLS, policy, grant, or production-release changes were made.
- Backend reads and inserts thread orientation through `SupabaseService`; existing
  placement batch updates intentionally leave orientation untouched so layout/panel
  saves cannot overwrite the targeted orientation update helper.
- Rack editor data service owns the toggle pipeline with in-flight write protection,
  optimistic local state, rollback/error snackbar, refresh restoration, and one
  `rack_module_orientation_flipped` PostHog event per successful user action.
- Shared orientation helpers live in `src/app/models/rack.ts` to avoid scattered
  string literals.

**Validation:**

- Targeted unit suite passed for Supabase mapping/payload/cache behaviour, rack data
  toggle eligibility, editor action presentation, module rendering, and patch preview
  propagation.
- `pnpm lint` passed.
- Runtime screenshots were captured for desktop and touch widths. Persisted
  authenticated rack-editor screenshots were blocked because local e2e credentials and
  a usable local Supabase anon environment were unavailable; a focused Playwright
  visual harness confirmed the orientation-specific physical-surface rotation,
  upright overlays/chrome, and drag-preview orientation.

---

## Decision log

- 2026-07-17 — The canonical plan file was missing in this worktree, so the parent
  delegation prompt was treated as the authoritative implementation plan.
- 2026-07-17 — Stored orientation on `rack_modules` as an extensible string union
  (`normal` / `rot180`) so the value belongs to a placement and remains compatible with
  possible future orientation variants.
- 2026-07-17 — Used an additive column default and check constraint without an
  UPDATE/backfill loop to avoid resetting existing `updated` timestamps.
- 2026-07-17 — Did not invent a feature flag because no appropriate existing flag
  controlled rack-editor write affordances; persisted orientation is read/rendered
  everywhere once the column exists.
- 2026-07-17 — Kept public/read-only and patch-editor surfaces render-only while
  exposing the toggle only in editable owner rack contexts.
- 2026-07-19 — Storage review found that the extensibility goal was correct but the
  physical representation was not: a checked text column is unnecessarily verbose for
  a compact finite state. Follow-up
  [`rack-module-orientation-smallint-storage-migration.md`](../rack-module-orientation-smallint-storage-migration.md)
  will migrate persistence to `smallint` (`0` normal, `1` rot180) while preserving
  semantic names at the TypeScript boundary.
