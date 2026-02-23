# Current Feature / AI RAM

> **Rules for AI agents:**
> 1. Read this file at the start of every session.
> 2. Keep it updated — check off steps, add discoveries.
> 3. One feature at a time — archive to [COMPLETED.md](./COMPLETED.md) when done, then reset.
> 4. This file owns implementation detail; `TODO.md` owns the backlog.
> 5. **Every feature uses three layers** (MVP → Structural → Polish). Define all three before coding. Complete each layer before starting the next. Layout before interactions.

---

## Active: Module Details Page Redesign (Editor + Surrounding Context)

Goal: redesign the **whole Module Details page context** around the editor so contribution tasks are clearer, denser,
and more trustworthy without accidental destructive actions.

> **Pause note (2026-02-23):** previous feature **SEO Tagging & Rich Link Previews** has been moved to `TODO.md` under
> ON HOLD with completed/incomplete checkpoints preserved.

---

## 1) Broader Context Audit (Whole Page, not only CV rows)

Primary host template: `src/app/features/module-browser/module-browser-detail/module-browser-detail.component.html`

Current page zones:

- Left zone: module visual card + comments.
- Middle zone: data cards, search chips, and optional dev utils.
- Right zone: editor panel (when open), plus “Racked in” and “Patched in”.
- Bottom zone: “Others by manufacturer”.

Observed context-level UX pressure:

- Editor competes with multiple high-density side panels for attention and width.
- Contribution flow and read-only metadata are mixed in the same viewport without clear task mode framing.
- CV row controls inherit generic form widths; row-level interaction hierarchy is not explicitly modeled per task state.

---

## 2) Problem Statement and Scope

In-scope:

- Module editor section inside module details page.
- Surrounding layout and hierarchy that influences editor usability.
- Contribution-only interactions (add/edit/remove unsaved rows, save, undo, status comprehension).

Out-of-scope (for this redesign phase):

- Database schema changes.
- New moderation workflow.
- Edit FAB behavior changes (kept as-is in current iteration).

Current known pain points:

- Row composition is still visually imbalanced under constrained width.
- Form control sizing is not intentionally tuned by field type (name vs min/max voltage).
- New affordances need stronger visual rhythm with the page’s existing card system.

---

## 3) Target UX Model (Design Direction)

Design intent for redesigned Module Details editing:

- **Mode clarity:** clear distinction between browsing module info and actively editing contribution data.
- **Row hierarchy:** each CV row reads as `status/meta -> core fields -> action`, with consistent alignment.
- **Density with readability:** compact numeric controls, stable row height, no wasted horizontal space.
- **Safe affordances:** destructive language/color only for truly removable draft rows.
- **No accidental writes:** unsaved preview/testing remains first-class via dedicated no-save test paths.

Key components involved:

- `module-browser-detail.component.html` (page composition),
- `module-editor.component.*` (editor sections, save behavior),
- `module-editor-cv-form-line.component.*` (row ergonomics),
- `module-editor-adder-line.component.*` (preset entry point),
- supporting shared controls (`brand-primary-button`, chips, tooltips, snackbars).

---

## 4) Execution Plan (Three Layers)

### MVP Layer — Layout correction and task legibility

**Deliverable:** editor rows and section framing feel intentionally structured in the existing page.

Steps:

- [x] Rebalance editor row grid so status/meta, name, and voltage fields align on a clear baseline.
- [x] Normalize control widths by semantic type (name flexible; voltage compact).
- [x] Tune spacing between section headers, chips, adder line, and first row.
- [x] Gate: screenshot review on `/modules/details/1423` with unsaved draft rows.

### Structural Layer — Section architecture inside Module Details

**Deliverable:** editor sits in a clear contribution workflow that fits the broader page.

Steps:

- [ ] Define explicit contribution sub-sections (“Prepare”, “Edit ports”, “Review & Save”).
- [ ] Evaluate moving low-priority info (or collapsing it) while editor is open.
- [ ] Introduce consistent content width strategy across right-side cards.
- [ ] Gate: desktop and mobile screenshot diff shows improved visual hierarchy.

### Polish Layer — Interaction feedback and consistency

**Deliverable:** polished micro-interactions and consistent visual language.

Steps:

- [ ] Refine status badge/iconography density and tooltip copy.
- [ ] Harmonize new adder controls with brand button system (contrast, hover, focus).
- [ ] Validate keyboard and screen-reader semantics for row actions.
- [ ] Gate: focused UX test pass + stakeholder signoff screenshots.

---

## 5) Pause/Handoff Management and Validation

How this feature is being run while SEO is paused:

- Keep all redesign exploration in this file; keep backlog tracking in `TODO.md`.
- Preserve no-write verification path using Playwright unsaved-draft scenario.
- Commit in small checkpoints to allow easy rollback of individual layout experiments.

Validation checklist for each iteration:

- [x] Unit tests for module editor pass.
- [x] Playwright unsaved-draft snapshot test passes without save action.
- [x] Visual review confirms no white-on-white controls and no misleading destructive styling.
- [ ] `git status` contains only intended source/doc changes (no required artifacts).
