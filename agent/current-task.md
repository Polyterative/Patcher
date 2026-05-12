# Current Task

**Active task:** Add linked-rack selection to patch creation.

**Why it matters:** Existing-patch owner flows now support linked-rack status and editing. The next bounded step is to let new patches start with the same optional rack context instead of forcing users to edit immediately after creation.

**Likely affected files:**
- `src/app/components/patch-parts/patch-creator/*`
- any helper or data-service code needed to source the current user's rack options
- focused patch-creator specs

**Acceptance criteria:**
- New-patch creation supports an optional linked-rack selection while preserving the current no-rack default.
- Saving a new patch forwards `linked_rack_id` only when the user selected a rack.
- The create flow explains that linked rack is optional context, not the source of truth for patch modules.
- Focused patch-creator tests cover save behavior for linked and unlinked creation.

**Validation steps:**
- Run targeted patch-creator specs.
- Run a build-safe validation command after the create-flow slice lands.

**Completion status / next action:** Queued for the next iteration step.
