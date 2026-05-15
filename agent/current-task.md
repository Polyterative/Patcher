# Current Task

## Title
Module Possession States — Layer 1 (MVP): segmented Own/Want/Sell control on module detail

## Source
`internaldocs/product/ROADMAP.md` → Tier 0 → "Module Possession States"

## Goal
Surface the existing `user_modules.kind` enum (`HAS | WANTS | SELLS`) in the module
detail UI. Replace the binary Add/Remove toggle with a 4-state segmented control
(Own | Want | Sell | —) that lets users set or clear their possession state for a module.
No DB schema changes needed — the enum and PK constraint already exist.

## Acceptance criteria (see acceptance-checklist.md)
- [ ] `MinimalModule` model has optional `possessionKind?: UserModulePossessionKind`
- [ ] `getCurrentUserModules` query includes `kind` column mapped to `possessionKind`
- [ ] `backend.update.userModulePossession(moduleId, kind)` upserts `user_modules.kind`
- [ ] `module-detail-data.service` exposes `currentModulePossession$` and `setModulePossession$`
- [ ] `module-minimal` shows 4-state button-toggle (Own | Want | Sell | —) when user is logged in
- [ ] Selecting current state again is a no-op (idempotent)
- [ ] Selecting — removes row from `user_modules`
- [ ] `pnpm test-headless` green (targeted)
- [ ] `pnpm build` green

## Out of scope (Layer 2+)
- Wishlist page / nav placement
- My Modules page filtering by kind (WANTS shown separately)
- WANTS count on module detail
- SELLS inline badge in user-area

## Risk notes
- `currentUserModules` is used broadly; adding `possessionKind` is additive (no type breakage)
- Module picker in rack editor currently shows all user_modules rows; WANTS will now appear there.
  Filed as a Layer 2 follow-up.
