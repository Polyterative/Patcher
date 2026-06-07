<!-- Auto-split from TODO.md by scripts/split-todo.cjs. -->
<!-- Section: INFRA (independent; pick any time a product task is blocked) -->

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

## Decision log

<!-- Append timestamped one-liners as the plan progresses. -->

