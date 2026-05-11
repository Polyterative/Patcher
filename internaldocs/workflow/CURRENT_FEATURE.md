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

### User Area — Search and Surface Hierarchy Cleanup

**Goal:** make the user-area search feel intentionally embedded in the workspace shell rather than floating as a competing surface.

#### Layer 1 — MVP
- [ ] Inspect the current user-area search host structure and confirm where it still reads as isolated or competes with the owned-content columns
- [ ] Reuse the existing user-area workspace/utility-rail structure instead of inventing a separate floating treatment

**Layer 1 discoveries:** pending.

#### Layer 2 — Structural
- [ ] Keep search inside a clearly bounded shell that aligns with the utility rail and never overlaps the owned-content columns
- [ ] Align the search surface spacing, overflow, and responsive behavior with the rest of the user-area workspace

#### Layer 3 — Polish
- [ ] Match the final search treatment to the shared floating-surface language without reintroducing a detached overlay feel
- [ ] Add focused coverage if an appropriate user-area layout spec can guard the chosen shell structure

**Current progress:** not started yet in code. Next step is to inspect `user-area-root`, the search component host markup, and the existing workspace layout spec to see whether the remaining problem is structural, visual, or just stale documentation.

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
