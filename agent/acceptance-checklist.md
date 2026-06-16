# Acceptance Checklist

- [x] Layout mode exposes an All / 3U / 1U scope selector in the existing floating panel.
- [x] Changing scope updates `RackDetailDataService.layoutScope$` and records analytics.
- [x] Remix execution uses the selected scope when computing and applying moves.
- [x] Arrangement summary uses the same selected scope as Remix.
- [x] Focused rack editor and rack detail data service tests pass.
