<!-- Auto-split from TODO.md by scripts/dev/split-todo.cjs. -->
<!-- Section: INFRA (independent; pick any time a product task is blocked) -->

#### HIGH: Type safety — eliminate `any` and flow Supabase types end-to-end

**Why:** A repo-wide scan found **~2,633 `any` annotations across ~45k TS LOC** (roughly one
every 17 lines), even though `src/backend/database.types.ts` already exposes generated
Supabase row types. The result is that refactors are dangerous, IDE intelligence is degraded,
and a whole class of runtime bugs (renamed columns, null fields, wrong joins) ship to Sentry
instead of failing at compile time. Worst offenders are the big data services and
`supabase-queries.ts` (1,928 LOC).

**Scope:**
- Establish a typed query helper layer so every call returns `PostgrestSingleResponse<T>` /
  `Tables<'rack'>` / `TablesInsert<...>` instead of `any` — start with `SupabaseService`
  namespaces (`GET`/`get`/`add`/`update`/`delete`).
- Ratchet ESLint: add `@typescript-eslint/no-explicit-any` as warn, snapshot the baseline,
  then forbid new occurrences on changed files via lint-staged.
- Enable `strict` / `noImplicitAny` incrementally with a per-directory budget; track the
  count in this entry as it drops.
- Prioritise these files first (largest blast radius):
  `features/backend/supabase-queries.ts`, `components/patch-parts/patch-detail-data.service.ts`,
  `components/rack-parts/rack-detail-data.service.ts`,
  `components/module-parts/module-editor/module-editor.component.ts`,
  `features/module-browser/module-browser-data.service.ts`.

**Out of scope:** refactoring the runtime behaviour of those files; this is purely a type
hardening pass with no functional change.

- [x] Add `@typescript-eslint/no-explicit-any` (warn) and record baseline count.
- [ ] Introduce typed wrapper around Supabase calls in `SupabaseService` using `Tables<>` /
      `TablesInsert<>` / `TablesUpdate<>` helpers.
- [ ] Migrate the five priority files above; verify the data-service callers compile clean.
- [ ] Flip `noImplicitAny` to true (file-by-file via `// @ts-expect-error` budget if needed).
- [ ] Drop the count below 500 `any`, then below 100.

**Closure:** Closed on 2026-06-14 by user direction. The ratchet and selected safe cleanup are shipped; remaining broad
strictness/count-reduction goals are intentionally not active work.

---

## Decision log

<!-- Append timestamped one-liners as the plan progresses. -->

- 2026-06-14T14:15+02:00 — Started with the lint/baseline ratchet slice because it is behavior-preserving and unblocked by schema/RLS approval. Reused the existing `scripts/checks/check-layering.cjs` baseline pattern and lint-staged hooks instead of adding a new lint framework.
- 2026-06-14T14:20+02:00 — Recorded the current AST-counted baseline at 2,993 explicit `any` keywords (excluding generated Supabase types), wired `pnpm lint` to fail only on per-file increases above baseline, and wired lint-staged to fail staged files whose count increases against `HEAD`.
- 2026-06-14T14:24+02:00 — Added a type-only/backend-local Supabase helper layer (`supabase-db.types.ts`) and migrated low-risk response casts in `supabase-get`, `supabase-add`, and `supabase-update`. Avoided changing shared operator typing because it caused broad app-level inference churn. Baseline now 2,979.
- 2026-06-14T14:26+02:00 — Migrated the remaining `get.statistics()` count responses to `responseCount()`, clearing `supabase-get.ts` from the explicit-any baseline. Baseline now 2,976.
- 2026-06-14T14:29+02:00 — Cleared explicit `any` from `supabase-queries.helpers.ts` and `supabase-queries.manufacturer-stats.ts` with metadata-preserving generics and local structural manufacturer types. Baseline now 2,972.
- 2026-06-14T14:31+02:00 — Cleared route layout metadata helper `any` annotations by using Angular `Data` in Saturn/Uranus/Venus route factories. Baseline now 2,969.
- 2026-06-14T14:35+02:00 — Cleared route layout component spec `any` casts by typing the route test doubles with Angular `ActivatedRoute` and `Data`. Baseline now 2,966.
- 2026-06-14T14:39+02:00 — Cleared `EllipsisPipe` null/undefined spec casts by adding overloads for the pipe's existing passthrough behavior. Baseline now 2,964.
- 2026-06-14T14:43+02:00 — Cleared custom validator spec form-control casts by passing `UntypedFormControl` directly to `AbstractControl` validators. Baseline now 2,944.
- 2026-06-14T14:48+02:00 — Cleared string utility null/undefined spec casts by typing existing passthrough behavior and narrowing table-filter reducers to strings. Baseline now 2,938.
- 2026-06-14T14:52+02:00 — Cleared mat-form pipe `ChangeDetectorRef` spec casts with typed Jasmine spy doubles. Baseline now 2,936.
- 2026-06-14T14:56+02:00 — Cleared `form-element-models` spec casts by passing controls directly to `AbstractControl` validators and invalid option shapes directly to `isOption(unknown)`. Baseline now 2,919.
- 2026-06-14T15:00+02:00 — Cleared `form-pipes` spec casts with typed `ChangeDetectorRef` spies and direct public `subscribed` reads. Baseline now 2,903.
- 2026-06-14T15:04+02:00 — Cleared `app-form-utils` spec casts with `ValidationErrors`, typed mixed sanitizer streams, and a `DomSanitizer` placeholder. Baseline now 2,899.
- 2026-06-14T15:08+02:00 — Cleared discovery tip utility fixture cast with a complete `DiscoveryTipDefinition`. Baseline now 2,898.
- 2026-06-14T15:12+02:00 — Cleared app-state layout spec capture cast by using exported `LayoutFlexWidthState`. Baseline now 2,897.
- 2026-06-14T14:45+02:00 — Cleared the priority-file `PatchDetailDataService` linked-rack response cast with a nullable `RackReadResponse`, leaving Supabase query/cache behavior unchanged. Baseline now 2,896.
- 2026-06-14T16:18+02:00 — Selected `RackDetailDataService` optimistic rack-module casts next. The service already writes unsynced `id: undefined` and unracked `row`/`column: null`, so this slice will align `RackingData` with existing runtime states instead of adding local casts.
- 2026-06-14T16:22+02:00 — Cleared six `RackDetailDataService` optimistic rack-module casts by typing `RackingData` for absent pre-persistence ids and nullable unracked coordinates. Baseline now 2,890.
- 2026-06-14T16:31+02:00 — Cleared three backend module payload locals in `supabase-add`/`supabase-update` with typed records and generated module insert/update payload casts at the Supabase boundary. Baseline now 2,887.
- 2026-06-14T17:08+02:00 — Closed and archived this plan by user direction. The shipped value is the ratchet, helper layer, and selected safe cleanup; remaining broad `noImplicitAny` and count-reduction goals should not be resumed unless a new task explicitly reopens them.
