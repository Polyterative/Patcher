<!-- Section: INFRA (independent; pick any time a product task is blocked) -->

#### LOW: Angular — Replace deprecated Flex Layout

**Status:** Completed in loop 3.

## Problem

**Why:** `@angular/flex-layout` is deprecated and remains a long-term Angular compatibility risk after the Angular 22 upgrade.

## Goals

- Remove direct `@angular/flex-layout` imports from app code.
- Replace `fx*` template directives with native CSS flex/grid and existing layout utilities.
- Preserve responsive behavior on primary rack, patch, module, auth, and shared UI surfaces.
- Keep the `@angular/flex-layout` package installed only if a third-party dependency still needs it; otherwise remove it.

## Assumptions

- Static `fxLayout*`, `fxFlex`, and alignment directives can be replaced with CSS classes/styles without runtime CDK breakpoint work.
- Any complex responsive behavior should be preserved with media queries rather than introducing new dependencies.
- Visual screenshot validation is desirable for broad layout changes, but a targeted code/test/lint pass is acceptable for non-visual mechanical slices when no dev server is running.

## Layers

### MVP

- [x] Inventory `@angular/flex-layout` imports and `fx*` template usage.
- [x] Replace the smallest shared/module import surfaces first and validate no template compile errors.

### Structural

- [x] Replace all remaining app-owned `fx*` directives with CSS classes, inline style bindings, or existing shared layout helpers.
- [x] Remove `FlexLayoutModule` imports from app modules/standalone components when no templates need them.
- [x] Remove the package dependency if no source or lockfile usage remains.

### Polish

- [x] Add or update focused tests where layout bindings can affect behavior.
- [x] Run targeted tests, `pnpm lint`, `pnpm build`, and docs checks.

## File-level checklist

- [x] `src/app/**/*.html`
- [x] `src/app/**/*.ts`
- [x] `src/app/**/*.scss`
- [x] `package.json`
- [x] `pnpm-lock.yaml`
- [x] `internaldocs/workflow/CURRENT_FEATURE.md`

## Acceptance criteria

- [x] No app-owned `@angular/flex-layout` imports remain.
- [x] No app-owned `fxLayout`, `fxFlex`, `fxLayoutAlign`, `fxLayoutGap`, `fxHide`, or `fxShow` template directives remain.
- [x] Existing responsive layouts keep equivalent behavior across primary breakpoints.
- [x] Lint and build pass after migration.

## Validation strategy

- `rg "@angular/flex-layout|fxLayout|fxFlex|fxLayoutAlign|fxLayoutGap|fxHide|fxShow" src/app`
- `pnpm test-headless --include="**/rack-image.component.spec.ts"`
- `pnpm lint`
- `pnpm build`
- `node scripts/checks/check-docs.cjs`

## Scope

- Inventory `@angular/flex-layout` imports and `fx*` template usage.
- Replace usage gradually with CSS grid/flex utilities, existing shared layout helpers, and Angular CDK layout only where runtime breakpoint observation is genuinely needed.
- Remove `@angular/flex-layout` once no imports or directives remain.

## Success criteria

- No `@angular/flex-layout` dependency or imports remain.
- Existing responsive layouts keep equivalent behavior across primary breakpoints.

## Decision log

- 2026-06-15 — Added as a low-priority follow-up after the Angular 22 upgrade; defer because it is broad UI/layout work.
- 2026-06-18T09:07+02:00 — Completed loop 3 migration in one mechanical slice: replaced app-owned `fx*` templates with global CSS layout helpers, moved breakpoint state from Flex Layout `MediaObserver` to CDK `BreakpointObserver`, removed all `FlexLayoutModule` imports, and removed `@angular/flex-layout` from `package.json`/lockfile.
