# Acceptance Checklist

## Unit Test Coverage — High-Yield Data Services

- [x] `rack-detail-data.service.ts`: add tests for user-ownership guard (isOwner$), delete rack flow, image upload/delete flows
- [ ] `rack-detail-data.service.ts`: add tests for module add/remove/move flows (deferred — out of scope for this pass)
- [ ] `module-detail-data.service.ts`: add tests for primary init flow (module load, CV data, related patches/racks)
- [ ] `module-detail-data.service.ts`: add tests for ownership / favourite / comment flows
- [x] `user-area-data.service.ts`: add tests for count updates (patchesCount$, racksCount$, commentsCount$) and allPatchTags$ with undefined data
- [x] All new specs: 0 lint errors, correct TypeScript types, no `any` except where pre-existing pattern allows
- [x] `pnpm test-headless` scoped to new/extended specs: all passing (62/62)
- [x] `pnpm build`: clean (pre-existing CSS budget warning only)
