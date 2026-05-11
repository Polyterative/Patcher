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

### User Area — Ownership-First Full-Height Workspace

**Goal:** turn the current user area into a clearer ownership-focused workspace where modules, racks, and patches are the primary large-screen surfaces and the utility rail becomes genuinely secondary.

#### Layer 1 — MVP
- [x] Trace the current user-area shell structure and identify what makes it read like a wrapped dashboard instead of a workspace
- [ ] Define a route-level container contract where the main workspace fills the available viewport beneath the page header
- [ ] Make **Modules / Racks / Patches** the primary large-screen surfaces instead of a wrap-anywhere stack

**Layer 1 discoveries:** the current `user-area-root` uses `profile-layout` as a two-column grid with a flexible `main-content` area that still wraps `app-user-modules`, `app-user-racks`, and `app-user-patches` like independent cards rather than true workspace columns. The right side is a 18–24rem sidebar, while the search surface still floats at the viewport edge as a separate fixed element.

#### Layer 2 — Structural
- [ ] Give the primary ownership surfaces a shared height/overflow contract instead of letting them grow independently in normal page flow
- [ ] Define the utility rail as a bounded secondary column with explicit rules for stats, manuals, and comments

#### Layer 3 — Polish
- [ ] Reconcile the floating search with the workspace so it supports the owned-content columns instead of competing with them
- [ ] Tune the large-screen spacing/scroll behavior so the page reads like one tool surface rather than several unrelated blocks

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
