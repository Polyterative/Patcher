# Acceptance Checklist

## Bug — 1U module placeholder wrong aspect ratio

- [x] `module-part-image.component.html` placeholder `<div>` has `[fxFlex]` removed
- [x] Replaced with `[ngStyle]` explicit width AND height when `fixedHeight=false`
- [x] `fixedHeight=true` path unaffected (CSS class `.preview--fixed-height` controls dimensions)
- [x] `pnpm build` green (19/19 spec + build clean)
- [x] Targeted `pnpm test-headless` green
- [ ] Visual verification in live app for Intellijel 1U + Pulp Logic 1U (manual/human)
