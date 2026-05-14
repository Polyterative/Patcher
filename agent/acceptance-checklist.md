# Acceptance Checklist

## ManufacturerDetailComponent spec

- [x] `stats$` returns `[]` when `manufacturerData$` is null
- [x] `stats$` computes `In catalogue` from modules length
- [x] `stats$` computes `Average HP` as total HP / count (one decimal)
- [x] `stats$` hides `Average HP` when modules list is empty
- [x] `stats$` separates 3U (standard.id = 0) from 1U (standard.id = 1 or 2)
- [x] `stats$` hides `3U` entry when there are no 3U modules
- [x] `stats$` hides `Active this month` when `changedModulesLast30Days` is 0
- [x] `stats$` shows `Active this month` when `changedModulesLast30Days` > 0
- [x] `stats$` includes `Last updated` when `latestModuleUpdatedAt` is set
- [x] `stats$` hides `Last updated` when `latestModuleUpdatedAt` is null
- [x] `logoUrl()` returns full URL when logo is present
- [x] `logoUrl()` returns null when logo is null
- [x] Route param `id > 0` is forwarded to `updateManufacturer$.next`
- [x] Route param `id = 0` is filtered (never forwarded)
- [x] Spec passes clean (build green, lint green)
