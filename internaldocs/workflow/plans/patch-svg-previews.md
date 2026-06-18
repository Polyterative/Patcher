<!-- Section: INFRA (independent; pick any time a product task is blocked) -->

# Patch SVG Previews (mirror of rack JPEG previews, but for the patch graph)

## Status

- [ ] Open — backlog. Not active. Not in `CURRENT_FEATURE.md`.
- Priority: **MEDIUM**
- TODO section: **INFRA**
- Owner persona on pickup: `coordinator-loop` → `planner` → `frontend-dev` → `code-reviewer`.

## User intent

Generate and persist a visual preview of each patch — saved as an **SVG file** in
Supabase storage — and surface it everywhere a patch is listed/teased, the same
way rack JPEG previews work today. The user explicitly asked for:

- The **same UX** as racks: an inline preview component with a "generate / update
  preview" button, stale-detection badge, and a placeholder when no preview
  exists yet.
- The **same backend shape**: a dedicated storage bucket (different folder), a
  `*.svg` filename stamped with a generation timestamp persisted on the patch
  row, cache-busted on update, cleaned up on replace.
- Output is a graph representation (nodes + connections), **not** a rasterized
  rack panel. SVG is required (not JPEG) so previews remain crisp at any size
  and are tiny on disk.

## Product / roadmap fit

- **Phase 2 (community platform).** Patches are the headline shared artefact of
  Phase 2 and currently render as text-only cards in lists. Adding a real
  visual preview makes patch browsing, search results, and embedded patch teasers
  (module pages, racks → linked patches, user profile activity) instantly
  scannable.
- **Compounding effect:** every later surface that lists patches inherits this
  preview for free — public profiles, marketplace listings that reference a demo
  patch, manufacturer pages showing patches involving their modules, future SEO
  OG-image generation (see `on-seo-og-image-generation.md`, which can reuse the
  same stored SVG as input).
- Not a roadmap gate; does not block any tier. Pure UX/SEO polish on an already
  shipped surface — safe to pick up between gated work.
- Does not require `ROADMAP.md` edits.

## Current system analysis

The rack preview pipeline already exists and is the explicit template to copy.

**Rack pipeline (reference implementation):**

- DB: `racks.image` `text | null` — stores the timestamped filename only.
- Storage bucket: `racks` (`DbStoragePaths.racks`, `StorageUrls.racks`).
- Backend ops (`src/app/features/backend/supabase-storage.ts`):
  - `uploadRackImage(file, name)` — stamps filename with
    `_YYYY-MM-DDhh-mm-ssms.<ext>` then uploads; busts `rackWithId` cache.
  - `deleteRackImage(name)` — busts `rackWithId` cache.
- Data service (`src/app/components/rack-parts/rack-detail-data.service.ts`,
  around L716–L810): captures the rendered DOM with `modern-screenshot`
  (`domToJpeg`), uploads, updates the row, deletes the previous file, and
  surfaces snackbars + analytics events
  (`rack.image_downloaded`, `rack.preview_image_updated`). Owner-or-admin gated.
- UI component (`src/app/components/rack-parts/rack-image/rack-image.component.ts`):
  - `@Input() data: Rack`, `@Input() canUpdatePreview`, `@Output() updatePreviewClick`.
  - Pure helpers `previewGeneratedAt()` and `isPreviewStale()` extract the
    timestamp from the filename and compare it against `rack.updated`.
  - Renders: image, placeholder for "Preview unavailable", placeholder for "New
    rack" (no image yet), and a stale badge + refresh button when relevant.
- Consumers: `rack-minimal` (and through it, `rack-list`, `rack-micro`).

**Patch side today (gaps):**

- `patches` table in `src/backend/database.types.ts` has **no `image` column**
  and there is no patches storage bucket — needs a schema change.
- `src/app/components/patch-parts/patch-graph/` renders the graph using
  **Sigma.js over WebGL/canvas** (`graph.component.ts` imports `Sigma` +
  `graphology`). Sigma does not natively export SVG, so we can't reuse a
  `domToSvg(graphHost)` trick the way the rack pipeline can rip the DOM.
- The underlying graph **data model is already extracted**:
  `buildPatchGraphData()` / `extractPatchGraphModuleInstances()` /
  `computePatchGraphSizeConstant()` in `patch-graph-build.utils.ts` give us
  pure nodes/edges. Layout primitives live in `patch-graph-layout.utils.ts`.
  This is enough to render an SVG ourselves without Sigma.
- Patch list UI (`patch-list`, `patch-micro`, patch teasers in module/rack
  pages) currently shows no visual at all — there is no equivalent of
  `rack-image` for patches.
- Cache keys: `'patches'` already exists in `supabase.cache.ts`; a
  `patchWithId`-style key may need to be added (a `publicPatchWithId` getter
  exists in `SupabaseService` but no matching cache tag yet — confirm during
  implementation).

**Coupling points to honour:**

- Component → Data Service → API Service → Supabase (`AGENTS.md` §4 layering).
- `DatabaseStrings.ts` is the only file allowed to know storage bucket names
  (lint R2).
- Re-run `pnpm updateBackendTypes` after the migration.
- Schema/migration preflight: [`internaldocs/patterns/BACKEND_METHODS.md`
  §"Schema-change preflight"](../../patterns/BACKEND_METHODS.md#schema-change-preflight-read-before-writing-sql).
- RLS changes require **explicit manual user approval** (`AGENTS.md` §5); the
  storage bucket policies for `patches` must be reviewed by the maintainer
  before going live.

## Future strategy

- Reuse the stored SVG as the input for **SEO OG image generation** (rasterize
  on demand server-side or in an edge function for `og:image`). Removes the
  need to recompute graph layout for SEO previews.
- A future "patch thumbnail strip on module/manufacturer pages" feature becomes
  trivial: just an `<app-patch-preview>` in a `<patch-micro>` card.
- If Patcher ever ships an animated/live patch preview (signal flow, see
  `patch-graph-flow.utils.ts`), the static SVG remains the still fallback and
  the loading placeholder.
- The SVG export utility itself is reusable: rack analysis overlays, module
  signal graphs, and the future module-IO graph could all share it.

## Goals

1. Patches gain a persistent, owner-generated **SVG preview** stored in a
   dedicated storage bucket and referenced by a new `patches.image` column.
2. A reusable `app-patch-preview` (or equivalently named) component renders the
   stored SVG, a "no preview yet" placeholder, a "preview unavailable"
   placeholder, and an owner-only "Generate / Update preview" button with a
   stale indicator — visually consistent with `app-rack-image`.
3. Patch detail page exposes the generate/update flow with the same snackbar +
   analytics treatment as racks (`patch.preview_image_updated`,
   `patch.image_downloaded` if download is also wired).
4. Patch list cards (`patch-list`, `patch-micro`) display the preview as their
   primary visual.

## Non-goals

- No live/animated preview, no server-side rasterization, no OG-image
  generation (separate plan).
- No change to Sigma renderer for the interactive patch graph — Sigma stays for
  the canvas viewer; the SVG export is an independent code path that reads the
  same data model.
- No change to rack previews.
- No new permission model beyond owner-or-admin (matches racks).
- Not building a thumbnail-cache CDN layer; rely on Supabase storage `cacheControl`.

## Assumptions

- A new public Supabase storage bucket `patches` is acceptable (matches `racks`
  semantics). Bucket creation + RLS / policy is **manual maintainer work**, not
  an autonomous agent action.
- `patches.image` `text | null` is the right shape (matches `racks.image`); no
  separate `preview_generated_at` column needed — the filename timestamp +
  `patches.updated` reproduce the rack stale-detection trick exactly.
- The Sigma graph data model in `patch-graph-build.utils.ts` is sufficient to
  produce a meaningful static SVG without re-running force-atlas2; we can
  either (a) snapshot Sigma's current node positions when the user clicks
  "Update preview" from the open patch view, or (b) run a deterministic
  headless layout (see Risks).
- SVG files are well under 1 MB; gzipped delivery is fine.

## Dependencies and sequencing

- **Hard prerequisite:** schema-change preflight read + maintainer approval on
  the migration and storage bucket RLS.
- **No dependency** on marketplace, manufacturer pages, profiles, or any Tier
  1/2 work.
- **Soft dependency:** if `on-seo-og-image-generation.md` is scheduled, land
  this first so OG generation can consume the stored SVGs.
- **Should land after** the current in-flight bug fixes don't touch
  `patch-detail-data.service.ts`'s mutation pipeline — coordinate via
  `CURRENT_FEATURE.md` at pickup time.

## MVP layer

Smallest end-to-end slice that proves the loop works on the patch detail page.

- [ ] Migration: add `patches.image text null` + (separately) maintainer-created
      `patches` storage bucket; capture both in the plan's Decision log.
- [ ] Run `pnpm updateBackendTypes` and update `Patch` / `PatchMinimal` models
      with `image?: string | null`.
- [ ] Register `DbStoragePaths.patches = 'patches'` and
      `StorageUrls.patches = ...` in `DatabaseStrings.ts`.
- [ ] Add `uploadPatchPreview(file, name)` (svg) and `deletePatchPreview(name)`
      to `supabase-storage.ts`, mirroring the rack methods 1:1, content-type
      `image/svg+xml`, cache-bust whatever key reads patch detail.
- [ ] New pure utility `patch-graph-svg.utils.ts` (alongside
      `patch-graph-build.utils.ts`) that turns
      `{nodes, edges, layout}` into a self-contained SVG string. Unit-tested
      with golden snapshots in `__tests__/`.
- [ ] Wire `updatePatchPreview$` action into `PatchDetailDataService`,
      modelled on `RackDetailDataService.updateRackImagePreview$`
      (owner/admin gate, snackbars, analytics event
      `patch.preview_image_updated`, previous-file cleanup with 404 tolerance).
- [ ] Owner-only "Generate/Update preview" button on the patch detail page
      that emits into `updatePatchPreview$`.

## Structural layer

Reusable surfaces + list consumers.

- [ ] `app-patch-preview` component (sibling of `rack-image`) with:
  - `@Input() data: PatchMinimal`
  - `@Input() canUpdatePreview = false`
  - `@Output() updatePreviewClick = new EventEmitter<void>()`
  - placeholders: *Preview unavailable* (load failure) and *New patch* (no
    image yet), matching rack copy and styling.
  - exported helpers `patchPreviewGeneratedAt()` and `isPatchPreviewStale()`
    (consider extracting the rack ones to a shared utility instead of
    duplicating — see Decision log on first non-obvious choice).
- [ ] Embed `app-patch-preview` in `patch-micro` and `patch-list` cards.
- [ ] Embed `app-patch-preview` on the patch detail page header area.
- [ ] Add the rack-style stale badge and refresh button (gated by
      `canUpdatePreview`).

## Polish layer

- [ ] Consistent placeholder typography/colors with `rack-image-fallback`.
- [ ] Loading skeleton while the SVG is fetched (mirror rack image transition
      class).
- [ ] Optional: download-preview button on patch detail page
      (`patch.image_downloaded` analytics event), gated like rack's downloader.
- [ ] Optional: visual tuning of the static SVG (legend, signal-flow colour
      coding pulled from `patch-graph-flow.utils.ts` palette so the static
      preview reflects the live view's colours).
- [ ] DESIGN_LANGUAGE pass — pull a designer-agent review before locking
      colours/typography.

## File / surface map

- **Schema/migration**
  - new SQL migration adding `patches.image text null` (preserve `updated`
    semantics — see preflight doc, don't accidentally bump `updated` on
    backfill).
  - manual: create `patches` storage bucket + RLS policies (owner write,
    public read).
- **Generated types**
  - `src/backend/database.types.ts` (regenerated).
- **Backend layer**
  - `src/app/features/backend/DatabaseStrings.ts` — add `patches` bucket
    constant + `StorageUrls.patches`.
  - `src/app/features/backend/supabase-storage.ts` — add
    `uploadPatchPreview` + `deletePatchPreview`.
  - `src/app/features/backend/__tests__/supabase-service/storage.spec.ts` and
    `storage-cache.spec.ts` — extend with patch counterparts.
- **Models**
  - `src/app/models/patch.ts` — add `image?: string | null` to `PatchMinimal`.
- **Data service**
  - `src/app/components/patch-parts/patch-detail-data.service.ts` — add
    `updatePatchPreview$` subject + reactive pipeline.
  - `src/app/components/patch-parts/__tests__/` (or co-located spec) —
    cover happy path, owner/admin gate, previous-file 404 tolerance, snackbar
    success/error.
- **SVG renderer**
  - new `src/app/components/patch-parts/patch-graph/patch-graph-svg.utils.ts`
    + `patch-graph-svg.utils.spec.ts` with golden-snapshot tests.
- **UI component**
  - new `src/app/components/patch-parts/patch-preview/` (component + html +
    scss + spec), mirroring `rack-image` structure and tests.
  - `src/app/components/patch-parts/patch-details/patch-details.component.*` —
    add the preview + button.
  - `src/app/components/patch-list/patch-list.component.*`,
    `src/app/components/patch-micro/patch-micro.component.*` — embed.

## Acceptance criteria

- [ ] Owner (or admin) of a patch can click "Generate preview" on the patch
      detail page; within a few seconds an SVG is uploaded to the `patches`
      storage bucket, `patches.image` is updated to the new filename, and the
      preview component re-renders showing the SVG.
- [ ] Re-clicking the button regenerates the SVG, replaces the storage object,
      and deletes the previous file (404 on delete is tolerated, matching
      rack behaviour).
- [ ] Patches without an `image` show a "New patch" placeholder. Patches whose
      stored SVG fails to load show a "Preview unavailable" placeholder.
- [ ] When `patches.updated` is newer than the timestamp encoded in
      `patches.image`'s filename, a stale badge + refresh button appear (owner
      only).
- [ ] `patch-list` and `patch-micro` cards now show the preview as the primary
      visual.
- [ ] Non-owners and unauthenticated visitors **cannot** trigger generation
      (UI hidden + backend gate + storage RLS).
- [ ] `pnpm lint` and `pnpm test-headless` pass; the new SVG renderer has
      passing golden-snapshot tests; new storage methods have spec coverage.
- [ ] No regression in the existing rack preview pipeline.

## Validation strategy

- **Lint:** `pnpm lint` (includes `check-layering.cjs`,
  `check-route-module-imports.cjs`, `check-px-ts.sh`, `check-docs.cjs`).
- **Unit:** `pnpm test-headless --include="**/patch-preview/**" --include="**/patch-graph-svg.utils.spec.ts" --include="**/supabase-service/storage*.spec.ts" --include="**/patch-detail-data.service*.spec.ts"`.
- **E2E:** extend an existing patch detail E2E (or add a focused one under
  `e2e/` if the patch detail has no media spec yet) — generate preview, reload,
  assert SVG renders; assert non-owner sees no button.
- **Manual via patcher-ui-debug skill:** capture a viewport snapshot of patch
  list before and after generation to confirm the preview appears.
- **Sentry/Supabase MCP:** after staging deploy, watch Sentry for new errors
  tagged `patch.preview_image_updated` and Supabase logs for storage 4xx/5xx
  on the `patches` bucket.

## Risks and open questions

- **Sigma is canvas, not SVG.** The static SVG export must either snapshot
  Sigma's current node positions at click time (needs the component to expose
  positions) or run a deterministic headless layout (e.g. dagre / elkjs /
  simple grid by `extractPatchGraphModuleInstances`). **Open question for
  planner:** which approach gives a more recognisable preview, and is the
  ~30 KB dagre/elkjs cost acceptable in the patch detail bundle?
- **Backfill behaviour.** The `patches` table's `updated` trigger must not fire
  when we set `image` (otherwise every preview generation would mark the patch
  as freshly edited and break the stale-detection invariant). Verify with the
  schema-preflight doc; if the trigger does fire, write the row update via a
  dedicated RPC that bypasses the `updated` bump, mirroring what was done for
  racks (see `BACKEND_METHODS.md`).
- **Storage RLS for `patches` bucket.** Maintainer must approve the policy
  (owner write, public read). Agent should propose, not apply.
- **Shared helper extraction.** `previewGeneratedAt` / `isPreviewStale` exist
  in `rack-image.component.ts`. Duplicating them is the smaller, safer change;
  extracting to a shared util is cleaner but touches rack tests. Decision
  belongs to the planner — record in Decision log.
- **Caching.** `uploadRackImage` uses `cacheControl: '360'` (6 minutes).
  Confirm whether SVGs (typically tiny + content-hashed via filename
  timestamp) want longer; suggested `cacheControl: '31536000'` since the
  filename changes on every regeneration.
- **`patchWithId` cache key.** Confirm whether a dedicated read cache exists
  for single-patch fetches; if not, identify which key to bust after upload
  (probably `'patches'`).

## Coordinator-loop handoff

When `coordinator-loop` picks this up:

1. Read the schema-change preflight doc and propose the migration as a
   reviewable diff — **do not apply autonomously**.
2. Delegate the SVG renderer utility to `frontend-dev` first (pure function,
   easy to TDD with golden snapshots) — this de-risks the whole feature.
3. Then delegate the storage + data-service layer (`frontend-dev`).
4. Then the UI component + list embeds (`frontend-dev` + `designer` pass for
   the placeholders).
5. `code-reviewer` validates layering + that no shortcuts were taken on the
   owner/admin gate.
6. Final manual checkpoint: maintainer approves bucket creation + RLS before
   merge to `production`.

## Decision log

<!-- append-only, timestamped one-liners for non-obvious choices -->

- 2026-06-18 — Plan filed by `feature-notetaker` from a verbatim user
  indication ("visual previews of the patches, saving SVG files… same
  behavior as racks… different folder… preview placeholders"). Classified
  as INFRA / MEDIUM because it polishes an already-shipped surface
  (patches) without blocking or being blocked by any Tier 1/2 roadmap item,
  but has high compounding value for browse/SEO surfaces.
