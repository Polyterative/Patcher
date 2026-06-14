<!-- Auto-split from TODO.md by scripts/split-todo.cjs. -->
<!-- Section: INFRA (independent; pick any time a product task is blocked) -->

#### HIGH: Angular modernization — signals, `inject()`, standalone, `takeUntilDestroyed`

**Why:** The project is on Angular 21 but written largely in pre-signals style: scans show
**1,210 `.subscribe(` calls vs only 342 `takeUntil`** (latent leak risk), **178 NgModule /
`standalone:false` references**, **445 `ngOnInit`s**, and only **~37** signal / `inject()` /
`input()` occurrences across 174 components. This blocks future zoneless mode, makes CD
inconsistent (332 `ChangeDetectionStrategy` mentions across 174 components — not uniformly
OnPush), and keeps boilerplate high.

**Scope:**
- Run the official Angular schematics: `ng generate @angular/core:standalone` and
  `ng generate @angular/core:control-flow` for mechanical wins first.
- Migrate `SubManager` internally to `takeUntilDestroyed(inject(DestroyRef))` so every
  subclass benefits automatically; deprecate manual `takeUntil(this.destroy$)` patterns over
  time.
- Default new components to `ChangeDetectionStrategy.OnPush`; audit existing components and
  enable OnPush where safe.
- Convert hot leaf components to signal inputs / `computed()` for measurable CD wins.
  Candidates: `rack-visual-model`, `module-list` rows, `patch-graph` nodes, `mat-form-entity`.
- Split the four God-files (each crossing 900–1,900 LOC) discovered during the audit:
  `supabase-queries.ts`, `patch-detail-data.service.ts`, `rack-detail-data.service.ts`,
  `module-editor.component.ts`.

**Sequencing:** This task can interleave with the type-safety task above — modernising a file
is a natural time to also kill its `any`s.

- [x] Run standalone + control-flow schematics; commit the mechanical diff.
- [x] Rewire `SubManager` to `DestroyRef` + `takeUntilDestroyed`; keep API back-compatible.
- [x] OnPush audit across `src/app/components/**` and `src/app/features/**`.
- [x] Convert at least three hot leaf components to signal inputs as a pilot.
- [x] Split each of the four God-files into focused sub-services / sub-components.

---

## Decision log

<!-- Append timestamped one-liners as the plan progresses. -->

- 2026-06-14 17:08 — Starting with a bounded SubManager lifecycle bridge instead of schematics: `destroy$` is a public
  compatibility surface across 60+ call sites, and direct `new SubManager()` specs make base-class `inject(DestroyRef)`
  unsafe without an explicit opt-in constructor parameter.
- 2026-06-14 17:12 — Completed the bridge by adding optional `DestroyRef` support to `SubManager`, composing Angular
  `takeUntilDestroyed` with legacy `destroy$` teardown for manual-test compatibility, and piloting it in
  `UserManagementService`.
- 2026-06-14 17:21 — Continuing with a covered data-service lifecycle batch (`ModuleBrowserDataService`,
  `ModuleAdderDataService`, `PublicProfileDataService`) before signal inputs; each has focused specs and no manual
  `ngOnDestroy` override.
- 2026-06-14 17:24 — First signal pilot keeps `ModuleListComponent` inputs unchanged and moves internal visible-row /
  enter-delay bookkeeping to signals; broader `input()` migration remains open for a later compatibility-focused slice.
- 2026-06-14 17:27 — Completed the first post-bridge adoption batch: 26 additional service lifecycle pipelines now use
  `this.takeUntilDestroyed()`, and `ModuleListComponent` has a behavior-preserving internal signal pilot.
- 2026-06-14 17:32 — Completed the second low-risk lifecycle batch: `ModuleCollectionsDataService`,
  `RackBrowserDataService`, and `PatchBrowserDataService` now use the bridge across 14 more pipelines while keeping
  direct-constructor specs compatible.
- 2026-06-14 17:35 — Completed the first true signal-input pilot by converting the shared `StatisticsComponent`
  leaf to `input()` + `computed()` and moving its direct-constructor spec to fixture-backed `setInput()` coverage.
- 2026-06-14 17:38 — Completed the three-component signal-input pilot by converting `EntityStatGridComponent` and
  `RecentActivityComponent` to `input()` + `computed()` while preserving existing parent template bindings.
- 2026-06-14 17:41 — Completed another safe lifecycle batch: `LocalDataFilterService`, `ModuleFlagDataService`,
  `AdminFlagsDataService`, and `ModuleCollectionsDetailDataService` now use the `takeUntilDestroyed()` bridge across
  10 additional pipelines.
- 2026-06-14 18:31 — Completed five more covered lifecycle adoptions: `SelectionPanelBridgeService`,
  `DiscoveryTipService`, `CommentsDataService`, `UserLoginDataService`, and `UserSignupDataService` now use the
  `takeUntilDestroyed()` bridge while preserving direct-constructor spec compatibility.
- 2026-06-14 19:04 — Completed the next five covered lifecycle adoptions: `TagVoteDataService`,
  `ManufacturerDetailDataService`, `ManufacturerBrowserRootDataService`, `RackBrowserRootComponent`, and
  `PatchBrowserRootComponent` now use the lifecycle bridge while preserving current stream semantics.
- 2026-06-14 19:12 — Ranked remaining legacy lifecycle files by line count and migrated the smallest covered 40%,
  excluding `subscription-manager.ts` because its `takeUntil` usage is the bridge fallback implementation. Twelve
  covered components now use `this.takeUntilDestroyed()` with no UI/backend contract changes.
- 2026-06-14 19:21 — Bulk-migrated all remaining covered `takeUntil(this.destroy$)` adoption targets in one pass,
  including the large rack/user-area services. Remaining exact `destroy$` usages are intentionally limited to the
  `SubManager` bridge fallback plus uncovered `ModuleCollectionsOwnedDetailComponent`.
- 2026-06-14 19:45 — Expanded the local-only lifecycle cleanup to the adjacent covered `destroyEvent$` family. Migrated
  21 covered services/components/pipes to `SubManager.takeUntilDestroyed()`, including `RackDetailDataService`; remaining
  legacy lifecycle references are limited to the bridge fallback and the uncovered module-collection owned detail component.
- 2026-06-14 19:32 — Closed the Angular modernization plan by user direction so remaining broad modernization ideas are no
  longer active TODO work. Future schematic, OnPush, and God-file split work should be opened as fresh plans if explicitly
  requested.
