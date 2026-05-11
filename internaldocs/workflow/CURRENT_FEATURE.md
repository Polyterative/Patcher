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

### User Area — Compact and Bound the Utility Rail

**Goal:** keep the user-area right side genuinely secondary by turning it into a shorter, bounded utility rail that supports the owned-content workspace instead of reading like a second dashboard.

#### Layer 1 — MVP
- [x] Keep the right rail bounded on large screens instead of letting it grow as a parallel page
- [x] Split the rail into clearer primary vs secondary support groups so stats, manuals, and comments do not blend into one long stack

**Layer 1 discoveries:** the earlier workspace pass already moved search into the rail and gave the sidebar a sticky bounded shell, but the internal hierarchy still felt too flat. Grouping search + stats separately from manuals + comments immediately made the main columns read as primary again.

#### Layer 2 — Structural
- [x] Reduce manuals to a smaller quick-access surface rather than an open-ended block
- [x] Bound the comments surface so its body does not visually outweigh modules, racks, and patches

#### Layer 3 — Polish
- [x] Remove leftover layout dependencies from utility-rail components where native layout already replaced them
- [x] Make the rail collapse earlier on narrower desktop / tablet widths so it stops competing before the layout feels cramped
- [ ] Tighten the remaining visual rhythm of the rail cards so the whole side reads as one supporting lane rather than several equal-weight panels

**Current progress:** the rail is now explicitly grouped, manuals are a compact quick-access list, comments use a bounded list body with pagination still visible, `user-manuals` no longer carries an unused `FlexModule` import, and the rail stacks earlier at `82rem` so mid-width desktops/tablets keep the owned-content workspace comfortable. What remains is small-scale card rhythm polish rather than another structural rewrite.

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
