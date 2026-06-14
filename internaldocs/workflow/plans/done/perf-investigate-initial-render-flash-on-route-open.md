<!-- Auto-split from TODO.md by scripts/split-todo.cjs. -->
<!-- Section: INFRA (independent; pick any time a product task is blocked) -->

#### HIGH: Perf — Investigate Initial Render Flash on Route Open

**Status:** COMPLETE — closed after the SCSS font-loading error was fixed.

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

## Decision log

<!-- Append timestamped one-liners as the plan progresses. -->

- 2026-06-14T20:00+02:00 — User confirmed this issue was already fixed recently via the SCSS font-loading error work. Archived as complete; no active implementation remains.
