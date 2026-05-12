# Current Task

**Active task:** Add a patch-editor operation mode selector with linked-rack context preview.

**Why it matters:** Linked-rack write failures now degrade safely while the live schema rollout is pending, so the next bounded step is the missing editor UX the user asked for: a clear mode selector and linked-rack context below the patch editor without changing collection-first editing.

**Likely affected files:**
- `src/app/components/patch-parts/patch-editor/*`
- `src/app/components/patch-parts/patch-detail-data.service.ts`
- focused patch-editor specs and any linked-rack context tests
- relevant internal linked-rack feature docs

**Acceptance criteria:**
- The patch editor exposes a clear collection-vs-linked-rack mode selector patterned after the rack editor control style.
- Linked-rack mode shows read-only linked-rack context below the editor without replacing collection-first editing.
- Existing collection module sourcing, patch instances, and connection editing remain unchanged.
- Focused specs cover the new mode/state behavior.

**Validation steps:**
- Run targeted patch-editor specs plus any linked-rack context specs touched by the slice.
- Run a build-safe validation command after the editor-mode slice lands.

**Completion status / next action:** Ready to start. Note: live selected linked-rack persistence still depends on applying the existing `patches.linked_rack_id` migration outside the repo, but create/edit flows now degrade safely while that blocker remains.
