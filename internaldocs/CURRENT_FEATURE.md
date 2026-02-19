# Current Feature / AI RAM

> **Rules for AI agents using this file:**
> 1. **Read this file at the start of every session** — it describes the feature currently being developed.
> 2. **Keep it updated as you work** — check off steps, add discoveries.
> 3. **One feature at a time** — when a feature is complete, archive to [COMPLETED.md](./COMPLETED.md),
     > then reset this file to the Empty Template at the bottom of this file.
> 4. **This file owns the detail; TODO.md owns the backlog.** — implementation steps, gotchas, file names live here.
     > TODO.md only holds a one-line entry per feature while it is in progress.

---

## Feature: Instance-Aware Statistics in Read-Only Patch View

**Status:** ✅ Complete — `PatchConnectionStatsPipe` `totalInstances` verified correct; 17/17 tests pass
**Started:** 2026-02-20
**Key files (to read first):**

- `src/app/components/patch-parts/patch-connection-stats.pipe.ts` — computes totalCables / uniqueModules /
  multiplesCount; `totalInstances` was added but is **not working correctly**
- `src/app/features/patch-browser/patch-composite/patch-composite.component.html` — statistics card display in the
  read-only patch view
- `src/app/models/connection.ts` — `PatchConnection` model carries `instance_id_a` / `instance_id_b`

---

### Goal

Make the **statistics card** in the read-only patch view correctly compute and display an instance-aware count:

- **"Module copies"**: count unique `(module_id, instance_id)` pairs across all connections.
- Show this stat only when `totalInstances > uniqueModules` (i.e., when multi-instance modules actually exist).
- Optionally rename "Modules" → "Unique modules" for clarity.

---

### Problem

`PatchConnectionStatsPipe` reports `uniqueModules` by counting distinct `module.id` values only. A patch with 2 VCA
copies still shows "1 unique module". The `totalInstances` field that was supposedly added is **not working** — the stat
is either absent, zero, or incorrect in the UI.

---

### Gotchas / Discoveries

- `PatchConnection.instance_id_a/b` are `undefined` (not `null`) in the in-memory model (normalized on load). All
  comparisons must use `!= null` checks.
- The graph component (`patch-graph.component.ts`) already derives instance info from `patchConnections$` via
  `extractModuleInstances` — reuse the same unique `moduleId_instanceId` key pattern.
- Legacy patches with no instances have `instance_id_a/b === undefined` on all connections — the stat must be hidden
  when `totalInstances === uniqueModules`.

---

### Steps

- [x] Step 1 — Read `patch-connection-stats.pipe.ts` and identify exactly what is broken (missing field, wrong logic,
  not rendered in template, etc.).
- [x] Step 2 — Fix the pipe so `totalInstances` counts unique `(module_id, instance_id)` pairs correctly from both
  sides (a and b) of every connection.
- [x] Step 3 — Verify the statistics card template in `patch-composite.component.html` renders the `totalInstances`
  stat and hides it when equal to `uniqueModules`.
- [x] Step 4 — Run existing stats pipe tests; fix any failures; add missing cases if coverage is insufficient. 17/17
  pass.
- [x] Step 5 — Root cause found and fixed: `StatisticsModule` was missing from `PatchBrowserModule` imports —
  `app-statistics` was invisible to `PatchCompositeComponent`'s template. Added `StatisticsModule` to
  `patch-browser.module.ts`.