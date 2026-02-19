# Current Feature / AI RAM

> **Rules for AI agents using this file:**
> 1. **Read this file at the start of every session** — it describes the feature currently being developed.
> 2. **Keep it updated as you work** — check off steps, add discoveries.
> 3. **One feature at a time** — when a feature is complete, archive the content as a one-line summary in TODO.md
     > Completed, then reset this file to the Empty Template at the bottom.
> 4. **This file owns the detail; TODO.md owns the backlog.** — implementation steps, gotchas, file names live here.
     TODO.md only holds a one-line entry per feature while it is in progress.

---

## Feature: Multiple Module Instances in Patches

**Status:** 🟡 In progress  
**Started:** Feb 19, 2026  
**Key files (to read first):**

- `src/app/components/patch-parts/patch-graph.component.ts` — node/edge ID construction ⚠️ blocker
- `src/backend/database.types.ts` — `patch_connections` schema
- `src/app/models/connection.ts` — PatchConnection model
- `src/app/features/patch-browser/patch-detail-data.service.ts` — connection loading pipeline

---

### Goal

Allow users to place the same physical module more than once in a single patch, with each instance independently
wirable in the patch graph.

---

### Design Decision

Use a separate `patch_module_instances` table (id, patch_id, module_id, instance_label) rather than adding
`instance_id` to `patch_connections`. This keeps the connections table clean and allows per-instance metadata.

---

### ⚠️ Graph Rendering Blocker

`patch-graph.component.ts` builds node IDs as `module.id.toString()` (module nodes) and
`module.id.toString() + cv.id` (CV nodes). Two instances of the same module collapse to identical node IDs.
**Fix:** suffix all node IDs with `_<instance_id>` before this feature can render correctly.

---

### Steps

- [ ] Read `patch-graph.component.ts` fully — understand node/edge ID construction
- [ ] Read `patch_connections` schema in `database.types.ts` and `connection.ts`
- [ ] Read `patch-detail-data.service.ts` — understand how connections are loaded and passed to graph
- [ ] Design `patch_module_instances` table type in `database.types.ts` (id, patch_id, module_id, instance_label)
- [ ] Add `patch_module_instances` to `DbPaths` in `DatabaseStrings.ts`
- [ ] Add `get/add/delete` for instances in `supabase.service.ts` with `cacheBust(['patchConnections'])` on writes
- [ ] Update `PatchConnection` model to carry `instance_id` alongside `module_id` on `CVwithModule`
- [ ] Update patch graph node/edge ID construction to include `instance_id` suffix — prevents ID collisions
- [ ] Update patch graph to render module nodes labeled "Module (1)", "Module (2)" per instance
- [ ] Update patch editor to allow adding extra instances and wiring them independently
- [ ] Write unit tests for instance CRUD and graph node-ID uniqueness with duplicate modules

---

### Gotchas / Discoveries

*(fill in as work progresses)*

---

<!-- Empty Template (copy this block when resetting after a completed feature)

## Feature: [Name]

**Status:** 🟡 In progress
**Started:** [Date]

### Goal

[One paragraph.]

### Steps

- [ ] Step 1

-->