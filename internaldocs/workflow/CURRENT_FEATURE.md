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
- [x] Define a route-level container contract where the main workspace fills the available viewport beneath the page header
- [x] Make **Modules / Racks / Patches** the primary large-screen surfaces instead of a wrap-anywhere stack

**Layer 1 discoveries:** the old `user-area-root` used `profile-layout` as a two-column grid with a flexible `main-content` area that still wrapped `app-user-modules`, `app-user-racks`, and `app-user-patches` like independent cards rather than true workspace columns. The first workspace pass now gives the owned-content area an explicit grid, normalizes the three owned sections inside that grid, bounds the utility rail, and moves search out of the floating viewport corner into the rail itself.

#### Layer 2 — Structural
- [ ] Give the primary ownership surfaces a shared height/overflow contract instead of letting them grow independently in normal page flow
- [x] Define the utility rail as a bounded secondary column with explicit rules for stats, manuals, and comments

#### Layer 3 — Polish
- [x] Reconcile the floating search with the workspace so it supports the owned-content columns instead of competing with them
- [ ] Tune the large-screen spacing/scroll behavior so the page reads like one tool surface rather than several unrelated blocks

**Current progress:** the user area now reads as a real workspace skeleton instead of a loose wrapped dashboard: owned content sits in explicit primary columns, the section internals use consistent native action/empty-state layout, the right rail is bounded and sticky, and global search has been pulled into that rail instead of floating over the page.

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
