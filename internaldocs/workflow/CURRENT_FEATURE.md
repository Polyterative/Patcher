# Current Feature / AI RAM

> **Rules for AI agents:**
> 1. Read this file when the task is about the active in-flight feature or explicitly references the current plan.
> 2. Keep it updated - check off steps, add discoveries.
> 3. One feature at a time - archive to [COMPLETED.md](./COMPLETED.md) when done, then reset.
> 4. This file owns implementation detail; `TODO.md` owns the backlog index, `plans/` owns per-task detail.
> 5. **Every feature uses three layers** (MVP -> Structural -> Polish). Define all three before coding. Complete each
>    layer before starting the next. Layout before interactions.
> 6. **Append to the Decision log** for any non-obvious choice (library pick, data shape, fallback policy, scope cut).
>    Future agents read this to avoid relitigating settled questions.

---

## Active

### Manufacturer Accounts & Verification — MVP

Plan owner: planner persona, 2026-06-18.
Backlog entry: `internaldocs/workflow/plans/manufacturer-accounts-verification.md` (decision log lives there).
Status: **M1 local migrations drafted; local type generation blocked by unavailable local Supabase/Docker**.

> **Backend preflight reminder** (`internaldocs/patterns/BACKEND_METHODS.md` §"Schema-change preflight"):
> all schema / RLS / storage policy work in this feature is approved **locally only**. Execution agents
> MUST stop before applying any migration or policy change to the remote Supabase project. After local
> migrations exist, regenerate `src/backend/database.types.ts` with `pnpm updateBackendTypes` against
> the local Supabase before continuing with Angular changes that depend on the new types.

#### Problem

Manufacturer pages are currently community-curated stubs. Brands have no in-app way to claim ownership of
their page, prove they are the legitimate owner, or take over the official surface (profile fields, logo,
official links, module availability state). Without that ownership model, Phase 2+ work that depends on
trustable manufacturer-authored content (official availability, MSRP edits, brand updates, analytics, B2B
surfaces) is blocked. This feature delivers the minimal end-to-end claim → review → verified-owner-edit
loop with admin review in-app.

#### Primary outcome

A logged-in user can submit a claim with a proof note for any manufacturer page; an admin can review and
approve/reject/needs-more-info via the in-app admin area; once approved the unique verified owner can edit
official manufacturer fields, upload the logo, and set per-module availability tags from a fixed initial
set — and these edits publish immediately.

#### Assumptions and CTO decisions

Beyond the decisions already locked in the backlog plan, this plan adopts the following operational
choices. Any reversal belongs in the backlog decision log first.

1. **Reuse `manufacturers.adminUser` for the verified-owner FK.** The column already exists in the schema
   and is referenced by `ManufacturerDetail.adminUser`. Add a `verified_at timestamptz` plus a
   `verified_by uuid references profiles(id)` audit pair on `manufacturers`. Do **not** introduce a
   separate `manufacturer_accounts` join table for MVP — single-owner is locked, so a join table would be
   dead weight until multi-owner is unlocked.
2. **Single claims table.** `manufacturer_claims (id, manufacturer_id fk, claimant_id fk profiles,
   proof_note text not null, status text check in (pending|approved|rejected|needs_more_info),
   admin_note text null, decided_at timestamptz null, decided_by uuid null fk profiles, created/updated
   timestamps)`. Enforce one active pending claim per manufacturer with a unique partial index
   `(manufacturer_id) where status = 'pending'`. A user may have at most one pending claim across all
   manufacturers — unique partial index `(claimant_id) where status = 'pending'`.
3. **Module availability is a dedicated join table, not coupled to the existing user-voted `module_tags`
   infra.** Manufacturer-set availability is authoritative; community tags are voted. Mixing them would
   contaminate vote semantics. Introduce
   `module_availability_tags (module_id fk, tag text check in (<initial set>), set_by uuid fk profiles,
   set_at timestamptz default now(), primary key (module_id, tag))`. Initial enum (from backlog
   decisions): `available_new`, `available_resellers`, `kit_diy`, `prototype`, `limited_stock`,
   `discontinued`, `contact_manufacturer`.
4. **No new manufacturer profile columns beyond what is strictly needed.** MVP additions:
   `tagline text null`, `description text null`, `social_links jsonb null` (free-form `{platform: url}`
   map, validated client-side; no normalisation until traction justifies it). Existing `websiteURL` and
   `logo` cover the rest.
5. **RLS shape mirrors `admin_can_update_racks`.** Per-table policies, no SECURITY DEFINER RPC. Admin
   actions on claims (status transitions) flow through standard `update` policies gated on
   `app_metadata.role = 'admin'`. Verified-owner update policies on `manufacturers`, `modules`, and
   `module_availability_tags` gate on `auth.uid() = (select adminUser from manufacturers where id = …)`.
   This keeps the security boundary inspectable from the migration alone.
6. **Storage:** extend the existing `manufacturer-logos` bucket. Add policies allowing INSERT/UPDATE for
   users whose `auth.uid()` matches `adminUser` of any manufacturer (verified owner), plus admin
   override. Logo filename convention: `manufacturer_<id>_<timestamp>.<ext>`.
7. **No audit/history layer.** Owner edits write through directly; admin review notes on claims are the
   only persisted decision trail. Adding history is explicitly Polish-tier and deferred.
8. **Admin queue lives inside `AdminPanelRootComponent`.** New `AdminManufacturerClaimsComponent` rendered
   below `<app-admin-flags>` in `admin-panel-root.component.html`. Same module
   (`BackendModule`), same `AdminGuardService`, same pattern as `AdminFlagsComponent`.
9. **Claim CTA lives on `ManufacturerDetailComponent`.** Inline state machine (no dialog) driven by a new
   `manufacturer-claim-data.service.ts` co-located with the manufacturer-detail feature. The CTA renders
   one of: not-logged-in prompt, "Claim this manufacturer" button, pending state with note, needs-more-
   info banner with admin note + resubmit, rejected banner (terminal for that user with cooldown deferred
   to Polish), "You own this page — edit" toggle when the viewer is the verified owner.
10. **Owner edit surface is inline on the manufacturer detail page (MVP), not a separate route.** Toggle
    flips profile fields, social links, and logo upload into edit mode. Per-module availability chips
    appear on the existing `app-module-list` row entries only for the verified owner (separate inline
    chip editor). No bulk-edit screen in MVP.

#### Affected files (high-level map)

Backend (TS):

- `src/app/features/backend/DatabaseStrings.ts` — register `manufacturer_claims`, `module_availability_tags`.
- `src/app/features/backend/supabase-get.ts` — `manufacturerClaimForCurrentUser`, `manufacturerClaimByManufacturerForCurrentUser`, `manufacturerOwnershipForCurrentUser`, `pendingManufacturerClaims` (admin), `moduleAvailabilityTags(moduleId)`, `manufacturerAvailabilitySummary(manufacturerId)`.
- `src/app/features/backend/supabase-add.ts` — `manufacturerClaim`, `moduleAvailabilityTag`.
- `src/app/features/backend/supabase-update.ts` — `manufacturerProfileAsOwner`, `manufacturerClaimStatusAsAdmin`.
- `src/app/features/backend/supabase-delete.ts` — `moduleAvailabilityTag`, `manufacturerClaim` (claimant withdraw).
- `src/app/features/backend/supabase-storage.ts` — `uploadManufacturerLogo`, `deleteManufacturerLogo` (mirroring `uploadCollectionCover` pattern).
- `src/app/features/backend/supabase.cache.ts` (cache key union) — add `manufacturerClaims`, `manufacturerOwnership`, `pendingManufacturerClaims`, `manufacturerWithId`, `moduleAvailabilityTags`.

Models / shared:

- `src/app/models/manufacturer.ts` — extend `ManufacturerDetail` typing with `tagline`, `description`, `socialLinks`, `verifiedAt`, plus new `ManufacturerClaim`, `ModuleAvailabilityTag` interfaces (or co-locate in feature modules; prefer co-located if not reused across modules).
- `src/app/models/module-availability.ts` (new) — `MODULE_AVAILABILITY_TAGS` const tuple + label map + tone map for chip styling.

Admin UI:

- `src/app/features/backend/admin-panel-root/admin-manufacturer-claims/` (new):
  - `admin-manufacturer-claims.component.ts|.html|.scss|.spec.ts`
  - `admin-manufacturer-claims-data.service.ts|.spec.ts`
  - `admin-manufacturer-claims-data.types.ts`
- `src/app/features/backend/admin-panel-root/admin-panel-root.component.html` — embed new component.
- `src/app/features/backend/backend.module.ts` — declare the new component (mirrors `AdminFlagsComponent`).

Manufacturer detail UI:

- `src/app/features/manufacturer-detail/manufacturer-claim/` (new):
  - `manufacturer-claim.component.ts|.html|.scss|.spec.ts`
  - `manufacturer-claim-data.service.ts|.spec.ts`
- `src/app/features/manufacturer-detail/manufacturer-detail-edit/` (new):
  - `manufacturer-detail-edit.component.ts|.html|.scss|.spec.ts` (inline edit mode for profile + logo)
- `src/app/features/manufacturer-detail/manufacturer-detail-data.service.ts` — extend with ownership stream, edit-mode toggle subject, save-profile pipeline, refresh after save.
- `src/app/features/manufacturer-detail/manufacturer-detail.component.{ts,html}` — wire the claim CTA, ownership banner, edit-mode toggle.
- `src/app/features/manufacturer-detail/manufacturer.module.ts` — declare new components, import owner-side form modules.

Module surface (per-module availability):

- `src/app/components/module-parts/module-availability-chips/` (new): read-only chip list shown on module rows on the manufacturer detail page (and on `ModuleMinimalViewConfig` consumers via a feature flag in the config).
- `src/app/components/module-parts/module-availability-editor/` (new, owner-only): chip selector wired through manufacturer-detail data service.
- `src/app/components/module-parts/module-minimal/module-minimal.component.ts` — add `showAvailabilityTags` + `ownerAvailabilityEditor` view-config flags, default off; wire chip components.

Migrations (LOCAL only, do not apply remote):

- `supabase/migrations/<ts>_add_manufacturer_verification_fields.sql` — adds `verified_at`, `verified_by`, `tagline`, `description`, `social_links` to `manufacturers`; backfill-safe defaults; **no UPDATE-style backfill** (column DEFAULT only) per BACKEND_METHODS.md §1.
- `supabase/migrations/<ts>_add_manufacturer_claims.sql` — claims table, indexes, RLS enable + policies (insert by authenticated, select-own + select-all-by-admin, update-by-admin).
- `supabase/migrations/<ts>_add_module_availability_tags.sql` — availability tag table, indexes, RLS enable + policies (select-all, insert/update/delete by verified owner of parent manufacturer or admin).
- `supabase/migrations/<ts>_manufacturer_owner_update_policies.sql` — RLS UPDATE policies on `manufacturers` (owner-of-self) and `modules` (verified owner of `manufacturerId`). Keeps existing admin/community paths intact (drop-if-exists then re-create policies idempotently).
- `supabase/migrations/<ts>_manufacturer_logo_storage_policies.sql` — storage.objects policies for the `manufacturer-logos` bucket: read-all (already public), write by verified owner or admin.

Tests:

- Unit specs for each new data service (`*-data.service.spec.ts`).
- Backend integration spec mirroring `src/app/features/backend/__tests__/supabase-service/integration-manufacturers.spec.ts` — add coverage for the new GET/add/update calls (with mocked client).
- `DatabaseStrings.spec.ts` — assert new keys are registered.

---

### Layered scope

#### MVP layer (must ship together)

The end-to-end claim → review → owner-edit loop with the smallest possible surface. Each chunk below is
an ordered implementation step. Steps inside a chunk may be parallelised; chunks must be done in order
because later code consumes earlier shapes.

##### Chunk M1 — Schema foundation (LOCAL migrations + types)

> **Stop point:** after generating local types, before any remote apply. Hand back to user.
> **M1 local discovery notes (2026-06-18T11:32+02:00):** read-only inspection found no existing `manufacturer-logos` bucket, so the local storage migration creates it as public; `manufacturers.adminUser` is existing `text`, so policies compare with `auth.uid()::text`; existing `modules` has a broad `update possible` policy, so M1 preserves it and adds a trigger to prevent non-admin `manufacturerId` reassignment. Local type generation is blocked until Docker/local Supabase is available.


1. Draft `add_manufacturer_verification_fields.sql`:
   - `alter table public.manufacturers add column verified_at timestamptz null;`
   - `alter table public.manufacturers add column verified_by uuid null references public.profiles(id);`
   - `alter table public.manufacturers add column tagline text null;`
   - `alter table public.manufacturers add column description text null;`
   - `alter table public.manufacturers add column social_links jsonb null;`
   - Use column DEFAULTs (here, all null) — no `UPDATE … WHERE` backfill.
2. Draft `add_manufacturer_claims.sql`:
   - Create table per CTO decision #2.
   - `alter table public.manufacturer_claims enable row level security;`
   - Policies: `insert` for `authenticated` where `claimant_id = auth.uid()`; `select` where `claimant_id = auth.uid()` OR admin claim; `update` only for admin claim (mirrors `admin_can_update_racks` shape); `delete` for claimant when status = 'pending' (withdraw) and admin always.
   - Indexes: `(manufacturer_id, status)`, partial unique `(manufacturer_id) where status='pending'`, partial unique `(claimant_id) where status='pending'`.
   - Touch-updated trigger reusing existing `tg_touch_*` pattern (or a new one if no generic helper exists — keep it local to this table).
3. Draft `add_module_availability_tags.sql`:
   - Create table per CTO decision #3, with `check (tag in (...))`.
   - RLS enable; `select` to all; `insert/update/delete` to verified owner of parent manufacturer or admin (subquery against `modules` ⨝ `manufacturers`).
4. Draft `manufacturer_owner_update_policies.sql`:
   - Drop-if-exists then create:
     - `manufacturers` `for update to authenticated using (id = (select id from manufacturers m2 where m2.adminUser = auth.uid() and m2.id = manufacturers.id)) with check (...)` — i.e. owner may update only their row.
     - `modules` `for update to authenticated` gated on the verified owner of the current `manufacturerId`; because RLS `WITH CHECK` cannot compare `OLD` and `NEW`, add a trigger to prevent non-admin `manufacturerId` reassignment.
   - Keep existing admin/anon policies intact.
5. Draft `manufacturer_logo_storage_policies.sql`:
   - `storage.objects` insert/update/delete policies scoped to `bucket_id = 'manufacturer-logos'` and the same owner/admin predicate. Read is already public.
6. Run `pnpm updateBackendTypes` against local Supabase; commit regenerated `src/backend/database.types.ts`.
7. Run `pnpm lint` and `pnpm test-headless --include="**/DatabaseStrings.spec.ts"` to baseline.
8. **STOP** — hand back to user for explicit approval to apply remote.

##### Chunk M2 — Backend access layer

Depends on M1 (types must be regenerated).

1. `DatabaseStrings.ts`: register `manufacturer_claims`, `module_availability_tags`.
2. `supabase.cache.ts`: extend cache-key union with `manufacturerClaims`, `manufacturerOwnership`, `pendingManufacturerClaims`, `moduleAvailabilityTags`, `manufacturerWithId` (verify whether already present; if so, reuse).
3. `supabase-get.ts`:
   - `manufacturerClaimByManufacturerForCurrentUser(manufacturerId)` — returns claim or null for the current user (used by claim CTA state machine).
   - `manufacturerOwnershipForCurrentUser(manufacturerId)` — returns boolean (covered by `manufacturers.adminUser = auth.uid()`); single source of truth for owner UI gates.
   - `pendingManufacturerClaims()` — admin-scoped list; cache key `pendingManufacturerClaims`.
   - `moduleAvailabilityTags(moduleId)` — list of `{tag, set_at}`; cache key `moduleAvailabilityTags`.
4. `supabase-add.ts`:
   - `manufacturerClaim({manufacturer_id, proof_note})` — bust `manufacturerClaims`.
   - `moduleAvailabilityTag({module_id, tag})` — bust `moduleAvailabilityTags`, `modules`, `moduleWithId`.
5. `supabase-update.ts`:
   - `manufacturerProfileAsOwner({id, name?, websiteURL?, logo?, tagline?, description?, social_links?})` — explicit select; bust `manufacturers`, `manufacturerWithId`, `manufacturerOwnership`.
   - `manufacturerClaimStatusAsAdmin({id, status, admin_note?})` — server-side trigger handles `verified_at`/`verified_by`/`adminUser` propagation on approval (see decision #5 — the trigger lives in `add_manufacturer_claims.sql`). Bust `manufacturerClaims`, `pendingManufacturerClaims`, `manufacturers`, `manufacturerWithId`, `manufacturerOwnership`.
6. `supabase-delete.ts`:
   - `moduleAvailabilityTag({module_id, tag})` — bust availability + module caches.
   - `manufacturerClaim(id)` — claimant withdraw of own pending claim; bust `manufacturerClaims`, `pendingManufacturerClaims`.
7. `supabase-storage.ts`:
   - `uploadManufacturerLogo(file, filename)` mirroring `uploadCollectionCover` (timestamp-suffixed filename, public bucket, cache control). Bust `manufacturers`, `manufacturerWithId`.
   - `deleteManufacturerLogo(filename)` analogous.
8. Backend integration specs updated for each new call.

##### Chunk M3 — Admin review queue UI

Depends on M2.

1. Create `admin-manufacturer-claims-data.types.ts` mirroring `admin-flags-data.types.ts` — claim row shape, status filter union, claim-list view model.
2. Create `admin-manufacturer-claims-data.service.ts` mirroring `AdminFlagsDataService`:
   - Streams: `_claims$`, `filteredClaims$`, `pendingCount$`, status filter subject, sort subject.
   - Actions: `approveClaim$`, `rejectClaim$`, `requestMoreInfo$` (carries optional admin note), `refresh$`.
   - Pipelines wire each action through `backend.update.manufacturerClaimStatusAsAdmin(...)` and re-fetch via `pendingManufacturerClaims()`.
   - Uses analytics `admin.action_performed` for parity.
3. Create `admin-manufacturer-claims.component.{ts,html,scss}`:
   - Reuse `flags-*` layout language (header, summary badges, toolbar, list rows, action buttons).
   - Each row shows: manufacturer name + link to detail page, claimant name + link, proof note, status, age, admin note (if any), and three action buttons (Approve / Reject / Needs more info — the last opens an inline note field, no dialog per UI guidance).
4. Register component in `BackendModule`; embed `<app-admin-manufacturer-claims>` under `<app-admin-flags>` in `admin-panel-root.component.html`.
5. Specs: data-service spec covering load/filter/approve/reject pipelines; component spec covering empty-state + action wiring.

##### Chunk M4 — Claim CTA on manufacturer detail

Depends on M2.

1. Create `manufacturer-claim-data.service.ts` (scoped to `ManufacturerClaimComponent`):
   - Inputs: `manufacturerId$ = new ReplaySubject<number>(1)`.
   - Derived: `viewerClaim$`, `viewerIsOwner$`, `ctaState$` (enum: `not-authenticated | can-claim | pending | needs_more_info | rejected | owner`).
   - Actions: `submitClaim$ : Subject<{proofNote: string}>`, `withdrawClaim$ : Subject<void>`.
   - Pipelines call `backend.add.manufacturerClaim`, `backend.delete.manufacturerClaim`, then refresh.
   - Analytics: `manufacturer.claim_submitted`, `manufacturer.claim_withdrawn`.
2. Create `manufacturer-claim.component.{ts,html,scss}`:
   - Pure presentation driven by `ctaState$` (template `@switch` over the enum). No imperative methods.
   - For `can-claim`: inline `MatFormField` textarea for proof note + submit button (disabled when empty).
   - For `pending`: status banner + withdraw link.
   - For `needs_more_info`: banner with admin note + textarea + resubmit button (reuses the same action path; backend treats resubmit as a new claim after the previous one is closed — handled by the admin transition, see M2 trigger).
   - For `rejected`: terminal banner ("Reach out to support" copy stub).
   - For `owner`: green confirmation banner + button to toggle edit mode (emitter consumed by parent).
3. Wire `<app-manufacturer-claim>` into `manufacturer-detail.component.html` directly under the hero card, above the stats grid.
4. Update `ManufacturerDetailDataService` to expose `viewerIsOwner$` for downstream gating, sourced from `backend.get.manufacturerOwnershipForCurrentUser(...)`. Cache the value alongside manufacturer load.
5. Specs: claim-data-service state-machine spec; component spec for each `ctaState$` branch.

##### Chunk M5 — Verified-owner profile + logo edit

Depends on M4 (owner state) and M2 (write methods).

1. Create `manufacturer-detail-edit.component.{ts,html,scss}`:
   - Reactive form for `name`, `websiteURL`, `tagline`, `description`, `social_links` (key-value rows), and a file input for the logo using the shared upload component patterns already used by `uploadCollectionCover`.
   - Submit pipeline: optional logo upload → `backend.update.manufacturerProfileAsOwner(...)` → success snackbar + exit edit mode + `ManufacturerDetailDataService.updateManufacturer$.next(id)` to refresh.
   - Cancel button restores untouched values.
2. Extend `ManufacturerDetailDataService` with an `editMode$ = new BehaviorSubject<boolean>(false)` subject and `enterEdit$ / exitEdit$` subjects so the toggle stays reactive (per `REACTIVE_SERVICES` guidance).
3. Wire the edit toggle into `manufacturer-detail.component.html` — when `viewerIsOwner$ | async` and `editMode$ | async`, render `<app-manufacturer-detail-edit>` in place of the read-only header block; otherwise read-only continues to render.
4. Add storage-side guardrails: reject files >2 MB client-side; log size to analytics.
5. Specs: form-validation spec for edit component; data-service spec for editMode toggle and refresh.

##### Chunk M6 — Per-module availability tags

Depends on M2 (availability methods) and M5 (owner context).

1. Add `MODULE_AVAILABILITY_TAGS` const tuple to `src/app/models/module-availability.ts`, with `{value, label, tone, icon}` entries for each of the seven enum values from the backlog decision.
2. Create `module-availability-chips.component` (read-only): consumes an availability list, renders chips using `mat-chip-set` with the design-language tone map. Used universally; visible to everyone.
3. Create `module-availability-editor.component` (owner-only): consumes the same list plus the available enum, emits add/remove events through Subjects to the parent data service (avoid imperative `setTags` methods).
4. Extend `module-minimal.component`:
   - Add `showAvailabilityTags: boolean` (default `false`) and `ownerAvailabilityEditor: boolean` (default `false`) to `ModuleMinimalViewConfig`.
   - Conditionally render the read-only chips or the editor.
   - On the manufacturer detail page, set both flags to `true` when `viewerIsOwner$`.
5. Extend `ManufacturerDetailDataService` (or split into a small `ManufacturerAvailabilityDataService` if size grows past 250 lines) with:
   - `availabilityByModule$: Observable<Map<number, AvailabilityTag[]>>` — fetched in parallel with the module list.
   - `addAvailability$ / removeAvailability$` subjects that call backend `add` / `delete` and refresh.
6. Module list refresh strategy: bust `moduleAvailabilityTags` cache + emit on `availabilityByModule$` after each write; no need to re-fetch the full module list.
7. Specs: chip-component snapshot spec (DOM only — no logic); editor spec for emit-on-toggle; data-service spec for parallel fetch + cache busting.

##### Chunk M7 — End-to-end validation

Depends on M3 + M4 + M5 + M6.

1. `pnpm lint` clean (resolve any new layering/baseline notes by refactoring, not by baseline edits unless explicitly justified).
2. `pnpm test-headless --include="**/manufacturer*.spec.ts"` (claim service, edit component, availability chips/editor, data service updates).
3. `pnpm test-headless --include="**/admin-manufacturer-claims*.spec.ts"`.
4. `pnpm test-headless --include="**/supabase-service/integration-manufacturers.spec.ts"`.
5. Manual UI verification via `patcher-ui-debug` skill — capture screenshots of:
   - Manufacturer detail page CTA states (not-logged-in, can-claim, pending, owner) by stubbing the data-service streams locally.
   - Admin queue with at least one synthetic pending claim.
   - Owner edit mode with logo preview.
6. Run `node scripts/checks/check-docs.cjs` to confirm this plan + decision log stay valid.

#### Structural layer (next-iteration scope, not in MVP cut)

- Multi-owner support: introduce the deferred `manufacturer_accounts` join table; migrate `adminUser` reads behind a helper view.
- Owner-side audit: small `manufacturer_audit_log` table fed by triggers on `manufacturers` and `modules` updates whenever `auth.uid()` matches the verified owner.
- Manufacturer-page analytics surface for verified owners (page views, claim funnel, module availability completeness).
- Cooldown / cooldown-bypass for rejected claims (currently terminal).
- Email/domain pre-verification path layered on top of the proof-note path.

#### Polish layer (after Structural)

- Custom availability tag icons + colour calibration with designer persona using `internaldocs/DESIGN_LANGUAGE.md` as ground truth.
- Rich social-links validation + auto-iconography per platform.
- Manufacturer logo cropper UX.
- Admin queue keyboard shortcuts (a/r/n) mirroring `AdminFlagsComponent` if it grows them.
- Rate limiting for claim submission (Supabase RPC + client throttling).

---

### Risks and dependencies

| Risk | Mitigation |
|---|---|
| RLS policies on `manufacturers` UPDATE collide with existing admin/anon policies | All new policies use `drop policy if exists` + `create policy` per migration; admin UPDATE remains explicit |
| Owner UPDATE policy on `modules` lets a verified owner reassign a module to a different `manufacturerId` | PostgreSQL RLS cannot compare `OLD` and `NEW`; M1 adds `trg_prevent_module_manufacturer_reassign_for_non_admin`. Manual test plan: attempt UPDATE that flips `manufacturerId` and confirm it fails for non-admin users |
| Trigger that sets `adminUser`/`verified_at` on claim approval mutates `manufacturers.updated` | Use `disable trigger user` strategy inside the function or write the update with `updated = updated` per BACKEND_METHODS.md §1 if `manufacturers` ever grows a touch-updated trigger; today it does not, but the helper is reusable |
| Storage policy regression on `manufacturer-logos` bucket | Migration creates the bucket as public when absent and uses explicit, named `storage.objects` policies for owner/admin writes; validate with read-only policy inspection before remote apply approval |
| `social_links jsonb` schema drift (clients write inconsistent shapes) | Client-side validator restricts keys to a known list initially (`twitter`, `instagram`, `facebook`, `youtube`, `bandcamp`, `mastodon`, `website_other`); enforce in the form layer before write |
| Cache-key explosion as we add five new keys | Re-audit `CachedEntity` union after Chunk M2 to ensure naming consistency and no duplicates |
| Local migration drift vs remote | Plan stops before remote apply; do not auto-merge migration commits — flag the chunk M1 deliverable as "requires user remote-apply approval" before downstream chunks proceed in production data |

#### Hard dependencies

- Local Supabase environment must be running so `pnpm updateBackendTypes` succeeds before Chunk M2.
- `MAT_FORM_FIELD` infrastructure already used elsewhere — no new Angular Material imports needed beyond what `BackendModule` and `ManufacturerModule` already pull in (`MatFormFieldModule`, `MatSelectModule`, `MatChipsModule` if not present must be added to `ManufacturerModule`).

### Validation strategy (summary)

- **Static:** `pnpm lint` (layering + 500/1000 LOC budgets; split any service that exceeds them rather than editing the baseline).
- **Unit:** targeted `pnpm test-headless --include="..."` per chunk; full suite once before completion.
- **Backend types:** `pnpm updateBackendTypes` must succeed after every migration touch; failure indicates a remote/local schema drift to resolve.
- **RLS sanity:** manual policy review post-migration; run `supabase` advisor MCP `get_advisors` (read-only) before remote apply approval is requested.
- **UI:** `patcher-ui-debug` skill snapshots for each CTA state + admin queue + edit mode.
- **No e2e required for MVP** — claim flow is admin-gated and not covered by current `pnpm test:e2e` suites; defer to Structural layer.

### Handoff notes

- Suggested execution order: implementer takes Chunk M1 first, **pauses at step 8 for remote-apply approval**, then M2 through M6 in order, then M7. Each chunk is small enough that a single implementer can own it end-to-end.
- After M1 implementer pauses, planner does not need to be re-engaged unless a CTO decision above must be revisited.
- After M6, run the `reviewer` persona on the cumulative diff (use `internaldocs/agents/reviewer.md`) before M7's manual verification. UI verification of M5 and M6 is best paired with the `designer` persona because it touches visible surfaces.
- The `bug-hunter` persona should be on standby for any RLS-related runtime errors surfaced by the Supabase logs after remote apply.

### Next-task staging decision

- 2026-06-18T10:30+02:00 — Round 1 selected `module-public-possession-statistics-trend-charts` because its Phase 1 query path exists but the public detail rendering/coverage still needs completion; Phase 2 is schema-approval blocked.
- 2026-06-18T10:34+02:00 — Implemented the Phase 1 stat row in `app-module-details`, passing counts from the detail data service through `app-module-composite`; removed the heavier Community data card so sub-threshold cohorts cannot leak through a second rendering path.
- 2026-06-18T10:40+02:00 — Round 1 completed and archived. Round 2 / 5 checked the remaining backlog and selected no task: all remaining open items are blocked by explicit Supabase/RLS/schema approval, credential/account setup, external service access, product-owner validation, or prerequisite manufacturer-account work.
- 2026-06-18T11:21+02:00 — Planner persona produced this concrete implementation plan after the user approved local-only schema/RLS/storage work for Manufacturer Accounts & Verification. No code changes made in this pass; backlog plan `internaldocs/workflow/plans/manufacturer-accounts-verification.md` carries the source-of-truth decision log.
