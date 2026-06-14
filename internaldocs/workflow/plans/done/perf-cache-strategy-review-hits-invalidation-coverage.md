<!-- Auto-split from TODO.md by scripts/split-todo.cjs. -->
<!-- Section: INFRA (independent; pick any time a product task is blocked) -->

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

## Decision log

<!-- Append timestamped one-liners as the plan progresses. -->

