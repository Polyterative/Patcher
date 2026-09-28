# Marketplace expiry-date editing — backend plan (#142 follow-up)

Goal: expose the existing `marketplace_listings.expires_at` column through the read/write backend path so sellers can set, edit, and clear a listing expiry date.

Status: DRAFT — pending `backend-plan-reviewer` gate. No SQL applied, no code changed, no commit.

## 1. Current shape (read-only inspection, 2026-09-28, `develop`)

DB (authoritative — `supabase/migrations/20260717133940_add_marketplace_listings_core_media.sql:23`):

- `marketplace_listings.expires_at timestamptz null` — nullable, no default, no CHECK constraint.
- Status enum already includes `'expired'` (`marketplace_listings_status_supported`), but nothing in this migration auto-transitions rows to `expired`; expiry is currently write-only/dead storage.
- `trg_marketplace_listings_touch_updated` (`public.tg_marketplace_listings_touch_updated()`) sets `new.updated_at = now()` on **every** UPDATE.

Generated types (`src/backend/database.types.ts:439-499`):

- `Row.expires_at: string | null`, `Insert.expires_at?: string | null`, `Update.expires_at?: string | null` — already present and optional. No typegen gap on the DB side.

Backend read path (drops the column):

- `MARKETPLACE_LISTING_COLUMNS` (`src/app/features/backend/supabase-marketplace-listings.ts:24-25`) — explicit projection, `expires_at` **absent**. All four query methods in `supabase-queries.marketplace-listings.ts` (`getActiveMarketplaceListings`, `getActiveMarketplaceListingsBySellerProfileId`, `getMarketplaceListingByPublicId`, `getCurrentUserMarketplaceListings`) select via `MARKETPLACE_LISTING_WITH_RELATIONS_COLUMNS`, so none return expiry.
- `mapMarketplaceListingRow` (`supabase-marketplace-listings.ts:123-146`) — no `expiresAt` mapping. `MarketplaceListingRow` inherits `expires_at` from `SupabaseTableRow` but the mapper silently drops it.
- `MarketplaceListing` interface (`src/app/features/marketplace/marketplace-listing.model.ts:175-196`) — no `expiresAt` field.

Backend write path (drops the column):

- `buildMarketplaceListingInsert` / `buildMarketplaceListingUpdate` (`supabase-marketplace-listings.ts:66-94`) — no `expires_at` key, so inserts/updates always leave the DB default (NULL); there is currently **no path** that writes a non-null expiry.
- `MarketplaceListingDraft` (`marketplace-listing.model.ts:97-111`), `MarketplaceListingNormalizedDraft` (`:127-141`), `MarketplaceListingDraftField` (`:113-125`), and `validateAndNormalizeMarketplaceListingDraft` (`marketplace-listing-draft.utils.ts:45-145`) — no expiry input, no validation.
- Write methods already bust the right keys and need no change (see §4): `supabase-add.ts:231,264`, `supabase-update.ts:561,584`, `supabase-delete.ts:225,261` all bust `['marketplaceListings', 'marketplaceListingWithId', 'currentUserMarketplaceListings']`.

Table registration: `DbPaths.marketplace_listings` already registered (`DatabaseStrings.ts:35`) — BACKEND_METHODS rule 1 already satisfied, no change needed.

Reference pattern for expiry validation: `normalizeFutureExpiresAt` in `src/app/features/manufacturer-detail/manufacturer-updates.utils.ts:136-156` (optional input; `expires_at_invalid` on unparseable, `expires_at_must_be_future` on past; normalizes to ISO string). Marketplace draft validation should mirror this rather than invent a new shape.

## 2. Proposed change (additive, no schema migration)

**No new DB column, no migration, no index, no RPC.** `expires_at timestamptz null` already exists. The entire change is widening the already-explicit TS projection + mapper + draft/validation + insert/update builders to carry it.

### 2a. Column projection

- `MARKETPLACE_LISTING_COLUMNS` += `expires_at` (append at end to minimize diff churn; position is irrelevant to PostgREST).
- `MARKETPLACE_LISTING_WITH_RELATIONS_COLUMNS` inherits it automatically. No join-shape change (scalar column on the primary table, not an embedded join — the BACKEND_METHODS "Selecting Columns in Embedded Joins" trimming rule does not apply; primary-table scalar addition costs one negligible column on rows already fetched).

### 2b. Mapper + domain model

- `mapMarketplaceListingRow` += `expiresAt: row.expires_at` (pass-through `string | null`, no coercion — keeps mapper total and honest for legacy NULL rows).
- `MarketplaceListing` interface += `expiresAt: string | null`.
- Fixture rows in `__tests__/supabase-service/marketplace-listings.spec.ts` already carry `expires_at: null` (`:45`) — extend assertions to `expiresAt: null` passthrough plus a non-null ISO case.

### 2c. Draft + validation

- `MarketplaceListingDraft` += `expiresAt?: string | Date | number | null` (accept the same loose input union as the manufacturer pattern; persistence layer normalizes).
- `MarketplaceListingDraftField` += `'expiresAt'`; `MarketplaceListingNormalizedDraft` += `expiresAt?: string` (absent/undefined = no expiry; never store empty string).
- `validateAndNormalizeMarketplaceListingDraft` += optional expiry branch mirroring `normalizeFutureExpiresAt`:
  - `null` / `undefined` / `''` → valid, no expiry (clearing path).
  - Unparseable → `errors.expiresAt = 'Use a valid date'` (invalid).
  - `<= now` → `errors.expiresAt = 'Use a future date'` (past rejected; matches manufacturer `expires_at_must_be_future` semantics).
  - Else normalize to `new Date(ms).toISOString()`.
- `normalizeMarketplaceListingForPersistence` passes the normalized value through; `buildMarketplaceListingInsert` / `buildMarketplaceListingUpdate` += `expires_at: listing.expiresAt ?? null` (explicit null on clear so sellers can remove expiry; `?? null` also keeps legacy drafts without the field writing NULL instead of `undefined`).

### 2d. What explicitly does NOT change

- `DbPaths` / `DatabaseStrings.ts` — table already registered.
- `CachedEntity` union / cache keys — reuse existing three keys (see §4). No new tag (same rows, same invalidation domain; cf. BACKEND_METHODS "Batching" reuse rule).
- RLS / policies / GRANTs / storage — untouched (see §5).
- Ordering / pagination — `updated_at desc, id desc` tie-breaker chains unchanged; no new paginated query.
- `status` auto-transition to `'expired'` — **out of scope**. This plan only makes expiry editable and readable. Any sweeper/cron/RPC that flips `active → expired` is a separate plan with its own trigger/RLS review.

## 3. Rejected alternatives (backend-plan-reviewer input)

| Option | Strengths | Costs / risks | Verdict |
|---|---|---|---|
| Chosen: reuse existing `expires_at timestamptz null` | Zero migration; nullable so old rows/clients unaffected; native date ordering/filtering; types already generated | `timestamptz` wire cost trivial (one scalar); past-date prevention is app-level (CHECK would need migration + lock) | **Chosen** |
| New separate `listing_expiries` relation | Normalized if expiry grew metadata (reason, history) | No such metadata requested; join cost on every listing read; migration + RLS + cache keys for one scalar; over-engineering | Rejected |
| `text` ISO column | Human-readable in raw rows | Loses native comparison/ordering; invalid strings possible without CHECK; worse than timestamptz on every axis | Rejected |
| Epoch `bigint` column | Compact | Requires migration for zero benefit; client-side date math; less readable; breaks existing generated types | Rejected |
| Boolean `auto_expire` flag + client-computed date | No date parsing | Cannot express *when*; still needs a date somewhere; adds invalid states (flag on + null date) | Rejected |
| Dedicated `set_listing_expiry` RPC | Server-side auth/validation choke point | No privilege boundary to enforce beyond owner-update (already covered by `marketplace_listings_update_own_sellable`); RPC adds surface, cache-bust wiring, and typegen without benefit | Rejected |
| DB CHECK `expires_at > now()` | Strongest invalid-state prevention | Needs migration + ACCESS EXCLUSIVE lock on a live table; blocks legitimate edge cases (seller pausing with a past stamp during edit); app-level validation + review is sufficient for this slice | Rejected for now; revisit if invalid rows observed |

## 4. Cache invalidation

No new `CachedEntity`. Reads (`getActiveMarketplaceListings`, `getActiveMarketplaceListingsBySellerProfileId`, `getMarketplaceListingByPublicId`, `getCurrentUserMarketplaceListings`) keep their existing `@Cacheable` tags; writes keep busting `['marketplaceListings', 'marketplaceListingWithId', 'currentUserMarketplaceListings']` on all add/update/delete paths (`supabase-add.ts:231,264`; `supabase-update.ts:561,584`; `supabase-delete.ts:225,261`). Expiry edits flow through `update.marketplaceListing`, which already busts all three. Test must assert the bust set is unchanged and that an expiry-only update still emits it.

## 5. RLS / security impact

None expected. No policy, GRANT, SECURITY DEFINER, or storage change. `expires_at` is read through the existing select policies (`marketplace_listings_select_public_active_anon`, `..._public_or_own_authenticated`) and written through the existing owner update path (`marketplace_listings_update_own_sellable`: `seller_profileid = auth.uid()` + sellable check). Column is non-PII scalar on an already-selectable row; no new disclosure. Per AGENTS.md §5, if a later slice proposes policy changes (e.g. hiding expired rows server-side), that requires explicit manual user approval — this plan does not.

## 6. Schema-change preflight (BACKEND_METHODS §"Schema-change preflight")

1. **Backend plan review (§0):** NOT YET DONE — this draft must go through `internaldocs/agents/backend-plan-reviewer.md` before product approval/implementation. Chosen representation + rejected alternatives recorded in §3 above.
2. **`updated` timestamp wipe (§1):** No backfill, no `UPDATE ... WHERE` migration — nothing to wipe. Note: the live `trg_marketplace_listings_touch_updated` fires `updated_at = now()` on every row update, so each seller expiry edit bumps `updated_at` and reorders the `updated_at desc` lists. This is **accepted and correct** (an expiry edit is a genuine user edit, unlike the 2026-05-15 backfill incident) — no trigger disable needed.
3. **RLS (§2):** No change proposed; no user approval required for this plan.
4. **Typegen (§3):** Run `pnpm updateBackendTypes` after implementation as a verification step only (no schema change, so `expires_at` must still be present in `Row/Insert/Update`); confirm Insert/Update keep `expires_at?` optional.
5. **Cache bust (§4):** Covered in §4 — reuse existing keys.
6. **Advisors (§5):** No schema change → no advisor run required. If reviewer requests a CHECK/index later, run Supabase MCP `get_advisors` post-apply.
7. **CURRENT_FEATURE tracking (§6):** Register on implementation; archive to COMPLETED.md on completion.

## 7. Test plan

- `supabase-marketplace-listings` unit: `MARKETPLACE_LISTING_COLUMNS` contains `expires_at`; `mapMarketplaceListingRow` passes `null` and a fixed ISO string through to `expiresAt`.
- Draft validation unit (`marketplace-listing-draft.utils.spec` or equivalent): empty/null → valid no-expiry; garbage → `expiresAt` error; past date → future-date error; future date → ISO normalized.
- Insert/update builder unit: future expiry → `expires_at` ISO in payload; cleared expiry → explicit `null`; `buildMarketplaceListingUpdate` still strips `seller_profileid`.
- Service spec (`__tests__/supabase-service/marketplace-listings.spec.ts`): extend select-shape spy assertions per BACKEND_METHODS join/column convention; assert expiry-only `update.marketplaceListing` still busts all three listing cache keys.
- `pnpm lint` (layering: no new imports across Component → Data → API → Supabase boundary) + targeted `pnpm test-headless --include="**/marketplace-listings*"`.
- No E2E in this slice (UI editing surface is a separate plan); no screenshot needed (no visual change).

## 8. Decision log

- 2026-09-28 · Reuse existing `expires_at timestamptz null`; no migration — column + types already exist, change is projection/mapper/draft only.
- 2026-09-28 · `expiresAt` is `string | null` passthrough in `MarketplaceListing` (no Date coercion) — keeps mapper total over legacy NULLs and matches DB wire type.
- 2026-09-28 · Expiry optional + clearable (`?? null` on write); past dates rejected app-side mirroring `normalizeFutureExpiresAt` manufacturer pattern.
- 2026-09-28 · No new `CachedEntity`; reuse `marketplaceListings / marketplaceListingWithId / currentUserMarketplaceListings` on existing bust paths.
- 2026-09-28 · No RLS/policy change; no `status → expired` auto-transition in this slice (separate plan).
- 2026-09-28 · `updated_at` bump on expiry edits accepted (genuine user edit, not backfill).

## 9. Documentation impact

- Internal: this plan file; on implementation, validation notes append here and completion archives per DOCUMENTATION_LIFECYCLE.
- Public docs: none in this slice (backend-only enablement; no user-visible surface until the UI editing slice ships; feature remains undiscoverable while UI is absent).

## 10. Backend plan review (backend-plan-reviewer gate, 2026-09-28, `develop`)

Verdict: **REQUEST CHANGES** — 3 required fixes below. No SQL written, no code changed, no commit (read-only inspection).

Scope inspected: this plan (§§1-9) + `BACKEND_METHODS.md` §Schema-change preflight (§0-§6) +
`src/app/features/backend/supabase-marketplace-listings.ts:24-146` +
`src/app/features/backend/supabase-queries.marketplace-listings.ts:20-99` +
`supabase/migrations/20260717133940_add_marketplace_listings_core_media.sql:5-46,165-185,295-338` +
`src/backend/database.types.ts:446,466,486` + `DatabaseStrings.ts:35` +
`supabase-add.ts:217-264`, `supabase-update.ts:547-584`, `supabase-delete.ts:188-261` +
`manufacturer-updates.utils.ts:136-156` (`normalizeFutureExpiresAt`).

What checks out (no change needed):

- **Additive safety: PASS.** No migration needed — `expires_at timestamptz null`, no default, no CHECK (`...core_media.sql:23`) already exists; `Row.expires_at: string | null`, `Insert/Update.expires_at?: string | null` already generated (`database.types.ts:446,466,486`); `DbPaths.marketplace_listings` already registered (`DatabaseStrings.ts:35`). Widening an explicit primary-table scalar projection + mapper + builders is additive; old rows/clients (NULL expiry) unaffected.
- **Trigger impact: PASS with note.** `tg_marketplace_listings_touch_updated()` unconditionally sets `new.updated_at = now()` on every UPDATE (`...core_media.sql:165-185`), and there is no backfill in this plan, so the 2026-05-15 wipe class does not apply. The plan (§6.2) correctly accepts the `updated_at` bump + `updated_at desc, id desc` reorder on expiry edits as genuine user edits. No trigger disable needed.
- **Cache-bust reuse: PASS.** All six write paths already bust `['marketplaceListings', 'marketplaceListingWithId', 'currentUserMarketplaceListings']` (`supabase-add.ts:231,264`; `supabase-update.ts:561,584`; `supabase-delete.ts:225,261`). No new `CachedEntity` — same rows, same invalidation domain per the BACKEND_METHODS batching-reuse rule.
- **RLS coverage: PASS.** Row-level policies are row-granular, not column-granular: reads flow through `marketplace_listings_select_public_active_anon` / `..._public_or_own_authenticated`, writes through `marketplace_listings_update_own_sellable` (USING owner-only, WITH CHECK owner + `is_marketplace_listing_sellable_by_owner`). A non-PII scalar on an already-selectable row adds no disclosure and no policy change. Note (pre-existing, not introduced): an expiry-only update still requires the SELLS possession marker via the WITH CHECK — a seller who removed the marker cannot update expiry, same as any other field today.
- **Typegen verify-only: PASS.** `pnpm updateBackendTypes` as a post-implementation check (assert `expires_at` still optional in Insert/Update) is the right call; no regen-driven change expected.
- **Rejected alternatives: SOUND.** Reusing `timestamptz null` over a side table / text ISO / epoch bigint / flag + computed date / RPC / immediate CHECK is correctly reasoned (zero migration, native ordering, nullable compat; app-level future-date validation sufficient for this slice). Explicitly agreed: no `expires_at` index (no query filters/orders by it in this slice) and no `active → expired` sweeper (separate plan with its own trigger/RLS review).
- **Out-of-scope boundaries: CORRECT.** No `DbPaths`/GRANT/RPC/storage change; no pagination/order change; setting `expires_at` changes no `status` (nothing in the migration auto-transitions; `getActive*` `IN ('active','reserved')` filters are untouched).

Required changes (must fix before product approval / implementation):

1. **Fix update-builder clear-vs-absent semantics (data-loss bug).** §2c proposes `expires_at: listing.expiresAt ?? null` in the shared insert builder, inherited by `buildMarketplaceListingUpdate` (which spreads the insert shape minus `seller_profileid`, `supabase-marketplace-listings.ts:88-94`). That conflates "draft has no expiry field" (legacy callers, unrelated title/price edits) with "seller explicitly cleared expiry" — every update without the field would write `expires_at = NULL` and silently wipe a previously set expiry. Fix: keep `expires_at: normalized → null` default in `buildMarketplaceListingInsert` only; in `buildMarketplaceListingUpdate`, omit the key when the normalized value is `undefined`/absent and send explicit `null` only on an explicit clear (`null`/`''` input). Add builder unit cases: (a) update draft without `expiresAt` → payload has **no** `expires_at` key; (b) explicit clear → `expires_at: null`; (c) future date → ISO string.
2. **Correct §4 + make expiry validation testable and type-consistent.** (a) §4 states all four reads "keep their existing `@Cacheable` tags" — false for `getCurrentUserMarketplaceListings`, which has no `@Cacheable` decorator (`supabase-queries.marketplace-listings.ts:79-99`, session-scoped). Reword to: three `GET` reads keep tags; the session-scoped fourth stays uncached. (b) `normalizeFutureExpiresAt` takes an explicit `now` parameter (`manufacturer-updates.utils.ts:136-139`); the plan's validation branch names no clock injection, making the past/future boundary untestable without flakiness. Require the same injectable-`now` shape (or reuse the manufacturer helper) and pin boundary semantics (`<= now` rejected, per §2c). (c) Manufacturer errors are union codes (`expires_at_invalid` / `expires_at_must_be_future`); §2c proposes display strings (`'Use a valid date'`). Require matching the existing `MarketplaceListingDraft` error-union convention (codes in validation, display strings at the UI layer) — check `marketplace-listing-draft.utils.ts:45-145` error type before implementation.
3. **Harden the test plan for additive-projection and compile impact.** (a) Per BACKEND_METHODS "Selecting Columns in Embedded Joins," the select-shape spy must assert both positive (`stringContaining('expires_at')`) and negative (no restored over-fetch, e.g. no `(*)` on the primary table) — §7 currently lists only the positive. (b) Making `MarketplaceListing.expiresAt: string | null` **required** breaks every existing `MarketplaceListing` object literal (fixtures, mocks, `BackendDouble`-style doubles). Require a pre-implementation grep for `MarketplaceListing` literals / `mapMarketplaceListingRow` consumers and update all producers, or justify making the field optional (`expiresAt?: string | null`). (c) Add an assertion that an expiry-only `update.marketplaceListing` still emits the unchanged three-key bust set (already planned) **and** that `buildMarketplaceListingUpdate` still strips `seller_profileid` when `expires_at` is present (regression guard on the destructuring path).
