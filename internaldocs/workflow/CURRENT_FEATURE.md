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
- [x] Add a nullable linked-rack association in patch create/edit flows without changing the existing no-rack default (`patches.linked_rack_id`, nullable, `ON DELETE SET NULL`)
- [x] Surface the selected linked rack in patch detail/editor with choose/change/clear actions
- [x] Keep module sourcing and connection editing unchanged: collection modules + patch instances remain the working surface
- [ ] Add a privacy-safe viewer state for linked-rack context when the rack cannot be shown
- [x] Preserve current behavior for existing patches with no linked rack

**Implementation status:** The nullable schema migration/backend round-trip is in place, and existing-patch owner flows now
show linked-rack status plus choose/change/clear controls. Public patch browsing stays rollout-safe by keeping the shared
listing query on its pre-linked-rack column set until list surfaces explicitly need the new field. Patch creation now
surfaces an optional linked-rack selector and preserves unlinked creation by omitting `linked_rack_id` unless the user
explicitly selected a rack. While the live Supabase environment is still missing `patches.linked_rack_id`, linked-rack-
selected create/edit attempts now degrade to explicit unavailable messaging and disabled linked-rack controls instead of
surfacing raw `PGRST204` responses. The remaining Layer 1 work is the privacy-safe viewer state. Live selected linked-rack
persistence still depends on applying the existing migration in the target Supabase environment.

**Owner-flow implementation notes:**
- Existing patch detail now shows an owner-only linked-rack summary card with text-first status.
- Existing patch edit mode now exposes a linked-rack select field plus a clear action in the patch metadata sidebar.
- The control sources options from the current user's racks via `backend.get.currentUserRacks()`.
- Successful linked-rack changes update local patch metadata/state without forcing a detail reload that would reset editor
  connection state.
- The shared public patch-browser query deliberately does not select `linked_rack_id` by default yet, so public listing
  surfaces remain compatible while linked-rack support is still being rolled out across environments.
- The patch creator dialog now exposes the same optional linked-rack context, but normal patch creation stays schema-safe by
  omitting `linked_rack_id` unless a rack was explicitly selected.
- When the live environment still lacks `patches.linked_rack_id`, linked-rack-selected create/edit flows now show explicit
  unavailable guidance and fall back to unlinked work instead of surfacing the raw backend error.
- The patch editor now exposes a collection-vs-linked-rack operation mode selector; linked-rack mode renders a read-only rack
  context section below the editor without changing collection module sourcing or patch-instance behavior.

#### Layer 2 — Structural
- [x] Define persistence and degraded states for renamed/edited/deleted/unavailable linked racks without stranding the patch
- [ ] Add rack-context entry points from rack detail/editor that preselect the association when starting a patch
- [x] Define compatibility/status language for:
  - `In linked rack`
  - `In collection only`
  - `Linked rack unavailable`
- [x] Define the linked-rack state model for patch detail/editor:
  - `Unlinked`
  - `Linked and available`
  - `Linked but diverged`
  - `Linked but unavailable`
- [x] Explicitly protect instance behavior so linked-rack context does not change editor-card creation, labels, or connection identity
- [x] Define migration/back-compat expectations for existing patches, patch queries, and nullable linked-rack data
- [x] Rack visual UI: realistic module rendering, inline CV panel, connection role overlays (in/out), staggered animations
- [x] Per-copy instance synchronization: positional matching algorithm, lazy instance creation, per-copy dimming/selection

#### Layer 3 — Polish
- [ ] Add helper copy and onboarding cues so users understand the difference between optional rack context and direct-list patch editing
- [ ] Add visual treatment for stale or diverged rack context that stays informative without feeling like an error
- [ ] Review educational/planning flows to ensure rack-linked mode does not weaken non-1:1 use cases
- [x] Add focused acceptance criteria for create-from-rack, create-without-rack, change/clear rack, stale rack, and viewer-no-access states

#### Defined state contract

- **Unlinked** — default for new patches and all existing patches where `linked_rack_id = null`. The patch remains a
  collection-first patch with no rack badge, no hidden placeholder, and a visible choose action in owner/editor flows.
- **Linked and available** — a patch has `linked_rack_id` and the current viewer can resolve that rack. Owner/editor
  flows show the linked rack name plus `Change` and `Clear` actions. Compatibility language can use `In linked rack`
  when the linked rack still contains the modules needed for the current patch.
- **Linked but diverged** — the linked rack is still readable, but its current module set no longer fully covers the
  patch's needs. The patch remains fully editable, the collection-first editor stays unchanged, and the UI falls back to
  `In collection only` with advisory copy rather than blocking or mutating patch data.
- **Linked but unavailable** — the patch still stores `linked_rack_id`, but the rack was deleted, made private, or is
  otherwise unreadable. Owner/editor flows show a generic unavailable state with `Change` / `Clear` actions. Public or
  unauthorized viewers must not see the rack name, layout, or module-list details.

#### Compatibility and persistence rules

- `In linked rack` means the linked rack is readable and still covers the patch's currently used modules.
- `In collection only` means the patch remains valid through the collection-first editor, either because no rack is
  linked or because the readable linked rack has diverged.
- `Linked rack unavailable` is a dedicated degraded state, not an error that blocks viewing or editing.
- Changing or clearing the linked rack only updates `linked_rack_id`; it must not add/remove/relabel patch instances or
  rewrite patch connections.
- The schema contract is a nullable `patches.linked_rack_id` foreign key with `ON DELETE SET NULL`.
- Existing patches remain first-class with `linked_rack_id = null`; no migration-only UX is required.
- Patch detail/editor reads should round-trip the nullable field even before every list surface uses it.

#### Focused acceptance criteria

- **Create from rack:** a rack-origin entry point may preselect `linked_rack_id`, but the editor still starts from the
  user's collection module list and patch instances.
- **Create without rack:** a new patch with no linked rack behaves exactly like the current patch flow.
- **Change / clear rack:** changing or clearing the linked rack preserves patch metadata, module instances, and
  connections.
- **Stale rack:** if the linked rack changes or diverges, the patch remains editable and uses informational copy instead
  of blocking warnings.
- **Viewer no access:** if a viewer cannot access the linked rack, the patch can still render but must not reveal rack
  identity or structure.

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
