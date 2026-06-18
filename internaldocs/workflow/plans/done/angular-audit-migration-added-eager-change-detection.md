<!-- Section: INFRA (independent; pick any time a product task is blocked) -->

#### LOW: Angular — Audit migration-added eager change detection

**Status:** Completed in loop 5.

## Problem

**Why:** The Angular 22 migration added `ChangeDetectionStrategy.Eager` to preserve behavior. Some components may be safe to move back to `OnPush` once verified.

## Goals

- Inventory all `ChangeDetectionStrategy.Eager` usages in app code and specs.
- Convert safe production components back to `OnPush` when focused tests cover their rendering/update behavior.
- Leave Eager in place with a documented reason where behavior or test fixtures depend on it.
- Avoid broad visual churn; this is an audit/conversion pass only.

## Assumptions

- Spec-only host components using Eager can stay Eager when they intentionally exercise projected forms or test harnesses.
- Components that already manage state through reactive bindings or explicit change detection may be safe OnPush candidates.
- If a conversion requires changing behavior or weakening tests, it should be deferred and documented.

## Layers

### MVP

- [x] Inventory production and spec-only `ChangeDetectionStrategy.Eager` usages.
- [x] Choose safe production candidates backed by focused specs.

### Structural

- [x] Convert safe candidates to `ChangeDetectionStrategy.OnPush`.
- [x] Document remaining Eager usages with reasons in the Decision log.

### Polish

- [x] Run focused specs for converted/retained components.
- [x] Run `pnpm lint`, `pnpm build`, and docs checks.

## File-level checklist

- [x] Production files containing `ChangeDetectionStrategy.Eager`
- [x] Specs covering converted or retained usages
- [x] `internaldocs/workflow/CURRENT_FEATURE.md`

## Acceptance criteria

- [x] Every current `ChangeDetectionStrategy.Eager` usage is either converted or has a documented reason to remain.
- [x] Any converted production component has focused test coverage passing.
- [x] No tests are weakened to make OnPush pass.
- [x] Lint/build/docs validation passes.

## Validation strategy

- `rg "ChangeDetectionStrategy\\.Eager" src/app`
- targeted specs for touched components
- `pnpm lint`
- `pnpm build`
- `node scripts/checks/check-docs.cjs`

## Scope

- Review each migration-added `ChangeDetectionStrategy.Eager` component/spec fixture.
- Keep eager strategy where behavior depends on it.
- Convert candidates to `OnPush` only with focused tests or UI validation.

## Success criteria

- Each eager strategy has either a reason to stay or has been safely converted.
- Tests and relevant UI smoke checks pass after any conversion.

## Decision log

- 2026-06-15 — Added as a low-priority follow-up because correctness matters more than immediate OnPush cleanup.
- 2026-06-18 — Coordinator validation passed targeted module-editor, mat-form-entity, and module-collection-editor specs plus lint, production build, docs check, and `git diff --check`.
- 2026-06-18 — Inventory found four production Eager usages plus six spec-only host/stub usages. Converted `ModuleCollectionEditorComponent`, `ModuleEditorCropperComponent`, and `MatFormEntityDateInputComponent` to `OnPush`; their bindings are driven by inputs, template events, `async` pipes, reactive forms, or delegated wrapper calls, and focused specs cover the touched flows.
- 2026-06-18 — Kept `MatFormEntityChipInputComponent` on `Eager`: its template reads `control.value` and `control.disabled` directly from a stable `UntypedFormControl` reference, including deferred rendering through the parent OnPush form entity. Converting safely needs a follow-up reactive value/disabled adapter rather than a strategy-only change.
- 2026-06-18 — Kept spec-only Eager usages in `patch-editor-cv-highlight.integration.spec.ts`, `module-collections-browser-root.component.spec.ts`, `mat-form-entity.component.spec.ts`, `module-part-image.component.spec.ts`, and `admin-panel-root.component.spec.ts`; these are host/stub components used to exercise projected content or bound fixtures, not production change-detection choices.
