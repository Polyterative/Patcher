# Top Offender Report — Layer 1 exit item for GitHub #150

Chrome 149 (Playwright 1.61.1), 1440x900, dev server (`pnpm start`, vite unoptimized + HMR —
lab deltas only, not prod absolutes), median of 5 cold + 5 warm per flow, settle 5000ms.
Committed baselines: [baselines/](baselines/) (`browser`, `rack-detail`, `patch-detail`,
`user-area` from prior rounds; `home`, `module-detail`, `racks-browser`, `patches-browser`,
`manufacturers`, `manufacturer-detail`, `info`, `not-found`, `public-profile`, `marketplace`
recorded 2026-09-25 on tree `5911db8d`).

Budgets: CLS target ≤0.05 / hard ≤0.1; DOM target ≤1500 / hard ≤3000 (home row; other flows
judged against the same hard cap); longtasks ≤3 hard; script eval ≤900ms hard; layout ≤600ms
hard; LCP public ≤2500ms target. INP is unmeasured in lab (harness has no interaction step);
taskDuration + longTaskCount used as TBT proxy. Dev transfer bytes are vite artifacts and are
excluded from offender ranking (prod bundle numbers live in the #150 thread).

## Per-flow worst offender (cold medians)

| flow | metric most over budget | observed | offending asset/task in trace | candidate hypothesis |
|---|---|---|---|---|
| home `/` | longTaskCount 8 (warm 7) vs hard ≤3 | 2.7x hard; script 713ms, task 3342ms | largest scripts identical on all flows (vite `chunk-*`, `core-*`, supabase — dev artifacts, not actionable); count outlier points at main-thread contention on home shell | H5-class profile-first: attribute longtasks before splitting (home rivals patch-detail script cost) |
| manufacturers `/manufacturers/browser` | DOM 6752 vs hard 3000 | 2.25x hard; CLS 0.71; layout 181ms; 37 third-party reqs | logo grid rows (no virtualization; external logo hosts); layoutDuration 181ms worst measured | H4 content-visibility + contain-intrinsic-size on rows; H7 lazy/async/dims on logos |
| manufacturer-detail `/manufacturers/details/987` | CLS 0.71; DOM 3103 vs hard 3000 | hard breach both | external logo/media hosts (38 third-party reqs); imageless dims suspected | H7 image sweep on this flow |
| browser `/modules/browser` | DOM 3486 vs hard 3000 | 1.16x hard; CLS 0.65 | module card rows (panel image + tags + prices, no content-visibility) | H4 (already queued) |
| user-area `/user/area` (auth) | CLS 0.91 | 9x hard — worst CLS anywhere | authenticated shell sections render after data (stats/lists); webfont swap suspected | H3 (authenticated exhibit) |
| patch-detail `/patches/details/5` | scriptDuration 718ms; taskDuration 2645ms | 5–9x other flows | Zone-patched 55ms flow tick (`patch-graph.component.ts`) + NG0956 re-creation storms (48x) | H5 profile-first, then H6 runOutsideAngular/rAF |
| module-detail `/modules/details/1025` | DOM 2784 (near hard); CLS 0.65 | 0.93x hard | gallery/panel image stacks without dims | H7 if H3 isolates imageless dims |
| rack-detail `/racks/0LpWxyJRmzWd` | CLS 0.59; NG0956 58x console storms | systemic | track-by-identity size-2 lists re-creating; panel images eager+sync (left as-is: likely LCP element) | H3; NG0956 track-key sweep (follow-up, not H-series) |
| public-profile `/u/Polyterative` | CLS 0.59; 17–19 third-party reqs | systemic + external avatars | avatar/external media without dims | H7 |
| racks-browser `/racks/browser` | CLS 0.56 | systemic; otherwise quietest browser (task 633ms, DOM 1045) | shell/content shift, no DOM pressure | H3 |
| marketplace `/marketplace` (LOCAL-ONLY) | CLS 0.52 | systemic; best LCP 444/264ms | same shell contributors; flag off in prod so no prod transfer | excluded from prod ranking |
| patches-browser `/patches/browser` | CLS 0.38 | mildest content breach, still 3.8x hard | shell/content shift | H3 |
| not-found `/404` | CLS 0.32 despite DOM 401 | 3.2x hard on the minimal split leaf | shell-level contributor (fonts/shell layout) — content cannot explain this | H3 isolation exhibit |
| info `/info` (shell-only) | — | CLS 0.064 PASSES hard ≤0.1; DOM 393 | — (control exhibit: minimal shell does not shift) | H3 control: CLS scales with content-layout weight, not the shell |

## Global ranking by measured impact

1. **Systemic CLS (13/14 flows breach, 0.32–0.91 vs 0.1 hard)** — biggest total budget miss.
   Isolation pair: `info` (0.064, shell-only, passes) vs `not-found` (0.32, minimal split leaf,
   breaches) proves a shell-level contributor exists alongside content causes; H2 (display=swap)
   held CLS bit-identical, so the icon-font swap is not the shifter. → **H3 root-cause hunt**.
2. **Manufacturers DOM 6752 + layout 181ms + 37 third-party** — largest single-flow hard breach
   (2.25x), with a concrete structural fix available. → **H4 + H7**.
3. **Home longtasks 8 + script 713ms / patch-detail script 718ms + task 2645ms** — top runtime
   costs; home's count breach is the worst INP-proxy signal. → **H5 profile-first**.
4. **Browser DOM 3486 (1.16x hard)** — structural, same fix family as #2. → **H4**.
5. **Zone-patched 55ms patch-graph tick** — correlated with patch-detail's 718ms script but
   unproven in isolation; needs graph e2e proof before touching. → **H6 (proof-gated)**.
6. **Third-party image hosts (manufacturers 37–38, public-profile 17–19)** — transfer + layout
   pressure, fixable with lazy/dims. → **H7**.
7. **Below-the-fold shell blocks (DiscordWidget/EventBanner/ProductHunt/footer)** — eager but
   unpriced in traces; defer only with LCP+CLS guards. → **H8**.

## Decision log entry (2026-09-25)

- Chose `info` vs `not-found` as the H3 isolation pair because they are the only two
  sub-500-DOM flows and they split CLS pass/fail, separating shell-level from content-level
  shift. Rejected bundle-analyzer-led ranking because dev chunk names are vite artifacts with
  no prod counterpart. Rejected marketplace prioritization because the flag is off in prod.
