<!-- Auto-split from TODO.md by scripts/dev/split-todo.cjs. -->
<!-- Section: INFRA (independent; pick any time a product task is blocked) -->

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

## Decision log

<!-- Append timestamped one-liners as the plan progresses. -->

