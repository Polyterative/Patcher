# Performance measurement — harness, flows, budgets, and loop rules

Canonical plan and budgets: [GitHub issue #150](https://github.com/Polyterative/Patcher/issues/150)
(umbrella measurement/optimization contract; this file is the durable runbook).
Per-flow offender ranking: [../perf/top-offender-report.md](../perf/top-offender-report.md).
Committed baselines: [../perf/baselines/](../perf/baselines/).

## Harness

Driver: `scripts/perf/measure-flow.mjs` (Playwright Chromium, headless). Full usage in
`scripts/perf/README.md`. Canonical invocation (dev server must return 200 on
`http://localhost:5556`; start with `pnpm start` if down; never run two servers):

```bash
node scripts/perf/measure-flow.mjs --flow <name> --url http://localhost:5556<route> --runs 5 --settle-ms 5000
```

Authenticated flows reuse the e2e fixture (refresh with `pnpm test:e2e:auth` when stale):

```bash
node scripts/perf/measure-flow.mjs --flow user-area --url http://localhost:5556/user/area --runs 5 --settle-ms 5000 --storage-state playwright/.auth/user.json
```

Fixed profile — compare only runs made with the same settings: viewport 1440x900,
Chrome 149 (Playwright 1.61.1), settle measured from navigation start, median of
5 cold + 5 warm runs per flow. Raw JSON, traces, and screenshots land in gitignored
`tmp/perf/<flow>/`; only trimmed medians are committed under `internaldocs/perf/baselines/`.
Dev-server transfer/script bytes are vite artifacts — deltas only, never prod absolutes.
INP is unmeasured in lab (no interaction step); `taskDurationMs` + `longTaskCount` are the
TBT proxy. Never claim INP numbers.

## Flow list (all baselined 2026-09-25, tree `5911db8d` unless noted)

| baseline file | route | notes |
|---|---|---|
| `browser.json` | `/modules/browser` | DOM 3486 vs 3000 hard |
| `rack-detail.json` | `/racks/0LpWxyJRmzWd` | 58x NG0956 track warnings |
| `patch-detail.json` | `/patches/details/5` | script ~718ms (FA2 layout; halved in H5) |
| `user-area.json` | `/user/area` (auth, `--storage-state`) | worst CLS 0.91 |
| `home.json` | `/` | worst longtask count 8/7 |
| `module-detail.json` | `/modules/details/1025` | DOM 2784, near hard |
| `racks-browser.json` | `/racks/browser` | quietest browser |
| `patches-browser.json` | `/patches/browser` | mildest content CLS 0.38 |
| `manufacturers.json` | `/manufacturers/browser` | worst DOM 6752, layout 181ms, 37 third-party |
| `manufacturer-detail.json` | `/manufacturers/details/987` | first link from manufacturers browser |
| `info.json` | `/info` (shell-only) | ONLY flow meeting CLS hard (0.064) — H3 control exhibit |
| `not-found.json` | `/404` | CLS 0.32 on minimal leaf — H3 shell exhibit |
| `public-profile.json` | `/u/Polyterative` | handle linked from Home |
| `marketplace.json` | `/marketplace` | LOCAL-ONLY (`marketplaceEnabled` true locally, false in prod) |

Known measured slugs live in the baseline files' `route` fields; manufacturer-detail id and
profile handle were discovered from live links (first browser link / home link), not fixtures.

## Budgets (flow-scoped, from #150)

Web Vitals: LCP ≤2500ms target / ≤3500 hard (public; ≤3.5s authenticated shells);
CLS ≤0.05 target / ≤0.1 hard; TBT proxy ≤200 target / ≤600 hard. Runtime: longest task
≤100 / ≤250ms; longtasks ≤3 hard; heap ≤40 / ≤80MB; DOM ≤1500 target / ≤3000 hard;
script ≤400 / ≤900ms; layout ≤250 / ≤600ms. Standing state: systemic CLS breach
(0.32–0.91 nearly everywhere) vs ≤0.1 hard — supporting-block transient per the
[shift-attribution addendum](../perf/shift-attribution-supporting-block.md)
(94–99% of CLS on probed content flows; fonts, images, and NG0956 exonerated;
H4/H7 own no share of this score; fix parked out of scope pending owner
un-park decision).

## Top-offender methodology

1. Re-measure (or reuse a same-tree baseline when `git diff <base> HEAD -- src/` is empty).
2. Rank by distance over hard budget, not raw size; dev transfer bytes excluded (artifacts).
3. Name the offending script/asset/task from the trace: harness `largestResources` per run,
   CDP duration deltas, console storms (NG0956), plus targeted probes (font-blocking,
   shift-attribution via `layout-shift` sources, CDP Profiler top frames, DOM timelines).
4. State one candidate hypothesis per offender; rank globally by measured impact.
5. Record the report under `internaldocs/perf/` and link it on #150.

Probes are throwaway scripts under gitignored `tmp/` — never committed, removed when done.

## Rollback rules (loop contract)

Every measured round, in order: (1) confirm server 200 (single instance);
(2) pre-change control on the current tree (`--flow <flow>-hNbase`, runs 5, settle 5000,
plus `--storage-state` for auth flows; committed baselines are reference only);
(3) apply exactly ONE hypothesis, no drive-by refactors; (4) same-profile re-measure
(`--flow <flow>-hN`); (5) verdict — KEEP only if the target metric improves with LCP, CLS,
and longTaskCount showing no regression (CLS equal-or-better is a hard gate), otherwise
`git checkout -- <files>` and post the negative result as a #150 comment (equally valuable);
(6) if kept: `check-layering.cjs` + `check-docs.cjs` (both exit 0; pre-existing failures
verified identical on the clean tree do not block, but introduce no NEW failure),
targeted unit spec, then commit alone as `perf(<scope>): <imperative lowercase>`;
(7) one short #150 comment per round with before/after medians and keep/revert.
Never push; never touch unrelated dirty files; frontend-only (no schema/migration/RLS/
storage/edge-function work); never claim lab INP.

## Out of scope (logged follow-ups, not this loop)

Backend/RPC/index work, prod-server (5557) re-measurement, INP interaction probes, zoneless
prototype, nightly regression wiring, real-device pilot, slow-device 4x-CPU pass, marketplace
in prod (flag off), virtualization/pagination for DOM budgets, supporting-block render
ordering, boot-URL shell seeding, graph tick zone scheduling (e2e-guarded, lab-invisible).
