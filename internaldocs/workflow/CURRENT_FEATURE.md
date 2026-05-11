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
- [x] Trace the current app-shell composition points (toolbar, banner, content, footer, floating overlays) and pick the first large-screen breakpoint experiment
- [x] Rework the main shell layout so larger screens can render a genuine left-side navigation column while smaller layouts keep the current top-toolbar behavior
- [x] Review the first shell experiment against key routes so the new column reads intentional rather than like the top bar simply rotated sideways

**Layer 1 result:** the app shell now switches wide desktops onto a dedicated left-side navigation rail instead of squeezing the top toolbar into a narrow column, the rail uses a stronger Metro-style grouped-card treatment that visually connects to the content pane, and focused toolbar coverage plus wide-shell screenshot review for modules, module details, and racks held after the layout change.

#### Layer 2 — Structural
- [x] Tighten the shell layout into a reusable breakpoint-driven structure instead of one-off page overrides
- [x] Add focused responsive coverage for the breakpoint transition and large-screen shell composition

**Layer 2 result:** the shell now uses a shared breakpoint service plus shared nav/account link builders, the old desktop toolbar is suppressed by the shared shell state instead of per-page hacks, and focused app-shell / toolbar / hero / home / user-area coverage now exercises the large-screen composition as one reusable system.

#### Layer 3 — Polish
- [ ] Refine titles, spacing, and adjacent navigation context so the large-screen shell feels consistent with the existing product chrome
- [ ] Recheck event banner, footer/help surfaces, and floating overlays against the large-screen shell so the experiment does not fragment the UI

**Layer 3 progress:** the Metro-style title strip now lives directly inside the shared hero title surface, home hero, and user-area root; the desktop strip keeps brand plus account actions in the same integrated row; detail/edit routes now get route-aware active context such as section plus “Details” / “Editing”; the right edge of the strip now uses explicit primary/account groups instead of a fragile auto-margin handoff; the footer has been moved onto a native responsive shell layout; and the brand entry now keeps an explicit branded state across default, active, focus, and visited states. The current polish focus is confirming the surrounding banner/help/floating surfaces still read coherently before closing Layer 3.

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
