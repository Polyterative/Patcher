# Infra safe-scope checkpoint — 2026-09-28

Read-only/source-level checkpoint for the frontend, observability, and documentation slice of
GitHub issues #159, #158, #156, #151, #150, and #145. This records validated local behavior; it
does not close the issues or substitute for owner-present runtime/operator evidence.

## Findings and evidence

| issue | current safe-scope status | evidence / remaining measurement |
|---|---|---|
| #156 / #151 — image proxy cache and fallback | Proxy defaults remain browser `max-age=604800` / edge `s-maxage=2592000`; 404/410 are 300 seconds and 5xx/non-image responses are non-cacheable. Panel and rack previews fall back to direct Supabase Storage after the proxy image fails, and expose a failed-image state if fallback also fails. | `pnpm test:functions:cloudflare-image-proxy` passed 7/7; panel-image spec passed 30/30; rack-image spec passed 33/33. These are local code/component checks, **not** a live deployed-worker/browser smoke. Cloudflare hit ratio and matching Supabase storage egress were not queried, so no cache-savings claim is made. Keep traffic switch, cleanup, and object deletion gated. |
| #159 — snapshot pilot | Snapshot worker and change-planner behavior remain covered locally; existing compaction plan retains the historical pilot data and result. | `pnpm test:functions:price-hub-worker` passed 18/18; `pnpm test:functions:price-hub-change-planner` passed 13/13. No current database snapshot, schedule, or storage measurements were read in this checkpoint. No Cron or storage action was run. |
| #158 — patch SVG preview wiring | Local frontend/backend wiring is present: `patches` is a proxy bucket, upload/delete methods target that bucket, patch preview metadata is written to `patches.image`, generated types include nullable `image`, and the authored migration defines the column/bucket/policies. | `DatabaseStrings` passed 16/16; Supabase storage passed 35/35; patch metadata update passed 18/18; migration regression passed 2/2. This establishes repository consistency only; remote migration/typegen/RLS state was not inspected or changed. SVG preview activation remains blocked on owner/operator confirmation of remote drift. |
| #150 — Chrome budgets | Fresh current-tree Chrome flow baselines captured 2026-09-28 on tree `fbea70f0` (same fixed profile: Chrome 149.0.7827.55 / Playwright 1.61.1, 1440x900, median of 5 cold + 5 warm, settle 5000ms, dev server `http://localhost:5556` returning 200). 5 flows re-measured: `info` (CLS bit-identical 0.064 — H3 control holds), `home` (longtasks 9/8 vs 8/7, still worst count; script 585 vs 713ms cold), `patch-detail` (script 583 vs 718ms cold; CLS bit-identical), `rack-detail` (task 1062 vs 893ms cold, layout 90 vs 66ms — observed uptick, needs same-tree repeat), `module-detail` (DOM 2772 vs 2784; cold CLS 0.639 vs 0.654). Trimmed medians committed in [`../perf/baselines/`](../perf/baselines/) (`info`, `home`, `patch-detail`, `rack-detail`, `module-detail`); raw runs under gitignored `tmp/perf/<flow>-h28base/`; remaining 9 flows still on the 2026-09-25 set. First `home` attempt hit a transient navigation error; retry succeeded. Tree was dirty with pre-existing uncommitted marketplace-detail changes unrelated to these flows — recorded as-is. | No optimization applied; offender ranking unchanged (baseline refresh only). Remaining 9 flows to re-measure before claiming a full current-tree set. |
| #145 — orientation Phase 1 | Read normalization accepts legacy semantic strings and smallint `0`/`1`, defaulting unknown/reserved values to normal; writes remain semantic strings pending the operator migration window. | `pnpm test-headless --include="**/rack-orientation.spec.ts"` passed 5/5. No migration, typegen, remote schema check, or write switch was performed. |

All targeted checks ran under Node `26.10.0` / pnpm `10.0.0`; the package requests Node `24.x`, so pnpm printed the existing engine-version warning. Chrome flow baselines for 5 flows (`info`, `home`, `patch-detail`, `rack-detail`, `module-detail`) were freshly collected 2026-09-28 on tree `fbea70f0` (see #150 row); no other performance, dashboard, or pilot runtime metric was freshly collected.

`pnpm lint` completed after setting `NODE_OPTIONS=--max-old-space-size=8192`; default heap first exhausted at approximately 4 GB. The successful run reported 30 existing ESLint warnings (no errors), layering soft-limit warnings, and aged TODO approval-question warnings. The current lint output also flags the two concurrently edited user-area marketplace files as over 500 lines; those source changes were not part of this checkpoint and were left untouched.

## Gates preserved

- R2 traffic switching, cleanup, and Supabase object deletion: not performed.
- Remote migration/type generation and all RLS/storage-policy apply: not performed.
- Cron scheduling or execution: not performed.
- No release, push, or commit was made.

## Decision

The smallest safe increment is this evidence/status checkpoint. The corresponding application
paths and compatibility tests already exist, and the available local checks pass; inventing a
code change without fresh runtime/dashboard data would not improve safety or substantiate the
remaining operational claims. Continue with owner-present measurements for cache hit/egress,
snapshot runtime, remote SVG schema/storage state, and a current-tree Chrome run before closing
the remaining issue work.
