<!-- Section: INFRA (independent; pick any time a product task is blocked) -->

#### LOW: Angular — Clean up safe-navigation migration wrappers

**Status:** Completed 2026-06-17.

**Why:** Angular 22 wrapped some template optional chaining expressions in `$safeNavigationMigration(...)` to preserve Angular 21 behavior. These wrappers are correct but noisy and should be reviewed deliberately.

## Problem

Template migration wrappers make simple optional reads harder to review and can obscure the intended input type at call sites. The remaining wrappers should either be removed with equivalent expressions or documented as intentionally retained.

## Goals

- Inventory all remaining `$safeNavigationMigration(...)` template usages.
- Replace wrappers with clearer null-safe template expressions where behavior is equivalent.
- Keep no wrappers unless there is a concrete behavior-preservation reason.
- Avoid behavior changes to patch-editor or module-detail flows.

## Assumptions

- Most wrappers are around optional chaining expressions used as component inputs or helper arguments.
- Angular template type-checking and existing focused specs are sufficient to catch unsafe rewrites.
- No schema, Supabase, or RLS changes are required.

## Layers

### MVP

- Replace trivial wrappers where the callee already accepts `undefined` / optional values.
- Use nullish coalescing only when the existing comparison/helper usage requires a primitive fallback.

### Structural

- Confirm no `$safeNavigationMigration(...)` usages remain in app templates.
- Keep the diff limited to affected templates unless type signatures reveal a real mismatch.

### Polish

- Run focused specs for touched surfaces, then lint/docs checks.
- Archive the workflow docs after review and validation.

## File-level checklist

- [x] `src/app/components/patch-parts/patch-editor/patch-editor.component.html` — remove wrapper calls around instance ids and panel-length checks.
- [x] `src/app/features/module-browser/module-browser-detail/module-browser-detail.component.html` — remove wrapper calls around title and hidden-usage bucket helper arguments.
- [x] `internaldocs/workflow/TODO.md` / `CURRENT_FEATURE.md` / `COMPLETED.md` — keep workflow state coherent.

## Acceptance criteria

- Remaining wrappers are intentional.
- Rewritten expressions have equivalent behavior and pass template compilation.
- No `$safeNavigationMigration(...)` occurrences remain unless a Decision log entry explains why.
- Focused tests for touched surfaces pass, and `pnpm lint` passes.

## Validation strategy

- Baseline and final targeted unit tests:
  - `pnpm test-headless --include="**/patch-editor*.spec.ts"`
  - `pnpm test-headless --include="**/module-browser-detail*.spec.ts"`
- Final broader validation: `pnpm lint`.

## Decision log

- 2026-06-15 — Added as a low-priority cleanup after Angular 22 template migration.
- 2026-06-17T17:45+02:00 — Selected for coordinator loop because higher-priority open items either require external credential/secret rotation or explicit Supabase/RLS approval; this cleanup is fully local and actionable.
- 2026-06-17T17:55+02:00 — Replaced all remaining wrappers with direct optional-chain/nullish expressions; focused patch-editor/module-detail specs, reviewer pass, `pnpm lint`, and docs check passed.
