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

### Manufacturer Detail — Hide Empty Tile Divider When Actions Are Fully Disabled

**Goal:** remove the dead-looking divider from manufacturer-detail module tiles whenever the action area is completely absent, so disabled tiles no longer look like broken placeholders.

#### Layer 1 — MVP
- [ ] Find the manufacturer-detail tile template and confirm which guard currently leaves the lower divider visible
- [ ] Trace how the action-area disabled state is computed so the divider can follow the same source of truth

**Layer 1 discoveries:** pending.

#### Layer 2 — Structural
- [ ] Hide the divider whenever all tile actions are absent/disabled without changing tiles that still have a live footer action
- [ ] Keep the fix local to manufacturer-detail/module-tile rendering so other module list surfaces stay unchanged

#### Layer 3 — Polish
- [ ] Add focused coverage for the fully-disabled tile state if a nearby component spec already exists
- [ ] Review the final tile rhythm against neighboring manufacturer-detail cards so the footer removal does not leave awkward spacing

**Current progress:** not started yet in code. Next step is to inspect the manufacturer-detail tile action/footer template and reuse the existing “buttons visible” decision rather than inventing a second visibility rule.

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
