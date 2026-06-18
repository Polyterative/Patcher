<!-- Section: INFRA (independent; pick any time a product task is blocked) -->

#### LOW: Angular — Migrate deprecated animations package usage

**Status:** Implemented and validated in loop 4.

## Problem

**Why:** Angular 22 deprecates `@angular/animations` in favor of newer enter/leave animation primitives.

## Goals

- Inventory all current `@angular/animations` imports and classify simple enter/leave transitions
  versus complex query/child/stagger/manual animations.
- Migrate simple enter-only or leave-only effects to Angular compiler `animate.enter` /
  `animate.leave` classes plus CSS keyframes.
- Keep complex animation package usage when there is no safe mechanical equivalent in this loop.
- Do not remove `@angular/animations` until every import is migrated.

## Assumptions

- The current Angular compiler supports `animate.enter` / `animate.leave` attributes.
- Complex uses of `query`, `animateChild`, animation params, or reusable animation helper files are
  safer to defer than to rewrite visually blind.
- Targeted unit/build validation is acceptable for simple class-based migrations; complex visual
  migrations should use screenshot validation in a later loop.

## Layers

### MVP

- [x] Inventory `@angular/animations` imports/triggers and classify each usage.
- [x] Pick simple enter/leave-only component animations that map cleanly to CSS.

### Structural

- [x] Move selected simple animations from component metadata to template `animate.enter` /
      `animate.leave` attributes.
- [x] Add scoped CSS keyframes/classes preserving duration/easing/opacity/transform intent.
- [x] Leave complex animation-package usages documented for future visual migration.

### Polish

- [x] Run targeted tests for touched components.
- [x] Run `pnpm lint`, `pnpm build`, and docs checks.

## File-level checklist

- [x] `src/app/**/*.ts`
- [x] `src/app/**/*.html`
- [x] `src/app/**/*.scss`
- [x] `internaldocs/workflow/CURRENT_FEATURE.md`

## Acceptance criteria

- [x] At least one simple enter/leave animation no longer imports from `@angular/animations`.
- [x] Remaining complex `@angular/animations` usages are documented in the Decision log.
- [x] No attempt is made to remove the package while imports remain.
- [x] Lint and build pass.

## Validation strategy

- `rg "@angular/animations|trigger\\(|transition\\(" src/app`
- targeted tests for touched components
- `pnpm lint`
- `pnpm build`
- `node scripts/checks/check-docs.cjs`

## Scope

- Inventory animation triggers and imports.
- Start with simple enter/leave transitions that map cleanly to the new primitives.
- Keep complex animations on the existing package until a safe equivalent is clear.
- Remove `@angular/animations` only when all usage is migrated.

## Success criteria

- Simple enter/leave animations use the current Angular 22 approach.
- No visual regressions in the main navigation, editor, browser, and dialog surfaces.

## Decision log

- 2026-06-15 — Added as a low-priority follow-up; migration should be visual-regression aware.
- 2026-06-18 — Inventory found `rack-image.component` as a simple enter-only opacity fade with no params/query/child/stagger behavior, so it was migrated to `animate.enter="rack-image-enter"` with scoped CSS keyframes. Deferred remaining package usage groups: route transition helpers (`shared-interproject/routing-layouts/*/fade.animation.ts`), reusable constants (`SharedConstants.ts`), list/card animations with params and `animateChild`/`query`, generated-form stagger/query, rack visual model overflow/keyframe/leave behavior, module browser/detail pane and mode transitions, badge pop/keyframe effects, and shared drag/drop/hero/lottie/loading effects that need visual validation or broader template changes before safe migration.
