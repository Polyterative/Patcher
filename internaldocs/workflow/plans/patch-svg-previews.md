<!-- Section: INFRA (independent; pick any time a product task is blocked) -->

# Patch SVG Previews (mirror of rack JPEG previews, but for the patch graph)

## Status

- [ ] Backend/storage direction approved — local backend/storage checkpoint committed; remote migration/typegen drift remains a gate, and product owner approved the narrow `patches.image` timestamp-preservation SQL strategy needed before preview wiring.
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
- SVG preview storage visibility should stay simple: privacy is about whether
  private patches are listed in public registries, while link-based access to a
  known preview URL is acceptable for now, matching the current rack-preview
  posture. No special owner-only SVG read restriction is required.
- The Sigma graph data model in `patch-graph-build.utils.ts` is sufficient to
  produce a meaningful static SVG without re-running force-atlas2; we can
  either (a) snapshot Sigma's current node positions when the user clicks
  "Update preview" from the open patch view, or (b) run a deterministic
  headless layout (see Risks).
- SVG files are well under 1 MB; gzipped delivery is fine.

## Dependencies and sequencing

- **Hard prerequisite:** schema-change preflight read remains required before writing SQL. Product owner approved the backend/storage direction; migrations/storage/RLS still must be proposed/reviewed and must not be applied autonomously.
- **No dependency** on marketplace, manufacturer pages, profiles, or any Tier
  1/2 work.
- **Soft dependency:** if `on-seo-og-image-generation.md` is scheduled, land
  this first so OG generation can consume the stored SVGs.
- **Should land after** the current in-flight bug fixes don't touch
  `patch-detail-data.service.ts`'s mutation pipeline — coordinate via
  `CURRENT_FEATURE.md` at pickup time.

## Approval queue

- **Approved 2026-06-18T20:58+02:00:** backend/storage direction is approved with a new `patches.image` column for the SVG URL/path, a dedicated `patches` storage bucket, RLS writes limited to the patch owner, reads aligned with patch visibility, and a deterministic filename based on patch id/version. Read-visibility direction was simplified by the 2026-06-18T21:24+02:00 decision below. Do not apply migrations/storage/RLS from this docs-only approval checkpoint.
- **Approved 2026-06-18T21:24+02:00:** preview storage visibility stays simple: public-registry listing is the privacy boundary, link-based access to a known SVG URL is acceptable like rack previews, and no special owner-only SVG read restriction is required for now. Do not apply migrations/storage/RLS from this docs-only approval checkpoint.
- **Approved 2026-06-18T22:43+02:00:** Apply the exact additive SQL/storage shape below: add nullable `public.patches.image`, create/use a public `patches` storage bucket for link-readable SVG previews, and add authenticated owner/admin insert/update/delete storage policies. No unrelated RLS/policy changes are approved.
- **Approval requested 2026-06-19T09:05+02:00:** May a maintainer reconcile the linked Supabase migration history before typegen by repairing/applying the local-vs-remote drift listed below? Default if not approved: keep `pnpm updateBackendTypes`, remote migration apply, and preview UI wiring blocked.
- **Approved 2026-06-19T09:05+02:00:** Product owner approved maintainer reconciliation of the linked Supabase migration/typegen drift only, so the patch preview migration and `pnpm updateBackendTypes` can proceed safely after reconciliation. This does not approve unrelated RLS/policy changes, timestamp-preservation SQL, or pushing.
- **Approval requested 2026-06-19T09:05+02:00:** Because `public.patches` currently has `handle_updated_auto BEFORE UPDATE ... moddatetime('updated')`, image-only row updates will bump `patches.updated` and break preview stale detection. May the next SQL checkpoint include a trigger/RPC-style preservation strategy for image-only updates (draft below), with no broad patch RLS changes? Default if not approved: do not wire `updatePatchPreview$`.
- **Approved 2026-06-19T09:05+02:00:** Product owner approved a narrow image-only timestamp-preservation SQL strategy for `public.patches.image` updates, so preview row writes do not alter graph-edit freshness semantics. No broad patch RLS changes, unrelated migration/policy changes, or push are approved; preview UI/data-service wiring may proceed only after migration drift is reconciled and this SQL checkpoint exists.

## Proposal-only SQL/storage checkpoint

This section was approved by the product owner at 2026-06-18T22:43+02:00 for
the next implementation checkpoint. Apply only this additive column, bucket, and
storage-policy shape; stop any remote/backend step if tooling reveals migration
drift, advisor failures, or a breaking production risk.

### Proposed additive migration

```sql
-- Draft only: do not apply until maintainer approval is recorded.
-- Adds the patch preview filename/path without touching existing rows.
-- `add column ... null` has no backfill and must not fire `patches.updated`
-- triggers on existing rows.
alter table public.patches
  add column if not exists image text null;

comment on column public.patches.image is
  'Supabase Storage filename for the generated SVG patch preview in the patches bucket.';
```

### Proposed storage bucket

```sql
-- Draft only: do not apply until maintainer approval is recorded.
-- Public bucket keeps preview reads simple/link-readable, matching rack preview
-- posture. Privacy remains the public-listing boundary, not secret SVG URLs.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('patches', 'patches', true, 1048576, array['image/svg+xml'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;
```

### Proposed filename convention

- Store only the basename in `public.patches.image`, not a full URL.
- Format: `patch_<patch_id>_v<patch_updated_stamp>.svg`.
  - Example: `patch_42_v20260618t201530123z.svg`.
  - `<patch_updated_stamp>` is derived from the patch row's current `updated`
    value at generation time, normalized to lowercase UTC
    `yyyymmddtHHMMSSmmmz` with non-alphanumerics removed.
- This keeps the path deterministic for a patch/version while still changing
  when the patch graph changes. Regenerating the same patch version may upsert
  the same object path; once a later patch edit changes `updated`, the next
  preview writes a new filename and can delete the previous object after the DB
  row update succeeds.

### Proposed storage policy shape

The bucket is public, so no owner-only SVG read policy is proposed. The app must
still gate generation through the owner/admin backend flow, and storage writes
remain constrained by policies that parse the patch id from the filename.

```sql
-- Draft only: RLS/storage policy changes require explicit maintainer approval.

drop policy if exists "patch_previews_insert_owner_or_admin" on storage.objects;
create policy "patch_previews_insert_owner_or_admin"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'patches'
    and lower(storage.extension(name)) = 'svg'
    and storage.filename(name) ~ '^patch_[0-9]+_v[0-9]{8}t[0-9]{9}z\.svg$'
    and (
      coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
      or exists (
        select 1
        from public.patches p
        where p.id = substring(storage.filename(name) from '^patch_([0-9]+)_')::integer
          and p.authorid = auth.uid()::text
      )
    )
  );

drop policy if exists "patch_previews_update_owner_or_admin" on storage.objects;
create policy "patch_previews_update_owner_or_admin"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'patches'
    and (
      coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
      or exists (
        select 1
        from public.patches p
        where p.id = substring(storage.filename(name) from '^patch_([0-9]+)_')::integer
          and p.authorid = auth.uid()::text
      )
    )
  )
  with check (
    bucket_id = 'patches'
    and lower(storage.extension(name)) = 'svg'
    and storage.filename(name) ~ '^patch_[0-9]+_v[0-9]{8}t[0-9]{9}z\.svg$'
    and (
      coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
      or exists (
        select 1
        from public.patches p
        where p.id = substring(storage.filename(name) from '^patch_([0-9]+)_')::integer
          and p.authorid = auth.uid()::text
      )
    )
  );

drop policy if exists "patch_previews_delete_owner_or_admin" on storage.objects;
create policy "patch_previews_delete_owner_or_admin"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'patches'
    and (
      coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
      or exists (
        select 1
        from public.patches p
        where p.id = substring(storage.filename(name) from '^patch_([0-9]+)_')::integer
          and p.authorid = auth.uid()::text
      )
    )
  );
```

### Visibility reconciliation

- The earlier owner/admin write direction still stands for generating, replacing,
  and deleting previews. It is enforced twice: UI/data-service owner/admin
  checks and storage policies for authenticated writes.
- The later visibility simplification supersedes owner-only reads. The proposed
  `patches` bucket is public, so anyone with the exact SVG URL can read it, as
  with rack previews. Private patch privacy is handled by not listing private
  patches publicly, not by making preview URLs secret.
- Remaining approval gate: applying the bucket and policies is a storage/RLS
  mutation and must be manually approved before any migration or Supabase change
  is executed.

### Non-breaking validation plan

1. Before applying: confirm the target Supabase project has no existing
   `public.patches.image` column or `patches` bucket/policies that would require
   a rename/migration merge.
2. Apply only after approval; then run `pnpm updateBackendTypes` and confirm
   `patches.Row/Insert/Update` include optional nullable `image`.
3. Verify the column-only migration does not update existing `public.patches.updated`
   values (no backfill/update statement is present).
4. Verify the row update used by the app to persist `image` does not
   unintentionally bump `patches.updated`; if it does, propose a second approved
   RPC/policy checkpoint before wiring generation.
5. Run Supabase advisors after the approved storage/RLS change and record any
   warnings in this plan before implementation proceeds.

### Remote migration/typegen drift inventory

Read-only inspection on 2026-06-19T09:05+02:00 confirmed the linked project
`sozmatmywjpstwidzlss` is still not safe for remote typegen or additional
migration application:

- `supabase migration list --linked` shows timestamp drift where remote history
  has old versions for equivalent local migration names:
  - public-id/checkpoint family: remote `20260515092813`…
   `20260515110711`; local `20260515112000`…`20260515130700`.
  - module usage/admin/module-discovery family: remote `20260609212909`,
   `20260610124954`, no local `20260611130000`; local has
   `20260609212500`, `20260610144900`, `20260611130000`.
  - generate-public-id grant and module snapshot: remote `20260611193541`,
   `20260616135552`; local `20260611193200`, `20260616155154`.
  - taxonomy split/correction: remote `20260618101252`,
   `20260618101259`, `20260618171152`; local `20260618105927`,
   `20260618121100`, `20260618190400`.
- Remote is missing local migration families for manufacturer verification,
  manufacturer claims, module availability tags, manufacturer owner policies,
  manufacturer logo storage policies, user module acquisitions, and patch SVG
  previews.
- Remote currently has no `public.patches.image` column and no `patches` storage
  bucket.

Do not run `pnpm updateBackendTypes`, `supabase db push`, Supabase MCP
migrations, or migration repair until the maintainer explicitly approves the
reconciliation plan.

### Preview update timestamp semantics gate

Read-only inspection on 2026-06-19T09:05+02:00 confirmed
`public.patches` has:

```sql
CREATE TRIGGER handle_updated_auto
BEFORE UPDATE ON public.patches
FOR EACH ROW EXECUTE FUNCTION moddatetime('updated')
```

`moddatetime` updates `patches.updated` for every row update, including an
image-only update. That would make a freshly persisted preview look non-stale
because the graph edit timestamp changes to the preview write time. The UI/data
service must not wire preview generation until an approved persistence strategy
preserves `updated` for image-only writes.

Draft preservation strategy for the next approval-only SQL checkpoint:

```sql
-- Draft only: do not apply without explicit maintainer approval.
-- Runs after handle_updated_auto by trigger-name ordering and restores OLD.updated
-- only when the preview filename is the only logical row change.
create or replace function public.tg_preserve_patch_preview_image_updated()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if NEW.image is distinct from OLD.image
    and (to_jsonb(NEW) - 'image' - 'updated') = (to_jsonb(OLD) - 'image' - 'updated') then
   NEW.updated := OLD.updated;
  end if;
  return NEW;
end;
$$;

drop trigger if exists zz_preserve_patch_preview_image_updated on public.patches;
create trigger zz_preserve_patch_preview_image_updated
  before update on public.patches
  for each row execute function public.tg_preserve_patch_preview_image_updated();
```

If approved, pair this with a narrow backend method that updates only
`patches.image` (rather than sending a full `Patch` object) and cache-busts
`patches`, `patchesWithModule`, and any single-patch cache key introduced during
implementation.


## MVP layer

Smallest end-to-end slice that proves the loop works on the patch detail page.

- [x] Migration: add `patches.image text null` + approved public
      `patches` storage bucket; capture both in the plan's Decision log.
- [x] Update generated types and `Patch` / `PatchMinimal` models with
      `image?: string | null` (manual type patch only; `pnpm updateBackendTypes`
      is gated by remote migration drift).
- [x] Register `DbStoragePaths.patches = 'patches'` and
      `StorageUrls.patches = ...` in `DatabaseStrings.ts`.
- [x] Add `uploadPatchPreview(file, name)` (svg) and `deletePatchPreview(name)`
      to `supabase-storage.ts`, mirroring the rack methods 1:1, content-type
      `image/svg+xml`, cache-bust whatever key reads patch detail.
- [x] New pure utility `patch-graph-svg.utils.ts` (alongside
      `patch-graph-build.utils.ts`) that turns already-built `{nodes, edges}`
      graph data into a self-contained SVG string. Unit-tested with a
      co-located `patch-graph-svg.utils.spec.ts`.
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
  - manual: create `patches` storage bucket + storage policies (owner write,
    simple link-readable SVG access; no owner-only SVG read restriction for now).
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
- **Storage visibility for `patches` bucket.** Direction is approved: owner-only writes and simple link-readable SVG access, with privacy handled by avoiding public-registry listing for private patches. No owner-only SVG read restriction is required for now. Exact public-bucket + owner/admin write policy SQL is now drafted above; do not apply it without maintainer approval.
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

- 2026-06-18T22:50+02:00 — Added local migration `20260618224500_add_patch_svg_previews_storage.sql` for `patches.image`, public `patches` SVG bucket, and owner/admin storage write policies. Remote Supabase apply and `pnpm updateBackendTypes` were skipped because MCP migration inspection showed the linked remote is behind current local migrations; manually patched `database.types.ts` only for the additive `patches.image` shape.
- 2026-06-18T22:55+02:00 — Reviewer approved the local backend/storage slice after fixes. Validation passed with `pnpm test-headless --include="**/supabase-service/storage*.spec.ts"`, `pnpm lint`, `node scripts/checks/check-docs.cjs`, and `git diff --check`; Supabase advisors were skipped because remote DDL/RLS was not applied.
- 2026-06-18T22:58+02:00 — Staged the next safe gate: reconcile remote migration/typegen drift, then verify whether persisting `patches.image` changes `patches.updated` before any `PatchDetailDataService` generation wiring.
- 2026-06-19T09:05+02:00 — Read-only Supabase inspection confirmed linked remote migration/typegen drift remains unresolved, remote lacks `patches.image`/`patches` bucket, and `public.patches.handle_updated_auto` uses `moddatetime('updated')`, so image-only row updates would bump `patches.updated`. Added maintainer approval gates for migration reconciliation and an image-only timestamp preservation strategy; no remote schema/storage/RLS changes were applied.
- 2026-06-19T09:05+02:00 — Product owner approved maintainer reconciliation of the linked Supabase migration/typegen drift only, allowing safe follow-up for the patch preview migration and `pnpm updateBackendTypes` after reconciliation. Timestamp-preservation SQL remains separately pending; no unrelated RLS/policy changes or push are approved.
- 2026-06-19T09:05+02:00 — Product owner separately approved a narrow image-only timestamp-preservation SQL strategy for `public.patches.image` updates, so preview row writes do not alter graph-edit freshness semantics. Preview UI/data-service wiring remains blocked until migration drift is reconciled and the approved SQL checkpoint exists; no broad patch RLS changes, unrelated migration/policy changes, or push are approved.
- 2026-06-18T22:43+02:00 — Product owner approved applying the drafted Patch SVG preview storage/RLS checkpoint: additive nullable `patches.image`, public link-readable `patches` SVG bucket, and authenticated owner/admin insert/update/delete storage policies. No unrelated RLS/policy changes are approved.
- 2026-06-18T20:58+02:00 — Product owner approved the Patch SVG previews backend/storage direction: add `patches.image` for SVG URL/path, use a dedicated `patches` storage bucket, limit RLS writes to the patch owner, align reads with patch visibility, and use a deterministic filename based on patch id/version; no migrations/storage/RLS were applied in this docs-only checkpoint.
- 2026-06-18T22:17+02:00 — Drafted the exact proposal-only SQL/storage checkpoint: nullable `patches.image`, public `patches` SVG bucket, deterministic `patch_<id>_v<updated>.svg` filenames, and authenticated owner/admin insert/update/delete storage policies; no migrations/storage/RLS were applied.
- 2026-06-18T21:24+02:00 — Product owner decided Patch SVG preview storage visibility should stay simple: privacy is about avoiding public-registry listing, link-based access to a known SVG URL is acceptable like current rack previews, and no special owner-only SVG read restriction is required for now; no migrations/storage/RLS were applied in this docs-only checkpoint.
- 2026-06-18T20:18+02:00 — First autonomous implementation slice intentionally avoids schema, storage, RLS, Supabase calls, model fields, UI components, and upload flows; it lands only the pure SVG renderer/test foundation while screenshot refresh remains credential/approval gated.
- 2026-06-18T20:23+02:00 — Reviewer findings on duplicate marker IDs and long-label clipping were fixed by replacing SVG marker IDs with inline arrowhead polygons and estimating label bounds in the generated viewBox.
- 2026-06-18 — Plan filed by `feature-notetaker` from a verbatim user
  indication ("visual previews of the patches, saving SVG files… same
  behavior as racks… different folder… preview placeholders"). Classified
  as INFRA / MEDIUM because it polishes an already-shipped surface
  (patches) without blocking or being blocked by any Tier 1/2 roadmap item,
  but has high compounding value for browse/SEO surfaces.
