# Current Task

**Active task:** Surface linked-rack choose/change/clear flows in patch create/edit/detail surfaces.

**Why it matters:** The linked-rack field now exists in the schema/backend layer. The next bounded user-facing slice is to let owners see and change that association without altering the collection-first editor.

**Likely affected files:**
- `src/app/components/patch-parts/patch-creator/*`
- `src/app/components/patch-parts/patch-details/*`
- `src/app/components/patch-parts/patch-editor/*`
- `src/app/components/patch-parts/patch-detail-data.service.ts`
- focused patch UI/data specs and screenshot/e2e coverage if the UI changes are visible

**Acceptance criteria:**
- Owners can choose, change, and clear a linked rack from the patch create/edit/detail flow.
- Clearing the linked rack only updates `linked_rack_id` and does not affect patch instances or connections.
- The UI uses the documented text-first linked-rack states and leaves collection-first module editing unchanged.
- Focused UI/data tests cover the visible linked-rack actions and state transitions.

**Validation steps:**
- Run targeted patch UI/data specs for the new linked-rack flows.
- Run a screenshot or visible-behavior validation path if the UI changes are visually meaningful.
- Run a build-safe validation command after the UI slice lands.

**Completion status / next action:** Queued for the next iteration step.
