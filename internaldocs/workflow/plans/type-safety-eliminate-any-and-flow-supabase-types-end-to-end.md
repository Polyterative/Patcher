<!-- Auto-split from TODO.md by scripts/split-todo.cjs. -->
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

- [ ] Add `@typescript-eslint/no-explicit-any` (warn) and record baseline count.
- [ ] Introduce typed wrapper around Supabase calls in `SupabaseService` using `Tables<>` /
      `TablesInsert<>` / `TablesUpdate<>` helpers.
- [ ] Migrate the five priority files above; verify the data-service callers compile clean.
- [ ] Flip `noImplicitAny` to true (file-by-file via `// @ts-expect-error` budget if needed).
- [ ] Drop the count below 500 `any`, then below 100.

---

## Decision log

<!-- Append timestamped one-liners as the plan progresses. -->

