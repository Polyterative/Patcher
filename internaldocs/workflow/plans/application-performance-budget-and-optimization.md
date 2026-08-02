<!-- Section: INFRA (independent; pick any time a product task is blocked) -->

# Application Performance — Chrome-measured budget, optimization loop, and compile-time wins

## Goal

Establish a **measurement-first**, repeatable Chrome-driven performance loop for the whole Patcher app
(browser + SSR) so every optimization is proven against a stable baseline via a **one-hypothesis-per-commit**
protocol. Reduce observed client workload — initial JS, main-thread time, long tasks, DOM/heap, network,
paint/layout, Core Web Vitals — across the top public and authenticated flows, using compile-time
(bundler, code-splitting, CSS budget, Angular optimizer, deferrable views, standalone tree-shaking) and
runtime (change detection, RxJS ownership, realtime/polling, images, third-party) fixes prioritized
strictly by observed cost.

This plan is the **umbrella measurement/optimization contract**. The existing on-hold plan
[`bundle-weight-lazy-boundaries-and-ssr-prerender-coverage.md`](./bundle-weight-lazy-boundaries-and-ssr-prerender-coverage.md)
covers only bundle graph / lazy boundaries / prerender — it is one narrow sub-scope. This plan supersedes
its methodology (Chrome runtime + Core Web Vitals are the sources of truth, not bundle-analyzer alone) and
picks up its unfinished items only when measurement confirms they are top offenders.

## Problem statement

Signals gathered from the repo (no build/profile run — snapshot only):

- **Angular 22 + Zone.js** still on the classic change-detection stack. `provideZoneChangeDetection()` is
  provided in `src/main.ts`; `zoneless` is not adopted. 405 hits of `ChangeDetectionStrategy` across ~195
  components — mixed OnPush coverage. This is the single biggest lever for main-thread cost, but any
  change must be measured, not assumed.
- **Root eager graph is wide.** `AppModule` eagerly imports `BackboneModule`, `AppFeaturesModule`,
  `FeedbackBoxModule`, `TimeagoModule.forRoot()`, plus `BrowserAnimationsModule`. `BackboneModule` in turn
  declares/instantiates `CommonSidebarComponent`, `FooterComponent`, `BuildInfoComponent`,
  `DiscordWidgetComponent`, `ProducthuntBadgeComponent`, `EventBannerComponent`, and imports
  `LottieContainerModule`, `HeroInfoBoxComponent`, `LabelValueShowcaseComponent`, `ScreenWrapperComponent`,
  plus `NotFoundModule` and `LegacyLinkGoneModule`. Several of these are only used on rare routes
  (404 / retired links) or below-the-fold on Home.
- **Angular Material** and **@angular/cdk** dominate the vendor graph (baseline: Material 1084 KiB raw,
  Angular core 992 KiB, CDK 461 KiB, Sentry 796 KiB, Lottie 469 KiB, PostHog 279 KiB, Luxon 255 KiB,
  Supabase-auth 252 KiB). Sentry and PostHog are already deferred (see `src/main.ts` and
  `posthog-loader`) — verify their init timing does not steal main thread during LCP.
- **Third-party fonts loaded eagerly** in `src/index.html` (`Material Icons`, `Roboto`, custom `Aven`
  font). No `font-display: swap` verification, no CSS `content-visibility` audit. Icon font is a well-known
  Chrome perf offender vs SVG icons.
- **Heavy feature deps still in the vendor graph:** `lottie-web`, `sigma`, `graphology*`,
  `modern-screenshot`, `ngx-image-cropper`, `dompurify`. Only the graph fullscreen dialog and Application
  Insights page have been split so far.
- **Manual `setInterval`s** are present in `patch-graph.component.ts` (55 ms flow tick),
  `rack-visual-model-layout.service.ts` (hover animation), and `reset-password` countdown — all Zone-patched,
  each tick triggers app-wide change detection unless explicitly detached.
- **Realtime**: no Supabase realtime channels detected in `src/app` — one variable removed from the perf
  matrix. Confirm during measurement (only Sentry/PostHog long-lived work found).
- **Subscriptions**: 1430 `.subscribe(` occurrences, 230 `rxjs` imports across the app. `SubManager` +
  `takeUntil(destroy$)` pattern is standard, but there is no automated audit of "subscribe outside
  constructor" or "no takeUntil".
- **SSR** is on-demand (`RenderMode.Server`, `**`), no static prerender for public entities. Any
  server-side cost regression compounds share-link TTFB.
- **Route lazy boundaries** are already present at feature level (rack, module, patch, marketplace,
  info, manufacturers, admin, user, public-profile, collections). Home page and shell are the top
  eager surface.
- **Assets**: 22 MB built browser dir; images and Lottie JSON are heavy. Some image sweep landed
  (see the on-hold bundle plan); no verified `content-visibility: auto` / `loading=lazy` coverage across
  browsers.
- **CSS budget** is 42 kB warn / 52 kB error per component style — plenty of headroom for regressions.

None of these are automatically top offenders. **The plan's contract is: measure first, act only on the
Chrome-observed top offender for the flow under test.**

## Assumptions

1. Local Chrome/Chromium (Playwright's chromium build) is the source of truth for repeatable metrics.
   Real-device / mobile profiling is a Polish-layer add-on, not baseline.
2. Node 24.x, `pnpm@10`, `@angular/build:application` builder, `@angular/ssr` server rendering, standard
   `pnpm build` (production, `optimization: true`, `aot: true`, no sourcemaps).
3. E2E auth credentials (`E2E_TEST_EMAIL`, `E2E_TEST_PASSWORD`) live only in the gitignored root `.env`.
   If unavailable, all authenticated flows are skipped and only the public-flow baseline is captured. No
   value is ever printed to logs or committed.
4. Changes stay frontend-only unless explicitly re-approved: **no Supabase RLS / migrations / edge
   function edits from this plan.** Backend perf work (indexes, RPC selectivity) is a separate proposal.
5. Production release / push cadence is unchanged. Every accepted optimization ships behind normal
   develop→production flow with the user's explicit release call.
6. Measurement runs live under `tmp/` (already gitignored via existing pattern for `tmp/agent-snap`).
   Result artifacts (JSON, trace files, screenshots) are not committed except as trimmed baseline
   snapshots in this plan's Decision log.

## Objective metrics and budgets

All budgets are **flow-scoped** (not global averages) and expressed as median of ≥ 5 cold + 5 warm runs on
the same viewport (1440 × 900 desktop, `Fast 3G` + throttling-off variant for lab reference), same
Playwright build, same Chromium binary, same site data cleared between cold runs. A change ships only if
**every** budget in its flow is met or held, and the targeted budget improves by the claimed delta.

### Web Vitals (target — public share-link flows)

| Metric | Target | Hard budget |
|---|---|---|
| LCP (Largest Contentful Paint) | ≤ 2500 ms | ≤ 3500 ms |
| CLS (Cumulative Layout Shift) | ≤ 0.05 | ≤ 0.1 |
| INP (Interaction to Next Paint) | ≤ 200 ms | ≤ 500 ms |
| TTFB (SSR share-link) | ≤ 800 ms | ≤ 1500 ms |
| TBT (Total Blocking Time, lab proxy for INP) | ≤ 200 ms | ≤ 600 ms |

### Runtime budgets (Chrome DevTools / CDP)

| Metric | Target | Hard budget |
|---|---|---|
| Longest single main-thread task (nav → interactive) | ≤ 100 ms | ≤ 250 ms |
| Long-task count in first 5 s | 0 | ≤ 3 |
| JS heap after cold home load + idle 5 s | ≤ 40 MB | ≤ 80 MB |
| DOM node count on home | ≤ 1500 | ≤ 3000 |
| JS script eval time in first 5 s | ≤ 400 ms | ≤ 900 ms |
| Style + Layout time in first 5 s | ≤ 250 ms | ≤ 600 ms |

### Network budgets

| Metric | Target | Hard budget |
|---|---|---|
| Compressed transfer, initial (HTML + all critical JS/CSS/fonts) | ≤ 220 kB | ≤ 350 kB |
| Requests in first 5 s | ≤ 30 | ≤ 60 |
| Third-party requests in first 5 s (Sentry, PostHog, Fonts) | ≤ 6 | ≤ 12 |
| LCP image transfer | ≤ 60 kB | ≤ 120 kB |

### Compile-time budgets (complement, not substitute)

| Metric | Target | Hard budget |
|---|---|---|
| Initial JS raw | ≤ 1.4 MB | ≤ 1.75 MB (current baseline) |
| Initial JS estimated transfer | ≤ 320 kB | ≤ 420 kB (current) |
| Largest lazy chunk raw | ≤ 350 kB | ≤ 450 kB |
| Any component style (per `angular.json`) | ≤ 30 kB warn / ≤ 42 kB error | already enforced |
| CSS in-body inline | 0 | 0 |

### Per-flow acceptance

The umbrella budgets above apply to **Home (unauth)**. Each other measured flow gets its own baseline row
and its own budget derived from the same rule: LCP ≤ 2.5 s (public) or ≤ 3.5 s (authenticated shells),
INP ≤ 200 ms, TBT ≤ 200 ms, longest task ≤ 100 ms.

Flows in scope (all measured at least once for baseline; picked into the loop by observed cost):

1. Home `/` (cold, unauth) — LCP + SSR share.
2. Modules browser `/modules` — first list paint + scroll INP.
3. Module detail `/modules/:public_id` (well-known slug) — image load + panel render.
4. Racks browser `/racks` and rack detail `/racks/:public_id` — rack visual model layout cost.
5. Patches browser `/patches` and patch detail `/patches/:public_id` — patch-graph reveal + flow interval.
6. Manufacturers `/manufacturers` + manufacturer detail — logo image sweep.
7. Info `/info`, Application Insights `/info/insights` — already-lazy sanity check.
8. 404 `/404` and legacy `/links/retired` — verify already-split leafs stay split.
9. Public profile `/u/:handle` — SEO-sensitive.
10. Marketplace `/marketplace` (only if `marketplaceEnabled` is on locally) — hero + card grid.
11. Auth-only: `/user`, `/user/account`, patch editor, rack editor — main-thread + subscription hotspots.

## Prerequisites

Do these once before starting the measurement loop; they cost nothing to keep and are reused per
hypothesis.

- **P1. Confirm baseline build reproducibility.**
  - `pnpm build` succeeds locally with no dirty perf-adjacent files.
  - `pnpm bundle-report` opens webpack-bundle-analyzer against `dist/Patcher/stats.json` (already scripted).
  - Record: SHA of `develop`, Node version, pnpm version, Chrome version (`node -e "console.log(require('@playwright/test').chromium.executablePath())"` + `--version`).
- **P2. No-credential public-flow baseline is authoritative.**
  - Public flows (Home, Modules, Racks, Patches, Manufacturers, Info, 404, Public profile) run without
    `E2E_TEST_EMAIL/PASSWORD`. Start here so work can begin without user intervention.
- **P3. Optional authenticated fixture.**
  - If `E2E_TEST_EMAIL` and `E2E_TEST_PASSWORD` are set in gitignored `.env`, `pnpm test:e2e:auth`
    generates `playwright/.auth/user.json`. Reuse via `--storage-state` for auth flow measurement.
  - **If missing:** register a Pending question in the Approvals ledger requesting the owner add them to
    `.env` (never to shell/history/output), then continue with public flows only.
- **P4. Add a repo-local measurement harness under `scripts/perf/`** (new dir; no existing script overlaps).
  Files:
  - `scripts/perf/measure-flow.mjs` — Playwright/Chromium driver that, for a given flow name + URL:
    - Clears storage; opens page in a fresh context with `viewport 1440×900`, `Emulation.setCPUThrottlingRate`
      set to `1×` for lab and optionally `4×` for slower device runs.
    - Uses CDP (`page.context().newCDPSession(page)`) to enable `Performance`, `Network`, `Runtime`,
      `Profiler`, `Tracing` (categories: `devtools.timeline,loading,disabled-by-default-devtools.timeline`).
    - Records: Web Vitals (LCP/CLS/INP via `web-vitals`-style inline polyfill injected before nav),
      long-tasks (`PerformanceObserver({type:'longtask'})`), navigation timing, response headers/sizes,
      request count, requests grouped by domain, `Performance.getMetrics` snapshot, JS/DOM heap
      (`Runtime.getHeapUsage`, `DOM.getDocument` count via CDP).
    - Emits: `tmp/perf/<flow>/<run>/summary.json`, `trace.json` (Chrome trace), `network.har` (if HAR is
      needed), `screenshot.png`, `console.log`. Median across ≥ 5 cold + 5 warm runs is written to
      `tmp/perf/<flow>/aggregate.json`.
  - `scripts/perf/compare-baseline.mjs` — diffs one flow's aggregate against a stored baseline
    (`internaldocs/perf/baselines/<flow>.json` if we choose to commit trimmed baseline copies) and prints
    ±% deltas for every budgeted metric, plus a machine-readable pass/hold/regress verdict.
  - `scripts/perf/README.md` — how to run one flow: `node scripts/perf/measure-flow.mjs --flow home
    --url http://localhost:5556/ --runs 5`.
  - **No new dependency install unless already available.** Playwright is already installed. `web-vitals`
    JS is small enough to inline as a snippet from source (Apache-2.0) into the harness, not as an npm
    dep — decision to be recorded in the Decision log when the harness is authored.
- **P5. Baseline snapshot commit.** After the first successful baseline for all public flows, commit
  a single trimmed JSON summary (aggregate numbers only, no traces, no HAR) at
  `internaldocs/perf/baselines/<flow>.json` so future runs can compare against a stable reference. Do
  **not** commit `tmp/perf/`.
- **P6. Regression short-circuit.** Add a pre-commit-optional (never mandatory) check:
  `node scripts/perf/check-regression.mjs` that, when run against a committed baseline, exits nonzero if
  any hard budget in any flow it has data for is regressed by > 10 %. Wire it into a nightly job only
  after the loop is proven; not into `pnpm lint` (would block unrelated commits).

## The optimization loop (contract)

Every optimization follows this exact order. A single hypothesis, a single flow, a single commit.

1. **Pick top offender.** Read the latest aggregate for the target flow; pick the single largest budget
   miss or the single largest raw metric. Speculative refactors are rejected here — the metric must be
   observed, in the trace, and above target.
2. **State the hypothesis** in the plan's Decision log: "For flow X, removing/deferring Y is expected to
   reduce metric Z by W%. Non-regression budgets: L, C, I."
3. **Baseline snapshot** in the current tree state, on the same Chrome, same Playwright, same
   throttling profile, ≥ 5 cold + 5 warm runs. Save aggregate JSON.
4. **Change one thing.** No drive-by refactors, no unrelated cleanup.
5. **Targeted tests.** `pnpm test-headless --include="**/<affected>.spec.ts"` for unit, plus the single
   e2e spec that exercises the flow (`pnpm test:e2e` with `--grep` for the flow). Only if these pass.
6. **Same-profile re-measure** ≥ 5 cold + 5 warm.
7. **Verdict.** If the target metric improves by the claimed delta and no non-regression budget breaches:
   commit that hypothesis alone, with a Decision-log entry pointing to before/after aggregate hashes.
   If not: revert the change, log the negative result (equally valuable), pick a different candidate.
8. **Commit.** Conventional commit, one hypothesis one commit, e.g. `perf(home): defer discord-widget below fold`.
9. **Never batch.** Even if two candidates look independent, measure separately.

Under this contract, "compiling optimizations accepted" means: bundler / builder / route-lazy-boundary
/ `@defer` / template-optimizer / TypeScript config tweaks are legal changes, but only if they follow
the same measured-hypothesis rule. Turning on zoneless, esbuild target upgrades, `standalone` migrations,
or `provideExperimentalCheckNoChangesForDebug` toggles are all in scope but each is one measured commit.

## Layers

### Layer 1 — MVP (Chrome-driven baseline + safe compile-time wins)

- [ ] Create `scripts/perf/measure-flow.mjs`, `scripts/perf/compare-baseline.mjs`,
      `scripts/perf/README.md` per P4. Do **not** touch app source.
- [ ] Capture baseline for public flows Home, Modules browser, Module detail, Racks browser, Rack detail,
      Patches browser, Patch detail, Manufacturers browser, Manufacturer detail, Info, 404,
      Public profile. Store aggregates under `internaldocs/perf/baselines/*.json`.
- [ ] Produce a single-page **Top Offender Report** (append to this plan's Decision log): per flow, the
      metric most over-budget with the offending script/asset/task in the trace, plus a candidate
      hypothesis. Rank candidates globally by measured impact.
- [ ] From the offender report, execute up to five safe **compile-time** optimizations, each as its own
      measured commit. Candidates to evaluate (only if observed in the report):
      1. Verify Angular production build already ships esbuild target `es2022` and no CommonJS deps beyond
         the current allow-list; drop unused entries from `angular.json` `allowedCommonJsDependencies`.
      2. Confirm `@angular/build:application` prerender/SSR settings emit hash-based output cache-keys
         only where needed; audit `outputHashing: 'all'` cache behavior against Cloudflare/CDN headers.
      3. Move `TimeagoModule.forRoot()` and `BackboneModule`'s eagerly-declared shell subcomponents
         (`DiscordWidgetComponent`, `EventBannerComponent`, `ProducthuntBadgeComponent`,
         `BuildInfoComponent`) behind `@defer` blocks or a lazy child, **only if** the report shows they
         land in the initial critical path.
      4. Split `NotFoundModule` and `LegacyLinkGoneModule` out of `BackboneModule`'s eager import graph
         (already `loadComponent`-routed; remove residual `NotFoundModule` / `LegacyLinkGoneModule`
         eager imports if audit confirms they are dead-weight in the shell).
      5. Verify `@sentry/angular` and `posthog-js` remain out of the initial main chunk. Move Sentry
         `browserTracingIntegration()` / `replayIntegration()` behind an idle-callback ≥ 3 s after LCP if
         they still cost long-tasks.
- [ ] Add `pnpm perf:home` (and per-flow scripts) to `package.json` scripts as thin wrappers around
      `node scripts/perf/measure-flow.mjs --flow ...`. Do not integrate into `pnpm lint` or `pnpm ci`.
- [ ] Documentation-impact classification and this plan's per-flow acceptance criteria confirmed with
      the coordinator before Layer 2.

**Exit criteria for Layer 1:** every public flow has a committed baseline; the top-offender report is in
the Decision log; at least three measured compile-time wins are landed **or** the harness proves the
current build already meets budget in that dimension.

### Layer 2 — Structural (runtime + framework wins under measurement)

Each item is measured per the loop. Landed only when the measurement backs the change for the specific
flow being profiled. Order below is only a guess at likely impact.

- [ ] **Change-detection audit.** Convert non-OnPush components on the Home / Modules browser / Rack
      detail / Patch detail hot paths to `ChangeDetectionStrategy.OnPush`, one component per commit,
      each proven via TBT/INP delta. Track coverage: `grep -c OnPush` before/after per commit.
- [ ] **Subscription hygiene sweep on hot components.** Audit for `subscribe()` calls outside
      constructor or `SubManager`/`takeUntil(destroy$)` on components in the measured hot flows;
      convert to template `async` pipes or reactive derived signals per `patterns/REACTIVE_SERVICES.md`.
      Prove with a leaked-emission test where possible.
- [ ] **`@defer` blocks** for below-the-fold components on Home (footer, event banner, discord widget,
      producthunt badge, hero-info-box) and the two-column shell chrome not used above LCP viewport.
      Each defer is one commit with LCP + CLS deltas.
- [ ] **`content-visibility: auto`** on off-screen list rows on browsers (`/modules`, `/racks`,
      `/patches`, `/manufacturers`). Requires stable `contain-intrinsic-size` so CLS is not disturbed —
      measured, not assumed.
- [ ] **Image sweep** across list cards, hero images, panel previews: `loading="lazy"`,
      `decoding="async"`, explicit `width`/`height`, `srcset` for panel images already flowing through
      `app-module-part-image`. Cross-check with the on-hold bundle plan's image-lazy checklist —
      complete what remains after re-measuring on Chrome.
- [ ] **Font strategy.** Add `<link rel="preconnect" href="https://fonts.googleapis.com" crossorigin>`
      already present for gstatic; add `font-display: swap`; consider self-hosting Roboto subset for
      only the weights used. Replace `Material Icons` icon font with the already-standalone
      `simple-icons`/inline SVGs where feasible on hot flows. Every step measured.
- [ ] **Zone-patched intervals audit.** Confirm `patch-graph.component.ts`'s 55 ms `setInterval`,
      `rack-visual-model-layout.service.ts`'s hover animation, and `reset-password` countdown do not
      thrash change detection on the surrounding shell. If observed, move to `NgZone.runOutsideAngular`
      or `requestAnimationFrame` with explicit `markForCheck()` on boundary emissions. Never touch
      without a trace showing the cost.
- [ ] **Route lazy-load audit vs bundle plan.** Cross-check the on-hold bundle plan's remaining
      candidates (`@angular/flex-layout` removal, ngx-image-cropper defer, remaining lodash transitive
      audit). Fold in only the items whose current runtime cost is proven on Chrome; do not autopilot
      them.
- [ ] **SSR profile.** Measure TTFB and CPU cost per SSR request for `/`, `/modules/:public_id`,
      `/racks/:public_id`, `/patches/:public_id`, `/u/:handle`. If TTFB > 1500 ms on a warm route, log
      the top server timing entry and open a targeted follow-up. Do not change SSR shape without a
      separate approved plan (would touch `src/server.ts` / `app.routes.server.ts`).
- [ ] **`webpack-bundle-analyzer` cross-check.** After runtime wins, rerun `pnpm bundle-report` and
      confirm the top vendor offenders identified in the on-hold bundle plan (`@angular/material`,
      `@sentry/core`, `lottie-web`, `posthog-js`, `luxon`) have moved. Update this plan with the new
      table.

**Exit criteria for Layer 2:** every public flow meets the Web Vitals target column; hard budgets are
never breached; long-task count in the first 5 s ≤ 3 for every public flow; documented list of
compile-time wins and their measured deltas is in the Decision log.

### Layer 3 — Polish (frontier and continuous protection)

- [ ] **Slow-device pass.** Rerun the loop under `Emulation.setCPUThrottlingRate: 4` for Home, Modules
      browser, Module detail; adjust budgets or split further only for regressions observed on the
      slow profile.
- [ ] **Real-device pilot (optional).** With owner approval and manual coordination only, run the
      harness against a physical mid-range Android via Chrome remote-debug for the same three flows.
      Record deltas; not automated.
- [ ] **Zoneless investigation (Angular 22).** Prototype `provideZonelessChangeDetection()` behind a
      local dev feature flag; measure Home + Modules browser under identical harness. Commit only if
      the trace confirms a materially smaller change-detection footprint and no functional regressions
      in `pnpm test-headless` + affected e2e specs. Otherwise archive the trace and log the negative
      result.
- [ ] **Per-route asset sub-budgets.** After Layer 2 settles, encode per-flow budgets into
      `scripts/perf/check-regression.mjs`; add a nightly (non-blocking) job that stores 30 days of
      aggregates for trend-tracking. Do not add it to `pnpm lint` / `pnpm ci`.
- [ ] **Documentation.** Author `internaldocs/testing/PERFORMANCE.md` describing the harness, flow
      list, budgets, top-offender methodology, and rollback rules. Reference from `internaldocs/README.md`.
- [ ] **Retire the bundle-only plan** after its remaining measured-worthy items land here; update
      [`bundle-weight-lazy-boundaries-and-ssr-prerender-coverage.md`](./bundle-weight-lazy-boundaries-and-ssr-prerender-coverage.md)
      Decision log to point at this plan and close it as superseded, not deleted.

## Observed initial candidates (pre-measurement — hypotheses only)

The following are candidate hypotheses that measurement should confirm or reject. **None of them ship
without a Chrome trace showing the cost.**

1. `BackboneModule` eagerly ships shell chrome that is either below the fold or unused (`DiscordWidgetComponent`,
   `EventBannerComponent`, `ProducthuntBadgeComponent`, `BuildInfoComponent`, `LottieContainerModule`).
   Likely INP + main-thread eval wins on Home.
2. `TimeagoModule.forRoot()` at the root drags a small locale/date footprint through initial. Verify
   whether it's meaningfully in the LCP path or free.
3. `Material Icons` icon-font blocks first paint via `fonts.googleapis.com` render-blocking CSS. Likely
   LCP and CLS wins by switching to inline SVGs on hot cards.
4. `@sentry/angular` deferred by 1 s in `main.ts` still likely lands during interaction window; may cost
   INP on Home. Candidate for `requestIdleCallback` gating.
5. `posthog-js` loader adds third-party bytes; verify PostHog init doesn't fire pageview during LCP.
6. Zone-patched 55 ms interval in `patch-graph.component.ts` causes app-wide CD ticks whenever the graph
   is mounted — likely INP hit on patch detail pages under interaction.
7. Non-OnPush components on Home / list browsers likely cause avoidable CD on child components — top
   candidate for measured OnPush conversion.
8. Large HTML per browser row (module cards render panel image + tags + prices) risks DOM budget on
   `/modules`. Candidate for `content-visibility: auto` and virtualized scroll if the observed DOM node
   count breaches the hard budget.
9. Full-Lottie files on Home/hero may be blocking; candidate for lightweight CSS transition + Lottie
   promotion behind `@defer (on viewport)`.
10. SSR `RenderMode.Server` for `**` may cause cold-start CPU cost on rarely visited routes; candidate
    for selective prerender of top public entities (already the on-hold bundle plan's territory).

## Risks and unknowns

- **Playwright chromium ≠ user's Chrome.** Absolute numbers are lab, not field. Ratios/deltas are the
  contract, not absolutes; final acceptance is the delta on the same profile between baseline and change.
- **Zone-based CD interplay.** Cheap-looking template changes can silently disable OnPush wins if
  ancestors are non-OnPush. Every OnPush commit needs a subtree verification (e.g., no wrapping
  non-OnPush parent that voids the win).
- **`@defer` semantics can shift LCP** if the deferred block was providing above-the-fold ink. Always
  measure LCP + CLS together with the target metric.
- **Feature-flag divergence.** Local dev has `marketplaceEnabled: true`, prod `false`. Measure with the
  same flag state as production for public flow budgets; call out any local-only surface explicitly.
- **SSR + hydration cost interference.** Client-side wins that increase hydration reconciliation cost
  may regress TTFB or INP. Guard TTFB + INP jointly on every SSR-hit flow.
- **Non-deterministic first-run cost.** Cold-run variance can dominate. The ≥ 5 cold + 5 warm median
  rule is not optional.
- **Auth fixture bootstrapping.** If `.env` is missing E2E creds, all authenticated flows must be
  skipped — do **not** substitute an unauthenticated shape for them and claim coverage.
- **CDN/cache header interactions.** Some transfer-size wins are undone if Cloudflare caches are stale.
  Do not measure transfer size behind a stale CDN; measure against local dev/prod build directly.
- **Backend timing.** Data-service RPC latency is out of scope here. If measurement pins a Chrome-side
  cost on server timing, log the finding, open a separate proposal, and do not tune schema/RLS/indexes
  from this plan.

## Validation strategy

Per hypothesis:

- `pnpm build` succeeds; `pnpm bundle-report` on the changed commit if compile-time only.
- `pnpm lint` (mechanical guardrails from `AGENTS.md` §11).
- `pnpm test-headless --include="**/<affected>.spec.ts"` for touched units.
- Targeted `pnpm test:e2e -- --grep <flow>` for the flow under test; `pnpm test:e2e:auth` only if the
  auth fixture is present and the flow is authenticated.
- `node scripts/perf/measure-flow.mjs --flow <flow>` ≥ 5 cold + 5 warm runs before and after the change.
- `node scripts/perf/compare-baseline.mjs --flow <flow>` reports PASS on target metric and no HOLD/REGRESS
  on non-target budgets. If REGRESS anywhere, revert.
- Decision log entry with the aggregate numbers (median only, no traces committed).

Plan-level acceptance:

- Every listed flow has a committed baseline in `internaldocs/perf/baselines/`.
- Every optimization commit references a before/after aggregate summary.
- At least one measured, landed win exists per Layer 2 category **or** a Decision-log entry documenting
  a measured non-result and the reason.
- No regression against any hard budget in any measured flow at the plan's completion snapshot.

## Documentation impact

- Classification: `internal-only`
- Production visibility: `immediate` (per-hypothesis; each landed optimization ships with the normal
  release cadence, none are user-visible feature toggles)
- Public docs paths: `none`
- Screenshot targets: `none`
- Changelog summary: `N/A` (performance optimization work is invisible to end users by design; if a
  specific landed win becomes user-visible, it gets its own changelog entry at commit time)

Any measurement-driven insight worth durability lands in `internaldocs/testing/PERFORMANCE.md` (created
in Layer 3). No `Patcher-docs` publication needed.

## Backend / risk gates

- **No** Supabase schema, RLS, migration, edge function, or storage change is authorized under this plan.
- **No** feature-flag flip in production. Any zoneless / experimental toggle is a local dev prototype
  only until re-approved.
- **No** push, force-push, worktree, or branch switch — all work happens on `develop` in this checkout.
- No touching of unrelated dirty files: `scripts/price-hub/crawlers/metadata.ts`,
  `scripts/price-hub/crawlers/sitemap-utils.ts`, `scripts/tests/price-hub-local-crawler.test.mjs`,
  `src/app/features/routes/marketplace/marketplace-detail/marketplace-detail.component.spec.ts`,
  `supabase/functions/_shared/price-hub/product-metadata-page.ts`.

---

## Decision log

<!-- Append timestamped one-liners as the plan progresses. -->

- 2026-08-03T00:13+02:00 — Plan authored (planner persona). Scope framed as measurement-first umbrella
  over runtime + compile-time perf, superseding the on-hold bundle-only plan as sub-scope. No app source
  edits and no `pnpm build` run in this authoring pass; observed candidates in §"Observed initial
  candidates" are hypotheses to be confirmed by the Layer 1 baseline, not accepted changes. Baseline
  bundle numbers reused from the on-hold bundle plan's committed 2026-06-14 snapshot (1.75 MB raw /
  419 kB transfer initial) rather than re-running `pnpm build` here; the harness under `scripts/perf/`
  will produce the authoritative baseline once implemented.
- 2026-08-03T00:13+02:00 — Rejected alternative: "start with bundle-analyzer wins and skip runtime
  profiling until later." Rejected because the user brief demanded Chrome as the measurement source of
  truth; bundle report is a complementary lens (already exists as `pnpm bundle-report`) but cannot
  price LCP/INP/main-thread cost, and past compile-time work landed in the on-hold bundle plan already
  hit the easy wins there. Rejected alternative: "adopt zoneless in Layer 1." Rejected because zoneless
  is a framework-wide behavioural change; introducing it before the harness exists would ship an
  unverifiable claim. It stays as a Layer 3 measured prototype.
- 2026-08-03T00:24+02:00 — Chrome/Playwright median of five fresh 1440×900 production-build Home
  navigations identified the below-fold footer QR Lottie as the largest avoidable request
  (719,076 B). Hypothesis: deferring only its decorative `app-lottie-container` until the footer enters
  the viewport preserves the animation when reached while removing its load-time JSON parse/render work.
  Result after the isolated template change: total transfer 5,588,067 B → 4,869,200 B (-718,867 B,
  -12.9%); requests 157 → 156; DOM nodes 3,596 → 1,854 (-48.4%); post-idle JS heap 77.7 MB → 51.6 MB
  (-33.6%); LCP 188 ms → 156 ms. Script transfer was unchanged (3.55 MB) and first-five-second task
  duration remained within run variance (2.79 s → 2.88 s), so bundle/runtime CPU remain the next
  measurement targets. An independent Chromium assertion verified the asset is absent before scrolling
  and loads after the footer enters the viewport; the targeted footer unit suite passes.
- 2026-08-03T00:34+02:00 — Added `scripts/perf/measure-flow.mjs` with tested CLI parsing, safe flow-name
  validation, cold/warm median aggregation, CDP navigation-delta timing, redacted resource reports, and
  ignored trace/screenshot artifacts. The production-build Home baseline now runs as
  `pnpm perf:measure -- --flow home --url http://127.0.0.1:5557/ --runs 5`. Its current cold median is
  4.87 MB transfer, 3.55 MB script transfer, 156 requests, 1,854 DOM nodes, 52.1 MB heap, 2.84 s task
  duration, and 0.638 CLS. Raw local transfer sizes are intentionally not compared to CDN-compressed
  production bytes; the before/after delta on this same harness is the optimization contract.
