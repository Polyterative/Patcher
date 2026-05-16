# Current Task

## Title
Bug — 1U module placeholder wrong aspect ratio

## Source
`internaldocs/workflow/TODO.md` → PRODUCT Tier 0 → "HIGH: Bug — 1U module placeholder wrong aspect ratio"

## Goal
When a 1U module (Intellijel or Pulp Logic format) has no panel image, the grey placeholder
rectangle shows with the wrong (portrait/tall) proportions instead of the correct wide, flat 1U
shape. The root cause is `[fxFlex]` being used to set width on the placeholder `<div>` — it sets
`flex-basis` along the parent flex main axis, which may be vertical. Replace with explicit
`[ngStyle]` width + height binding so dimensions are immune to flex-direction.

## Acceptance criteria (see acceptance-checklist.md)
- [ ] `module-part-image.component.html` placeholder `<div>` has `[fxFlex]` removed
- [ ] Replaced with `[ngStyle]` explicit width AND height when `fixedHeight=false`
- [ ] `fixedHeight=true` path unaffected (CSS class still controls dimensions)
- [ ] `pnpm build` green
- [ ] `pnpm test-headless` targeted green

## Affected files
- `src/app/components/module-parts/module-minimal/module-part-image/module-part-image.component.html`

## Out of scope
- Surface-mode (`containImage=false`) path — no placeholder rendered there
- Any changes to `lib-screen-wrapper` or flex layout direction
- Visual regression screenshots (manual visual check is sufficient for a style fix)

## Risk notes
- Low risk — one-line attribute swap, no TS logic change.
- `fixedHeight=true` path uses CSS class `.preview--fixed-height` which already sets
  `width: 100%; height: 8rem !important;` — no ngStyle needed there; the `{}` empty object keeps it.
