# Current Task

**Title:** Admin Flags — Delete Confirmation + Sort Order Toggle

**Source:** User feedback ("The admin page could use some work") + autonomous safety audit

**Goal:**
The admin module-flag page has two UX gaps: (1) the Delete action fires immediately with no confirmation, which is a safety issue for an admin tool; (2) there is no way to change the sort order of flags, making it hard to triage oldest-first (FIFO). This task adds a delete confirmation step (consistent with the pattern used elsewhere in the app) and a "Newest first / Oldest first" toggle to the filter toolbar.

**Acceptance criteria:** see agent/acceptance-checklist.md

**Affected files:**
- `admin-flags.component.ts` — add `confirmDelete()` method
- `admin-flags.component.html` — wire `confirmDelete`, add sort toggle
- `admin-flags-data.service.ts` — add `sortOrder$` BehaviorSubject, include in `filteredFlags$`
- `admin-flags-data.service.spec.ts` — tests for sort behavior

**Out of scope:**
- Inline module editor / preview panel
- Bulk operations
- Backend schema changes
- Any other admin panel surface

**Risk:** Low — fully contained in admin panel, no user-facing surface affected.
