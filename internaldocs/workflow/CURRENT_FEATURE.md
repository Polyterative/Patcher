# Current Feature / AI RAM

> **Rules for AI agents:**
> 1. Read this file when the task is about the active in-flight feature or explicitly references the current plan.
> 2. Keep it updated - check off steps, add discoveries.
> 3. One feature at a time - archive to [COMPLETED.md](./COMPLETED.md) when done, then reset.
> 4. This file owns implementation detail; `TODO.md` owns the backlog.
> 5. **Every feature uses three layers** (MVP -> Structural -> Polish). Define all three before coding. Complete each
>    layer before starting the next. Layout before interactions.

---

## Active

*None — pick a task from TODO.md.*

---

<!-- ARCHIVED 2026-05-15 → see COMPLETED.md + ARCHITECTURE.md §Opaque URL Token Pattern -->

### Opaque URL Tokens for Racks & Patches ✅ ARCHIVED

**Goal:** replace enumerable `/racks/details/:id` and `/patches/details/:id` URLs with an opaque
`public_id` token (e.g. `/racks/aB3kF9_xZ2`) so anonymous link-sharing of private items stops
leaking the sequential-ID enumeration vector, while keeping legacy public links working as
permanent redirects.

#### Decisions (locked-in 15-05-2026)

- **URL shape:** `/racks/:public_id` and `/patches/:public_id`. No `details/` segment.
- **Token format:** 12-char nanoid-style, alphabet `[A-Za-z0-9_-]` (~71 bits entropy, 2.4e21
  keyspace — brute-force-infeasible). Stored in a new column `public_id text UNIQUE NOT NULL`.
- **Legacy URLs:**
  - Public items at `/racks/details/:id` → 301 redirect to `/racks/:public_id`.
  - **Private items at `/racks/details/:id` → `/links/retired`.** Old private shares are intentionally
    invalidated; users must re-share the new token URL. (Acceptable per product decision —
    closes the historical enumeration leak retroactively.)
- **Access policy on new token URLs:** anonymous viewers with the token can view (link =
  capability). Editing still requires owner auth — unchanged.
- **Blank-page-on-private fix:** included. Today RLS blocks anonymous reads of private rows;
  the new flow goes through a `SECURITY DEFINER` RPC that bypasses RLS for read-by-token.
- **Backend scope:** minimal and contained — one column + one trigger + two RPCs per table
  (`racks`, `patches`). Modules / profiles unchanged.

#### Architecture

```text
[ Browser ]
   |
   |  GET /racks/aB3kF9_xZ2          (anonymous OR logged-in)
   v
[ Angular route: RackBrowserDetailViewComponent ]
   |
   |  rpc('get_rack_by_public_id', { token: 'aB3kF9_xZ2' })
   v
[ Supabase RPC, SECURITY DEFINER ]
   |  SELECT * FROM racks WHERE public_id = token LIMIT 1;
   |  (bypasses RLS; only the holder of the full 71-bit token can hit a row)
   v
[ row ]  -> hydrate detail view

Legacy:  GET /racks/details/1018
   -> RackLegacyRedirectGuard
        SELECT public, public_id FROM racks WHERE id = 1018
        if (public)   -> router.navigate(['/racks', public_id])
        if (!public)  -> /links/retired page (with copy explaining the migration)
```

#### Layer 1 — MVP (security fix + working new URLs)

**Failing regression tests (already landed — these are the bug-catchers):**

- [x] `src/app/components/rack-parts/rack-detail-data.service.unavailable.spec.ts` —
      asserts `rackDetailUnavailableMessage$` exists, is populated on null fetch, and
      is cleared on next request. **Was 3 failing → now passing** after the fix below.
- [x] `src/app/features/routes/rack/rack-browser-detail/rack-browser-detail-view.component.spec.ts`
      "unavailable / blank-page regression" — asserts the template renders a
      `[data-testid="rack-detail-unavailable"]` element when data is missing.
      **Was 1 failing → now passing** after the fix below.
- Run: `pnpm test-headless --include="**/rack-detail-data.service.unavailable.spec.ts" --include="**/rack-browser-detail-view.component.spec.ts"` → 18/18 ✅.
- Patch counterpart (`patchDetailUnavailableMessage$`) already exists and is tested in
  `patch-detail-data.service.core.spec.ts:113` — used here as the reference contract.

**Rack empty-state fix (lands the bug fix ahead of the URL migration — ✅ DONE):**

- [x] Add `readonly rackDetailUnavailableMessage$ = new BehaviorSubject<string | null>(null);`
      to `RackDetailDataService` (mirror of `PatchDetailDataService:143`).
- [x] In the `updateSingleRackData$` pipeline (`rack-detail-data.service.ts:~482`):
  - reset `rackDetailUnavailableMessage$.next(null)` in the leading `tap`,
  - on `!x?.data`, call `rackDetailUnavailableMessage$.next(this.buildUnavailableMessage())`,
  - on `catchError`, also populate the message (previously only a snackbar fired).
- [x] Add `buildUnavailableMessage()` private helper — copy: *"This rack isn't publicly
      available. If you have a share link from the owner, use that to view it."* when
      reading as anonymous; *"This rack could not be loaded."* otherwise.
- [x] Update template (`rack-browser-detail-view.component.html`) — after the existing
      `@if (bag.data) {...}` block, added
      `@else if (bag.unavailableMessage) { <app-advice-tooltip data-testid="rack-detail-unavailable" title="Unavailable" tone="info">{{ bag.unavailableMessage }}</app-advice-tooltip> }`.
- [x] Imported `AdviceTooltipModule` in `rack-browser.module.ts` (component lives in this
      module, so the dependency must be local).
- [x] Re-ran 528 rack-related specs → all green. `pnpm lint` → 0 errors (1 pre-existing
      warning in `patch-graph-reveal.spec.ts`, untouched).

> Note: this is the immediate bug fix that closes the "blank page on private rack URL"
> issue today, *independent* of the URL token migration below. The migration replaces the
> *root cause* (sequential ID enumeration); this fix makes the failure mode graceful.

**Backend (Supabase migration — applied 15-05-2026 to project `sozmatmywjpstwidzlss`):**

- [x] Migration `supabase/migrations/20260515112000_add_public_id_to_racks_and_patches.sql`:
  - [x] `public_id text` column on racks + patches
  - [x] `generate_public_id(len int default 12)` plpgsql helper (pgcrypto, base64url, retry loop)
  - [x] Backfill of 438 racks + 94 patches; all unique tokens. **⚠️ Backfill UPDATE reset every `updated` timestamp** — past mistake documented in [BACKEND_METHODS.md §Schema-change preflight](../patterns/BACKEND_METHODS.md#schema-change-preflight-read-before-writing-sql). Use `disable trigger user` or column DEFAULT next time.
  - [x] Unique indexes + `NOT NULL`
  - [x] `BEFORE INSERT` trigger `tg_set_public_id`
- [x] RPC `get_rack_by_public_id(token text)` + `get_patch_by_public_id(token text)` — SECURITY DEFINER, STABLE, grants to `anon, authenticated`. Returns `TABLE(...)` with `author` jsonb to mirror existing `select=*,author:authorid(...)` shape.
- [x] RPC `resolve_public_rack_legacy_id(p_id int)` + `resolve_public_patch_legacy_id(p_id int)` — returns `public_id` for public rows, NULL for private/missing.
- [x] RLS unchanged; SECURITY DEFINER RPCs are the only path that exposes private rows by token.
- [x] Types regenerated via Supabase MCP into `src/backend/database.types.ts`; manually flipped `public_id` to optional on Insert/Update generics (trigger fills it).
- [x] Follow-up fixes `supabase/migrations/20260515125800_fix_generate_public_id_pgcrypto_schema.sql`, `20260515130200_harden_generate_public_id_search_path.sql`, and `20260515130500_harden_public_id_trigger_search_path.sql`: schema-qualified `extensions.gen_random_bytes(...)` because Supabase installs `pgcrypto` in `extensions`; unqualified lookup broke rack lock/unlock upserts when the public_id trigger fired. Also pinned the public_id helper search paths to `pg_catalog`.

**Frontend routing:**

- [x] New routes `racks/:publicId` and `patches/:publicId` in `rack-browser.module.ts` / `patch-browser.module.ts`, declared **after** the Uranus shell block so `/racks/browser` still wins.
- [x] `LegacyRackRedirectComponent` + `LegacyPatchRedirectComponent` at `details/:id` — call `resolvePublic*LegacyId`, navigate to `/<token>` (public) with `replaceUrl: true` or `/links/retired` (private/missing).
- [x] Detail components switched to `params.publicId`; new `updateSingleRackByPublicId$` / `updateSinglePatchByPublicId$` ReplaySubjects on the data services route through the token RPCs.
- [x] Loading indicators rebound to the new subjects (templates).
- [x] `RoutingService.linkToRack/linkToPatch/rackPathFor/patchPathFor` helpers — prefer `public_id`, fall back to legacy `/details/:id`.
- [x] `extractCreatedPublicId` helper + `supabase-add.ts` `.select('id, public_id')` so post-create navigation lands on the canonical URL (critical: private-by-default new rows can't use legacy redirect path).
- [x] `RackMinimal` / `PatchMinimal` model types include optional `public_id?: string`.
- [x] All call-sites in templates (rack-micro, patch-micro, rack-image, patch-minimal share button) + comment-context now build URLs from `public_id` when present.

**Sharing & deep links:**

- [x] Patch-text "Patch link:" line now uses token URL when available.
- [x] Share button in patch-minimal toolbar copies token URL.
- [ ] SSR sitemap (`api/sitemap.ts`) — verified: emits browser-level routes only, no per-rack URLs. No change needed.

**Tests:**

- [x] Unit suite: 3896/3897 green (1 skipped pre-existing). Lint clean.
- [x] New specs: `legacy-rack-redirect.component.spec.ts`, `legacy-patch-redirect.component.spec.ts`, `routing.service` token helpers, plus by-publicId pipeline coverage on rack/patch detail data services and comment-context.

#### Layer 2 — Structural

- [ ] Add `LegacyLinkGonePageComponent` shared between racks/patches with copy explaining
      that old private links were retired for security and pointing to "ask the owner for
      a new link". Reuse styling from existing 404.
- [x] Add a column to the user's "My racks" / "My patches" lists exposing a one-click
      "Copy share link" — uses the new token URL so users can re-share retired private links.
- [ ] Telemetry: count hits to `LegacyRackRedirectComponent` split by `public/private/notfound`
      (lightweight log to Supabase `events` table, or Sentry breadcrumb) to size the migration
      impact and decide when legacy routes can be removed.
      Implemented as Sentry breadcrumbs; private and not-found collapse to `legacy_redirect_unavailable`
      because the resolver returns NULL for both cases.
- [ ] Rate-limit the two RPCs at the gateway level (Supabase function-level RLS or a
      Postgres `pg_stat_activity` check) to slow down speculative brute-force attempts.
      ~71 bits makes this strictly belt-and-suspenders.
- [x] Cache: registered the new RPC calls in the existing SupabaseService cache layer keyed by
      `public_id`. Option 1: reused existing bust namespaces (`rackWithId`; `patches` for patch detail reads, since no separate `patchWithId` key exists), so current update/delete paths invalidate token reads.

#### Layer 3 — Polish

- [ ] Token alphabet review: confirm we exclude visually ambiguous chars only if we expect
      humans to type the token. Default keeps full URL-safe set (`A-Za-z0-9_-`).
- [x] Skipped unit test: `generate_public_id` collision retry exits in `<= N` tries
      (mock unique violations). Reason: this retry loop is server-side PL/pgSQL; no Angular/JS layer
      calls or retries it, so it is not unit-testable from the Angular tree without changing backend code.
- [x] Add unit test: legacy redirect resolves public → token URL with `replaceUrl: true`
      (so browser back-button doesn't bounce-loop).
- [x] Add Playwright e2e: open `/racks/<token>` anonymously for a private rack → renders.
- [x] Add Playwright e2e: open `/racks/details/<numeric>` for a private rack anonymously → retired-link page.
- [x] Add Playwright e2e: open `/racks/details/<numeric>` for a public rack anonymously → token URL + renders.
- [x] Add Playwright e2e: mirror private-token, private-legacy, and public-legacy coverage for patches
      using live fixtures id=186 (`KtgoYgs0qyaX`) and id=5 (`o6BNUDeXEhWo`).
- [ ] Docs: short note in `internaldocs/ARCHITECTURE.md` describing the
      "public_id token + SECURITY DEFINER RPC" pattern so future tables (e.g. `modules`
      private flag, if it ever exists) can reuse it.
- [ ] After 90-ish days of telemetry, decide whether to drop the `details/:id` legacy
      route entirely or keep as a permanent redirect.

#### Risks / open questions

- **PostgREST cache invalidation:** the RPC result isn't auto-invalidated by table UPDATEs.
  Confirm our existing cache layer in `SupabaseService` covers RPC-shaped reads; if not,
  bust manually on rack/patch update like other writes already do.
- **SSR / prerender:** prerender list (`prerender-routes.txt`) currently has no per-item
  detail routes. Confirm no prerender step relies on numeric IDs; otherwise update.
- **Backups / exports:** any CSV / JSON export of racks should expose `public_id` so old
  numeric IDs aren't used as shareable references downstream.
- **`linked_rack_id` references on `patches`:** internal FK by numeric id — keep
  numeric ids in DB, only URL-facing surface changes. No FK migration needed.
- **OG / social preview cards:** if SSR generates OG meta from the detail route, make sure
  the new token route is wired into the same SSR path. Private items should produce a
  generic preview (no leaking of name/description) — TBD with product, tracked under Polish.

#### Out of scope

- Modules, profiles, manufacturers: their URLs stay as-is — they're public-only and don't
  carry the same enumeration concern.
- Changing what "private" means semantically (still: hidden from listings, viewable by
  token holders, editable by owner).
- A formal "unlisted vs private" distinction — covered if/when product asks for it.

---

## Empty template

```markdown
### Feature Name

**Goal:** one sentence.

#### Layer 1 — MVP
- [ ] step

#### Layer 2 — Structural
- [ ] step

#### Layer 3 — Polish
- [ ] step
```
