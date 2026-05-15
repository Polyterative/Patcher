# Acceptance Checklist

## Module Possession States — Layer 1 MVP

- [x] `MinimalModule` model has optional `possessionKind?: UserModulePossessionKind`
- [x] `getCurrentUserModules` query includes `kind` column mapped to `possessionKind`
- [x] `backend.update.userModulePossession(moduleId, kind)` upserts `user_modules.kind`
- [x] `SupabaseService.update` exposes `userModulePossession`
- [x] `module-detail-data.service` exposes `currentModulePossession$` and `setModulePossession$`
- [x] `module-minimal` shows 4-state button-toggle (Own | Want | Sell | —) when user is logged in
- [x] Selecting current state again is a no-op
- [x] Selecting — removes row from `user_modules`
- [x] Unit tests for `setModulePossession$` pipeline in data service spec
- [x] `pnpm test-headless` green (62/62)
- [x] `pnpm build` green
