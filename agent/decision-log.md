# Decision Log

## 16-06-2026 18:30

- **Rack remix row scope:** Implement row scope as explicit `{ rowIndex }` values in the same Layout scope pipeline. Compare row scopes by value instead of object identity, and reuse existing row-local Remix output rather than adding a separate action path.

## 16-06-2026 18:20

- **Rack remix move summary:** Add a read-only pre-action summary using the existing layout analysis moves. This satisfies the plan's diff-summary intent without changing the committed Remix persistence path or adding a new preview state.

## 16-06-2026 18:10

- **Rack remix mixed-row blocker:** Surface the existing mixed-format guard before action time by hiding Remix in the Layout panel when `computeLayoutAnalysis()` reports mixed rows. Keep the data-service snackbar guard unchanged for race/loading safety.

## 16-06-2026 18:00

- **Rack remix validity summary:** Keep the Layout panel useful before hover by deriving validity copy from the existing pure `computeLayoutAnalysis()` result. Do not add new Remix state or persistence; this is a read-only presentation slice.

## 16-06-2026 17:48

- **Rack remix scope selector:** Continue the same frontend-only Remix plan because earlier roadmap items are blocked by backend/product approvals. Use an explicit All / 3U / 1U BehaviorSubject scope so the panel summary and Remix action cannot diverge; defer single-row scope until a row-picking UI is deliberately designed.

## 16-06-2026 17:34

- **Rack remix arrangement counts:** Continued the existing frontend-only Remix plan rather than blocked backend-dependent roadmap items. Count exact valid arrangements per physical-format group only while the DP state space is bounded, use a deterministic sampled estimate for larger groups, and expose the result in the existing Layout panel; leave shuffle and statistical confidence intervals for later.

## 16-06-2026 17:08

- **Rack row move motion polish:** Selected the existing Rack Editor granular-update plan's Layer 3 S15 because roadmap Tier 0 frontend-only site-ops banner is already implemented and completed, while the TODO still has this HIGH unblocked frontend-only rack polish item. Keep row motion in `RackVisualModelComponent` as a transient visual observer of `requestMoveRow$`; do not change `RackDetailDataService` persistence or backend calls.

## 14-06-2026 21:36

- **Rack remix motion:** Use a FLIP-style compositor animation in `rack-visual-model` instead of making the data service animation-aware. Rows now track by index so row array replacement does not recreate the full rack, while module signal coordinate keys remain separate from stable movement keys.
- **Scaled rack correction:** Convert measured viewport deltas through `dragScale` before applying CSS transforms. The rack editor renders even the normal surface at scale, so raw viewport pixels make cross-row travel overshoot and look unstable.
- **Manual drag isolation:** Suppress Remix FLIP for a short cooldown after manual CDK drops instead of relying only on the existing two-frame reorder flag. CDK owns manual drag settling; Remix FLIP owns programmatic layout changes.
- **Full-rect Remix FLIP:** Store width/height with each movement snapshot and animate from the previous full rect, not just previous top-left. This avoids size snaps in unusual transforms and lets travel distance extend duration without changing the rack data flow.
- **Avoid ghost overlays:** Keep Remix on direct FLIP instead of Material/CDK or cloned overlay animations. CDK primitives are pointer-drag oriented, and cloned ghosts produced duplicate/fade artifacts; the safer fix is disabling Angular enter/leave at the rack boundary during the FLIP window.

## 14-06-2026 21:18

- **Rack remix refinement:** Count target-column changes as real Remix output, not only cross-row moves. This makes single-row 1U layouts and already-packed racks eligible for alternate ordering while preserving the physical-standard isolation rule. Undo uses the existing snackbar action pattern with a 10-second duration.

## 14-06-2026 21:11

- **Rack remix trigger:** Implemented the first action as a conservative batch row reassignment, not a destructive blank-panel cleanup. Blank panels are left in place for now because deleting persisted blanks during an auto-arrange requires a clearer undo/error strategy.

## 14-06-2026 21:26

- **Rack remix format partitioning:** Fixed the pure FFD output to partition by exact physical standard before any action layer is wired. This prevents future auto-arrange work from placing Intellijel 1U or Pulp Logic 1U modules into 3U rows, or into each other's rows, even when HP would fit.

## 14-06-2026 21:18

- **Rack remix visual wiring:** Added only a read-only layout hover panel in the existing visual model instead of building the full floating Remix control panel. This keeps the slice non-destructive while exposing the analysis data in the same interaction pattern as power/function rows.

## 14-06-2026 21:00

- **Rack remix layout mode:** Added `layout` as a visible analysis option separately from panel implementation. Kept `signal` hidden because existing tests and UI wording describe it as paused; Remix should not accidentally unpause unrelated signal analysis UI.

## 14-06-2026 20:58

- **Rack remix layout foundation:** Started with pure analysis utilities rather than toolbar/UI wiring so format isolation, mixed-row blocking, blank exclusion, and FFD behaviour are locked before product interaction work. Did not mark the full `computeLayoutAnalysis` checklist complete because exact/estimated arrangement counting remains intentionally unfinished.

## 14-06-2026 20:54

- **Rack comparison postponement:** User explicitly postponed Rack Comparison indefinitely after the pure diff foundation commit. Keep the plan in TODO as on hold for traceability, but do not continue route/UI work without a fresh explicit request.

## 14-06-2026 20:52

- **Rack comparison diff foundation:** Implemented comparison as pure utilities before adding entry-point UI. Used existing normalized `share` plus `matchedModules` because `RackBalanceAxisResult` currently has no matched-HP field despite the plan's HP examples; avoided inventing HP data in UI copy until the analysis model is deliberately extended.

## 14-06-2026 20:38

- **Module tag axis tinting:** Kept axis colour as an opt-in `ModuleMinimalViewConfig` flag so dense rack/editor module-card contexts stay neutral. Used the existing function-analysis theme overlay mixin for subtle tinting rather than adding a new palette. Added `resolveTagAxis()` as the reusable mapping source; no current description-highlight pipe exists to wire yet.

## 14-06-2026 20:30

- **Rack picker weakest-axis hint:** Derived the hint in `RackDetailDataService` instead of the browser component so the picker remains a generic embedded browser. Passed the computed axis through the edit-only rack detail template and rendered only the label as the visible chip text, keeping the explanatory "least coverage" copy in the tooltip.

## 14-06-2026 20:24

- **Rack stale preview indicator:** Put stale detection in `RackImageComponent` rather than the data service because the filename/updated comparison is a pure presentation concern and every image render already has the rack object. Gated the badge behind `canUpdatePreview` so public/list rack images do not grow owner-only actions accidentally.

## 14-06-2026 20:20

- **Rack blank shortcut overflow:** Reused the dormant `rack-visual-model` blank strip instead of creating a new rack editor control. Kept six common HP sizes inline and used a compact `MatMenu` for 1–20 HP because it satisfies edge sizes without increasing persistent row chrome.

## 14-06-2026 20:18

- **Backend bandwidth closure:** Treated the stale perf plan as complete after verifying live Vercel and Supabase REST compression headers. Archived the plan without code changes because all query/pagination/image audit implementation work was already done and the only remaining item was external verification.

## 14-06-2026 19:58

- **Root leaf route split:** Selected `/404` and `/links/retired` because both were low-traffic leaf pages imported eagerly by `AppRoutingModule` while already shaped as standalone components. Exported `appRoutes` only for test visibility and preserved route paths/redirect behavior.

## 14-06-2026 20:02

- **Load More closure:** User clarified that even comments should not keep the old paginator. Reused the existing user-area modules/racks Load More visual pattern; comments append backend pages while patches grow the local slice because their full list is already loaded.

## 14-06-2026 20:16

- **Rack power headers:** Selected the derived-only Rack Analytics slice because it is product-useful and unblocked by schema/RLS. Kept the count in `buildRackPowerBreakdown` and existing rack power surfaces rather than adding a new UI component or backend method.

## 14-06-2026 19:55

- **Patch graph fullscreen dialog split:** Chose the fullscreen/export dialog as the next non-flex heavy boundary because it is user-triggered and owns the `modern-screenshot` import. Converted only that dialog to standalone and opened it via dynamic import; did not defer the inline graph or cropper because those are more tightly coupled to currently rendered module templates and `@ViewChild` paths.

## 14-06-2026 19:49

- **Lodash cleanup:** Removed only the direct lodash package entries because source search showed no imports. Did not try to force-remove transitive lodash packages from the lockfile; those are owned by upstream dependencies and would require separate package replacement work.

## 14-06-2026 19:46

- **Application insights lazy boundary:** Picked Application Insights for the first Layer 2 lazy split because it was declared directly in `InfoPagesModule` but is only reached through `/info/insights`. Used a child NgModule rather than standalone conversion to avoid mixing lazy-boundary work with component architecture churn.

## 14-06-2026 19:43

- **Image metadata sweep:** Chose template-only image attributes as the ten-improvement execution slice because it advances the active asset/a11y objective without inventing UI or touching visual layout. Added a static Node contract test instead of full fixture tests for every template because the behavior is declarative metadata and several changed surfaces are module-declared rather than standalone.

## 14-06-2026 19:37

- **Bundle/prerender first slice:** Chose measurement plus prerender coverage before dependency deferral so later chunk changes have a pinned baseline. Reused the existing sitemap REST pattern rather than adding Angular service/API methods because the generator runs in Node before build. Dynamic prerender routes fail open to static routes when credentials or individual tables are unavailable, matching existing sitemap resilience while avoiding schema/RLS work.

## 14-06-2026 13:00

- **Type safety ratchet:** Selected the first Type Safety plan item as the next unblocked HIGH infra slice. Reused `.eslintrc.json`, `package.json` lint/lint-staged wiring, and the `check-layering.cjs` baseline pattern. Chose AST-based `SyntaxKind.AnyKeyword` counting over regex so aliases/comments/strings do not skew the baseline.
- **Type safety ratchet completion:** Kept the full plan active instead of archiving because only the MVP ratchet item is complete. Baseline count is 2,993 AST `AnyKeyword` nodes; Angular ESLint reports 2,990 warnings because its lint target differs slightly from the baseline file set.
- **Type safety helper layer:** Introduced backend-local helper aliases over generated Supabase types and Postgrest response shapes. Did not retune `remapErrors` or `throwIfSupabaseError` because focused tests showed their existing type-erasing behavior is relied on across the app; changing it would create broad production-risk churn.
- **Module collection SEO polish:** Selected `CURRENT_FEATURE.md` Layer 3 SEO/share metadata as the next unblocked frontend-only slice. Reused the existing detail-page SEO pattern from rack detail and public profile instead of adding a new metadata service or UI. Kept analytics separate because `ModuleCollectionsDetailDataService` already captures `module_collection.viewed`, while the remaining docs item asks for creation/discovery analytics as a distinct follow-up.
- **Module collection analytics polish:** Reused `AnalyticsService` and the module browser/home discovery event shapes. Chose not to send raw collection search text because searches are user-entered; events use search length/active flags plus order/count metadata instead.
- **Rack editor optimistic add slice:** Chose bottom-picker add plus blank quick-add as the bounded next step. Existing delete/reorder/row paths already prove the rollback pattern; add paths need generated id reconciliation, so this slice will reuse `applyPersistedRackingIds` instead of adding a second id-mapping helper.
- **Rack editor optimistic add implementation:** Kept the solution inside `RackDetailDataService` and `rowedRackedModules$` rather than creating UI-level state. Bottom-picker adds use an optimistic unracked row, quick-add blanks fetch the existing blank module data before local insertion, and both paths patch generated ids through `applyPersistedRackingIds` or remove only the optimistic object on failure.
- **Rack editor full-reload audit:** Treated duplicate-rack hydration as an intentional route handoff instead of same-rack reload debt. The remaining same-rack opportunity was panel switching, which already updated local state but did not roll back on failed persistence; fixed it by restoring the prior `selectedPanelId`.
- **Discovery community trends:** Reused the existing homepage discovery component and RPC-backed aggregate service. Chose not to create a new route or additional query because the documented MVP already exists behind `showCommunityTrends = false`.
- **Rack name prefill bug:** Confirmed the service state was not the bug; the visual path depends on `matAutocomplete` `displayWith` in `lib-mat-form-entity`. Current HEAD already passes primitives through in `presetDisplayFunction`, so this slice added a rendered-input regression and archived the stale TODO after E2E verification.
- **1U placeholder aspect bug:** Treated the TODO as stale production-code-wise because `module-part-image` already uses explicit style dimensions for no-panel placeholders. Added rendered component tests rather than changing the template; the public `/modules` snapshot contained 1U image cards but no missing-panel `.preview` nodes, so the exact no-panel state is covered in unit DOM tests.
- **Manufacturer filter parity:** Kept advanced catalogue filters inside `app-module-list` rather than extracting a shared browser filter bar because module browser filtering is server-side and manufacturer filtering is local. Fixed standard filtering by converting the select component's string ids to numeric module standard ids at the local filter boundary.
- **Type safety PatchDetailDataService cleanup:** Chose a local nullable `RackReadResponse` shape for the linked-rack read consumer instead of editing backend query definitions. This removes one explicit `any` from a priority file while preserving existing undefined/null fallback behavior and avoiding Supabase runtime/query changes.
- **Type safety RackDetailDataService cleanup:** Widened the shared `RackingData` model to match existing runtime states (`id?: number`, nullable `row`/`column`) rather than adding more local casts. This is behavior-preserving because rack utilities, optimistic rack edits, and persisted rack-module responses already use unsynced IDs and unracked null coordinates.
- **Type safety backend module payload cleanup:** Kept module add/update normalization behavior exactly as-is and typed only the local payload containers plus Supabase insert/update boundary casts. This avoids changing query definitions or the historical field deletion rules while removing loose payload `any` variables.
- **Type safety plan closure:** Closed and archived the plan by user direction even though the original long-tail count-reduction goals are not complete. Future agents should treat the ratchet/helper/safe-cleanup value as shipped and should not resume this plan unless explicitly asked.
- **Angular SubManager bridge:** Used explicit `super(destroyRef)` opt-in instead of base-class `inject(DestroyRef)` because `SubManager` is directly constructed in specs. The helper composes Angular `takeUntilDestroyed` with legacy `destroy$` so both Angular injector teardown and manual `ngOnDestroy()` tests stop subscriptions.
- **Angular modernization batch:** Prioritized covered data services with no manual `ngOnDestroy` override for the first adoption wave. For signals, used internal `ModuleListComponent` state rather than `input()` conversion because current tests and some consumers still use direct property assignment; true signal inputs need a compatibility-focused fixture-backed slice.
- **Angular second lifecycle batch:** Migrated the remaining small browser/collection services before touching lifecycle-heavy files. Deferred `rack-detail-data.service` and `user-area-data.service` because the former is a God-file marked for split and the latter has a manual destroy override.
- **Angular signal-input pilot:** Chose `StatisticsComponent` as the first true `input()`/`computed()` conversion because it is a shared standalone leaf with local derived state and focused tests. Converted specs to fixture-backed `setInput()` rather than preserving direct property assignment, matching Angular's signal-input testing path while keeping parent template bindings unchanged.
- **Angular signal-input batch:** Finished the three-component pilot with `EntityStatGridComponent` and `RecentActivityComponent` because both are shared atoms with local derived list state and existing focused coverage. Kept selector/input names unchanged so parent templates continue binding the same product API.
- **Angular third lifecycle batch:** Returned to `takeUntilDestroyed()` adoption after the signal pilot, selecting covered services without manual destroy overrides. Kept the optional appended `DestroyRef` constructor pattern so direct-constructor specs and Angular DI both stay compatible.
- **Angular fourth lifecycle batch:** Selected five covered services (`SelectionPanelBridgeService`, `DiscoveryTipService`, `CommentsDataService`, `UserLoginDataService`, `UserSignupDataService`) because they exercised bridge compatibility across root services, component-scoped services, forms, router events, and direct-constructor specs without changing UI or backend behavior.
- **Angular fifth lifecycle batch:** Selected tag-vote, manufacturer detail/browser data, and patch/rack browser root streams because they are covered and exercise both service subscriptions and component-owned derived observables. Deferred larger editors/detail services to avoid mixing lifecycle migration with God-file or manual-destroy work.
- **Angular smallest covered batch:** Followed the user's "top forty percent of the smallest files" direction by sorting remaining legacy lifecycle files by line count and updating the smallest covered 40% slice. Excluded `subscription-manager.ts` from adoption because it owns the bridge fallback and should retain its internal `takeUntil` implementation.
- **Angular covered bulk lifecycle completion:** Switched from incremental batches to a broad mechanical pass across every remaining covered exact `takeUntil(this.destroy$)` target. Kept `takeUntil` imports where files still use non-bridge local teardown (`destroyEvent$`, timers, menu-close, discovery-search reset), and left the lone uncovered exact target unchanged.
- **Angular destroyEvent lifecycle completion:** Treated covered `destroyEvent$` holders as the same local-only modernization family once exact `destroy$` adoption was complete. Migrated them to `SubManager.takeUntilDestroyed()` rather than preserving per-class Subjects/EventEmitters, including `RackDetailDataService` after confirming its remaining uses were object-lifecycle teardown and not a separate reset token.
- **Angular modernization closure:** Closed the active Angular modernization TODO by user direction after repeated lifecycle passes. Marked remaining broad items done for backlog hygiene rather than continuing the same plan; future schematic, OnPush, standalone, or God-file split work should be proposed as fresh scoped tasks.

## 17-05-2026

- **Load More for public profile tabs:** Followed the established `PatchBrowserDataService` accumulation pattern exactly (skip===0 → replace, skip>0 → append, loading state only on fresh load). Considered keeping `MatPaginator` for simplicity but rejected it — it's inconsistent with every other list view in the app since `25240a44` and `c874817a`. No new pattern introduced. `MatPaginatorModule` removed from the feature module entirely; replaced with `MatButtonModule` which was already present elsewhere.

## 2026-05-12T11:16:04+02:00

- Bootstrapped the missing `agent/` control files instead of blocking on their absence, because the iterative loop needs durable in-repo state.
- Chose the smallest safe linked-rack task first: define the state contract before changing schema or UI.
- Kept the linked-rack definitions aligned with the existing product rules: collection-first editing stays canonical, and unavailable racks must degrade without mutating patch instances or leaking private rack data.
- Next implementation slice is the nullable schema/backend association for `patches.linked_rack_id`.

## 2026-05-12T11:24:00+02:00

- Added a forward-only migration for nullable `patches.linked_rack_id` with `ON DELETE SET NULL` and an index for later lookups.
- Extended patch types plus add/query plumbing so the new field can round-trip without changing existing no-rack behavior.
- Added focused backend coverage for add/update/detail handling of `linked_rack_id`.
- Updated `database.types.ts` in-repo to match the migration-backed schema contract so app code can compile against the new field before a separate live-schema apply/type-regeneration step.
- Next bounded task is the owner-facing choose/change/clear UI slice.

## 2026-05-12T11:41:00+02:00

- Added owner-only linked-rack status UI to the patch detail shell and linked-rack choose/change/clear controls to patch edit metadata.
- Kept the linked-rack edit path metadata-only: changing or clearing the link updates `linked_rack_id` without forcing a patch-detail reload that would disturb local connection state.
- Reused `get.currentUserRacks()` instead of widening the backend API surface.
- Added focused service/component coverage and updated the authenticated patch-detail screenshot spec to capture the linked-rack edit shell.
- Next bounded task is patch creation support for optional linked-rack selection.

## 2026-05-12T11:57:44+02:00

- Fixed the patches browser regression by removing `linked_rack_id` from the default public `getPatches()` select, so public listing surfaces do not depend on the linked-rack schema rollout.
- Added a focused backend regression assertion that the public patch listing query stays free of `linked_rack_id`.
- Tightened the patch-browser smoke test to target actual patch-list items and the paginator range label instead of generic page-wide selectors.
- Validated the fix with the focused backend spec, a production build, and the patch-browser Playwright smoke suite.
- Remaining linked-rack work stays scoped to patch creation, viewer-facing unavailable/privacy handling, and the later linked-rack module-proposal enhancement.

## 2026-05-12T12:17:17+02:00

- Added optional linked-rack UI to patch creation, loading the current user's racks into a select and keeping the create flow text explicit that rack context is optional.
- Kept patch creation rollout-safe by omitting `linked_rack_id` from patch inserts unless the user explicitly selected a rack, so unlinked patch creation and all existing unlinked patches keep working.
- Added focused creator/backend coverage for linked and unlinked creation payloads, and extended the authenticated patch-creation E2E to assert the linked-rack field and complete the create flow via the returned patch id.
- Recorded the live Supabase migration apply as an external rollout dependency before selected linked-rack persistence can be used in production.
- Next bounded task is privacy-safe viewer handling for unavailable or inaccessible linked racks.

## 2026-05-12T12:36:00+02:00

- Normalized patch add/update Supabase `{ error }` responses into real observable errors so linked-rack UI flows can handle the pending schema rollout explicitly instead of treating `PGRST204` as success.
- Added rollout-safe linked-rack fallback copy and disabled-state handling in both patch detail editing and linked-rack-selected patch creation, so users can keep working unlinked while the live migration is still pending.
- Kept the external migration blocker in place: the repo now degrades gracefully, but actual linked-rack persistence still requires the live `patches.linked_rack_id` column.
- Validated the guarded write path with focused backend, patch-detail, patch-creator, and patch-minimal specs plus a production build.
- Next bounded task is the requested patch-editor operation mode selector with linked-rack context preview.

## 2026-05-12T12:44:00+02:00

- Added a patch-editor operation mode selector modeled on the rack editor button-group pattern, keeping collection-first editing as the default and rendering linked-rack context as a separate read-only section below the editor.
- Loaded linked-rack preview data from the existing rack detail/racked-modules reads instead of introducing new backend APIs, and kept the preview informational only so it never mutates patch instances or connection state.
- Added focused patch-editor coverage for the new operation-mode options and row-grouped linked-rack preview shaping.
- Validation stayed at focused unit/build coverage because the shared live environment still cannot persist a linked patch until the external schema migration lands, which blocks a stable visible end-to-end assertion for linked-rack mode.
- Next bounded task is privacy-safe viewer handling for unavailable or inaccessible linked racks.

## 16-05-2026 10:11

- Fixed 1U module placeholder aspect ratio bug by removing `[fxFlex]` from the placeholder `<div>`
  inside `module-part-image.component.html` and replacing it with an explicit `[ngStyle]` binding
  for both `width` and `height`.
- `fxFlex` sets `flex-basis` along the parent flex main axis, which is not always horizontal;
  using explicit CSS properties is immune to flex-direction, so the fix is correct across all
  host layouts without requiring any parent-component changes.
- `fixedHeight=true` path kept as-is: the existing `.preview--fixed-height` CSS class already
  enforces `width: 100%; height: 8rem !important;` — no inline override needed.
- Discarded alternatives: (a) forcing `flex-direction: row` on `lib-screen-wrapper` — would be
  a broader change with potential layout side-effects; (b) removing `lib-screen-wrapper` — not
  needed; the wrapper is not the root cause.

## 2026-06-16T18:16+02:00

- **Rack replace-with-blank enter delay:** Suppressed the next enter animation by row/column visual slot rather than racking id, because the optimistic replacement blank starts without a persisted id while preserving the same slot.

## 2026-06-16T18:23+02:00

- **Rack same-HP hover aid:** Kept the cue as opacity/filter-only classes on existing rack tiles so it does not interfere with drag/drop, row animations, or analysis overlay classes. Suppressed it outside off-analysis edit mode because analysis modes already encode their own hover semantics.

## 2026-06-16T18:29+02:00

- **Module description keywords:** Added a dedicated opt-in view-config flag rather than changing all module descriptions, because the plan scopes keyword colour to module-browser scanning only. Escaped DB text before returning trusted highlight markup so `[innerHTML]` does not widen the rendering surface.
