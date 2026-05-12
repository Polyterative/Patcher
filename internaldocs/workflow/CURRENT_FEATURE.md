# Current Feature / AI RAM

> **Rules for AI agents:**
> 1. Read this file when the task is about the active in-flight feature or explicitly references the current plan.
> 2. Keep it updated - check off steps, add discoveries.
> 3. One feature at a time - archive to [COMPLETED.md](./COMPLETED.md) when done, then reset.
> 4. This file owns implementation detail; `TODO.md` owns the backlog.
> 5. **Every feature uses three layers** (MVP -> Structural -> Polish). Define all three before coding. Complete each
>    layer before starting the next. Layout before interactions.

---

## Active

### Patch Builder — Optional Rack Context

**Goal:** Allow patches to optionally reference a specific rack for orientation while keeping the current
collection-first editor and compatibility with patches that intentionally diverge from any rack.

**Current direction:** The linked rack is additive context only. The collection-first module list remains the editable
wiring surface, and the underlying patch model must still work when no rack is linked.

**Behavior reference:** `internaldocs/tracked-use-cases/PATCH_INSTANCE_SPEC.md` remains the stable contract for
instance identity, labels, and connection persistence.

**Refinement decisions after doc pass:**
- Use **linked rack** as the standard term for the optional association.
- Use **collection-first editor** as the standard term for the underlying patch workflow.
- Treat rack compatibility as advisory state, not a module whitelist or editing gate.
- Keep existing no-rack patches first-class; `null` linked-rack state is normal, not legacy debt.
- Keep viewer-facing linked-rack rendering privacy-safe when the rack is unavailable or not visible to that viewer.
- Prefer text-first state messaging over icon-only/status-color-only communication.

#### Layer 1 — MVP
- [ ] Add a nullable linked-rack association in patch create/edit flows without changing the existing no-rack default (`patches.linked_rack_id`, nullable, `ON DELETE SET NULL`)
- [ ] Surface the selected linked rack in patch detail/editor with choose/change/clear actions
- [ ] Keep module sourcing and connection editing unchanged: collection modules + patch instances remain the working surface
- [ ] Add a privacy-safe viewer state for linked-rack context when the rack cannot be shown
- [ ] Preserve current behavior for existing patches with no linked rack

#### Layer 2 — Structural
- [ ] Define persistence and degraded states for renamed/edited/deleted/unavailable linked racks without stranding the patch
- [ ] Add rack-context entry points from rack detail/editor that preselect the association when starting a patch
- [ ] Define compatibility/status language for:
  - `In linked rack`
  - `In collection only`
  - `Linked rack unavailable`
- [ ] Define the linked-rack state model for patch detail/editor:
  - `Unlinked`
  - `Linked and available`
  - `Linked but diverged`
  - `Linked but unavailable`
- [ ] Explicitly protect instance behavior so linked-rack context does not change editor-card creation, labels, or connection identity
- [ ] Define migration/back-compat expectations for existing patches, patch queries, and nullable linked-rack data

#### Layer 3 — Polish
- [ ] Add helper copy and onboarding cues so users understand the difference between optional rack context and direct-list patch editing
- [ ] Add visual treatment for stale or diverged rack context that stays informative without feeling like an error
- [ ] Review educational/planning flows to ensure rack-linked mode does not weaken non-1:1 use cases
- [ ] Add focused acceptance criteria for create-from-rack, create-without-rack, change/clear rack, stale rack, and viewer-no-access states

#### Acceptance notes
- The patch editor module list remains sourced from collection modules + patch instances, never from linked-rack modules alone.
- Clearing the linked rack never damages patch modules, instances, or connections.
- A changed, deleted, or now-private linked rack degrades to a non-blocking informational state rather than blocking editing.
- Public patch rendering must not leak a private or inaccessible linked rack; unauthorized viewers must not see rack name, layout, or module-list details.
- Linked-rack state messaging must be text-first and understandable without relying on color or icons alone.

---

## Empty template

```markdown
### Feature Name

**Goal:** one sentence.

#### Layer 1 — MVP
- [ ] step

#### Layer 2 — Structural
- [ ] step

#### Layer 3 — Polish
- [ ] step
```
