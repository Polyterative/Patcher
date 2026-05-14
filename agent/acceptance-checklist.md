# Acceptance Checklist

## Admin Flags — Delete Confirmation + Sort Order Toggle

- [x] Delete button shows a `window.confirm()` dialog before emitting to `deleteFlag$`
- [x] Confirmation message is clear: "Delete this flag? This action cannot be undone."
- [x] `sortOrder$: BehaviorSubject<'desc' | 'asc'>` added to service; defaults to `'desc'`
- [x] `filteredFlags$` applies sort after filtering; sort is stable (uses spread copy)
- [x] Sort toggle UI added to toolbar: "Newest first" / "Oldest first"
- [x] 18/18 tests pass (3 new sort tests added)
- [x] Build green
