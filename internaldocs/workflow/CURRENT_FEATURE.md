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

### Module Browser — Tag Filter Loading Feedback

**Goal:** keep module-browser filtering calm and legible by preserving the current result set until the next tag-filter result is ready, while showing shared loading feedback instead of a misleading empty state.

#### Layer 1 — MVP
- [ ] Trace the current module-browser tag-filter flow and identify exactly where the empty-state flash happens
- [ ] Add the first visible loading state for tag-triggered filtering while preserving the previous results until the next filtered list is ready
- [ ] Review the resulting browser states so tag changes feel stable and clear instead of briefly reading as "no results"

#### Layer 2 — Structural
- [ ] Move the tag-filter loading behavior into the data flow rather than patching it only in the template
- [ ] Add focused tests for tag-filter loading, repeated filter changes, and completion transitions

#### Layer 3 — Polish
- [ ] Align the loading copy and visual treatment with the app's shared loading language
- [ ] Make sure repeated fast tag changes never leave stale results, stale loaders, or ambiguous empty states behind

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
