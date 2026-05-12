# Current Task

**Active task:** Add privacy-safe linked-rack viewer handling.

**Why it matters:** Linked-rack edit/create flows now degrade safely and the patch editor has a read-only linked-rack mode, so the next bounded step is making viewer-facing linked-rack state safe when the rack is unavailable or not visible to that viewer.

**Likely affected files:**
- `src/app/components/patch-parts/patch-detail-data.service.ts`
- `src/app/components/patch-parts/patch-minimal/*`
- focused patch-detail / patch-minimal specs
- any public patch detail query/helper needed to resolve linked-rack viewer state safely

**Acceptance criteria:**
- Public or unauthorized viewers never see the identity or structure of a private/unavailable linked rack.
- Linked-rack context degrades to safe text-first messaging when the rack cannot be shown.
- Existing owner flows remain intact.
- Focused specs cover the new viewer state behavior.

**Validation steps:**
- Run targeted patch detail / patch minimal specs.
- Run a build-safe validation command after the viewer-state slice lands.

**Completion status / next action:** Ready to start. Note: live selected linked-rack persistence still depends on applying the existing `patches.linked_rack_id` migration outside the repo; until then, viewer-state work should assume linked-rack mode data can come only from seeded/non-live environments.
