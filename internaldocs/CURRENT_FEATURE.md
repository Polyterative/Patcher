# Current Feature / AI RAM

> **Rules for AI agents:**
> 1. Read this file at the start of every session.
> 2. Keep it updated - check off steps, add discoveries.
> 3. One feature at a time - archive to [COMPLETED.md](./COMPLETED.md) when done, then reset.
> 4. This file owns implementation detail; `TODO.md` owns the backlog.
> 5. **Every feature uses three layers** (MVP -> Structural -> Polish). Define all three before coding. Complete each
>    layer before starting the next. Layout before interactions.

---

## Active

### Title

**Goal:** Make the module details editor stop failing silently when users try to fill in missing power data on incomplete modules, and add regression coverage for the real save path.

---

#### Key files

- `src/app/features/module-browser/module-browser-detail/module-browser-detail.component.html`
- `src/app/components/module-parts/module-detail-data.service.ts`
- `src/app/components/module-parts/module-editor/module-editor.component.ts`
- `src/app/features/backend/supabase-update.ts`
- `src/app/features/backend/__tests__/supabase-service/update-module.spec.ts`
- `e2e/module-editor-ux-review.spec.ts`

---

#### Layer 1 – MVP (data wiring)

- Confirm whether module edit access is incorrectly exposed to any logged-in user on incomplete modules
- Verify whether backend updates are filtered by `submitter` / admin and whether zero-row updates currently look like success
- Make unauthorized or zero-row module updates fail explicitly instead of presenting a silent no-op

#### Layer 2 – Structural (template)

- Align module detail edit affordance with actual edit permissions
- Keep editor visibility and save/close flows consistent with existing `app-edit-fab` behavior

#### Layer 3 – Polish

- Add targeted regression tests around module update authorization and the module-detail editor path
- Add/extend E2E coverage for module power editing so the failing workflow is exercised through the UI

---

#### Decisions / notes

- Current leading hypothesis: UI exposes the editor too broadly (`bag.user && !bag.data.isComplete`), while `update.module()` only updates rows matching `submitter = currentUser.id` unless the user is an admin
- Need to confirm whether Supabase/RLS returns a hard error or a zero-row response for unauthorized updates in this path
- User-reported example: `/modules/details/1717` (Disting Mk4)
- Simplified implementation direction per user request: make logged-in edits work again now; defer stricter permission redesign
- Implemented direction: remove the app-layer `submitter` restriction from `update.module()` so incomplete-module edits can persist for logged-in users

---

#### Status

In progress.
