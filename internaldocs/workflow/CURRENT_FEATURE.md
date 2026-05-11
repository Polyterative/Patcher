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

### App Shell — Large-Screen Side Toolbar Experiment

**Goal:** test a large-screen shell variant that turns the current top-toolbar chrome into a left-side navigation column without regressing compact layouts, floating surfaces, or overall product consistency.

#### Layer 1 — MVP
- [ ] Trace the current app-shell composition points (toolbar, banner, content, footer, floating overlays) and pick the first large-screen breakpoint experiment
- [ ] Rework the main shell layout so larger screens can render a genuine left-side navigation column while smaller layouts keep the current top-toolbar behavior
- [ ] Review the first shell experiment against key routes so the new column reads intentional rather than like the top bar simply rotated sideways

#### Layer 2 — Structural
- [ ] Tighten the shell layout into a reusable breakpoint-driven structure instead of one-off page overrides
- [ ] Add focused responsive coverage for the breakpoint transition and large-screen shell composition

#### Layer 3 — Polish
- [ ] Refine titles, spacing, and adjacent navigation context so the large-screen shell feels consistent with the existing product chrome
- [ ] Recheck event banner, footer/help surfaces, and floating overlays against the large-screen shell so the experiment does not fragment the UI

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
