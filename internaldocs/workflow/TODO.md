# TODO

> **Rules for AI agents using this file:**
> 1. **Pick one task** from the Backlog — immediately cut it from Backlog and paste it under Active *before* doing any
     other work. Do not start implementation until the file reflects the task as Active.
> 2. **Update steps inline as you go** — check off `[ ]` → `[x]` after completing each step; save the file before moving
     to the next step. Never leave Active half-finished when handing back.
> 3. **On completion** — move the task to [COMPLETED.md](./COMPLETED.md) as a one-line summary (date + what changed),
     then clear Active. Also reset `CURRENT_FEATURE.md` to its Empty Template.
> 4. **Domain detail lives in `CURRENT_FEATURE.md`** — implementation steps, file names, schema fields, test results,
     and gotchas go there while a feature is in progress. Only a one-line entry per feature belongs here.
> 5. **Do not duplicate** strategy rationale already in `../product/PRINCIPLES.md` or `../product/ROADMAP.md`; one sentence of
     context per task is enough.

**Tasks are ordered by priority within each section.**

---

## Legend

- `[ ]` — Not started
- `[~]` — In progress
- `[x]` — Done

## Active

*None — pick a task from the Backlog below.*

---

> Two tracks run in parallel: **Product** (user-facing features) and **Infra** (tests, tooling, hygiene).
> Product tasks are sequenced by the Tier 0 → Tier 1 → Tier 2 arc from [../product/ROADMAP.md](../product/ROADMAP.md).
> Infra tasks are independent and can be picked any time a product task is blocked.

---

### PRODUCT — Tier 0 (ship in any order; no external dependencies)

---

#### MEDIUM: Admin — Rack Image Upload

**Why:** Users often don't upload cover images for their racks. The admin needs to be able to
set or replace those images manually to improve the quality of public listings and social previews.
Regular users must **not** be able to update images on racks they don't own; only the admin can
edit any rack's image regardless of ownership.

**Access model (critical):**
- **Admin only** — image upload/replace is an admin-panel-only action. No user-facing UI for
  editing another user's rack image, ever.
- **RLS intent:** the existing `racks` RLS allows owners to update their own rows. The admin
  update must bypass RLS via a `SECURITY DEFINER` RPC (same pattern as the public_id RPCs) so
  that the admin's authenticated session can write `image_url` on any rack without touching
  the existing owner-scoped policies.
- **Never expose this RPC to `authenticated` or `anon` roles** — grant execute to the
  admin service-role key only (called server-side or via a dedicated admin Supabase client
  initialised with the service-role secret, not the anon key).

**Scope:**
- Admin panel only; no user-side upload path now or implied later.
- One image per rack (the cover/hero image); target field is `racks.image_url`.
- Upload via Supabase Storage bucket (reuse existing bucket or provision `rack-images` with
  public read / service-role write).
- No client-side image editing in Layer 1 — accept raw file, display with `object-fit: cover`.

**Checklist:**

- [ ] Confirm `racks.image_url` column exists and is in `DatabaseStrings.ts`; add if missing.
- [ ] Provision (or reuse) a `rack-images` Supabase Storage bucket — public read, service-role write only.
- [ ] Add a `SECURITY DEFINER` RPC `admin_set_rack_image_url(p_rack_id int, p_url text)` — callable only via service-role; not granted to `anon` or `authenticated`.
- [ ] Add `backend.admin.setRackImageUrl(rackId, url)` to `SupabaseService`, initialised with the service-role client (not the anon client).
- [ ] Build `AdminRackImageUploadComponent` (file input → upload to Storage → call RPC → snackbar).
- [ ] Wire the component into the admin rack detail view, behind the existing admin auth guard.
- [ ] Verify existing `racks` RLS is **not** relaxed — only the new SECURITY DEFINER RPC changes what the admin can write.
- [ ] Unit-test: upload triggers the correct storage path and RPC; error path shows snackbar; component is not reachable without admin role.

---

#### HIGH: Module Possession States

**Why:** Allows users to track modules as owned/wanted/for-sale — the DB already supports it
(`user_modules.kind` enum `HAS|WANTS|SELLS`). High solo-user value, no external dependencies.
**Source:** `internaldocs/product/ROADMAP.md` → Tier 0 → "Module Possession States"

Layer 1 (MVP — module detail segmented control): **shipped 2026-05-15 on `agent/autonomous-20260515`**

Remaining (Layer 2 — user area integration):

- [ ] Filter "My Modules" user-area to `HAS`+`SELLS` by default; add Wishlist view for `WANTS`
- [x] Filter rack/patch editor module picker to `HAS`+`SELLS` only
- [x] `SELLS` inline badge in user-area module list

---

#### MEDIUM: Module Browser — Tag Filter UX improvements

**Why:** The tag selector in the module navigator is hard to use at scale: the current UI is a
plain scrollable list. Tags should instead be shown as grouped, selectable chips — mirroring the
`proposer-groups` panel already in `module-tags.component.html` — so the picker is graphical,
scannable, and repeatable rather than a wall of text to scroll.

- [x] **Replace the flat tag list with a rich grouped-chip picker.** Reuse (or extract into a
      shared component) the `proposer-groups` pattern from
      `src/app/components/module-parts/module-minimal/module-tags/module-tags.component.html`:
      tags grouped by category label, each rendered as a `mat-chip-option` inside a
      `mat-chip-listbox [multiple]="true"`. The picker opens inline (not a dropdown) below the
      filter controls so all groups are visible at once. Selected chips highlight via Angular
      Material's built-in `[selected]` binding.
- [x] Add a **search input** at the top of the chip picker to filter visible tags in real-time.
      Wire it as a local `BehaviorSubject<string>` with `debounceTime(300)` +
      `distinctUntilChanged`; filtering is client-side (tags already loaded). Clears on reset.
- [x] Add a small **AND / OR toggle** (`mat-button-toggle-group`) above the chip groups.
      Default: OR (current implicit behaviour).
      - **OR** — modules matching *any* selected tag are returned
      - **AND** — only modules carrying *all* selected tags are returned
- [x] Add a **tag-match relevance sort** to the module browser results. When one or more tags are
      selected, expose a sort option "Best match" (or similar label) that ranks modules by the
      number of selected tags they satisfy — descending (most matching tags first). This is a
      client-side derived score: `matchScore = selectedTags.filter(t => module.tags.includes(t)).length`.
      "Best match" should become the default sort automatically when tags are active; revert to the
      previous sort when all tags are deselected. In OR mode the score drives the ranking; in AND
      mode all shown modules satisfy every tag so the score is always equal — in that case "Best
      match" collapses to the secondary sort (e.g. alphabetical) and the option can be hidden.

---

#### HIGH: Rack Editor — Optimistic / diff-based updates (no full-reload flash)

**Why:** Every destructive rack operation (remove module, reorder, etc.) triggers a full data
reload that flashes the entire view, making it impossible to track which module was just
affected. The goal is to eliminate full-page re-renders for rack mutations and make every
change feel instant and local.

**Layer 1 — Exit animation before reload (quick win)**

- [x] Add a CSS/Angular-animation exit sequence to the module tile in the rack visual model
      (`rack-visual-model` / `module-realistic` component). When a remove action is confirmed,
      play the exit animation on the specific tile first (e.g. fade+scale-down, ~180 ms),
      *then* trigger the backend delete and reload pipeline. This ensures the user always sees
      which module was removed before the view updates. Use the existing `[@leave]` animation
      pattern already present in `module-tags.component.html` as reference.

**Layer 2 — Optimistic / diff-based state (structural)**

- [x] Replace the "delete → full reload" pattern with an **optimistic local update**: on
      remove, immediately splice the module out of the in-memory rack state (the observable
      driving the visual model) and fire the backend call in the background. On backend success,
      do nothing (state is already correct). On error, restore the original state and show an
      error snackbar.
- [x] Apply the same diff pattern to **reorder** operations: `requestRackedModulesDbSync$`
      pipeline now captures a snapshot before backend sync and restores on error.
- [ ] Apply the optimistic diff pattern to **add** operations (harder — requires DB-generated ID).
- [ ] Audit `rack-detail-data.service.ts` for every place a full `rackWithId` cache bust +
      reload is triggered after a write; replace each with a targeted `state$.next(patchedState)`
      emission where the operation is local enough to compute the new state deterministically.
- [ ] Long-term: no rack operation should cause a visible full-page re-render. Track remaining
      full-reload call sites as tech debt until all are eliminated.

---

### PRODUCT — Tier 1 (requires Manufacturer Page Phase 2 to be live)

---

#### HIGH: Manufacturer Accounts & Verification

**Why:** Manufacturer pages need a trustable ownership model before official-field editing, updates, analytics, or B2B surfaces can ship.
**Blocked on:** Explicit user approval for any required Supabase/RLS policy work around `manufacturer_accounts`.

- [ ] Add the minimal `manufacturer_accounts` table shape and generated types once policy work is approved
- [ ] Add claim read/create methods scoped to manufacturer detail surfaces
- [ ] Add CTA states for claim, pending review, and ownership-review request
- [ ] Limit first verified edits to official profile fields, MSRP, and official links
- [ ] Keep shared catalogue edits audited or review-gated

---

#### LOW: Manufacturer Updates / Featured Surface

**Why:** Verified manufacturers need a compact way to highlight new releases, updated modules, featured products, and
important notices without turning Patcher into a blog platform.
**Depends on:** Manufacturer Accounts & Verification.

- [ ] Add manufacturer-owned update entries with title, body, timestamp, optional linked module
- [ ] Add "featured modules" controls for verified manufacturers
- [ ] Show a compact "what's new" / "featured" section on manufacturer detail pages
- [ ] Define hard constraints up front: posting limits, entry length, expiry/archive model, and reporting flow
- [ ] Define moderation / visibility rules for official update entries

---

#### LOW: Manufacturer Analytics

**Why:** Verified manufacturers need aggregate insight into catalogue performance and audience interest inside Patcher.
**Depends on:** Manufacturer Accounts & Verification.

- [ ] Validate with a small set of boutique manufacturers what they would actually want from analytics before building it
- [ ] Define privacy-safe aggregate metrics (views, outbound clicks, collection count, public rack count, public patch count)
- [ ] Define minimum thresholds below which metrics are hidden instead of shown
- [ ] Add manufacturer dashboard queries / aggregation layer
- [ ] Add private analytics UI for verified manufacturers
- [ ] Document privacy boundaries so no user-level ownership data is exposed

---

#### LOW: Manufacturer API / Widgets Pilot

**Why:** Long-term B2B angle — let manufacturers use Patcher as lightweight catalogue infrastructure, not only a public page.
**Depends on:** Manufacturer Accounts & Verification.

- [ ] Decide first deliverable: narrow embeddable widget vs authenticated API, using the smallest credible B2B wedge
- [ ] Define manufacturer-owned fields safe for programmatic access
- [ ] Design minimal auth / key model for verified manufacturers
- [ ] Pilot one narrow integration path (e.g. module card widget or official-profile sync)

---

### INFRA (independent; pick any time a product task is blocked)

---

---

#### LOW: Filter inputs — focus-triggered preset chips overlay

**Why:** Numeric and certain text filter fields require manual typing even when the vast
majority of users pick from a small set of common values. Surfacing 3–4 preset chips on
focus saves keystrokes and is faster than typing, without replacing the ability to type a
custom value.

**Interaction model:**
- On `focus`, a small overlay/panel appears **above or below** the input (aligned to the
  input width, never wider) containing up to 4 preset chips.
- Clicking a chip fills the control value and dismisses the overlay — identical to typing
  that value.
- The overlay dismisses on blur or on Escape. It does **not** block the user from typing.
- If the control already has a value that matches a preset, that chip is highlighted.

**Implementation approach:**
`mat-form-entity.component` already imports `MatAutocomplete`. Add an optional
`@Input() presets: (string | number)[]` input (empty by default — zero-impact on existing
uses). When `presets` is non-empty and the field type is `numeric` or `text`, wire a
`matAutocomplete` panel with the preset options rendered as compact chips rather than the
standard autocomplete list style. This reuses the existing CDK overlay infrastructure.

Alternatively, implement as a standalone wrapper directive `AppInputPresetsDirective` that
can be applied to any `mat-form-field` — more composable, zero changes to the existing
component.

**Fields that benefit from presets (initial set):**

| Field | Presets |
|-------|---------|
| HP (module filter) | `2, 4, 8, 16` |
| HP (rack creator) | `84, 104, 126, 168` |
| Rows (rack creator) | `3, 4, 6, 9` |
| Any HP numeric in forms | same as module filter |

More fields can opt in by passing `[presets]` — the mechanism is generic.

**Checklist:**

- [x] Decide implementation: extend `mat-form-entity` with `@Input() presets` vs standalone
      directive. Prefer directive for composability.
- [x] Build the preset overlay (4 chips max, compact, dismisses on blur/Escape/chip click).
- [x] Wire preset chips to set the `FormControl` value directly.
- [x] Apply to HP filter field in module browser and manufacturer page.
- [x] Apply to rack creator HP + rows fields.
- [x] Unit-test: preset chip click sets correct control value; overlay absent when
      `presets` is empty.

---

#### MEDIUM: Manufacturer page — parity with module browser filters

**Why:** The manufacturer detail page shows modules via `app-module-list` with only
`[showSearch]="true"` and `[showOrder]="true"` — basic name search and sort. The full
module browser has a sidebar with: **name, description search, HP condition + value,
standard, tags, sort, reset**. Users navigating a manufacturer's catalogue cannot filter
by standard (1U vs 3U), HP size, or tags — common operations when browsing a large
catalogue like Mutable or Make Noise.

**Current state:**
- `app-module-list` has `showSearch` (local name filter) and `showOrder` (sort + group).
- `defaultGroupId='standard'` is already set on the manufacturer page — grouping by
  standard already works, it just can't be *filtered*.
- All advanced filters in the module browser are server-side via `ModuleBrowserRootDataService`;
  on the manufacturer page all modules are loaded client-side (manageable — manufacturer
  catalogues are small enough for client-side filtering).

**Approach — shared filter bar component:**

Extract the advanced filter controls into a reusable `ModuleFilterBarComponent` (or extend
`app-module-list` inputs) so the same filters appear in both contexts without code
duplication. Client-side filtering is acceptable on the manufacturer page (no pagination
needed for a single manufacturer's catalogue).

**Filters to add to manufacturer page (parity):**

| Filter | Already present | Notes |
|--------|----------------|-------|
| Name search | ✅ via `showSearch` | keep |
| Sort / group | ✅ via `showOrder` | keep, including `defaultGroupId='standard'` |
| Standard (1U / 3U) | ❌ | most requested — lets user focus on 1U tiles only |
| HP condition + value | ❌ | useful for large catalogues |
| Tags | ❌ | filter by function category |
| Description search | ❌ | low priority, add if the shared component makes it free |
| Reset button | ❌ | add alongside other filters |

**Manufacturer-specific controls to preserve:**
- The stat showcase grid above the module list (stays unchanged).
- `defaultGroupId='standard'` grouping — keep as default even when the standard filter
  is active (consistent visual structure).

**Checklist:**

- [x] Audit `app-module-list` and decide: extend with more `@Input()` filter flags, or
      extract a separate `ModuleFilterBarComponent` that wraps the `LocalDataFilterService`
      pattern. Prefer extraction if 3+ contexts will need the same bar. **Decision: extended
      app-module-list with `@Input() showFilters = false` — only 2 contexts currently.**
- [x] Implement client-side standard / HP / tag filtering in the manufacturer context
      (pipe on the `modulesData$` stream, no new backend queries).
- [x] Add the filter controls to `manufacturer-detail.component.html` — compact inline
      bar or collapsible panel (not a full sidebar; the manufacturer page layout is narrower).
- [x] Add reset functionality.
- [x] Ensure the `defaultGroupId='standard'` grouping behaviour is preserved after
      filtering (filtered results still group by standard if grouping is active — sorting
      and grouping are separate from filtering in the pipeline).
- [ ] Reduce duplication: if a shared component is extracted, update the module browser
      root to use it too — one source of truth for filter controls. (Deferred: server-side
      vs client-side filtering means module browser cannot trivially share the same bar.)

---

#### MEDIUM: Module — public possession statistics & trend charts

**Why:** Aggregated counts of how many users own, want, or have sold a module are a
genuinely useful signal — both for individual buyers ("is this in demand?") and for the
community over time (trend discovery, discontinued-module demand, collector interest).
Combined with the "Cool" count this forms a lightweight community layer on every module
page.

**Static counts (Phase 1 — easy):**

Display on the module detail page (public, no login required to *view*):

| Stat | Label | Source |
|------|-------|--------|
| # users with `HAS` | `★ 42 own this` | `COUNT(user_modules WHERE kind='HAS' AND module_id=X)` |
| # users with `WANTS` | `◎ 17 want this` | `kind='WANTS'` |
| # users with `SELLS` | `$ 3 selling` | `kind='SELLS'` |
| # users with `COOL` | `✦ 89 find this cool` | `kind='COOL'` (once that feature lands) |

- Use Supabase `count` aggregation — a single query per module, no new table needed.
- Cache aggressively (e.g. 5-minute TTL) — these numbers don't need to be real-time.
- Counts are anonymous (no user identity exposed). Minimum threshold: hide counts below 3
  to avoid exposing individuals in small cohorts (privacy principle from `ARCHITECTURE.md`).
- Placement: a compact stat row near the module header — small numerals + icons, not a
  dashboard. Should feel incidental, not the main attraction.

**Trend charts (Phase 2 — requires historical data):**

To show trends, ownership events need to be timestamped. Two approaches:
- **Option A (event log):** add an `user_module_events` table
  `(user_id, module_id, kind, action: 'add'|'remove', created_at)`. Every upsert/delete on
  `user_modules` appends a row. Enables full trend reconstruction.
- **Option B (snapshot):** a scheduled DB function (e.g. daily) inserts aggregate counts
  into a `module_possession_snapshots` table `(module_id, kind, count, snapped_at)`.
  Simpler, lower storage cost, loses intra-day resolution.
*Recommendation: Option B for now — daily snapshots are sufficient for trend visibility
and avoid per-user event logging privacy concerns.*

Charts to show (module detail page, collapsed behind a "Trends" toggle to keep the page
light by default):
- **Ownership over time** — line chart: HAS count per day/week.
- **Demand signal** — WANTS count over time (spike near a new firmware = community buzz).
- **Market activity** — SELLS count over time (spike = surplus/discontinuation signal).

**Implementation notes:**

- Phase 1 has no schema change — pure query addition.
- Phase 2 Option B requires a new `module_possession_snapshots` table and a scheduled
  function — **needs explicit user approval** before adding (per `AGENTS.md §5`).
- Chart component: reuse or wrap an existing lightweight chart (check if any chart lib is
  already in `package.json` before adding a new dependency).
- All queries route through `SupabaseService`; add to `DatabaseStrings.ts` before writing
  backend methods.

**Checklist:**

- [x] Phase 1: add `getModulePossessionCounts(moduleId)` to `supabase-queries.ts`; wire
      into module detail data service; render stat row in module detail template.
- [x] Apply minimum-3 display threshold and cache TTL.
- [ ] Phase 2: decide Option A vs B with product owner; get approval for schema change.
- [ ] Phase 2: implement snapshot function + chart component once schema is approved.

---

#### LOW: Module — "Cool" appreciation button

**Why:** Users want a lightweight, low-commitment way to bookmark a module they find
interesting or aesthetically appealing — separate from ownership intent. "I think this is
cool" is not "I want to buy it" and not "I own it". It is a pure appreciation signal,
useful for personal curation and potentially for community interest signals later.

**Product concept:**
- A single tap button on the module card/detail (edit mode not required — visible to any
  logged-in user on any module page).
- Label/icon: something expressive and playful — e.g. a spark/star/flame icon, not a
  thumbs-up (too generic). Animation on tap: small burst/pop effect (similar to the iOS
  like animation pattern).
- Togglable: tap again to un-cool.
- Count visible publicly on the module (e.g. `✦ 42`) so it doubles as a community signal.
- The personal state (did *I* cool this?) is private per user.

**DB approach (minimal schema change):**
Add `COOL` to the existing `"user module possession"` Postgres enum on `user_modules.kind`.
Current enum: `HAS | WANTS | SELLS` → becomes `HAS | WANTS | SELLS | COOL`.
This means a user can have exactly one kind per module row (the PK is `user_id + module_id`).
**Open question:** should a user be able to mark a module as both `COOL` and `WANTS`
simultaneously? With the current single-kind model they cannot. Decide before implementing:
- **Option A (simple):** `COOL` is exclusive like the others — if you mark cool, it replaces
  any existing kind. Simplest, lowest risk.
- **Option B (additive):** `COOL` lives in a separate `user_module_appreciations` table so
  it is independent of possession state. More flexible, requires a new table.
*Recommendation: start with Option A for MVP; migrate to B if the use case demands it.*

**Requires explicit user approval** before any DB enum change or migration (per `AGENTS.md §5`).

**Checklist (do not implement until design questions resolved):**

- [ ] Decide Option A vs B with product owner.
- [ ] If Option A: add `COOL` to the `"user module possession"` enum via migration
      (requires approval). Update `UserModulePossessionKind` type and generated DB types.
- [ ] Add `backend.update.userModulePossession(moduleId, 'COOL' | null)` action (reuses
      existing upsert pattern in `ModuleDetailDataService`).
- [ ] Add the Cool button to `module-minimal` (and/or module detail) alongside the existing
      `HAS | WANTS | SELLS` toggle group — visually distinct (not part of the segmented
      control, separate smaller affordance).
- [ ] Tap animation: CSS keyframe burst or Angular animation on the button icon.
- [ ] Public cool count: aggregate query or cached counter on the module row.
- [ ] Unit-test the toggle action and the count display.

---

#### MEDIUM: Module / Patch / Rack browser — replace pagination with "Load more"

**Why:** Page-based pagination interrupts browsing flow and loses scroll position. For
exploratory browsing of modules, patches, and racks, a "Load more" button at the bottom
is more natural: the user stays in context, results accumulate, and the action is explicit
(no accidental infinite scroll).

**Pattern: explicit "Load more" (not auto-scroll infinite load)**
Auto-loading on scroll is rejected because: it makes the footer unreachable, it can trigger
unintentional loads, and it is harder to share a specific position. A visible **"Load more"**
button gives the user control and is still far better than page navigation.

**Where to replace pagination → "Load more":**

| Context | Current | Proposed |
|---------|---------|----------|
| Module browser (`module-browser-root`) | `mat-paginator` server-side | **Load more** |
| Patch browser (`patch-browser-root`) | `mat-paginator` server-side | **Load more** |
| Manufacturer module list (`manufacturer-browser-root`) | `mat-paginator` | **Load more** |
| Public profile — racks tab | `mat-paginator` | **Load more** |
| Public profile — modules tab | `mat-paginator` | **Load more** |

**Where to keep classic pagination:**

| Context | Reason to keep |
|---------|---------------|
| User comments (`user-comments`) | Dense tabular list; user navigates to find a specific comment by date/page |
| Any admin / data-repair tables | Position-aware navigation needed |
| Module picker inside rack/patch editor | Small count, not a browsing context |

**Technical approach:**

The module browser already uses `skip$` / `take$` BehaviorSubjects for server-side
pagination. "Load more" is a straightforward adaptation:
- On "Load more" click: `skip$.next(currentItems.length)` → fetch next page → **append**
  to existing list (not replace). The current pattern replaces the list on every page
  change — the data service needs a `loadMore$` subject that accumulates results via
  `scan((acc, items) => [...acc, ...items], [])`.
- Filter/sort changes reset the accumulated list back to page 1 (same as current
  `paginatorToFirstPage$` logic, just clears the accumulator).
- The "Load more" button shows a count hint: *"Load 20 more (340 remaining)"*. Hidden when
  all results are loaded.
- On SSR / first load: render the first page normally (no change to SSR behaviour).

**Checklist:**

- [ ] Refactor `ModuleBrowserDataService`: add `loadMore$: Subject<void>`, change
      `modulesList$` pipeline to accumulate pages via `scan` instead of replace.
      Reset accumulator on filter/sort change.
- [ ] Replace `mat-paginator` in `module-browser-root.component.html` with a
      `AppLoadMoreButtonComponent` (new shared component: button + remaining-count label).
- [ ] Apply same pattern to `PatchBrowserDataService` + template.
- [ ] Apply same pattern to `ManufacturerBrowserRootComponent` (client-side — simpler,
      just slice the local array and grow the slice on each "load more").
- [ ] Apply same pattern to public profile rack/module tabs.
- [ ] Keep `mat-paginator` in `user-comments` and any data-table context.
- [ ] Ensure back-navigation restores scroll position and loaded items (use Angular
      route scroll strategy + serialise loaded count in router state if needed).

---

#### HIGH: Bug — 1U module placeholder wrong aspect ratio

**Why:** When a 1U module has no panel image, the grey placeholder rectangle shows with
3U-like tall proportions instead of the correct wide, flat 1U shape (see screenshot:
"1U Mult" — Intellijel 1U 10HP — shows as a narrow portrait rectangle instead of a
landscape slab). Pulp Logic 1U is also likely affected.

**Root cause (confirmed by template inspection):**

In `module-part-image.component.html`, the `!filename` placeholder branch:

```html
<div [fxFlex]="data.hp/sizeDivider/2+'rem'"
     [ngStyle]="fixedHeight ? {} : {height:((bag.height)/sizeDivider/2+'rem')}"
     class="preview img">
```

`[fxFlex]` is used to set the **width** (HP-based), but `fxFlex` in an Angular FlexLayout
context sets the **flex-basis** along the main axis. If the parent `lib-screen-wrapper`
uses a **column** flex layout, `fxFlex` applies along the vertical axis — so `data.hp`
sets the **height** and `bag.height` (format height in rem) ends up wrong or ignored.
This produces portrait proportions for a 10HP 1U module (should be wide, flat).

Compare with the `filename` branch: `<img [ngStyle]="{maxHeight:...}"` only constrains
height and lets the image fill width naturally — it does not have this problem because
actual images have intrinsic dimensions.

**Fix:**

Replace `fxFlex` with an explicit `[ngStyle]` width binding on the placeholder `<div>`:

```html
<div [ngStyle]="fixedHeight
       ? {}
       : { width: (data.hp / sizeDivider / 2) + 'rem',
           height: (bag.height / sizeDivider / 2) + 'rem' }"
     class="preview img">
```

This makes the dimensions explicit and immune to flex-direction.
Verify `fixedHeight` path also sets correct 1U proportions.

**Checklist:**

- [x] Fix `module-part-image.component.html` placeholder `<div>`: replace `[fxFlex]`
      width with `[ngStyle]` explicit width + height binding.
- [ ] Verify fix visually for Intellijel 1U (standard.id=1) and Pulp Logic 1U
      (standard.id=2) with a module that has no panel image. (manual — requires live app)
- [x] Verify 3U placeholder is unaffected. (no template change to the 3U path)
- [x] Verify `fixedHeight=true` mode also renders correct proportions for 1U.
      (CSS `.preview--fixed-height` already enforces width:100% height:8rem — ngStyle emits {})
- [ ] Snapshot/visual test with Playwright if feasible.

---

#### LOW: Module tags — axis-colour tinting (code-highlighting style)

**Why:** Module tag chips are currently all the same neutral colour. Since each tag already
maps to a balance analysis axis (`voices`, `modulation`, `utilities`, `timing`, `tone`)
via `RACK_BALANCE_AXES[n].dbTagNames`, the axis colour can be applied directly to the chip
— giving an instant visual grammar identical to the balance radar. Tags that don't map to
any axis remain neutral.

This is the same colour system proposed for description keyword highlighting — one shared
palette, two surfaces.

**Tag-to-axis mapping:**
The mapping already exists in `RACK_BALANCE_AXES[n].dbTagNames` (exact string match) and
`purposePatterns` (regex). Extract a pure function:

```ts
// rack-balance-analysis.utils.ts (new or alongside constants)
export function resolveTagAxis(tagName: string): RackBalanceAxisId | null
```

This function iterates `RACK_BALANCE_AXES`, checks `dbTagNames` first (exact), then
`purposePatterns` as fallback. Returns the axis id or `null` for unmapped tags. Pure,
zero dependencies, fully unit-testable.

**Visual treatment:**
- Chips get a CSS class `tag-chip--axis-{axisId}` (e.g. `tag-chip--axis-voices`).
- Style: **very light tint** — e.g. a barely-there background from the axis colour at
  10–15 % opacity, or a coloured left border (2 px). Not a solid fill — the chip should
  still read as a chip, not a coloured badge.
- Exact tokens from `internaldocs/DESIGN_LANGUAGE.md` / active theme CSS custom properties
  (same tokens used for description keyword colouring and the balance radar polygon).
- Unmapped tags: default chip style, no tint.

**Scope:**
- Apply in the module browser tag display (`module-tags.component`) and on the module
  detail page.
- Controlled by a `viewConfig` flag `colorTagsByAxis: boolean` (default `false`; opt-in
  per context) so it can be turned off where the visual density would be too high (e.g.
  rack editor tile tooltips).

**Checklist:**

- [ ] Extract `resolveTagAxis(tagName: string): RackBalanceAxisId | null` as a pure
      exported function in `rack-balance-analysis.utils.ts` (or alongside the constants).
- [ ] In `module-tags.component`, bind `[class]="'tag-chip--axis-' + resolveTagAxis(tag.name)"` 
      conditionally when `viewConfig.colorTagsByAxis`.
- [ ] Add SCSS rules for each `.tag-chip--axis-{id}` using CSS custom properties.
- [ ] Add `colorTagsByAxis` to `ModuleMinimalViewConfig` (default `false`).
- [ ] Enable in module browser and module detail contexts only.
- [ ] Unit-test `resolveTagAxis` for all known `dbTagNames` and a few unmapped strings.
- [ ] **Reuse** `resolveTagAxis` in the description keyword highlight pipe — single source
      of truth for tag→axis→colour mapping.

---

#### LOW: Module Browser — keyword highlighting in descriptions

**Why:** When scanning module descriptions in the browser, semantic keywords (filter, VCO,
distortion, LFO, etc.) are currently indistinguishable from surrounding text. Colouring a
small number of matched keywords lets the user scan the category of a module at a glance
without reading every word.

**Scope:** module browser only (`module-part-description.component`). Not on rack pages,
not on the module detail page, not in search results outside the browser context. Controlled
by a `viewConfig` flag so it can be turned off in other display contexts.

**Rules:**
- Highlight at most **2 keyword spans per description** (first 2 matches by pattern priority
  order, left to right in the text). More would create visual noise.
- Keywords are matched against the existing `purposePatterns` from `RACK_BALANCE_AXES` —
  no new keyword list needed; reuse what is already maintained.
- One colour per balance axis (consistent with balance panel colours):

| Axis | Colour token suggestion |
|------|------------------------|
| `voices` | accent-warm (orange-ish) |
| `modulation` | accent-cyan / teal |
| `utilities` | neutral / grey-blue |
| `timing` | accent-yellow / amber |
| `tone` | accent-purple |

  Exact tokens must come from `internaldocs/DESIGN_LANGUAGE.md` / the active theme — no
  hard-coded hex values.

- Highlights are rendered as inline `<span class="desc-kw desc-kw--{axisId}">` elements
  inside the description text, injected via `[innerHTML]` with a sanitized string.
  Angular's `DomSanitizer.bypassSecurityTrustHtml` is acceptable here since the source is
  our own DB text, not user input rendered in a privileged context.

**Implementation:**

- Create `DescriptionKeywordHighlightPipe` (pure pipe, `description-keyword-highlight.pipe.ts`)
  in `module-parts/shared-pipes/`:
  - Input: `description: string`, `maxHighlights: number = 2`
  - Iterates `RACK_BALANCE_AXES` patterns in priority order; for each match wraps the
    matched substring in `<span class="desc-kw desc-kw--{axisId}">`.
  - Stops after `maxHighlights` total matches across all axes.
  - Returns `SafeHtml`.
- In `module-part-description.component.html`, replace `{{ data.description }}` /
  `{{ data.description | ellipsis:144 }}` with `[innerHTML]` bound to the pipe output,
  guarded by a `viewConfig.highlightKeywords` flag (default `false`; set to `true` only
  in module browser context).
- SCSS: `.desc-kw` gets a subtle `font-weight: 500` + colour from CSS custom property;
  no background, no underline — colour only, keeping it calm.
- Unit-test the pipe: assert correct span injection, correct axis class, max-2 cap, and
  that plain text with no matches passes through unchanged.

---

#### LOW: Maintenance — audit & fix external search shortcut URLs

**Why:** External shop/forum search URLs in
`src/app/features/module-browser/module-browser-detail/module-browser-detail.constants.ts`
can break when sites redesign. Schneidersladen is confirmed broken (reported 2026-05-16 —
the current URL template `https://schneidersladen.de/en/search?sSearch=` no longer returns
results; likely a site redesign). Fix or replace before the next release.

**Quick audit results (2026-05-15, test query "maths"):**

| Site | Status | Notes |
|------|--------|-------|
| Google | ✅ | |
| YouTube | ✅ | |
| Modwiggler | ✅ | |
| Lines (llllllll.co) | not checked | |
| Elektronauts | not checked | |
| Modulargrid | ✅ | |
| VCV Library | not checked | |
| Wigglehunt | ✅ | |
| Thomann | not checked | |
| Schneidersladen 🇩🇪 | ❌ | **Broken** (confirmed 2026-05-16) — `?sSearch=` query param no longer works after site redesign; needs new URL pattern or removal |
| Signalsounds 🇬🇧 | ✅ | |
| Exploding Shed | ✅ | |
| Elevatorsound 🇬🇧 | ✅ | |
| Perfect Circuit 🇺🇸 | not checked | |
| Milk Audio Store 🇮🇹 | ✅ | |
| New Groove 🇮🇹 | ✅ | |
| Escape From Noise 🇸🇪 | ✅ | |
| Machineroom 🇺🇦 | ✅ | |
| Control 🇺🇸 | ✅ | |
| Patchwerks 🇺🇸 | ⚠️ | SSL/connection timeout — needs manual check |
| Found Sound 🇦🇺 | ✅ | |
| Synthshop 🇳🇴 | ✅ | |

**Checklist:**

- [x] Manually verify unchecked URLs and Patchwerks in a browser — confirm search results
      actually appear (HTTP 200 is not sufficient; some sites redirect broken searches to
      homepage with 200). — Lines ✅, Elektronauts ✅, VCV Library ✅, Thomann (geo-redirects) ✅, Patchwerks ✅ (no SSL timeout)
- [x] Fix or remove any broken entries in `module-browser-detail.constants.ts`. — Schneidersladen `?sSearch=` → `?search=` (Shopware 6 migration); Wigglehunt tooltip corrected.
- [x] Add a comment at the top of the constants file noting the last audit date so future
      maintainers know when to re-check.

---

#### LOW: Rack Editor — "Weakest category" hint in module picker

**Why:** When browsing modules to add to a rack, the user has no contextual nudge about
what the rack is currently missing. A single word — the balance category with the lowest
score — is enough signal without being prescriptive.

**Design intent:** the hint should feel like a whisper, not a recommendation engine.
One small chip/badge, one word, always present during module search in edit mode.

**Implementation:**
- `RackBalanceAnalysisService.analyze()` already returns `axes` sorted by `share`.
  The weakest axis is `axes.sort((a,b) => a.share - b.share)[0]`.
- Render its `label` (e.g. *"Voices"*) as a muted badge near the module picker search
  input — e.g. `⬡ Voices` or just `Voices` in a secondary chip. A `matTooltip` can
  expand to *"Your rack has the least coverage in: Voices"* for users who want context.
- No separate action required — it is read-only ambient information.
- Update reactively as modules are added/removed (balance analysis is already reactive).
- Hide if the rack has no modules yet (no meaningful analysis possible).

**Checklist:**

- [ ] Derive `weakestAxis$` observable in `rack-detail-data.service.ts` (or the rack editor
      data service) from the existing balance analysis stream.
- [ ] Add a single small badge to the module picker / search area template, bound to
      `weakestAxis$`. Guard: only show when `modules.length > 0` and edit mode is active.
- [ ] Style as a secondary/muted chip — not a CTA, not a warning. One word max visible,
      full label in tooltip.

---

#### MEDIUM: Tag taxonomy — split "PURPOSE" group into sub-groups

**Why:** The `PURPOSE` tag group currently contains ~35 tags in a single flat list (see
screenshot: Attenuate, Blank, Clock Gen, Clock Mod, Compare, Control, Delay, Distort, EQ,
Env. Follow, Envelope Gen., FX, Frequency Div., Full Voice, Function Gen., LFO, LPG,
Logic, Mix, Modulate, Multiply, Noise, Pan, Phase Shift, Pitch Shift, Polarize, Quad,
Quantize, Reverb, Rhythm, Ring Mod, S&H, Sample, Sequence, Slew Limit, Switch, Uncertainty,
Utility, VCA, VCF, VCO, Waveshape). This is unmanageable to scan.

**Proposed new type groups** (DB `tags.type` value, new integers to be assigned):

| New type name      | Tags                                                                                     |
|--------------------|------------------------------------------------------------------------------------------|
| `purpose_voice`    | VCO, VCF, VCA, LPG, Full Voice, Noise, Waveshape, Ring Mod, Distort, Phase Shift, EQ    |
| `purpose_modulation` | LFO, Envelope Gen., Env. Follow, Function Gen., S&H, Slew Limit, Quantize, Clock Gen., Clock Mod, Frequency Div., Uncertainty |
| `purpose_utility`  | Attenuate, Mix, Pan, Multiply, Compare, Polarize, Quad, Switch, Logic, Control, Utility |
| `purpose_time_fx`  | Delay, Reverb, FX, Pitch Shift                                                           |
| `purpose_sequencing` | Sequence, Rhythm, Sample, Modulate                                                     |
| `purpose_blank`    | Blank *(keep separate or merge into utility — decide before migrating)*                  |

> **Note:** exact assignment of edge cases (e.g. "Modulate" could be modulation or
> sequencing; "Control" could be utility or sequencing) should be confirmed with the product
> owner before the migration runs.

**Implementation notes:**

- `tags.type` is stored as an integer in the DB (`0 = purpose`, `1 = nature`, `2 = character`).
  New type IDs for the sub-groups need to be defined (e.g. `3–8`) and the mapping added to
  `NUMERIC_TAG_TYPE_NAMES` in `rack-balance-analysis.service.ts`.
- The split is a **data migration** (UPDATE statements on `tags` rows) — requires explicit
  user approval per `AGENTS.md §5` before running. Draft the migration SQL but do not apply
  autonomously.
- `isBalanceRelevantTagType` and `getPatternsForTagType` in `rack-balance-analysis.service.ts`
  must be updated to recognise the new type names so balance analysis continues to work.
- The tag proposer panel in `module-tags.component.html` groups by `type` label — the new
  groups will appear automatically once the DB rows are updated and types are mapped.
- **No UI code change needed** for the grouping UI itself — it already renders groups
  dynamically from the data.

**Checklist:**

- [ ] Confirm final group assignments with product owner (edge cases above).
- [ ] Define new integer IDs for each new type and add to `NUMERIC_TAG_TYPE_NAMES`.
- [ ] Draft migration SQL: `UPDATE tags SET type = <new_id> WHERE name IN (...)` for each
      group — one statement per group for clarity and reviewability.
- [ ] Get explicit user approval, then run migration on production.
- [ ] Update `isBalanceRelevantTagType` to include new type names.
- [ ] Update `getPatternsForTagType` if the new types need different pattern sets.
- [ ] Run `pnpm updateBackendTypes` after any schema changes (not needed here — `tags.type`
      column type does not change).
- [ ] Smoke-test the tag proposer panel and balance analysis after migration.

---

#### LOW: Rack — Stale preview indicator

**Why:** After editing modules in a rack the preview image no longer reflects the current
state, but there is no indication of this. The user has no way to know the image is stale
without remembering when they last regenerated it.

**Zero-schema approach:** the preview filename already encodes its generation timestamp
(e.g. `336_2026-05-1509-54-15073.jpeg`). Parse the date portion and compare to
`rack.updated` — if `rack.updated > imageGeneratedAt`, the preview is stale. No new DB
column needed.

**Visual treatment (minimal, integrated):**
- A small overlay chip/badge positioned over the rack image (bottom-left or top-right
  corner), visible **only to the rack owner** when the preview is stale.
- Label: a simple icon (e.g. `sync` or `image_not_supported`) with no text, or at most
  a compact *"Preview outdated"* tooltip on hover. Should not obscure the image content.
- Style: semi-transparent, uses the design system's muted/secondary token palette — not
  a warning colour (it is informational, not an error).
- Clicking the badge triggers the existing "Update preview" action directly (shortcut).
- When no image exists at all, the existing empty-state handling covers it — no extra
  indicator needed.

**Checklist:**

- [ ] Implement `isPreviewStale(rack: Rack): boolean` pure function: parse the date from
      `rack.image` filename (regex on `_YYYYMMDDH...` segment), compare to
      `new Date(rack.updated)`. Return `false` if image is null/unparseable.
- [ ] In `rack-image.component` (or its parent), expose `isStale` as an `@Input` or derive
      it from the rack data already available.
- [ ] Add the overlay badge to the rack image template, guarded by
      `isOwner && isStale && image !== null`.
- [ ] Wire the badge click to the existing "Update preview" action (emit through the data
      service, no new backend method needed).
- [ ] Unit-test `isPreviewStale` with fixture filenames and dates.

---

#### MEDIUM: Rack Comparison — balance diff between two racks

**Why:** Users who maintain multiple versions of a rack (e.g. current vs planned rebuild, or
two rack concepts) have no way to see at a glance what they would gain or lose functionally.
A diff of the balance analysis radars answers exactly that: *"+12 HP of Voices, −8 HP of
Modulation"*.

**Entry point — user area (simplest viable placement):**
The feature is most useful in the user's own rack list, not on a single rack page. A
"Compare" action on the rack list lets the user pick two of their racks; the result opens as
a dedicated comparison view (or a panel/overlay). Starting here avoids adding complexity to
the rack detail page before the UX is proven.

**Data model:**
`RackBalanceAnalysisResult` already contains `axes: RackBalanceAxisResult[]` where each
axis has `id`, `label`, `share` (0–100 normalised score), and `hp` (matched HP).
A diff is computed as:
```
diffAxes = axes_A.map(a => ({
  ...a,
  shareDiff: a.share - axes_B.find(b => b.id === a.id).share,
  hpDiff:    a.hp    - axes_B.find(b => b.id === a.id).hp
}))
```
No new backend calls needed — both racks' modules are already loaded via existing queries.

**Comparison view UI:**
- Side-by-side radar charts (existing `rack-balance-panel` reused, read-only).
- A **delta panel** between or below the two radars: one row per axis showing
  `▲ +12 HP  Voices` / `▼ −8 HP  Modulation` / `= 0  FX`. Colour: green for positive
  delta, muted warning for negative, neutral for zero. Font and token choices from
  `internaldocs/DESIGN_LANGUAGE.md`.
- Rack names and thumbnail images as column headers.
- A short **plain-language summary** derived from the top 2 positive and top 2 negative
  deltas: *"Rack B has more Voices (+12 HP) and Utilities (+6 HP) but less Modulation
  (−8 HP)."*

**Checklist:**

- [ ] Add `compareRacks` route or modal entry point in the user-area rack list
      (e.g. a "Compare" toggle that lets the user select two racks from the list).
- [ ] Implement `computeRackBalanceDiff(a: RackBalanceAnalysisResult, b: RackBalanceAnalysisResult): RackBalanceDiff`
      pure function in `rack-balance-analysis.service.ts` (or a sibling utils file).
- [ ] Build `RackComparisonComponent` (or a dedicated route under user-area) that:
      - Accepts two rack IDs as inputs / route params.
      - Loads both racks' `rowedRackedModules` (reuse existing data service pattern).
      - Runs `RackBalanceAnalysisService.analyze()` on each.
      - Calls `computeRackBalanceDiff` and renders the delta panel.
- [ ] Reuse `rack-balance-panel` in read-only mode for each radar — no duplication.
- [ ] Generate the plain-language summary string from the diff (pure function, unit-testable).
- [ ] Keep the comparison view accessible from a direct URL so it can be shared
      (e.g. `/compare?a=<publicIdA>&b=<publicIdB>`). Public racks only for shared URLs;
      private racks visible only to their owner.

---

#### LOW: Rack Editor — Same-HP highlight on hover (edit mode)

**Why:** When deciding whether to swap two modules, the user needs to know which other
modules are the same width. Currently there is no visual cue — they have to remember or
read the HP label on each tile individually.

**Behaviour:** active **only** when the rack is in edit mode (`isCurrentRackEditable === true`
AND `isCurrentRackPropertyOfCurrentUser === true`) **and** analysis mode is `off`. Hovering
any module tile highlights all other tiles that share the same `module.hp` value; non-matching
tiles dim slightly. The hovered tile stays at full brightness. On mouse-leave everything
returns to normal instantly. When analysis mode is anything other than `off`, the existing
analysis overlays take full control and this highlight is suppressed entirely.

**Implementation notes:**
- `rack-visual-model.component.ts` already tracks `hoveredRackedModule`. Derive
  `hoveredHp: number | null` from it.
- In the template, add a CSS class (e.g. `module--sameHpHighlight` / `module--sameHpDim`)
  to each tile based on `hoveredHp`, **guarded by both** `isEditable && analysisMode === 'off'`:
  - `module--sameHpHighlight` → `rackedModule.module.hp === hoveredHp && !isHovered`
  - `module--sameHpDim` → `rackedModule.module.hp !== hoveredHp && hoveredHp !== null`
- Keep the SCSS transition short (100–150 ms opacity ease) so it feels snappy, not
  distracting.

---

#### MEDIUM: Rack Editor — "Remix" layout optimizer

**Why:** Users sometimes want to know if there is a better arrangement of their modules across
rows — one that avoids row overflows and wastes less HP — without having to drag everything
manually. A "Remix" feature automates this and also gives a sense of *how many valid
arrangements* exist, which is itself an interesting analytical view.

**Format isolation constraint (hard rule):**
Modules of different physical formats must **never** be mixed across format groups during a
remix. The formats are encoded in `module.standard` (already loaded on every `RackedModule`):
- `standard.id === 0` (or null) → 3U Eurorack
- `standard.id === 1` → Intellijel 1U
- `standard.id === 2` → PulpLogic 1U

The remix algorithm partitions modules into separate format groups first, then runs
bin-packing independently within each group. A 1U module can never be assigned to a 3U row
and vice versa — this is a hard constraint, not a preference.

**Pre-condition: homogeneous rows.** Remix assumes each row already contains modules of
one format only. Mixed-standard rows (e.g. a 3U and a 1U module sitting in the same row)
are an inconsistent rack state. When the layout panel is opened, `computeLayoutAnalysis`
must check every row first:
- If any row contains modules of more than one `standard.id`, remix is **blocked** for that
  format group.
- The panel surfaces a clear, non-destructive warning: *"Row 3 contains mixed formats (3U
  and 1U). Fix this before remixing."* — with a link/highlight to the offending row.
- No auto-arrange or shuffle action is offered while mixed rows exist.
- The HP overflow indicator still works normally — mixed rows are a separate validity
  concern from overflow.

The layout panel exposes a **scope selector** so the user can choose what to remix:
- **All formats** — runs FFD independently for each format group and recombines results.
- **3U only** — leaves 1U rows untouched.
- **1U only** (if 1U modules are present) — leaves 3U rows untouched.
- **Single row** — reshuffles only within a specific row (order-only remix, no cross-row
  movement). Useful for tidying a single messy row without disturbing anything else.

**Mathematical background:**
This is a variant of the **bin-packing problem** (NP-hard in general), but Eurorack racks
are small enough to make exact or near-exact solutions tractable:
- Typical rack: 6–12 rows × 84/104 HP capacity.
- Typical module count: 20–80 modules, each 1–28 HP wide.
- A **First-Fit Decreasing (FFD)** greedy heuristic (sort modules by HP descending, place
  each into the first row that fits) runs in O(n log n) and produces a solution within
  11/9 of optimal. Good enough for instant feedback.
- For exact counting of valid arrangements, **dynamic programming on subsets** (bitmask DP)
  works up to ~20 modules; beyond that, randomised sampling or branch-and-bound with pruning
  gives an estimate with confidence bounds. The key constraint is only that each row's used
  HP ≤ `rackData.hp` — no ordering constraint within a row (user can drag after).
- Module *identity* is preserved (the user's specific modules are rearranged, not replaced).
  Blank panels are excluded from remix input and can be re-added via the quick-add shortcut
  after the remix.

**Integration with existing analysis modes:**
Add `layout` to `RACK_ANALYSIS_MODES` in `rack-analysis-mode.ts`. In `layout` mode the
rack visual model shows a "remix" control panel in the same floating options area used by
`power` and `function` modes.

**UX design:**

- A **"Remix" button** in the rack editor toolbar (edit mode only) activates `layout`
  analysis mode and opens the layout panel.
- The panel shows:
  - **Current layout validity** — is any row over capacity right now? How much HP is wasted?
  - **"Auto-arrange" action** — applies FFD in one tap, animates modules into their new
    positions using the optimistic diff-based update (ties into that work). Shows a diff
    summary: "3 modules moved across rows".
  - **Valid arrangements estimate** — a computed or sampled count: *"~420 valid arrangements
    exist for your current modules"*. Updates live as modules are added/removed. For small
    racks (≤ 20 modules) show exact count; for larger racks show a sampled estimate with
    `~` prefix.
  - **"Shuffle" action** — picks a random valid arrangement from the solution space (fun /
    inspirational use case).
- The panel is read-only analysis when no row is overflowing; the auto-arrange CTA is
  highlighted when overflow is detected (ties into the HP overflow indicator feature).

**Checklist:**

- [ ] Add `layout` to `RACK_ANALYSIS_MODES` and `RACK_ANALYSIS_MODE_OPTIONS`.
- [ ] Implement `computeLayoutAnalysis(modules: RackedModule[], rackHp: number)` pure
      function in a new `rack-layout-analysis.utils.ts`:
      - **First step:** partition input by `module.standard.id` into format groups.
      - Run FFD and arrangement counting independently per group — never mix groups.
      - Returns `{ isValid: boolean, wastedHp: number[], overflowHp: number[], validArrangementCount: number | 'estimated', estimate?: number }`.
      - Accepts an optional `scope: 'all' | '3u' | '1u' | { rowIndex: number }` param to
        limit which group(s) are touched.
      - Uses FFD for `autoArrange` output (returns new `row` assignments per module).
      - Uses bitmask DP for exact count when `modules.length ≤ 20` per group, randomised
        sampling otherwise.
- [ ] Wire into `rack-visual-model.component.ts` alongside existing `rowPowerBreakdown`.
- [ ] Build the layout panel UI in the floating options area (same pattern as power/function
      panels in `rack-editor.component.html`).
- [ ] "Auto-arrange" emits new row assignments through `rackDetailDataService` using the
      diff-based update path (batch move, not full reload).
- [ ] Blank panels (`isBlankModule`) are stripped before remix and ignored in HP accounting
      for arrangement count.
- [ ] Unit-test `computeLayoutAnalysis` with known fixtures (e.g. 4 modules × [10, 20, 30,
      40] HP into a 84 HP rack).

---

#### MEDIUM: Rack Editor — Quick-add blank panel shortcut

**Why:** Adding a blank panel to fill leftover HP currently requires opening the full module
picker, searching for a blank, and dragging it in. This is far too many steps for what is a
very common finishing operation. A purpose-built shortcut should take one or two taps.

**Context:** blank modules already exist in the DB as real module rows (`rack-blank-module.constants.ts`):
- 3U Eurorack blanks: IDs 4647–4666 (1 HP → 20 HP, index = HP size)
- Intellijel 1U blanks: IDs 4711–4735 (1 HP → 25 HP)

The correct blank ID for a given HP size is therefore directly derivable — no search needed.

**Interaction design (space-efficient, low-click):**

The primary proposal is a **segmented number strip** rendered at the end of each rack row
(or in the row's hover/action bar). It shows compact HP buttons `1 2 3 4 6 8` (the most
common blank sizes — covers 99 % of use cases in 6 taps). Tapping a number immediately
inserts the matching blank at the end of that row; no confirmation needed (blank panels
are trivially removable). A secondary `…` chip opens a small popover with the full 1–20 HP
range for edge cases.

Alternative considered: a single `+□` button that cycles through sizes on repeated taps —
rejected because it requires counting taps and gives no visual overview of available sizes.

**Checklist:**

- [x] Expose a per-row "add blank" action area in `rack-visual-model.component.html`
      (visible on row hover in edit mode, or always visible when `rowOverflowHp < 0` i.e.
      there is free space to fill). Keep it visually lightweight — icon + number strip,
      not a full button row.
- [x] Build the HP number strip as a row of `mat-mini-fab` or small flat `mat-button`
      elements: `[1, 2, 3, 4, 6, 8]`. Tapping any triggers
      `rackDetailDataService.addBlankToRow$(rowId, hp)` (new action).
- [x] Add `addBlankToRow$` action in `rack-detail-data.service.ts`: resolves the correct
      blank module ID from `BLANK_MODULE_IDS` (offset by HP value from the base ID 4646 for
      3U blanks), calls `backend.add.rackedModule(...)`, then applies an optimistic local
      update (ties into the diff-based update work).
- [ ] `…` overflow button opens a compact `MatMenu` or inline number grid showing the full
      1–20 HP range for unusual sizes.
- [x] Intelligently pre-select / highlight the size that exactly fills the remaining free HP
      in that row (computed from `rowUsedHp` vs `rackData.hp`) so one tap fills the gap.
- [ ] Ground the strip visual style in `internaldocs/DESIGN_LANGUAGE.md` — should feel like
      a tool affordance, not a call-to-action button.

---

#### HIGH: Rack Editor — Row HP overflow indicator

**Why:** A rack row has a fixed HP capacity (`rackData.hp`). It is currently possible to place
modules that together exceed that capacity with no visual warning — the user can be 1 HP over
without realising it and wonder why the physical rack doesn't fit.

**Design intent:** the indicator should feel like a natural extension of the existing row UI
(ruler, power panel), not a jarring alert. Tone: calm but unmissable — similar to how a code
editor shows a gutter marker.

**Implementation notes:**

- Per-row used HP = `row.reduce((sum, m) => sum + m.module.hp, 0)`. This is already
  computable from `rowedRackedModules` (input to `rack-visual-model.component`).
- `rackData.hp` is the row capacity (all rows share the same HP width for a standard case).
- Derive a `rowHpOverflow: number[]` array alongside the existing `rowPowerBreakdown` array
  in `rack-visual-model.component.ts` (see `buildRackPowerBreakdown` pattern).

**Checklist:**

- [x] Compute `rowUsedHp` and `rowOverflowHp` per row in the component (client-side, no
      backend call needed).
- [x] When `rowOverflowHp > 0`, render a visual overflow indicator on that row. Suggested
      treatment: a thin accent bar at the right edge of the row that protrudes slightly beyond
      the rack boundary, coloured with the design system's warning/error token, with a
      `matTooltip` showing e.g. *"Row 2: 105 / 104 HP — 1 HP over capacity"*.
- [x] Additionally, show a compact summary badge somewhere on the rack card header (or the
      row power panel area) listing total overflow when any row is over — e.g.
      `⚠ 1 HP over` — so the problem is visible without hovering.
- [x] The indicator should animate in/out smoothly when modules are added/removed (tie into
      the diff-based update work once that lands).
- [x] No indicator shown when `rowOverflowHp <= 0`; the UI stays clean for well-packed racks.
- [x] Ground visual decisions in `internaldocs/DESIGN_LANGUAGE.md` — use existing warning
      colour tokens, not ad-hoc colours.

---

#### HIGH: Bug — Drag-and-drop module preview (ghost) no longer visible during drag

**Why:** Regression. Previously, dragging a module inside the rack visual model showed a
semi-transparent preview of the module tile at the drop target position before releasing —
giving clear visual feedback of where the module would land. After a recent change this
preview has disappeared: only an empty gap is shown during the drag, making reordering
confusing and error-prone.

**Investigation notes:**
- The rack visual model uses CDK Drag-and-Drop (`cdkDrag` on each module tile in
  `rack-visual-model.component.html`).
- CDK renders a `*cdkDragPreview` template while dragging; if none is defined it falls back
  to a clone of the dragged element. The current template has no `*cdkDragPreview` block —
  it was likely removed during a refactor, leaving CDK with no preview to render or a
  misconfigured one.
- `dropRevealSuppressed` / `dropRevealAnimating` CSS classes are still present in the
  template, suggesting the suppression logic may now be incorrectly hiding the preview for
  all tiles instead of only the source tile.

**Fix checklist:**

- [x] Audit `rack-visual-model.component.html` for the `*cdkDragPreview` template block —
      if missing, restore it (render `<app-module-realistic>` or equivalent minimal tile).
- [x] Check `isDropRevealSuppressed()` — ensure it returns `true` only for the actively
      dragged module, not for all modules or the placeholder slot.
- [ ] Verify `[cdkDragScale]` is set correctly so the preview matches the visual size of
      the tile in the rack grid.
- [x] Restore the entry animation on drop so the placed module animates into its final
      position (was working before the regression).
- [ ] Add a Playwright visual smoke test: drag a module to a new slot and assert the
      preview element is present in the DOM during the drag.
  Remaining: Playwright test requires live E2E test account (see blockers.md).

---

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

#### MEDIUM: Bug — Moving Modules Inside a Rack Does Not Bump `updated` Timestamp

**Why:** Moving modules on the rack canvas does NOT update `racks.updated`, so the edited
rack doesn't jump to the top of the "My Racks" list (sorted by `updated DESC`).

**Investigation completed 15-05-2026 (confidence: HIGH, root cause confirmed in code):**

- "My Racks" query at `src/app/features/backend/supabase-queries.ts:735-745` orders by
  `updated DESC` — correct sort field.
- Module move/reorder save path: `rack-detail-data.service.ts:953-961` →
  `backend.update.rackedModules(...)` → `supabase-update.ts:100-134` writes **only**
  `rack_modules` rows and busts `rackWithId` cache. **No write to parent `racks` row.**
- Rack metadata edits (rename, privacy, row count) DO write the parent `racks` row through
  `update.rack(...)` in `supabase-update.ts:148-167` → those correctly bump `racks.updated`
  (via the existing BEFORE UPDATE timestamp trigger).
- **Same defect exists for patches:** `patch-detail-data.service.ts:636-660` →
  `update.patchConnectionsSilent(...)` → only writes `patch_connections`, never touches the
  parent `patches` row.

**Recommended fix (Option A preferred — DB trigger, needs explicit user approval):**

Add a trigger on `rack_modules` and `patch_connections` (and likely
`patch_module_instances` if it exists) that bumps the parent row's `updated` on any
INSERT/UPDATE/DELETE:

```sql
create or replace function public.touch_rack_updated_from_rack_modules()
returns trigger language plpgsql as $$
begin
  update public.racks set updated = now()
    where id = coalesce(new.rackid, old.rackid);
  return null;
end; $$;

create trigger trg_touch_rack_updated_from_rack_modules
after insert or update or delete on public.rack_modules
for each row execute function public.touch_rack_updated_from_rack_modules();
```

(Mirror for patches; pick correct FK column names from schema.)

**Trade-off:** Option A covers any writer (current and future). Option B (frontend-only — add
an `update.rack({ updated: now })` touch after `update.rackedModules`) is faster to ship but
leaves the data invariant unenforced.

**Implementation (next agent):**

- [x] Ask user for explicit approval on the DB trigger (Option A) or pick Option B.
- [x] Apply chosen fix. If trigger: log the migration under the schema-change preflight
      checklist in `internaldocs/patterns/BACKEND_METHODS.md`.
- [x] Add a unit test: "moving a module updates the rack's last-modified timestamp" — assert
      `backend.update.rackedModules` is called; deeper updated-timestamp verification requires live DB integration test.
- [x] Repeat for patches' connections / instances flows.

**Fixed via DB triggers on `rack_modules` (and patches equivalent) — see migration `20260515123000_touch_parent_updated_from_child_tables.sql`. Applied 2026-05-15.**

---

#### HIGH: Perf — Investigate Initial Render Flash on Route Open

**Why:** When opening a route there is a noticeable flash roughly 1.5–2s after navigation: all
text appears to disappear and then reappear. This looks like a late-arriving state update (SSR
hydration mismatch, late `async` pipe emission swapping placeholder → real content, a guarded
`*ngIf` flipping from `false → true → false → true`, font/FOUT swap, or a router data resolver
firing a second emission). Goal: find the root cause and eliminate the visible re-render.

**Scope (read-only investigation first — do NOT change behaviour while diagnosing):**

- [ ] Reproduce reliably on at least one route (capture which routes flash and which do not)
- [ ] Record a Performance trace (Chrome DevTools) covering the navigation + the flash window;
      identify whether the flash correlates with a script task, layout, paint, or network response
- [ ] Check SSR vs CSR: confirm whether the flash is SSR hydration replacing server HTML, or a
      pure CSR state transition (compare `pnpm start` vs `pnpm start:ssr` behaviour)
- [ ] Audit `*ngIf` / `@if` guards on the affected templates — look for conditions that briefly
      evaluate truthy from cached/stale data then flip when fresh data arrives (and vice versa)
- [ ] Audit `async` pipes on the affected templates — list every observable feeding the view and
      confirm it is not emitting twice (e.g., `BehaviorSubject` initial value + late real value
      without `distinctUntilChanged`, or missing `shareReplay`)
- [ ] Check router data flow: resolvers, route params subscriptions, and any
      `ActivatedRoute.params`/`paramMap` pipelines for double emissions on navigation
- [ ] Check the loading/skeleton states — confirm the flash is not a skeleton being shown for
      <2s after content is already visible
- [ ] Check `@font-face` / FOUT — flash text disappearance could be a font swap event
- [ ] Document findings in `internaldocs/workflow/CURRENT_FEATURE.md` with root cause + proposed fix
- [ ] Implement the minimal fix that removes the visible flash WITHOUT removing any current
      functionality (no behavioural regressions on the affected routes)
- [ ] Verify across the routes that originally reproduced the issue + run `pnpm test-headless`
      and at least the auth E2E (`pnpm test:e2e:auth`)

---

#### HIGH: Perf — Audit Reactive Pipelines & Event Chains for Smoothness

**Why:** The app should feel like butter. Today there are likely pipelines that re-emit more
than necessary, chains that re-subscribe per emission, or templates that re-render on identity
changes that should have been collapsed. The goal is a global pass over every observable chain
to tighten things up — fewer redundant emissions, fewer change-detection cycles, smoother UX —
while preserving every current behaviour.

**Scope (read-only audit, then targeted refactors):**

- [x] Inventory every `Subject` / `BehaviorSubject` / `ReplaySubject` in `src/app` and note its
      role (entity identity trigger, refresh signal, submit event, UI toggle, etc.)
      **Done:** All data services scanned; patterns documented in `CACHE_STRATEGY.md` + `REACTIVE_SERVICES.md`
- [x] Inventory every long observable chain (services + components) and capture: source(s),
      operators used, consumer(s), and whether the chain is `shareReplay`'d or duplicated across
      subscribers
- [x] Look for missing `distinctUntilChanged` on streams where consecutive equal values trigger
      re-renders or re-fetches
      **Done:** `debounceTime(750)` present on all search/filter inputs; `distinctUntilChanged` on auto-save streams; no gaps found
- [x] Look for `switchMap` chains that should be `exhaustMap` (e.g., submit buttons) or
      `concatMap` (ordered writes) — wrong flattening operator is a common smoothness killer
      **Done:** 9 submit chains fixed across login/signup/reset/comments/rack/patch services — commit `aecd4f3c`
- [x] Look for nested subscriptions (`.subscribe` inside another `.subscribe`) and flatten with
      `switchMap` / `mergeMap` — **none found**
- [x] Look for components that manually subscribe where the template could use `async` pipe
      **Done:** Scanned all data services; 1 minor low-severity leak in `login-email.component.ts` (not worth churn; `valueChanges` shares component lifecycle)
- [x] Look for `combineLatest` / `withLatestFrom` calls that fan-out emissions unnecessarily;
      consider `auditTime` / `debounceTime` / `throttleTime` where appropriate
      **Done:** 81 `combineLatest` usages scanned; all are filter/search/view-model combiners — correct use case; no fan-out issues found
- [x] Look for chains that fire on every keystroke / scroll / hover without `debounceTime`
      **Done:** All search/filter inputs use `debounceTime(750)` — no gaps found
- [x] Confirm `SubManager` + `takeUntil(this.destroy$)` is used everywhere (no leaked subs)
      **Done:** All data services extend `SubManager`; no leaked subscriptions found
- [x] Verify `OnPush` change detection is used where possible on container components — flag
      candidates that are still on default CD
      **Done:** OnPush sweep completed in prior session (checkpoint 017)
- [x] Document findings + proposed refactors in `internaldocs/workflow/CURRENT_FEATURE.md`
      **Done:** Findings documented; no additional refactors needed — all actionable items already applied
- [x] Apply refactors in small batches, each batch validated with `pnpm test-headless`
      **Done:** 9 exhaustMap fixes applied and validated; caching.spec.ts expanded to 5 tests
- [x] NO functional regressions — every feature still works as before

---

#### HIGH: Perf — Cache Strategy Review (Hits, Invalidation, Coverage)

**Why:** Backend access goes through `SupabaseService` and several reads are cacheable, but we
need a fresh pass to confirm: are we busting cache keys when (and only when) we should? Are
there reads that should be cached but currently aren’t? Are there caches that are too aggressive
and serve stale data after writes? Right balance = fewer round-trips and consistent UI.

**Scope (read-only audit, then targeted fixes):**

- [x] Inventory every `GET/get` method in `SupabaseService` (and any data services that cache
      locally) and record: cache key shape, TTL (if any), and which write methods invalidate it
- [x] Inventory every `add/update/delete` method and confirm it busts ALL keys that could now be
      stale — cross-reference against the GET inventory
- [x] Identify reads that are NOT currently cached but are called repeatedly with the same args
      across components (candidates to add caching)
- [x] Identify caches that survive longer than they should (e.g., user-area data after a logout
      / account switch / patch save)
- [x] Check `DatabaseStrings.ts` joins for any duplicated round-trips that could be merged into
      a single cached read
      **Done:** Audited all joins in `DatabaseStrings.ts`; no duplicated round-trips; `select('*')` on `tags` (3 cols) and `standards` (2 cols) is correct; no optimisation needed
- [x] Verify caches respect user-scoped boundaries (no cross-account leakage) — ✓ allUserData bust is comprehensive
- [x] Document the cache map (key → producer → invalidators) in `internaldocs/patterns/CACHE_STRATEGY.md`
- [x] Apply fixes in small batches, each validated with `pnpm test-headless`
- [x] NO functional regressions — every read still returns the same data the user expects

**Done: All cache strategy bullets complete** — `CACHE_STRATEGY.md` created, 7 cache invalidation fixes applied (commit `d5fc8ec9`), `DatabaseStrings.ts` join audit complete (no issues found)

---

#### HIGH: Perf — Backend Bandwidth Optimisation (Every Byte Costs Money)

**Why:** Supabase egress is billed per byte. Today some queries probably select more columns,
more rows, or more joins than the UI actually consumes. The goal is to systematically trim
backend payloads — fewer columns, narrower joins, server-side filtering / pagination — without
changing any user-visible behaviour.

**Scope (read-only audit, then targeted query rewrites):**

- [x] Inventory every Supabase query in `SupabaseService` (and `DatabaseStrings.ts` joins) and
      for each capture: columns selected, joined tables, expected payload size, and which UI
      surface consumes it
      **Done:** All 40+ queries audited in `supabase-get.ts`, `supabase-queries.ts`, `DatabaseStrings.ts`
- [x] For each query, identify columns/joined fields that are fetched but never read by the
      consumer — replace `select('*')` with explicit column lists
      **Done:** Reference tables (`tags` 3 cols, `standards` 2 cols, `manufacturers` 5 cols) — `select('*')` is correct; module browser already uses explicit 7-col list (down from 27); only 4 unused cols found in `modulesBySameManufacturer` (`res1, res2, depthMax, submitter`) — too minor/risky to change
- [x] Identify lists that load all rows when the UI only renders a window — add `range()` /
      pagination / `limit()` where appropriate
      **Done:** Module browser, rack browser, patch browser all use `.range(from, to)` pagination; no unlimited-list endpoints found
- [x] Identify duplicate fetches (same data requested by multiple components in the same view)
      and consolidate (links into the caching task above)
      **Done:** No duplicate fetches found; caching layer handles shared data
- [x] Check for N+1 patterns where multiple round-trips could be a single joined query
      **Done:** All joins are embedded in single queries; no N+1 patterns found
- [x] Check image / asset payloads — confirm we serve appropriately sized images and not full
      originals where thumbnails would do
      **Done:** All module panels, rack images, and manufacturer logos are served as full originals (no Supabase image
      transformation applied). Supabase image transformation (`/render/image/public/`) would require Pro/Team plan;
      deferred for now. Storage base URLs consolidated into `StorageUrls` class in `DatabaseStrings.ts` (commit `d9fd933f`)
      — a single place to add transform params if/when the plan supports it.
- [ ] Confirm gzip / brotli is in effect for API responses (Supabase default — verify on
      production)
- [x] Estimate bytes saved per query before/after where possible (helps prioritise)
      **Done:** No significant savings available — queries are already well-optimised; total potential savings ~4 unused cols × N rows in one endpoint (negligible)
- [x] Document findings in `internaldocs/workflow/CURRENT_FEATURE.md`
      **Done:** Findings documented below
- [x] Apply rewrites in small batches; run `pnpm updateBackendTypes` if response shapes change;
      validate with `pnpm test-headless` after each batch
      **Done:** No rewrites needed — no actionable over-fetching found
- [x] NO functional regressions — every UI surface still has exactly the data it needs

**Findings:** Queries are already well-optimised. No bandwidth fixes needed at this time. Remaining work: image thumbnails and gzip/brotli verification (requires production access — not blocking).

---

#### MEDIUM: Sentry — Issue Monitoring & Resolution Workflow

**Why:** Sentry is already integrated and collecting error data, but there is currently no process
to regularly review reported issues and address them. A backlog of unresolved errors is accumulating.
Future work should establish a lightweight routine (or automated agent workflow) that queries Sentry
for open issues, triages them by frequency/severity, and works through fixes systematically.

**Tokens:** Sentry API credentials are already present in the project (available via MCP or
environment config) — no new setup required to start.

- [ ] Audit current open Sentry issues and categorise by frequency, severity, and affected surface
- [ ] Establish a recurring review cadence (manual or agent-assisted) for new Sentry events
- [ ] Resolve the highest-impact issues identified in the initial audit
- [ ] Explore MCP / automated tooling to let the AI agent query and triage Sentry data directly
- [ ] Document the agreed workflow so future agents know the process

---

#### HIGH: E2E — Dedicated Test Account Cleanup

**Why:** E2E credentials are coupled to a personal Supabase account — should use a dedicated test account.

- [ ] Create dedicated Supabase test account (email/password)
- [ ] Update local `.env` and rotate GitHub secrets `E2E_TEST_EMAIL` + `E2E_TEST_PASSWORD`
- [ ] Re-run `pnpm test:e2e:auth` to confirm

---

#### HIGH: E2E — Multi-Instance Patching

**Why:** Auto-instance feature has 30 unit tests but no E2E coverage through the real UI.
**Depends on:** Dedicated test account (above).

- [ ] Open patch in editor → verify collection modules appear as cards
- [ ] "Add Copy" from 0 instances → verify 2 cards with labels (1)(2)
- [ ] "Add Copy" again → verify 3 cards
- [ ] Connect CV from instance (1) → verify connection recorded
- [ ] Same output CV to instance (2) → verify accepted
- [ ] Same connection again → verify rejected as duplicate
- [ ] Delete instance with connections → verify confirmation dialog
- [ ] Confirm deletion → instance removed, connections scrubbed, remaining renumbered
- [ ] Save + reload → connections and instances survive roundtrip
- [ ] Legacy patch (pre-instance) → loads and displays correctly

---

#### ON HOLD: SEO — OG Image Generation

**Paused 2026-02-23.** Resume when Manufacturer Page Phase 1 is live (manufacturer pages need OG images too).

Completed: sitemap, robots.txt, canonical URLs, JSON-LD, llms.txt, og:image dimensions, bot cache headers (partial), manufacturer detail metadata (`907e676a`).

Remaining:

- [ ] OG image generation endpoint (`@vercel/og`)
- [ ] Middleware wiring to generated OG image URLs
- [ ] Rich preview validation (Telegram / WhatsApp / Slack + debuggers)
- [ ] Visual polish pass

---

#### POLICY: Unit Test Coverage

Target: statements and lines ≥ 75% (baseline 03-02: ~57%).
Not a blocking task — coverage rises naturally as new features ship with tests.

**2025-07-16 bulk pass completed (~1200+ tests added, ~145+ spec files created):**
All components, pipes, utils, services, constants, and helper files that can be tested with
direct instantiation (no Supabase/D3/canvas) now have spec coverage.

Remaining uncovered high-value files (complex dependencies):
- `user-management.service.ts` (599L, Supabase Auth-heavy)
- `graph.component.ts` (498L, D3/canvas)
- `patch-graph.component.ts` (297L, SupabaseService-dependent)

Previously listed as "remaining" but now fully covered by direct-instantiation specs:
- `rack-detail-data.service.ts` — 5 spec files, 40+ tests (helpers, reactive, media-duplicate, main)
- `module-detail-data.service.ts` — 1 spec file, 24 tests
- `user-area-data.service.ts` — 1 spec file, 24 tests
