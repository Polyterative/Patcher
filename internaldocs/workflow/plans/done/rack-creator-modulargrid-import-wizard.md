<!-- Section: PRODUCT — Tier 0 (ship in any order; no external dependencies) -->

# Rack Creator — ModularGrid Import Wizard

## Status

- [x] Completed in commit `1b251849`. Inline rack-creator import UI, pure parser/matcher helpers, ambiguous resolution, existing rack/rack-module writes, and focused regressions shipped. No schema, RLS, migration, release, push, or production-state change.
- Priority: **MEDIUM**
- TODO section: **PRODUCT — Tier 0** (additive frontend + existing backend surface; no dependency on manufacturer verification, marketplace, or price hub).
- Owner persona on pickup: `coordinator-loop` → `planner` → `frontend-dev`. A `designer` micro-brief is required before implementation for the toggle + wizard placement inside the rack creation dialog.

**Why:** Rack creation from scratch is the slowest onboarding step for users who already have a documented rack elsewhere.
ModularGrid is the de-facto competitor database and many prospective Patcher users maintain their real rack there. Letting
those users paste a ModularGrid export and land in Patcher with a mostly-correct rack shortens time-to-value dramatically
without requiring any ModularGrid API relationship (which is not available anyway — the JSON export is a Unicorn/paying-user
feature).

## User intent

> "I already have my rack in ModularGrid. Let me import it into Patcher without re-adding every module by hand."

Concretely:

- In the existing rack creation dialog, add a small toggle at the end labeled **"Import from ModularGrid"** (or equivalent).
- When enabled, reveal an inline import section (no separate dialog) where the user pastes JSON exported from their
  ModularGrid Unicorn account.
- Copy must clearly say: **"Requires JSON exported from a ModularGrid Unicorn account."** No pretense of universal support.
- While the JSON is missing or invalid, the rack **Create** button stays disabled — the import gates creation.
- When the JSON parses and matches the expected shape, show an inline **preview / estimate** of what will be imported
  (rack size, matched count, likely-match count, ambiguous count, unmatched count).
- On Create, the dialog creates the rack **and** the matched `rack_modules` in a single flow through the existing
  `SupabaseService` layer.

## Product / roadmap fit

- Fits **PRODUCT — Tier 0**: additive to an existing surface, no external service or new schema.
- Reinforces Patcher's positioning as the tool where you actually **do** rack work (patches, IO, planning), not just catalogue it.
  Making migration off ModularGrid trivial is directly aligned with `product/PRINCIPLES.md` (Patcher is a tool, not a
  social/collection scoreboard).
- Complements — does not depend on — future manufacturer-verification and marketplace tiers; imported racks flow into the
  same `racks` / `rack_modules` surfaces those tiers already consume.
- Does not touch `ROADMAP.md`; capture the roadmap alignment here per persona spec.

## Current system analysis

Relevant surfaces and files (confirmed to exist in this checkout):

- `src/app/components/rack-parts/rack-creator/rack-creator.component.ts` (+ `.html`, `.scss`, `.types.ts`) — the rack creation UI to extend.
- `src/app/components/rack-parts/rack.module.ts` — module registration for rack UI.
- `src/app/components/rack-parts/rack-detail-data.service.ts` — owner of the rack add/edit flows; the ModularGrid import
  logic should be reachable through a co-located `*-data.service.ts` sibling of the wizard section, not the container.
- `src/app/features/backend/supabase.service.ts` — namespaced backend entrypoint. All writes must go through it.
- `src/app/features/backend/supabase-add.ts` — already exposes:
  - `add.rack(data)`
  - `add.rackModule(moduleId, rackid, row?, column?)`
- `src/app/features/backend/supabase-get.ts` — `get.rackedModules(rackid)` uses `row` then `column`, mapping into
  `RackingData { rackid, moduleid, row, column, selectedPanelId }`.
- `src/app/features/backend/DatabaseStrings.ts` — must be checked before any new query is added; not expected to change
  for this feature (existing tables are sufficient).
- `src/app/models/rack.ts` — `RackingData` (rackid, moduleid, row, column, selectedPanelId) and `RackMinimal` (name,
  description, hp, rows, public, locked, ...).
- `src/app/models/module.ts` — module fields: `id`, `name`, `hp`, `manufacturer`, `standard`, joined panels/IO.
- `src/backend/database.types.ts` — `rack_modules` (moduleid, rackid, row, column, selected_panel_id) and `racks`
  (authorid, name, description, hp, rows, public).

Constraints and gotchas observed:

- Patcher and ModularGrid have **independent module ID spaces**. Empirically, 16/101 unique MG IDs collided with Patcher
  IDs and many were unrelated. **ID-based matching is invalid** and must not be used, even as a "boost".
- ModularGrid rows and columns are **1-based**. Patcher `rack_modules.row`/`column` in current utilities are treated
  **0-based**. Conversion must be explicit and unit-tested.
- ModularGrid JSON does not include: `manufacturer`, explicit `HP`, power, depth, tags, IO, or panel metadata. The only
  reliable per-module signals are `name` and (indirectly) inferred HP from column deltas.
- Inferred HP: sort modules within a row by `col`, subtract from the next module's `col`; for the last module in a row use
  `Rack.te + 1 - col`. Useful for dense rows; noisy for sparse rows and 1U blank rows.
- The `Rack.rows1u` field is a PHP-serialized string flagging which rows are 1U. The wizard must parse it defensively
  (regex extraction of integers is sufficient; do not `unserialize` blindly).
- Empirical prototype results on the sample export (`KARMA_COMA_Spares.json`, 108 module instances, 101 unique MG IDs):
  - normalized-name matching → 97/108 instances found candidates
  - normalized-name + inferred HP → 89/108 resolved to exactly one Patcher module
  - 8 remained ambiguous, 11 lacked exact-name match → alias/token/fuzzy pass needed
  - blanks require their own bucket (do not create fake modules for them)
- Examples that need alias/token/fuzzy support:
  - `Pamela's NEW Workout` → `ALM017 - Pamela's NEW Workout`
  - `Optomix rev2 2016` → `Optomix rev2`
  - `Varigate 8+ Black & Gold Panel` → `Varigate 8+`
  - `AI008 Matrix Mixer Black` → `AI008 Matrix Mixer` / `AI008 Eurorack Matrix Mixer`
  - `6x MIX - black` → `6x MIX`
  - `dual xfade_black` → `dual xfade`
  - `MMM VCF - black` → `MMM VCF`
  - `Microcell - uCell, µCell, Micro Supercell (black panel)` → `Microcell` / `Supercell` (ambiguous)

## Future strategy

- The ModularGrid parser + matcher should be structured so it can be **reused** for other future import sources (Rack
  Planner CSV, patch photo → module list, community-shared exports). Keep the parser and matcher pure and separate from
  the rack-creator UI so a later "Import" surface elsewhere in the app can reuse them.
- Matching quality is the long-term lever. Priority order for future improvement:
  1. Normalized-name + inferred-HP scoring (MVP).
  2. Alias table (data-only, editable at the module level; no schema change required if stored as a Patcher-owned
     module-side property — otherwise deferred).
  3. Manufacturer-verified module registry (blocked on Manufacturer Accounts & Verification; opportunistic boost only).
  4. Server-side matching RPC if client-side scanning of the module catalogue gets slow at scale.
- Later polish: allow saving unmatched entries as a "wish list" tied to the created rack (feeds Marketplace Tier 2 flows).
  Out of scope for MVP.

## Goals

- Import a ModularGrid JSON export into a new Patcher rack with correct name, rows, HP, and correctly-placed matched
  modules.
- Keep the flow **inside the existing rack creation dialog** — a toggle + inline section, not a new page.
- Gate the **Create** button on: (a) valid rack fields as today, and (b) parsed valid JSON with a resolvable preview.
- Never silently create guessed modules or fabricate Patcher modules.
- Route all writes through `SupabaseService` (`add.rack`, `add.rackModule`) — no schema, RLS, or migration change.

## Non-goals

- No ModularGrid API integration. Import is user-pasted JSON only.
- No auto-creation of missing modules in Patcher's catalogue.
- No two-way sync back to ModularGrid.
- No power/depth/IO reconstruction from the ModularGrid export (data is not present).
- No batch import of multiple racks in one dialog.
- No schema, RLS, or Supabase migration change in MVP.
- No changes to `CURRENT_FEATURE.md` on intake.

## Assumptions

- The rack-creation dialog is the correct integration point for this feature (confirmed by user intent: "as the last
  option in the rack creation dialog").
- Patcher's existing module catalogue is large enough that normalized-name + inferred-HP matching converges to a useful
  hit rate on typical MG exports (validated on one 108-instance sample; must be re-validated during implementation on 2–3
  additional real exports).
- The user is willing to review ambiguous/unmatched matches before the rack is created. This is preferred over "create the
  rack first, fix later" because leaving a half-populated rack is a worse first impression than a two-step wizard.
- Rack-level fields (`rows`, `hp`, `name`) can be derived from the ModularGrid `Rack` object and pre-fill the existing
  rack-creator form when the toggle is on; the user can still override before Create.

## Dependencies and sequencing

- **Blocking**: none. Existing backend surface (`add.rack`, `add.rackModule`, `get.rackedModules`) is sufficient.
- **Soft dependency**: designer micro-brief on toggle placement + wizard density within the rack-creator dialog. Should
  precede implementation but can be resolved in one round.
- **Not required**: Manufacturer Accounts & Verification, Marketplace, Price Hub. This feature is deliberately Tier 0 so
  it can ship without waiting for any of them.
- **Follow-ups it unblocks**: better alias data model for modules; import from other sources; onboarding flow that starts
  with "paste your rack".

## MVP layer

1. **Toggle + inline section in `rack-creator.component`**
   - Add an "Import from ModularGrid" toggle as the last field in the create dialog.
   - When on, reveal an inline section with a large paste-only textarea and helper copy
     ("Requires JSON exported from a ModularGrid Unicorn account.").
   - Toggle off returns the dialog to today's behavior with no side effects.
2. **Parser (pure TS, no Angular deps)**
   - Accept string, `JSON.parse` with a friendly error state ("This does not look like valid JSON.").
   - Validate top-level shape: `{ Rack, User, Module[] }`. If shape is wrong, show
     "This does not look like a ModularGrid rack export."
   - Extract:
     - Rack: `name`, `rows` (int), `te` → `hp` (int), `format`, `rows1u` → parsed set of 1U row indices.
     - Modules: array of `{ mgId, name, row (1-based), col (1-based) }`.
   - Compute inferred HP per module: sort within row by `col`, take delta to next module; for last, use `te + 1 - col`.
3. **Matcher (pure TS, no Angular deps, injected module catalogue via data service)**
   - Normalize both sides: lowercase; strip diacritics; collapse whitespace; drop parenthesized panel/color qualifiers
     (`black`, `black panel`, `silver`, `gold`, `& gold panel`); drop trailing revision noise (`rev2 2016` → `rev2`);
     tokenize on non-alphanumeric.
   - Score = `nameScore * 1.0 + hpScore * 0.5`.
     - `nameScore`: 1.0 exact normalized match; token Jaccard otherwise; 0 if below threshold.
     - `hpScore`: 1.0 if inferred HP within ±1 of Patcher `module.hp`; linear falloff to 0 by ±3.
   - Bucket per source module:
     - **confident** — single candidate ≥ high threshold.
     - **likely** — single candidate above low threshold or multiple candidates but a clear leader.
     - **ambiguous** — multiple candidates within a small score band.
     - **unmatched** — no candidate above low threshold.
     - **blank** — MG entry looks like a blank/spacer; separate bucket, defaults to skip.
   - Do **not** match on MG `id`. Ever.
4. **Preview UI**
   - Show counts per bucket, rack dimensions, and a compact list of items in each bucket.
   - Ambiguous rows expose a small candidate picker.
   - Unmatched rows show "skip" (default) or "search Patcher catalogue" affordance (reusing existing module-search widget
     if trivial; otherwise defer to Structural).
5. **Create-gate wiring**
   - Existing rack-form validity plus `hasValidImportPreview` (or `importDisabled`) becomes the Create predicate.
6. **Create flow**
   - On Create with import on: call `add.rack(...)`, then batch `add.rackModule(...)` for every resolved (confident +
     likely-accepted + ambiguous-picked) instance, with **explicit 1-based → 0-based row/column conversion**.
   - Failures on any `add.rackModule` should surface a non-fatal warning and leave the rack in place (user can retry
     placement later). Do not roll back the rack.
7. **Notifications**
   - Reuse shared notification helpers for success ("Rack created — X modules placed, Y skipped.") and errors.

## Structural layer

- Extract the parser + matcher into a reusable `modulargrid-import` utility module co-located with the wizard, so a
  future generic "Import" surface can consume it.
- Add a real inline module-search affordance for unmatched rows if the trivial reuse in MVP is insufficient.
- Add basic unit test coverage for: JSON shape validation, `rows1u` parsing, inferred-HP computation, normalized-name
  matching, row/column conversion.
- Consider a small `rack-creator-import-data.service.ts` co-located with the wizard section, extending `SubManager`, to
  own the parse/match reactive pipeline and keep `rack-creator.component.ts` thin.

## Polish layer

- Persist last-used import section state (collapsed/expanded) per user session — minor QoL.
- Improve ambiguous-picker density using the current DESIGN_LANGUAGE tokens.
- Optionally offer "download unmatched list" so the user can request additions on the Patcher module catalogue.
- Consider a lightweight motion cue when the preview counts recompute after a paste.

## File / surface map

Expected to change:

- `src/app/components/rack-parts/rack-creator/rack-creator.component.html`
- `src/app/components/rack-parts/rack-creator/rack-creator.component.ts`
- `src/app/components/rack-parts/rack-creator/rack-creator.component.scss`
- `src/app/components/rack-parts/rack-creator/rack-creator.types.ts`
- New: `src/app/components/rack-parts/rack-creator/modulargrid-import/` (wizard section + `*-data.service.ts` + pure parser/matcher).

Read but should **not** change in MVP:

- `src/app/features/backend/supabase.service.ts`
- `src/app/features/backend/supabase-add.ts`
- `src/app/features/backend/supabase-get.ts`
- `src/app/features/backend/DatabaseStrings.ts`
- `src/backend/database.types.ts`
- `src/app/models/rack.ts`, `src/app/models/module.ts`

Explicitly out of scope:

- Any `supabase/migrations/**` file.
- Any RLS policy change.

## Acceptance criteria

- [ ] The rack creation dialog shows an "Import from ModularGrid" toggle as its last field.
- [ ] Toggle-off behavior is byte-identical to today's dialog.
- [ ] Helper copy explicitly states the JSON must come from a ModularGrid **Unicorn** account.
- [ ] Invalid JSON shows a friendly, non-technical error; Create stays disabled.
- [ ] JSON that parses but does not match the ModularGrid rack shape shows a distinct error; Create stays disabled.
- [ ] Valid JSON populates a preview panel showing:
  - detected rack `name`, `rows`, total `hp`, format;
  - counts per bucket: confident / likely / ambiguous / unmatched / blank.
- [ ] Ambiguous items are individually reviewable; unmatched items are skippable (default) with no silent fabrication.
- [ ] No matching decision uses ModularGrid `id`.
- [ ] Row/column values written to `rack_modules` are correctly 0-based; a targeted unit test covers 1U rows and last-in-row placement.
- [ ] On Create, the rack is created first via `add.rack(...)`; then resolved `rack_modules` are created via
      `add.rackModule(...)`.
- [ ] Failure to place a single module logs a notification but does not roll back the rack.
- [ ] No schema, migration, or RLS change is introduced.
- [ ] `pnpm lint` and targeted `pnpm test-headless --include="**/rack-creator*.spec.ts"` (and the new parser/matcher spec)
      pass.
- [ ] Persona review via `internaldocs/agents/designer.md` signed off toggle placement + wizard density.

## Validation strategy

- **Unit** (`pnpm test-headless --include=...`):
  - parser: shape validation, `rows1u` parse, inferred HP for dense/sparse rows and last-in-row.
  - matcher: normalized-name equality, alias-noise stripping (color/panel qualifiers, revision suffixes), HP scoring,
    bucket assignment.
  - row/column conversion (1-based → 0-based) round-tripped through `get.rackedModules`-style read.
- **Component**: existing `rack-creator.component.spec.ts` + `rack-creator-branches.spec.ts` extended with:
  - toggle default state and toggle-on reveal;
  - Create disabled/enabled predicates for the new gate.
- **Manual** using the caller's sample export `KARMA_COMA_Spares.json` and at least two additional real exports if
  reachable, checking preview counts and post-create placement.
- **Runtime legibility** via the `patcher-ui-debug` skill for the toggle + preview screenshot pass, following the
  DESIGN_LANGUAGE conventions.

## Risks and open questions

- **Matching precision on unseen exports.** The 89/108 exact-resolution rate is one sample. Structural pass must be
  prepared to widen alias handling if follow-up exports do worse.
- **Blank/spacer handling.** MG treats blank panels as regular modules. We must reliably detect and bucket them as
  "blank" rather than misfiring name-similarity heuristics onto them.
- **1U row semantics.** `rows1u` is PHP-serialized and format could vary. Parser must fail soft — if it cannot decide,
  fall back to "all rows are 3U" and warn in the preview.
- **HP inference on sparse rows.** Delta-to-next-module overestimates width when there are intentional gaps. HP must be a
  score contribution, never a hard filter.
- **Legal / attribution.** Confirm the copy positions this as "for the user's own personal export" and does not imply any
  ModularGrid partnership. Product copy should not use the ModularGrid logo.
- **Rack `hp` semantics.** Patcher `racks.hp` is a single integer; MG `te` is the row width. Confirm the mapping is 1:1
  before writing; if Patcher's rack model implies "per row" vs "total width", adjust conversion.
- **Open question for maintainer:** should the toggle default off on desktop but be discoverable via an empty-rack
  onboarding hint? (Deferred to designer brief.)

## Coordinator-loop handoff

- Selectable as-is by `coordinator-loop`.
- Suggested delegation chain:
  1. `designer` — one-round placement + density brief (toggle, paste area, preview panel, ambiguous picker).
  2. `planner` — confirm layer split (MVP vs Structural) and cut acceptance-scope for the first PR if needed.
  3. `frontend-dev` — implement MVP layer with unit tests; keep parser + matcher pure and reusable.
  4. `code-review` — verify no direct MG-ID matching, correct row/column conversion, and layering (no
     `SupabaseService` import inside the component).
- Verified-checkpoint commits allowed per `coordinator-loop` autonomy rules; no production branch or release.

## Decision log

- 2026-07-07 — Intake. Chose **PRODUCT — Tier 0 / MEDIUM** because the feature is fully additive to the rack-creator
  surface, has no external dependency, and unblocks onboarding for users migrating from ModularGrid. HIGH was considered
  but rejected: it does not gate any active roadmap tier and current active work (Manufacturer Accounts & Verification)
  should not be de-prioritized.
- 2026-07-07 — Ruled **against** ID-based matching entirely. Empirical 16/101 collision rate with unrelated modules on
  the sample export means any ID boost would add noise, not signal.
- 2026-07-07 — Chose **inline section inside the existing dialog** over a separate import page. User intent explicitly
  asked for a toggle at the end of the dialog, and keeping creation in one surface avoids a stalled "half-imported" state.
- 2026-07-07 — Chose to **gate Create on a valid parsed preview**, not to allow creating an empty rack when import fails.
  Matches the user's explicit "only after valid JSON should Create be enabled" instruction.
- 2026-07-07 — Kept parser + matcher **pure and reusable** so a future generic Import surface can consume them without
  refactoring the rack-creator.
