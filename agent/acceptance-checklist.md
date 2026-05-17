# Acceptance Checklist

## feat(public-profile): Replace mat-paginator with Load More for racks and patches tabs

- [x] `loadMorePatches$` Subject added to `public-profile-data.service.ts`
- [x] `loadMoreRacks$` Subject added to `public-profile-data.service.ts`
- [x] Patch pipeline: `skip===0` → replace list; `skip>0` → append list
- [x] Rack pipeline: same accumulation pattern
- [x] Loading state (undefined) only shown on fresh load, not on load-more
- [x] Skip resets to 0 on profile change
- [x] Component getters added: `hasMorePatches`, `remainingPatchesCount`, `hasMoreRacks`, `remainingRacksCount`
- [x] Template: both `<mat-paginator>` replaced with `@if (hasMore*) { mat-stroked-button }`
- [x] Module: `MatPaginatorModule` → `MatButtonModule`
- [x] SCSS `.loadMore` styles added to component stylesheet
- [x] 2 new spec tests: `loadMorePatches$ appends results and advances skip`, `loadMoreRacks$ appends results and advances skip`
- [x] `pnpm test-headless` — 9/9 tests pass (5 existing + 2 new + 2 others)
- [x] `pnpm build` — green (pre-existing budget warnings only)
