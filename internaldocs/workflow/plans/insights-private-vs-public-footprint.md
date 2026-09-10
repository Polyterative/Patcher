# Insights private-vs-public footprint — plan (PLAN ONLY, no implementation)

> Status: draft plan for product-owner review. No code, migration, or remote change authorized by this file.

## Goal

Add ONE small new statistic to the public `/info/insights` page: a private-vs-public comparison showing that private work exists and counts — primarily for RACKS (owner expects most racks are private; users should see their private racks "are still there"), ideally as a pie-style visual. Modules/patches private-vs-public only if the same data source yields them with near-zero extra cost; otherwise racks-only with an explicit follow-up note. Keep scope tight: ONE new section/card.

Owner's words (preserved): "just a new useful statistic", "pick an insight on the private data as well, like a comparison between private and public, like with a pie chart. About the racks, I expect many racks to be private. I want to show that they are still there somehow."

## Non-goals (explicit scope cuts)

- No per-user, per-entity, or identifying data. No contents/metadata of private items.
- No new pages, routes, flags, or navigation changes.
- No changes to the hero Ownership Top-6, Fresh chart, 30-day activity, or Makers sections beyond inserting one card.
- No RLS/policy change, migration apply, Vault secret, or remote typegen in this plan's authorization — all separately gated (see § Open questions / gates).

## Approvals-ledger check (internaldocs/workflow/TODO.md, read 2026-09-10)

- Standing approvals cover: docs-only changes; frontend-only changes on `develop` behind existing flags with targeted specs + lint; several named Cloudflare/Marketplace/Price-Hub/API scopes. None covers an insights snapshot RPC change or migration apply.
- Pending questions are unrelated (security hardening queue, rack orientation smallint migration, Cloudflare traffic switch, PostHog credentials).
- Denials / permanent constraints that bind this plan: production branch / release / pushes never autonomous; Supabase RLS/policy never autonomous (AGENTS.md §5); backend-breaking changes to live production clients require the user present.
- Consequence: this plan LISTS gates for the owner to register in TODO.md. It does not edit TODO.md / CURRENT_FEATURE.md / COMPLETED.md (per task instructions).

## Discovery findings (with file/line evidence)

### 1. Page, route, public status

- Route: `src/app/features/info-pages/info-pages.module.ts:17-21` — `path: 'insights'` lazy-loads `ApplicationInsightsModule`. No auth guard on this branch; toolbar exposes `/info/insights` publicly (`toolbar-link-data.ts:20`, specs assert public exposure).
- Page component: `application-insights-page.component.{ts,html,scss,spec.ts}`, module `application-insights.module.ts` (declares `ApplicationInsightsPageComponent`, `InsightChipComponent`, `InsightMetricBarComponent`; imports `ModulePartsModule` for `app-module-minimal` hero cards).
- Current sections (html order): hero Ownership Top-6 (`hero-cards`) → Fresh last-30d stacked chart → Library now (`snapshot-grid`) → 30-day activity (`activity-chips`) → Makers in motion (`metric-bars`). Each card ends with a `method-note` paragraph and `hero-actions` browse buttons.
- Component vm: `application-insights-page.component.ts:87,123-136` — `vm$ = combineLatest([pageState$, discoveryState$, heroBucket$])` with `startWith(LOADING_VM)`; `page` comes from `ApplicationStatisticsService.page$`, `discovery` from `discovery$`. New fields flow through `page` only — no component-stream redesign needed.

### 2. Data pipeline (service → mappers → models → component)

- Service: `src/app/features/backbone/home/application-statistics.service.ts:65-69` — `page$ = refreshRequest$.pipe(switchMap(() => backend.GET.applicationInsightsSnapshot(30)), map(({statistics, activitySeries, moduleInsights}) => mappers.mapPage(...)))`.
- Backend binding: `src/app/features/backend/supabase.service.ts:218` — `applicationInsightsSnapshot: queries.getApplicationInsightsSnapshot.bind(...)`; typed in the `GET` namespace surface.
- Snapshot fetcher: `src/app/features/backend/supabase-queries.application-insights-snapshot.ts:167-222` — `@Cacheable({maxAge: defaultCacheTime, cacheBusterObserver: filter(modules|patches|profiles|rackWithId|racksMinimal), maxCacheCount: 20})`, calls `rpc('get_application_insights_snapshot', {p_days: days})`, defaults missing `statistics` to the 11-field public-only shape. Any new statistics keys must get defaults HERE (forward/backward compat for old RPC responses during rollout).
- Types: `src/app/features/backend/supabase-queries.models.ts:15-27` (`PublicApplicationStatistics`, 11 public-only numbers), `:65-69` (`PublicApplicationInsightsSnapshot`); page model `src/app/features/backbone/home/application-statistics.models.ts:71-105` (`ApplicationInsightsPage`).
- Mappers: `application-statistics.mappers.ts:46-52` (`mapPage` delegates to `mapApplicationInsightsPage`); `application-statistics.page-mapper.ts:18-100` (builds `footprintSnapshot`, spreads `mapSharingSections` etc.); `application-statistics.sharing-mappers.ts` (rate bars with suppression via `createRateDatum`); `mapper-formatting.ts` (`mapSharingMix`, `mapTrendDays`); `mapper-context.ts` (context interface); `utils.ts:96-125` (`createRateDatum` minimum-numerator/denominator suppression, `mapBarWidths`, `formatPercentValue`).
- Suppression convention (existing, to reuse): hero uses minimum count 1 / "Not enough data yet" (`application-insights-page.component.html:49-50,99`); rate bars use `createRateDatum` minimums (e.g. sharing-mappers.ts:35-36 `minimumNumerator: 3, minimumDenominator: 10`; patch-depth up to 12/5). Suppressed metrics return `null` and are filtered out; highlights fall back to `'N/A'`.

### 3. What visibility columns exist (verified against `src/backend/database.types.ts`, not memory)

- `racks.Row` (`database.types.ts:1684-1698`): `authorid: string`, `public: boolean`, plus `public_id`, `locked`, `hp/rows`, timestamps. Visibility = `racks.public` AND author's `profiles.public` (see RPC below).
- `patches.Row` (`:1449-1462`): `authorid: string`, `public: boolean`, `public_id`, `linked_rack_id`, timestamps. Public-facing definition additionally requires ≥1 row in `patch_connections` (connected patches only).
- `modules.Row` (`:1180-1204`): `public: boolean`, `manufacturerId`, `submitter`, no `authorid`. Visibility = `modules.public` alone.
- `profiles.Row` (`:1506-1517`): `public: boolean`, `username`, etc. Gates rack visibility.
- `DbPaths` (`src/app/features/backend/DatabaseStrings.ts:3-41`) already registers `modules`, `racks`, `patches`, `profiles` — no new table registration needed for an RPC that counts these tables (confirm in implementation PR; BACKEND_METHODS §"Adding a New Backend Method" step 1 is satisfied by existing entries).

### 4. Current snapshot RPC — public-only, additively extendable

- Migration: `supabase/migrations/20260511213000_add_get_application_insights_snapshot_rpc.sql`.
- Signature: `get_application_insights_snapshot(p_days integer default 30)` RETURNS TABLE `(statistics jsonb, activity_series jsonb, module_insights jsonb)`, `LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public` (`:1-13`), with `revoke ... from public; grant execute ... to anon, authenticated` (`:442-444`). Typegen mirrors this (`database.types.ts:2424-2431`: Args `{p_days?}`, Returns `{statistics: Json, activity_series: Json, module_insights: Json}[]`).
- Public filters inside: `public_modules ... where m.public = true` (`:26-38`); `public_visible_racks ... where r.public = true and p.public = true` (`:39-48`); `public_connected_patches ... where p.public = true and exists (patch_connections)` (`:49-61`). Final `statistics` object has exactly 11 keys, all public (`:226-257`).
- **Queryable today: only PUBLIC aggregates.** There is NO existing private count in this RPC. Answer to the discovery question: private-vs-public counts are NOT queryable from the insights snapshot today; the raw columns to derive them (`racks.public`, `patches.public`, `modules.public`, `profiles.public`) exist and are readable inside a SECURITY DEFINER function.
- **Backward compatibility: YES, additive extension is safe.** The `RETURNS TABLE` shape stays `(statistics, activity_series, module_insights)`; new data rides inside the `statistics` JSONB object as new keys (old clients ignore unknown JSON keys; new client defaults missing keys to `undefined`/suppressed). Production is live on `develop` + `production`; no breaking change is proposed. A brand-new second RPC is unnecessary (extra round-trip, extra cache entry, more surface).
- Precedent for exposing private COUNTS publicly via SECURITY DEFINER: `get_module_usage_summary` (`supabase/migrations/20260511161500_add_get_module_usage_summary_rpc.sql:1-58`) is `SECURITY DEFINER`, granted to `anon`, and returns per-module `hidden_rack_count = total − public` and `hidden_patch_count`. So global private counts via a locked-down aggregate RPC already have an accepted in-repo precedent — but this plan still treats the new aggregate as a security boundary requiring review + explicit owner approval.

### 5. Cache keys

- `getApplicationInsightsSnapshot` reuses the existing cache entry (`defaultCacheTime` = 5 min, `InMemoryStorageStrategy`; busted by `modules|patches|profiles|rackWithId|racksMinimal`). No new `CachedEntity` tag is needed: the extended payload rides the same key, and existing rack/patch/profile write paths already bust those tags, keeping private totals fresh. Implementation must confirm no write path creates private racks without busting one of those tags (expected to hold; verify by grep in PR).
- `CachedEntity` union lives in `src/app/features/backend/supabase.cache.ts:73-107`.

### 6. Visual system — no pie/donut exists; dependency-free proposal required

- Repo grep for `conic-gradient|donut|pie-chart|pieChart` in `src/` returns no component (only the Fresh stacked bars and `insight-metric-bar` horizontal bars exist as chart precedent).
- Canonical constraints from `internaldocs/DESIGN_LANGUAGE.md` (read before proposing visuals): laboratory-grade instrument, zero-bullshit, information hierarchy through position/weight not decoration; tight type scale with tabular numerals; near-black/dark chrome is the product direction but THIS page is currently light (`application-insights-page.component.scss:1-16` light gradient + `--insights-blue-*` ramp) — so the new visual must reuse the page's existing blue ramp and card chrome, not introduce a dark island; colour encodes state, never decoration; no decorative shadows/gradients (gradients only if they encode a continuous range — a two-slice share is NOT continuous, so use flat slices); spacing from `tools-utilities.scss` scale only; motion ≤150 ms, honest loading states; Material Icons only; responsive via layout helpers, tested mobile portrait → desktop 1920; never collapse content silently.
- Consequence: propose an inline-SVG donut (two flat `<circle>` strokes with `stroke-dasharray`, no library) OR a CSS `conic-gradient` ring. SVG is preferred (exact `role="img"` + `<title>`/aria-label, `prefers-reduced-motion`-safe, no animation needed). Reuse `--insights-blue-500` (public) vs `--insights-blue-200/300` (private) or equivalent two-step ramp already on the page; legend carries the numbers so colour is redundant encoding, not sole encoding.

## Proposed physical representation (chosen) + rejected alternatives

### Chosen: extend `statistics` JSONB additively with total/private counts (no schema-column change, no new table, no RLS change)

New `statistics` keys (all integers, `count(*)::int`):

- `totalRacks`, `privateRacks` (where private = total − public-visible under the SAME rack definition the page already uses).
- If near-zero extra cost holds (same RPC, two more `count(*)` over already-scanned CTEs): `totalPatches`, `privatePatches`, `totalModules`, `privateModules`. Otherwise racks-only; modules/patches become an explicit follow-up (see scope rule below).
- Lesson from preflight §1 (timestamp triggers): this is a SELECT-only RPC change. No `UPDATE`, no backfill, no trigger interaction, no `updated`-wipe risk. State this in the implementation PR.
- Least-privilege return shape (preflight §2): counts only. No ids, no author ids, no names, no timestamps, no per-entity rows. Function keeps `SECURITY DEFINER`, `SET search_path = public`, `STABLE`, `revoke from public / grant to anon, authenticated` exactly as today. Body uses only static SQL over the four tables; no `format()`/dynamic SQL (no injection surface).
- Frontend derives shares client-side (`private/total`, `formatPercentValue` precedent) and suppresses per the suppression rule. No new RPC args; `p_days` semantics untouched (footprint is point-in-time, not windowed).

Exact rack semantics to implement (must match the page's existing public definition or the share is meaningless):

- `public_visible_racks` (unchanged): `racks r JOIN profiles p ON p.id = r.authorid WHERE r.public AND p.public`.
- `total_racks`: `count(*) FROM public.racks` — DECISION REQUIRED (owner gate): count ALL racks, or only racks on confirmed/existing profiles? Recommended: `count(*) FROM public.racks` unfiltered (simplest, matches "your private racks are still there" mental model; deleted-user orphans are negligible). Alternative (rejected unless reviewer insists): join profiles and count only rows with a live author — adds a join for no user-visible gain.
- `private_racks = greatest(total_racks − public_visible_racks, 0)`.
- Patches (if included): mirror the connected-patch definition — `total_connected_patches` = patches with ≥1 `patch_connections` row regardless of flags; `public_connected_patches` as today; `private = total − public`. Rationale: the page's patch universe is "connected public patches", so the private slice must be "connected non-public" or the donut compares incompatible populations. Unconnected drafts are excluded from BOTH slices and disclosed in the method note.
- Modules (if included): `total_modules = count(*) FROM modules`; `public_modules` as today; `private = total − public`. Note modules have no author gate, so semantics are cleanest here.

Scope rule (owner's tight-scope constraint): implement racks MUST; add patches + modules in the SAME migration only if each is literally one more `count(*)` CTE over tables the RPC already touches AND the frontend card can show all three without growing beyond one card (e.g. one donut for racks + two one-line shares for modules/patches, or a three-row mini-legend). If either condition fails, ship racks-only and file the follow-up. The plan's default assumption is **racks + modules + patches totals are all cheap** (three `count(*)`s, no new joins except the existing rack→profile join), but the IMPLEMENTER must confirm query cost with `EXPLAIN` on representative data and cut back to racks-only if anything is non-trivial.

### Rejected alternatives (recorded per AGENTS.md §5 + backend-plan-reviewer gate)

| Option | Strengths | Costs / risks | Verdict |
|---|---|---|---|
| New separate RPC/view for private counts | Isolates new code; zero touch to existing RPC | Extra round-trip + latency on a public page; second cache entry + invalidation matrix; two sources can disagree within a cache window; more review surface | REJECTED — additive JSONB keys dominate on cost and consistency |
| Direct client-side `count(*, head:true)` on `racks/patches/modules` via PostgREST | No SQL change at all | Anon/auth RLS only sees public-or-own rows ("public or own" rack policy; `patch_module_instances_select_public_or_own` precedent), so anon gets public counts, never global private totals; opening RLS to expose private rows would be a major security regression | REJECTED — impossible without breaking RLS; never proposed |
| New persisted column / summary table / trigger-maintained counters | Fast reads at scale | Persistent-data-shape change, backfill timestamp-wipe risk (preflight §1 incident 2026-05-15), trigger/rollback burden, mixed old/new client compat, overkill for three `count(*)`s on tables that already serve this RPC in ~ms | REJECTED — no-new-column wins; revisit only with measured perf evidence |
| Per-user "your X private racks" personalization | Strongest reassurance signal | Requires auth-gated query on a public unauthenticated page; introduces per-user data on a public surface; scope explosion | REJECTED — global aggregates only (privacy constraint) |
| Percent-only without absolute private totals | Slightly smaller disclosure | Owner wants users to feel private work "is still there" — absolute counts reassure more than a bare %; both are global aggregates with identical sensitivity class | REJECTED as sole output — show both count + share; suppression rule handles small-N instead |

## Privacy analysis + suppression rule (non-negotiable constraints, called out explicitly)

1. **PUBLIC + unauthenticated surface.** `/info/insights` is served to anon. Only GLOBAL aggregates may ever be shown (e.g. "% of racks are private", "N private racks"). NEVER per-user, per-entity, or identifying data; never contents/metadata of private items. The RPC returns counts only; the frontend receives no rows to leak.
2. **De-anonymization edge cases analyzed:**
   - *Small-N inference:* if `totalRacks` is tiny (e.g. 5 total, 4 public), publishing `private = 1` reveals that exactly one hidden rack exists — but not whose, and no content. Risk is low but nonzero in a single-digit universe (an observer who knows all public racks learns one hidden rack exists; combined with timing or `get_module_usage_summary` per-module hidden counts, a determined observer could narrow down WHICH module is used privately — still not who).
   - *Cross-referencing with public browsers:* public rack/patch browsers already enumerate the public slice; the private count is the complement. No per-entity linkage is exposed beyond what subtraction already implies.
   - *Author-gate subtlety:* `public_visible_racks` requires BOTH `r.public` AND `p.public`. A rack with `r.public = true` on a private profile counts as PRIVATE in this scheme. That is correct for the page's mental model ("visible in the public library vs not") but must be disclosed in the method note so a user with a public rack on a private profile isn't confused about which slice they're in.
   - *Exact-totals-at-small-N sensitivity:* exact private totals below ~10 make single-creation events observable over time (poll the page, see +1). This is inherent to ANY global counter on a public page (the existing public counters have the same property) and is accepted for public counts; the mitigation is a minimum-count suppression gate, not hiding the feature.
3. **Suppression rule (proposed, needs owner sign-off):** reuse the existing `createRateDatum` convention, not a new invention:
   - Show the private-vs-public donut ONLY when `totalRacks >= 10` AND each displayed slice `>= 3`. Otherwise render the card with the headline suppressed and the existing copy pattern "Not enough data yet." plus the method note (mirrors hero `minimum count 1` and `sharing-mappers` 3/10 minimums).
   - Same gate per entity if modules/patches are included (each entity gated independently so a large racks universe doesn't launder a tiny patches universe into view).
   - No coarser bucketing or rounding proposed beyond this gate: counts are exact integers like every other footprint number on the page; rounding would break the page's "absolute counts, not progress bars" contract (`Library now` card description). If the owner judges exact private totals sensitive at small N even WITH the gate, the fallback is to raise thresholds (e.g. 5/20), not to round.
4. **RLS / policy stance:** this plan PROPOSES NO RLS, policy, GRANT (beyond the existing anon/auth execute on the same function), storage, Vault, or remote change. The SECURITY DEFINER aggregate is the entire privilege story, and its body must be reviewed as a security boundary (static SQL, fixed `search_path`, counts-only). Any reviewer finding that implies a policy change becomes a NEW explicit owner approval — never applied autonomously (AGENTS.md §5; TODO.md denials).

## Frontend placement brief (REQUIRED by repo UX rules)

- **Where the element lives:** inside the `vm.page` branch of `application-insights-page.component.html`, as a new `lib-hero-content-card` in the existing `.insights-page` grid. entering through the `ApplicationInsightsPage` model (new optional `privateFootprint` field mapped in `page-mapper.ts`), rendered from `vm.page` like every sibling card. No route, nav, toolbar, or SEO URL change.
- **Visual weight:** medium-low, equal sibling to `Library now` / `30-day activity` — one donut (≈6–8 rem diameter inline SVG, two flat slices, center label with private %), a 2–3 row legend with tabular numerals (Public N · Private N · Share %), one `takeaway` line, existing `hero-actions` browse-racks button pattern, one `method-note`. No animation (static SVG; `prefers-reduced-motion` has nothing to disable). No new tones outside the page's `--insights-blue-*` ramp + existing `brand/emerald/violet/amber` metric tones. Density matches siblings (`snapshot-grid`/`activity-chips` rhythm, `tools-utilities.scss` gaps only, no ad-hoc px outside the `rem` convention — `check-px-ts.sh`).
- **Affected vs excluded surfaces:** AFFECTED: `/info/insights` only (new card + `ApplicationInsightsPage` model/mapper + snapshot fetcher defaults). EXCLUDED: hero rankings, Fresh chart, discovery pipeline, home teaser (`mapTeaser` untouched), SEO title/URL (copy tweak to description only if needed — default: untouched), browsers, dashboards, emails, docs screenshots (docs screenshot work follows DOCUMENTATION_LIFECYCLE only after production publication; not in this plan).
- **Options (2–3 + recommended default):**
  - **Option A (RECOMMENDED): standalone card "Private footprint" placed immediately after "Library now", before "30-day activity".** Why: pairs the public absolute counts the user just read with the private complement while the library mental model is hot; high visibility for the owner's reassurance goal without touching the hero; one-card insertion is the smallest diff that still reads as a first-class insight. Weight: same as siblings.
  - **Option B: extend "Library now" with a donut row inside the existing card.** Why considered: tightest possible diff, no new card chrome. Why NOT recommended: `Library now`'s contract is "absolute counts, not progress bars" — a share donut breaks that contract inside the card; grid of four snapshot metrics has no room for a donut + legend without reflowing siblings at 36 rem breakpoint; mixing point-in-time totals with shares confuses the method note.
  - **Option C: reassurance footer card at the very end (after "Makers in motion").** Why considered: lowest disruption risk, reads as a coda ("and your private work counts too"). Why NOT recommended: lowest visibility — the exact users who bounce after the hero/charts never see it; owner wants private work surfaced, not footnoted.
- **Designer gate:** per AGENTS.md §5, placement/hierarchy is co-designed. This brief IS the placement proposal — owner approves A (or picks B/C) before implementation. No `designer` sub-agent pass needed beyond this brief unless the owner wants mock-level exploration; if they do, run `designer` on options A vs B with live screenshots.

## Copy framing (reassurance: private racks "are still there") + method-note text

Proposed card copy (final wording_owner-approved at implementation; keep zero-bullshit, sentence-case labels):

- Card title: `Private footprint` · icon: `lock` (Material Icons, sibling cards use `analytics`/`timeline`/`precision_manufacturing`) · description: `How much of the library stays private — your unshared work still counts.`
- Takeaway: `Takeaway: most racks stay private — they are still here, still counted, and still yours. Sharing is optional.`
- Legend rows: `Public racks N (P%)` · `Private racks N (P%)`; if modules/patches included, one line each: `Private modules N (P%)` · `Private patches N (P%)` with the connected-patch caveat.
- Empty/suppressed state: `Not enough data yet.` (exact existing string) + subline `Private shares appear once the library is large enough to show them without singling anyone out.`
- Method-note (racks-only variant): `Method: point-in-time global totals from the cached public snapshot. Public racks are shared racks on public profiles; private is everything else (unshared racks plus shared racks on private profiles). Counts only — no private contents, names, or owners are exposed. Shares hide until totals reach 10 with at least 3 per slice.`
- Method-note (racks+modules+patches variant): append `Patches count connected works only (≥1 saved cable connection); unconnected drafts are in neither slice. Modules have no profile gate.`
- SEO: no title/URL change. Description may gain one clause at implementation (`...and the private footprint`) — optional, owner call.

## Implementation steps (for the future implementer — NOT executed by this plan)

1. **Migration (author locally, DO NOT apply remotely):** new `supabase/migrations/<timestamp>_add_private_footprint_to_insights_snapshot.sql` with `CREATE OR REPLACE FUNCTION public.get_application_insights_snapshot(...)` — full body copied from `20260511213000`, plus `total_racks/private_racks` (+ optionally totals for patches/modules) CTEs and new `statistics` keys. Keep signature, volatility, `search_path`, grants identical. No `UPDATE`/backfill (preflight §1 N/A — note it in the PR). Run local Docker validation + `get_advisors` (lint+security) per preflight §5; address errors/warns or document.
2. **Typegen (local):** `pnpm updateBackendTypes`; confirm `get_application_insights_snapshot` Returns shape unchanged (still `Json` triple) and hand-fix any Insert/Update optional drift per preflight §3. No remote typegen.
3. **Backend TS:** `supabase-queries.models.ts` — extend `PublicApplicationStatistics` with optional `totalRacks/privateRacks` (+ optionals for patches/modules); `supabase-queries.application-insights-snapshot.ts` — default new keys when absent (old-RPC compat: `?? 0` then mapper suppresses). Tables already in `DbPaths` — note the check, add nothing. No new `CachedEntity` (reuse same entry + existing busters); verify write paths in PR.
4. **Mappers:** `application-statistics.models.ts` — add optional `privateFootprint` to `ApplicationInsightsPage` (donut segments + legend + suppressed flag); `page-mapper.ts` — map it with the §Privacy suppression gate; reuse `formatCount/formatPercentValue/mapBarWidths` idioms. Suppression helper co-located with `createRateDatum` precedent.
5. **Component/template/styles:** extend `ApplicationInsightsVm` only if needed (prefer reading straight from `vm.page.privateFootprint` — no new streams); add the Option-A card in html with `role="img"` + aria-label on the SVG, tabular numerals, existing card classes; styles in scss reusing `--insights-blue-*`, card, legend, method-note patterns; mobile 36 rem/24 rem breakpoints per existing file.
6. **Specs:** extend `application-statistics.service.spec.ts` / page-mapper + utils specs (new keys, suppression gates, old-payload defaults), `application-insights-page.component.spec.ts` (suppressed vs shown states), backend `get-complex-queries.spec.ts` `GET.applicationInsightsSnapshot` block (defaults mapping). Keep runs targeted (`pnpm test-headless --include="**/application-*insights*.spec.ts"` style).
7. **Checks + screenshots:** `pnpm lint` (layering R1–R4, route-module, px, docs checks); desktop 1280/1920 + mobile portrait screenshots via `patcher-ui-debug` skill / `scripts/dev/agent-snapshot.mjs` before concluding; manual a11y pass (keyboard, contrast, reduced-motion, screen-reader label).
8. **Docs lifecycle:** this plan carries the Documentation impact block (below). On `develop` completion, queue the public-docs entry; never present as live before production publication + visibility confirmation.

## Validation plan

- Targeted specs listed above, all passing; `pnpm lint` clean (including `check-layering.cjs`, `check-route-module-imports.cjs`, `check-px-ts.sh`, `check-docs.cjs`).
- RPC: local Docker `EXPLAIN` showing the added `count(*)`s ride existing scans; advisors clean; old-payload (11-key) vs new-payload mapper tests both green.
- Visual: desktop + mobile screenshots inspected in-session (donut renders, legend aligns, no layout shift at 36 rem/24 rem, suppressed state shows "Not enough data yet.").
- Privacy self-check: response payload contains integers only (no ids/names/timestamps); suppressed-state test with `totalRacks < 10`; author-gate test (public rack on private profile lands in private slice).

## Backend plan review (self-review acting as `backend-plan-reviewer` per AGENTS.md §5)

### Decision matrix

| Option | Strengths | Costs/risks | Verdict |
|---|---|---|---|
| Chosen: additive JSONB keys in existing SECURITY DEFINER RPC | No signature change; old clients ignore new keys; one round-trip; same cache entry; SELECT-only (no trigger/backfill/rollback burden); counts-only least privilege | RPC body grows slightly; needs owner approval for migration apply; thresholds need product sign-off | ADOPT |
| Separate RPC/view | Isolation | 2× round-trips, dual-cache skew, more surface | REJECTED |
| Client-side direct counts | No SQL | RLS makes private rows invisible to anon; would require opening RLS (security regression) | REJECTED |
| Persisted counters/triggers | Read speed at huge scale | Schema-shape change, backfill `updated`-wipe risk, trigger ops burden; unjustified without perf evidence | REJECTED |
| No-new-column derived `total − public` | Zero storage, always consistent | Poll-observable +1 at small N (accepted; mitigated by suppression gate, same as existing public counters) | ADOPT (with gate) |

### Findings

- HIGH · Physical representation · `total_racks` definition (all rows vs live-author-only) must be pinned before implementation — plan recommends all-rows + records the choice in the Decision log. No BLOCK; owner confirms.
- MEDIUM · Migration mechanics · No locking/rewrite/backfill (SELECT-only function replace takes a brief lock on the function only, no table rewrite). Rollback = redeploy previous function body. State in PR.
- MEDIUM · RLS · No policy change proposed or needed. The SECURITY DEFINER body is the trust boundary: static SQL, `SET search_path = public`, counts-only output, existing anon/auth execute grants. Any new grant/policy need found in review becomes a fresh owner gate.
- MEDIUM · Cache · Reuse existing entry; verify private-rack writes bust `racksMinimal`/`rackWithId` (or add the missing bust — additive, non-breaking).
- LOW · Typegen · Returns shape unchanged; still run `pnpm updateBackendTypes` locally and report drift.

Verdict: **APPROVE WITH CHANGES** — proceed to product approval with the open questions below answered; no representation change required.

## Documentation impact

- Classification: public-behavioral + public-visual (new card on a public page; no contract/URL/API change)
- Production visibility: immediate (page is ungated public; no feature flag proposed — add one only if the owner wants shielding, default: none)
- Public docs paths: likely `Patcher-docs` insights/library pages (exact paths named at publication time, post-production-confirmation only)
- Screenshot targets: `insights` desktop + mobile (captured at implementation; refreshed per DOCS_SCREENSHOTS only after production publication + manual review)
- Changelog summary: `The insights page now shows how much of the library stays private, starting with racks.`

## Decision log

- 2026-09-10 · Chose additive `statistics`-JSONB extension over new RPC (single round-trip, same cache entry, backward-compatible; rejected separate-RPC, direct-count, persisted-counter, per-user variants with reasons above).
- 2026-09-10 · Chose inline-SVG donut over library/CSS-only pie (accessible `role="img"` label, no dependency, flat slices per DESIGN_LANGUAGE; conic-gradient kept as fallback).
- 2026-09-10 · Chose Option A placement (standalone card after Library now) as recommended default; B/C documented with rejection reasons; owner picks before implementation.
- 2026-09-10 · Chose `total − public` derivation with `totalRacks >= 10, slice >= 3` suppression gate (reuses `createRateDatum` convention; exact counts preserved per page contract; thresholds owner-adjustable).
- 2026-09-10 · Read BACKEND_METHODS §"Schema-change preflight" before writing SQL guidance: §0 review done in-plan; §1 N/A (SELECT-only, no backfill); §2 no RLS proposed (SECURITY DEFINER body reviewed as boundary); §3 local typegen required; §4 cache reuse verified in plan, write-path audit deferred to PR; §5 advisors required pre-apply; §6 CURRENT_FEATURE recording deferred to implementation phase.
- 2026-09-10 · Precedent noted: `get_module_usage_summary` already exposes per-module hidden counts to anon via SECURITY DEFINER — global private counts follow the same accepted pattern but still require explicit approval.
- 2026-09-10 · IMPLEMENTATION — scope outcome: ALL-THREE (racks+modules+patches). Local EXPLAIN on throwaway PG15 (20k racks / 8k modules / 10k patches / 15k connections, synthetic): total_racks bare seq-scan aggregate 0.59 ms; total_modules 0.21 ms; total_connected_patches hash-semi-join 1.95 ms vs existing public_connected_patches baseline 1.42 ms (same plan shape, rides already-scanned tables); combined new-keys fragment 3.10 ms; full extended function executes in 27.46 ms. Each new key is one cheap count(*); gate condition for all-three met.
- 2026-09-10 · IMPLEMENTATION — local Docker functional validation: new migration applied cleanly to a minimal mirror schema (CREATE FUNCTION ok; anon/authenticated GRANT errors expected — those roles exist only in real Supabase). Live run verified all six keys (totalRacks/privateRacks/totalModules/privateModules/totalPatches/privatePatches), private = greatest(total − public, 0), and the author-gate (952 public-flagged racks on private profiles correctly land in the private slice). First draft failed creation with a WITH forward-reference (footprint_totals placed before module_rows); fixed by moving the CTE after module_rows.
- 2026-09-10 · IMPLEMENTATION — `total_racks` = all rows (plan recommendation, unopposed) as authorized. Frontend derives shares client-side; suppression total ≥ 10 AND slice ≥ 3 per entity, racks slice carries the card.
- 2026-09-10 · IMPLEMENTATION — deviations/limits: (a) `pnpm updateBackendTypes` NOT run — local `supabase db start` fails pre-existing (migrations assume a remote baseline: `relation "modules" does not exist` on 20260328122200); Returns shape is unchanged (Json triple) so no type drift is possible from this change; typegen refresh queued for the remote-apply operator window. (b) Supabase-MCP `get_advisors` unavailable in this session (no MCP tools); self-checked security boundary instead (signature/volatility/search_path/grants identical, static SQL, counts-only) — advisors queued for the operator window. (c) Live-page screenshots show the suppressed card (remote RPC still 11-key); the donut/shown branch was validated via an isolated SVG+CSS preview (arc origin, shares, legend alignment inspected) — re-verify live after remote apply.
- 2026-09-10 · IMPLEMENTATION — cache: verified rack writes bust `rackWithId`/`racksMinimal`, which the snapshot entry already listens on (plus `modules|patches|profiles`); no new CachedEntity. DbPaths already registers all four tables — nothing added.

## Open questions / gates (for the owner to register in TODO.md Approvals ledger — plan requests NOTHING autonomously)

1. **Placement:** approve Option A (new card after Library now) or pick B/C. (Recommended default: A.)
2. **Scope:** racks-only v1, or racks+modules+patches in the same migration if the implementer's EXPLAIN confirms near-zero cost? (Recommended default: include all three ONLY if each is one cheap `count(*)`; else racks-only + follow-up note.)
3. **Suppression thresholds:** approve `total >= 10, slice >= 3` per entity, or set higher (e.g. 5/20)? Exact counts preserved in all cases.
4. **`total_racks` definition:** all rows in `racks`, or only rows with a live author profile? (Recommended default: all rows.)
5. **Migration authorization (two separate gates):** (a) authorize authoring + local Docker validation + local typegen + advisors on `develop`; (b) separately authorize remote migration apply to the Supabase project (operator window, user present). No RLS/policy/storage/Vault change is requested; any such need found later returns as a new gate.
6. **Copy:** approve takeaway/method-note wording above or supply edits (especially the "shared racks on private profiles count as private" disclosure).
7. **Flag/shielding:** page is ungated public — confirm no feature flag wanted for the new card (default: ship visible on `develop`, release with normal flow).

## File / evidence index (spot-checkable)

- Page: `src/app/features/info-pages/application-insights/application-insights-page.component.{ts:87,103-136,171-198, html:17-22,100-287, scss:1-21, spec.ts}`; module `application-insights.module.ts`; route `info-pages.module.ts:17-21`.
- Pipeline: `application-statistics.service.ts:65-69`; `supabase.service.ts:218`; `supabase-queries.application-insights-snapshot.ts:157-222`; models `supabase-queries.models.ts:15-27,65-69` + `application-statistics.models.ts:71-105`; mappers `mappers.ts:46-52`, `page-mapper.ts:18-100`, `sharing-mappers.ts`, `mapper-formatting.ts`, `mapper-context.ts`, `utils.ts:96-125`.
- Backend: `supabase/migrations/20260511213000_add_get_application_insights_snapshot_rpc.sql:1-13,26-61,226-257,442-444`; precedent `20260511161500_add_get_module_usage_summary_rpc.sql:1-58`; types `src/backend/database.types.ts:1180-1204 (modules.public), :1449-1462 (patches), :1506-1517 (profiles), :1684-1698 (racks), :2424-2431 (RPC signature)`; cache `supabase.cache.ts:68-109`; tables `DatabaseStrings.ts:3-41`.
- Rules: `AGENTS.md §5`; `internaldocs/patterns/BACKEND_METHODS.md §"Schema-change preflight"`; `internaldocs/agents/backend-plan-reviewer.md` (self-review above); `internaldocs/DESIGN_LANGUAGE.md`; `internaldocs/workflow/TODO.md` ledger; `internaldocs/workflow/DOCUMENTATION_LIFECYCLE.md` (impact block above).
