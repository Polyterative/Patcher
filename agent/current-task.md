# Current Task

**Active task:** None — all acceptance-checklist items complete as of 2026-05-14.

**Last completed task:** Fix Patch Editing "No connections" empty-state stale-source bug.

**What shipped:** Switched `patch-details.component.html` outer bag from `patchConnections$` (backend snapshot) to `editorConnections$` (live in-editor state) so the "No connections yet" empty state and graph visibility update immediately when a connection is added during editing. `editorConnections$` is always synced from `patchConnections$` on patch load, so non-editing display is unchanged. Added a focused regression test in `patch-detail-data-service-sync-errors.spec.ts`. References: this session (2026-05-14).

**Feature state:** Bug fix shipped. 25/25 focused tests pass. Build green.

**Next step:** Pick the next task from `internaldocs/workflow/TODO.md`. Candidates:
- Rack-Context Patch Building — Polish Review (low)
- E2E — Dedicated Test Account Cleanup (high infra; requires creating a Supabase test account — must be done by a human)
