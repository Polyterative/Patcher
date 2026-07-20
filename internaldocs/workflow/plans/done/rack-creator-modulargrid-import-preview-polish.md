# Rack Creator — ModularGrid import preview polish

## Problem

The create-new-rack ModularGrid import panel shows identified module thumbnails in broken-looking stretched cards. The ambiguity chooser interaction is useful, but candidate choices only show names, so users cannot verify manufacturer or target-module panel image before selecting.

## Goals

- Preserve the inline import flow and ambiguity chooser the user likes.
- Make identified module thumbnails respect module panel aspect ratios instead of stretching/cropping.
- Show manufacturer names and target-module images wherever ambiguity candidates are presented.
- Keep the change local to rack creator UI; no backend/schema/RLS/migration changes.

## Assumptions

- Existing `MinimalModule` catalogue data includes `manufacturer` and `panels` for candidate display.
- The fix can use existing `app-module-part-image` behavior rather than adding image-loading infrastructure.
- This is an approved visible bugfix; no new placement/hierarchy decision is needed beyond improving current surfaces.

## Layers

### MVP

- [x] Change identified preview image rendering so panel images fit within a stable frame without distortion.
- [x] Add target-module image and manufacturer text to each ambiguity candidate.

### Structural

- [x] Reuse one compact candidate-card pattern for ambiguity options and keep skip/default behavior unchanged.
- [x] Add helper methods only if needed for safe manufacturer fallback copy.

### Polish

- [x] Tighten responsive layout so candidate cards remain dense but legible on narrow dialogs.
- [x] Validate with targeted specs and lint/docs checks. Runtime screenshot deferred because the current dev server was noted as stale/HMR-inconsistent in `CURRENT_FEATURE.md`.

## File-level checklist

- `src/app/components/rack-parts/rack-creator/rack-creator.component.html`
- `src/app/components/rack-parts/rack-creator/rack-creator.component.scss`
- `src/app/components/rack-parts/rack-creator/rack-creator.component.ts`
- `src/app/components/rack-parts/rack-creator/rack-creator.component.spec.ts`

## Acceptance criteria

1. Identified module thumbnails are contained and keep panel aspect ratio.
2. Ambiguity chooser still defaults to Skip, supports explicit candidate selection, and remains visually close to the existing chooser.
3. Ambiguous candidate options show target-module image, target name, manufacturer, and HP.
4. No backend schema/RLS/migration changes.
5. Visual runtime screenshot inspected if feasible.

## Validation strategy

- `pnpm test-headless --include="**/rack-creator.component.spec.ts"`
- `pnpm lint`
- `node scripts/checks/check-docs.cjs`
- Runtime import dialog screenshot if a dev server can be started or reused safely.

## Decision log

- 2026-07-08T13:06+02:00 — User-provided screenshot and request make the visible direction explicit: fix stretched import thumbnails and enrich existing ambiguity candidates with manufacturer and target images without redesigning placement or changing backend contracts.
- 2026-07-08T13:09+02:00 — Implemented contained fixed-frame module images for identified and ambiguous candidates, kept skip-as-default selection semantics, and added a local manufacturer fallback helper with targeted unit coverage. Runtime screenshot remains deferred until the dev server is restarted cleanly.

- 2026-07-08T13:15+02:00 — Implemented and reviewed. Runtime Playwright capture of the import dialog confirmed identified module images render contained (`object-fit: contain`) and ambiguous candidate cards include target images plus manufacturer/HP metadata; only unrelated pre-existing user-area HEAD aborts/background warnings appeared.
